
-- 1) Fix signup trigger: always 'student', ignore client-supplied role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, registration_number, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'registration_number', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  -- SECURITY: always student. Staff must be promoted by an admin via a privileged path.
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

-- Ensure trigger exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Lock down profiles SELECT — owner-only
DROP POLICY IF EXISTS "Authenticated can read profiles" ON public.profiles;

CREATE POLICY "Users read own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Safe lookup function for staff to fetch student name + reg # without bank_balance
CREATE OR REPLACE FUNCTION public.get_profile_summary(_user_ids uuid[])
RETURNS TABLE (user_id uuid, full_name text, registration_number text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.registration_number
  FROM public.profiles p
  WHERE p.user_id = ANY(_user_ids)
    AND (
      auth.uid() = p.user_id
      OR public.has_role(auth.uid(), 'staff')
      OR public.has_role(auth.uid(), 'student')
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_summary(uuid[]) TO authenticated;

-- 3) Restrict profiles UPDATE so bank_balance can't be self-modified
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE OR REPLACE FUNCTION public.prevent_bank_balance_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow only when the bank_balance is unchanged, OR the change is made by a SECURITY DEFINER
  -- function (where current_user is the function owner, not the calling auth role).
  IF NEW.bank_balance IS DISTINCT FROM OLD.bank_balance THEN
    -- auth.uid() is set for client calls; SECURITY DEFINER calls from our funcs run with auth.uid() too,
    -- so we instead use a session-level guard via a GUC set inside trusted functions.
    IF current_setting('app.allow_balance_change', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'bank_balance cannot be modified directly';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_bank_balance ON public.profiles;
CREATE TRIGGER profiles_guard_bank_balance
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_bank_balance_self_update();

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4) Update claim_meal to set the GUC so balance updates succeed
CREATE OR REPLACE FUNCTION public.claim_meal(_meal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _meal public.meals%ROWTYPE;
  _staff uuid := auth.uid();
  _half numeric;
BEGIN
  IF NOT public.has_role(_staff, 'staff') THEN
    RAISE EXCEPTION 'Only staff can claim meals';
  END IF;

  SELECT * INTO _meal FROM public.meals WHERE id = _meal_id FOR UPDATE;
  IF NOT FOUND OR _meal.status <> 'released' THEN
    RAISE EXCEPTION 'Meal not available';
  END IF;

  _half := round(_meal.price / 2);

  PERFORM set_config('app.allow_balance_change', 'on', true);

  UPDATE public.meals
    SET status = 'claimed', claimed_by = _staff
    WHERE id = _meal_id;

  UPDATE public.profiles SET bank_balance = bank_balance + _half WHERE user_id = _meal.student_id;
  INSERT INTO public.transactions (student_id, amount, meal_id, note)
    VALUES (_meal.student_id, _half, _meal_id, 'Meal claimed by staff — 50% refund');

  UPDATE public.profiles SET bank_balance = bank_balance - _half WHERE user_id = _staff;
  INSERT INTO public.transactions (student_id, amount, meal_id, note)
    VALUES (_staff, -_half, _meal_id, 'Claimed meal — paid 50%');

  PERFORM set_config('app.allow_balance_change', 'off', true);
END;
$$;

-- 5) Top-up RPC for users — replaces direct bank_balance UPDATE from client
CREATE OR REPLACE FUNCTION public.top_up_balance(_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _new numeric;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 100000 THEN
    RAISE EXCEPTION 'Top-up amount must be between 1 and 100000';
  END IF;

  PERFORM set_config('app.allow_balance_change', 'on', true);

  UPDATE public.profiles
    SET bank_balance = bank_balance + _amount
    WHERE user_id = _uid
    RETURNING bank_balance INTO _new;

  INSERT INTO public.transactions (student_id, amount, note)
    VALUES (_uid, _amount, 'Bank top-up');

  PERFORM set_config('app.allow_balance_change', 'off', true);
  RETURN _new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.top_up_balance(numeric) TO authenticated;

-- 6) Lock down meal-related transactions: students should not insert arbitrary entries.
-- The existing meal logging flow in src/routes/log.tsx writes both the meal and a transaction
-- from the client. Move billing into a SECURITY DEFINER function and remove direct INSERT.

-- Allow direct insert ONLY when guarded GUC is set (i.e., from our trusted functions)
DROP POLICY IF EXISTS "Students insert own transactions" ON public.transactions;

CREATE POLICY "Trusted server inserts transactions"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (current_setting('app.allow_balance_change', true) = 'on');

-- Helper to log a meal + charge atomically (used by client meal logging)
CREATE OR REPLACE FUNCTION public.log_meal(_meal_date date, _slot meal_slot, _price numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'student') THEN
    RAISE EXCEPTION 'Only students can log meals';
  END IF;
  IF _price IS NULL OR _price < 0 OR _price > 5000 THEN
    RAISE EXCEPTION 'Invalid price';
  END IF;

  PERFORM set_config('app.allow_balance_change', 'on', true);

  INSERT INTO public.meals (student_id, meal_date, slot, price, status)
    VALUES (_uid, _meal_date, _slot, _price, 'logged')
    RETURNING id INTO _id;

  UPDATE public.profiles SET bank_balance = bank_balance - _price WHERE user_id = _uid;
  INSERT INTO public.transactions (student_id, amount, meal_id, note)
    VALUES (_uid, -_price, _id, 'Meal logged');

  PERFORM set_config('app.allow_balance_change', 'off', true);
  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_meal(date, meal_slot, numeric) TO authenticated;

-- Helper to refund a forfeited (cancelled) breakfast
CREATE OR REPLACE FUNCTION public.forfeit_meal(_meal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _meal public.meals%ROWTYPE;
  _uid uuid := auth.uid();
BEGIN
  SELECT * INTO _meal FROM public.meals WHERE id = _meal_id FOR UPDATE;
  IF NOT FOUND OR _meal.student_id <> _uid THEN
    RAISE EXCEPTION 'Meal not found';
  END IF;
  IF _meal.status <> 'logged' THEN
    RAISE EXCEPTION 'Only logged meals can be cancelled';
  END IF;

  PERFORM set_config('app.allow_balance_change', 'on', true);

  UPDATE public.meals SET status = 'forfeited' WHERE id = _meal_id;
  UPDATE public.profiles SET bank_balance = bank_balance + _meal.price WHERE user_id = _uid;
  INSERT INTO public.transactions (student_id, amount, meal_id, note)
    VALUES (_uid, _meal.price, _meal_id, 'Cancelled meal — full refund');

  PERFORM set_config('app.allow_balance_change', 'off', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.forfeit_meal(uuid) TO authenticated;

-- Release a meal (no balance change, just status flip) — kept as direct UPDATE via existing policy.
