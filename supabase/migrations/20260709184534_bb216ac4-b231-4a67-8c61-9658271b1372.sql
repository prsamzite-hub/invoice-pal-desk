CREATE TABLE public.document_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(12,3),
  unit_price NUMERIC(14,2),
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX document_items_document_id_idx ON public.document_items(document_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_items TO authenticated;
GRANT ALL ON public.document_items TO service_role;

ALTER TABLE public.document_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items on their documents"
  ON public.document_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.receipts r WHERE r.id = document_items.document_id AND r.user_id = auth.uid()));

CREATE POLICY "Users can insert items on their documents"
  ON public.document_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.receipts r WHERE r.id = document_items.document_id AND r.user_id = auth.uid()));

CREATE POLICY "Users can update items on their documents"
  ON public.document_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.receipts r WHERE r.id = document_items.document_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.receipts r WHERE r.id = document_items.document_id AND r.user_id = auth.uid()));

CREATE POLICY "Users can delete items on their documents"
  ON public.document_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.receipts r WHERE r.id = document_items.document_id AND r.user_id = auth.uid()));