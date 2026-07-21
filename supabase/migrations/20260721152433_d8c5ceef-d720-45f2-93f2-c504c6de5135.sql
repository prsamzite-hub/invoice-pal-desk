-- Remove all business-related database objects
DROP TABLE IF EXISTS public.business_profiles CASCADE;
ALTER TABLE public.receipts DROP COLUMN IF EXISTS is_business;