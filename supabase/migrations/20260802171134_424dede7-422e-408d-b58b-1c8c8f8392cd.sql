ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS vat_amount numeric,
  ADD COLUMN IF NOT EXISTS vat_rate numeric,
  ADD COLUMN IF NOT EXISTS vat_is_calculated boolean NOT NULL DEFAULT false;