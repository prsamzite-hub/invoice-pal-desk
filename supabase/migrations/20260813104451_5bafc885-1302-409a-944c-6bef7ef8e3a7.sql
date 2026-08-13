ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS doc_number integer;

CREATE TABLE IF NOT EXISTS public.receipt_counters (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_number integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.receipt_counters TO service_role;
ALTER TABLE public.receipt_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own counter read" ON public.receipt_counters
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Backfill existing documents chronologically per user
WITH numbered AS (
  SELECT id, user_id,
         row_number() OVER (PARTITION BY user_id ORDER BY created_at, id) AS rn
  FROM public.receipts
)
UPDATE public.receipts r
SET doc_number = n.rn
FROM numbered n
WHERE r.id = n.id AND r.doc_number IS NULL;

INSERT INTO public.receipt_counters (user_id, last_number)
SELECT user_id, COALESCE(MAX(doc_number), 0) FROM public.receipts GROUP BY user_id
ON CONFLICT (user_id) DO UPDATE SET last_number = GREATEST(public.receipt_counters.last_number, EXCLUDED.last_number);

CREATE UNIQUE INDEX IF NOT EXISTS receipts_user_doc_number_key
  ON public.receipts (user_id, doc_number);

CREATE OR REPLACE FUNCTION public.assign_receipt_doc_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.doc_number IS NULL THEN
    INSERT INTO public.receipt_counters (user_id, last_number)
    VALUES (NEW.user_id, 1)
    ON CONFLICT (user_id) DO UPDATE
      SET last_number = public.receipt_counters.last_number + 1,
          updated_at = now()
    RETURNING last_number INTO NEW.doc_number;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_receipt_doc_number() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS receipts_assign_doc_number ON public.receipts;
CREATE TRIGGER receipts_assign_doc_number
BEFORE INSERT ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.assign_receipt_doc_number();

CREATE OR REPLACE FUNCTION public.protect_receipt_doc_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.doc_number IS NOT NULL AND NEW.doc_number IS DISTINCT FROM OLD.doc_number THEN
    NEW.doc_number := OLD.doc_number;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_receipt_doc_number() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS receipts_protect_doc_number ON public.receipts;
CREATE TRIGGER receipts_protect_doc_number
BEFORE UPDATE ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.protect_receipt_doc_number();