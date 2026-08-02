ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS is_business boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS receipts_user_is_business_idx ON public.receipts (user_id, is_business);