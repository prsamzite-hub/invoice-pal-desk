// Lightweight Lovable AI Gateway helper for receipt/invoice extraction.
// Uses fetch directly (OpenAI-compatible chat completions).

export interface ExtractedLineItem {
  description: string;
  quantity?: number | null;
  unit_price?: number | null;
  total: number;
}

export interface ExtractedDocument {
  company: string;
  amount: number;
  currency: string;
  date: string; // ISO yyyy-mm-dd
  due_date?: string | null;
  document_type: "receipt" | "invoice";
  category?: string;
  notes?: string | null;
  invoice_number?: string | null;
  supplier_cvr?: string | null;
  amount_excl_vat?: number | null;
  vat_amount?: number | null;
  vat_rate?: number | null;
  items?: ExtractedLineItem[];

}

const EXTRACT_SYS =
  "You extract structured data from receipts and invoices (often Danish/European). " +
  "Read carefully, including small/faded print. Company is the supplier/merchant brand (e.g. 'BR', 'Netto', 'Rema 1000'), not an address line. " +
  "Numbers may use comma as decimal separator (e.g. '74,25' = 74.25) and dot as thousands separator ('1.234,50' = 1234.50). Convert all amounts to numbers with a dot. " +
  "amount = the final total the customer must pay, incl. VAT/moms (I alt / Total inkl. moms). " +
  "amount_excl_vat = subtotal excluding VAT (ekskl. moms), vat_amount = the VAT/moms amount. " +
  "invoice_number = Fakturanr./Faktura nr./Invoice no. supplier_cvr = the supplier's 8-digit CVR/VAT number. " +
  "DUE DATE RULE: due_date must ONLY come from a field labelled 'Forfaldsdato', 'Betalingsdato', 'Betalingsfrist', 'Sidste rettidige betaling' or 'Due date'. " +
  "NEVER use the invoice date (Fakturadato), order date or delivery date (Leveringsdato) as due_date. If no such label exists, set due_date to null. " +
  "date = the invoice/receipt date (Fakturadato / date of purchase). " +
  "document_type = 'invoice' when an invoice number and/or a due date is present, otherwise 'receipt'. " +
  "Extract every purchased line item with its description and line total; include quantity and unit price when visible. Discounts/rabat can be negative line items. " +
  "Respond with JSON ONLY matching: " +
  '{"company":string,"amount":number,"currency":string,"date":"YYYY-MM-DD","due_date":"YYYY-MM-DD"|null,"document_type":"receipt"|"invoice","category":string,"notes":string|null,' +
  '"invoice_number":string|null,"supplier_cvr":string|null,"amount_excl_vat":number|null,"vat_amount":number|null,' +
  '"items":[{"description":string,"quantity":number|null,"unit_price":number|null,"total":number}]}. ' +
  "Use DKK if currency unclear. " +
  "category ∈ {Groceries, Utilities, Subscriptions, Dining, Transport, Shopping, Health, Other}.";

async function callGateway(model: string, userContent: unknown): Promise<ExtractedDocument> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACT_SYS },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI gateway ${res.status}: ${body.slice(0, 400)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content) as ExtractedDocument;
}

/** Text-layer path (text-based PDFs) — cheaper and more accurate than vision. */
export async function extractReceiptFromText(text: string): Promise<ExtractedDocument> {
  return callGateway("google/gemini-2.5-pro", [
    {
      type: "text",
      text:
        "Extract the fields from this document text (extracted from a PDF).\n\n" +
        text.slice(0, 30000),
    },
  ]);
}

/** Vision path (photos and scanned/image-only PDF pages). */
export async function extractReceiptFromImages(
  images: Array<{ base64: string; mime: string }>,
): Promise<ExtractedDocument> {
  return callGateway("google/gemini-2.5-pro", [
    { type: "text", text: "Extract the fields from this document." },
    ...images.map((img) => ({
      type: "image_url" as const,
      image_url: { url: `data:${img.mime};base64,${img.base64}` },
    })),
  ]);
}

export async function extractReceiptFromImage(base64: string, mime: string) {
  return extractReceiptFromImages([{ base64, mime }]);
}
