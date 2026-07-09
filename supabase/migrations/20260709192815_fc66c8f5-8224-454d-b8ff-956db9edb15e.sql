
-- 1. Backfill company text from vendors where missing
UPDATE public.receipts r
SET company = v.name
FROM public.vendors v
WHERE r.vendor_id = v.id
  AND (r.company IS NULL OR btrim(r.company) = '');

-- 2. Drop FK / column on receipts
ALTER TABLE public.receipts DROP COLUMN IF EXISTS vendor_id;

-- 3. Drop the vendors table
DROP TABLE IF EXISTS public.vendors CASCADE;
