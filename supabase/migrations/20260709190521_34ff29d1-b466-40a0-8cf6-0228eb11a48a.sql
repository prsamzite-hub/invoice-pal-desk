
CREATE TABLE public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  domain TEXT,
  logo_path TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, normalized_name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own vendors" ON public.vendors
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX vendors_user_id_idx ON public.vendors(user_id);

-- Add vendor_id to receipts (nullable during backfill, kept nullable so legacy paths don't break)
ALTER TABLE public.receipts
  ADD COLUMN vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;
CREATE INDEX receipts_vendor_id_idx ON public.receipts(vendor_id);

-- Backfill: one vendor per (user_id, lower(trim(company)))
INSERT INTO public.vendors (user_id, name, normalized_name)
SELECT DISTINCT ON (user_id, lower(trim(company)))
  user_id,
  trim(company) AS name,
  lower(trim(company)) AS normalized_name
FROM public.receipts
WHERE company IS NOT NULL AND trim(company) <> ''
ORDER BY user_id, lower(trim(company)), created_at ASC;

UPDATE public.receipts r
SET vendor_id = v.id
FROM public.vendors v
WHERE v.user_id = r.user_id
  AND v.normalized_name = lower(trim(r.company))
  AND r.vendor_id IS NULL;
