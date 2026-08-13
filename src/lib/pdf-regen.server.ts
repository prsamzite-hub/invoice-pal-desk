/** Server-only helper: (re)generate and store a document PDF. */
import { loadLogoBytesByName } from "./vendor-logos.functions";

async function loadSenderProfile(supabase: any, userId: string) {
  try {
    const { data } = await supabase
      .from("business_profiles")
      .select("company_name, cvr, address, postal_code, city, phone, email")
      .eq("user_id", userId)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

export async function regeneratePdfFor(
  supabase: any,
  userId: string,
  id: string,
  lang: "da" | "en",
): Promise<string> {
  const { generateReceiptPdf } = await import("./receipt-pdf.server");
  const { data: row, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("Ikke fundet");
  const { data: items } = await supabase
    .from("document_items")
    .select("description, quantity, unit_price, total, position")
    .eq("document_id", id)
    .order("position", { ascending: true });
  const vendorLogo = await loadLogoBytesByName(supabase, userId, row.company);
  const pdfBytes = await generateReceiptPdf({
    company: row.company,
    amount: Number(row.amount),
    currency: row.currency,
    date: row.issued_date ?? "",
    due_date: row.due_date,
    document_type: (row.document_type as "receipt" | "invoice") ?? "receipt",
    category: row.category,
    notes: row.notes,
    supplier_invoice_number: row.supplier_invoice_number,
    supplier_cvr: row.supplier_cvr,
    vat_amount: row.vat_amount == null ? null : Number(row.vat_amount),
    vat_rate: row.vat_rate == null ? null : Number(row.vat_rate),
    vat_is_calculated: row.vat_is_calculated === true,
    items: (items ?? []).map((it: any) => ({
      description: it.description ?? "",
      quantity: it.quantity == null ? null : Number(it.quantity),
      unit_price: it.unit_price == null ? null : Number(it.unit_price),
      total: Number(it.total ?? 0),
    })),
    receipt_id: row.id,
    doc_number: row.doc_number ?? null,
    vendor_logo: vendorLogo,
    sender: await loadSenderProfile(supabase, userId),
    lang,
  });
  const pdfPath = row.pdf_path || `${userId}/pdfs/${row.id}.pdf`;
  const up = await supabase.storage
    .from("receipts")
    .upload(pdfPath, pdfBytes, { contentType: "application/pdf", upsert: true });
  if (up.error) throw up.error;
  if (!row.pdf_path) {
    await supabase.from("receipts").update({ pdf_path: pdfPath }).eq("id", id);
  }
  return pdfPath;
}
