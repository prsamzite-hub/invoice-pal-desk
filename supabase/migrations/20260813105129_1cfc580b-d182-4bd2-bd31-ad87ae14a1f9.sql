ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS verification_token text;

UPDATE public.receipts SET verification_token = encode(gen_random_bytes(16), 'hex') WHERE verification_token IS NULL;

ALTER TABLE public.receipts ALTER COLUMN verification_token SET DEFAULT encode(gen_random_bytes(16), 'hex');
ALTER TABLE public.receipts ALTER COLUMN verification_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS receipts_verification_token_key ON public.receipts (verification_token);

CREATE OR REPLACE FUNCTION public.verify_document(_token text)
RETURNS TABLE (
  company text,
  amount numeric,
  currency text,
  issued_date date,
  document_type text,
  registered_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.company, r.amount, r.currency, r.issued_date, r.document_type, r.created_at
  FROM public.receipts r
  WHERE r.verification_token = _token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.verify_document(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_document(text) TO anon, authenticated, service_role;