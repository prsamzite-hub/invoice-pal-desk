ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS private_share_pct numeric;

ALTER TABLE public.receipts
  ADD CONSTRAINT receipts_private_share_pct_range
  CHECK (private_share_pct IS NULL OR (private_share_pct >= 0 AND private_share_pct <= 100));