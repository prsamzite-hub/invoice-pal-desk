import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Upload a receipt file: uploads original to storage, extracts data via AI,
// generates a polished PDF, uploads that, inserts a row, returns it.
export const uploadReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Expected FormData");
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("Missing file");
    return { file };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { file } = data;
    const { extractReceiptFromImage } = await import("./ai-gateway.server");
    const { generateReceiptPdf } = await import("./receipt-pdf.server");

    const bytes = new Uint8Array(await file.arrayBuffer());
    const isImage = file.type.startsWith("image/");

    // Upload original
    const stamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "upload";
    const originalPath = `${userId}/originals/${stamp}-${cleanName}`;
    const up1 = await supabase.storage
      .from("receipts")
      .upload(originalPath, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
    if (up1.error) throw up1.error;

    // Extract fields
    let extracted: Awaited<ReturnType<typeof extractReceiptFromImage>> = {
      company: "Unknown",
      amount: 0,
      currency: "DKK",
      date: new Date().toISOString().slice(0, 10),
      due_date: null,
      document_type: "receipt",
      category: "Other",
      notes: null,
    };
    try {
      if (isImage) {
        const base64 = btoa(String.fromCharCode(...bytes));
        extracted = await extractReceiptFromImage(base64, file.type);
      }
    } catch (e) {
      console.error("[uploadReceipt] extraction failed", e);
    }

    // Insert row (get id for PDF)
    const insert = await supabase
      .from("receipts")
      .insert({
        user_id: userId,
        company: extracted.company || "Unknown",
        amount: Number(extracted.amount) || 0,
        currency: extracted.currency || "DKK",
        issued_date: extracted.date || null,
        due_date: extracted.due_date || null,
        document_type: extracted.document_type || "receipt",
        category: extracted.category || null,
        notes: extracted.notes || null,
        original_path: originalPath,
        status: extracted.due_date ? "unpaid" : "paid",
      })
      .select("*")
      .single();
    if (insert.error) throw insert.error;
    const row = insert.data;

    // Generate PDF
    const pdfBytes = await generateReceiptPdf({
      company: row.company,
      amount: Number(row.amount),
      currency: row.currency,
      date: row.issued_date ?? "",
      due_date: row.due_date,
      document_type: (row.document_type as "receipt" | "invoice") ?? "receipt",
      category: row.category,
      notes: row.notes,
      items: (extracted as { items?: Array<{ description: string; quantity?: number | null; unit_price?: number | null; total: number }> }).items ?? [],
      receipt_id: row.id,
    });
    const pdfPath = `${userId}/pdfs/${row.id}.pdf`;
    const up2 = await supabase.storage
      .from("receipts")
      .upload(pdfPath, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (up2.error) throw up2.error;

    const upd = await supabase
      .from("receipts")
      .update({ pdf_path: pdfPath })
      .eq("id", row.id)
      .select("*")
      .single();
    if (upd.error) throw upd.error;
    return upd.data;
  });

export const listMyReceipts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("receipts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  });

export const getReceiptPdfUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("receipts")
      .select("pdf_path, user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!row || row.user_id !== userId || !row.pdf_path) throw new Error("Not found");
    const signed = await supabase.storage.from("receipts").createSignedUrl(row.pdf_path, 60 * 10);
    if (signed.error) throw signed.error;
    return { url: signed.data.signedUrl };
  });
