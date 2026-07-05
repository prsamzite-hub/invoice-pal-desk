// Lightweight Lovable AI Gateway helper for text-only JSON extraction.
// Uses fetch directly (OpenAI-compatible chat completions) to avoid pulling
// the AI SDK in for this scaffold endpoint.

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
  items?: ExtractedLineItem[];
}

export async function extractReceiptFromText(text: string): Promise<ExtractedDocument> {
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
      model: "google/gemini-2.5-flash",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract structured receipt/invoice data. Respond with JSON ONLY matching: " +
            '{"company":string,"amount":number,"currency":string,"date":"YYYY-MM-DD","due_date":"YYYY-MM-DD"|null,"document_type":"receipt"|"invoice"}. ' +
            "Use DKK if currency unclear. document_type=invoice when a payment due date is present.",
        },
        { role: "user", content: text.slice(0, 8000) },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI gateway ${res.status}: ${body.slice(0, 400)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content) as ExtractedDocument;
}

const EXTRACT_SYS =
  "You extract structured data from receipts and invoices (often Danish/European). " +
  "Read carefully, including small/faded print. Company is the store/merchant brand (e.g. 'BR', 'Netto', 'Rema 1000'), not an address line. " +
  "Numbers may use comma as decimal separator (e.g. '74,25' = 74.25). Convert all amounts to numbers with a dot. " +
  "amount = the final total the customer paid (after discounts, incl. VAT/moms). " +
  "Extract every purchased line item with its description and line total; include quantity and unit price when visible. Discounts/rabat can be negative line items. " +
  "Respond with JSON ONLY matching: " +
  '{"company":string,"amount":number,"currency":string,"date":"YYYY-MM-DD","due_date":"YYYY-MM-DD"|null,"document_type":"receipt"|"invoice","category":string,"notes":string|null,' +
  '"items":[{"description":string,"quantity":number|null,"unit_price":number|null,"total":number}]}. ' +
  "Use DKK if currency unclear. document_type=invoice when a payment due date is present. " +
  "category ∈ {Groceries, Utilities, Subscriptions, Dining, Transport, Shopping, Health, Other}.";

export async function extractReceiptFromImage(
  base64: string,
  mime: string,
): Promise<ExtractedDocument & { category?: string; notes?: string | null }> {
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
      model: "google/gemini-2.5-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACT_SYS },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the fields from this document." },
            { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI gateway ${res.status}: ${body.slice(0, 400)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content);
}

