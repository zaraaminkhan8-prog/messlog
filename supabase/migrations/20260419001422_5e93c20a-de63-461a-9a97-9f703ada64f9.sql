DROP POLICY IF EXISTS "Staff claim released meals" ON public.meals;

CREATE POLICY "Staff claim released meals"
ON public.meals
FOR UPDATE
TO authenticated
USING ((status = 'released'::meal_status) AND has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) AND claimed_by = auth.uid() AND status = 'claimed'::meal_status);

-- Allow staff to insert their own transactions (paying 50% for claimed meal)
-- and allow staff to update student's profile bank_balance via a security definer function

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

  UPDATE public.meals
    SET status = 'claimed', claimed_by = _staff
    WHERE id = _meal_id;

  -- Refund student 50%
  UPDATE public.profiles SET bank_balance = bank_balance + _half WHERE user_id = _meal.student_id;
  INSERT INTO public.transactions (student_id, amount, meal_id, note)
    VALUES (_meal.student_id, _half, _meal_id, 'Meal claimed by staff — 50% refund');

  -- Charge staff 50%
  UPDATE public.profiles SET bank_balance = bank_balance - _half WHERE user_id = _staff;
  INSERT INTO public.transactions (student_id, amount, meal_id, note)
    VALUES (_staff, -_half, _meal_id, 'Claimed meal — paid 50%');
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_meal(uuid) TO authenticated;