
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('student', 'staff');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Anyone signed in can read roles"
ON public.user_roles FOR SELECT TO authenticated USING (true);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  registration_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  bank_balance NUMERIC NOT NULL DEFAULT 5000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read profiles"
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Meals
CREATE TYPE public.meal_slot AS ENUM ('breakfast', 'lunch', 'dinner');
CREATE TYPE public.meal_status AS ENUM ('logged', 'eaten', 'released', 'claimed', 'forfeited');

CREATE TABLE public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meal_date DATE NOT NULL,
  slot public.meal_slot NOT NULL,
  price NUMERIC NOT NULL,
  status public.meal_status NOT NULL DEFAULT 'logged',
  claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, meal_date, slot)
);
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students see own meals"
ON public.meals FOR SELECT TO authenticated
USING (auth.uid() = student_id OR (status = 'released' AND public.has_role(auth.uid(), 'staff')) OR (claimed_by = auth.uid()));

CREATE POLICY "Students insert own meals"
ON public.meals FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_id AND public.has_role(auth.uid(), 'student'));

CREATE POLICY "Students update own meals"
ON public.meals FOR UPDATE TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Staff claim released meals"
ON public.meals FOR UPDATE TO authenticated
USING (status = 'released' AND public.has_role(auth.uid(), 'staff'));

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meal_id UUID REFERENCES public.meals(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students see own transactions"
ON public.transactions FOR SELECT TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students insert own transactions"
ON public.transactions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_id);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_meals_updated BEFORE UPDATE ON public.meals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + student role on signup; metadata supplies reg_no, full_name, role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
BEGIN
  INSERT INTO public.profiles (user_id, registration_number, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'registration_number', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  _role := COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'student');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
