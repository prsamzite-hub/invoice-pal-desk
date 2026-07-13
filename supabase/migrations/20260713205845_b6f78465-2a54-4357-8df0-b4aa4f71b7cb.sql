
-- 1. is_business flag on receipts
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS is_business boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS receipts_user_business_idx ON public.receipts(user_id, is_business);

-- 2. Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read own roles" ON public.user_roles;
CREATE POLICY "read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- 3. Admin read-all policies (added alongside existing owner policies)
DROP POLICY IF EXISTS "admins read all receipts" ON public.receipts;
CREATE POLICY "admins read all receipts" ON public.receipts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins read all business_profiles" ON public.business_profiles;
CREATE POLICY "admins read all business_profiles" ON public.business_profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins read all profiles" ON public.profiles;
CREATE POLICY "admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins read all document_items" ON public.document_items;
CREATE POLICY "admins read all document_items" ON public.document_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. Audit log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read audit log" ON public.audit_log;
CREATE POLICY "admins read audit log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins insert audit log" ON public.audit_log;
CREATE POLICY "admins insert audit log" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = admin_id);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON public.audit_log(created_at DESC);

-- 5. Grant admin to Sami
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = 'samiarlimmi@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
