import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const CATEGORIES = [
  "Groceries",
  "Utilities",
  "Subscriptions",
  "Dining",
  "Transport",
  "Shopping",
  "Health",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface ExtractedFields {
  company: string;
  amount: number;
  currency: string;
  issued_date: string | null;
  due_date: string | null;
  document_type: "receipt" | "invoice";
  category: string | null;
  notes: string | null;
}

export interface ExtractResult {
  originalPath: string;
  mime: string;
  extracted: ExtractedFields;
  extractionOk: boolean;
  errorMessage?: string;
}

// Step 1: upload the original and run AI extraction. Returns editable draft.
export const extractReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Expected FormData");
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("Missing file");
    return { file };
  })
  .handler(async ({ data, context }): Promise<ExtractResult> => {
    const { supabase, userId } = context;
    const { file } = data;
    const { extractReceiptFromImage } = await import("./ai-gateway.server");

    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = file.type || "application/octet-stream";
    const isImage = mime.startsWith("image/");

    const stamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "upload";
    const originalPath = `${userId}/originals/${stamp}-${cleanName}`;
    const up1 = await supabase.storage
      .from("receipts")
      .upload(originalPath, bytes, { contentType: mime, upsert: false });
    if (up1.error) throw up1.error;

    const fallback: ExtractedFields = {
      company: "",
      amount: 0,
      currency: "DKK",
      issued_date: new Date().toISOString().slice(0, 10),
      due_date: null,
      document_type: "receipt",
      category: "Other",
      notes: null,
    };

    if (!isImage) {
      return {
        originalPath,
        mime,
        extracted: fallback,
        extractionOk: false,
        errorMessage: "Automatisk aflæsning understøtter kun billeder (JPG, PNG, HEIC). Udfyld felterne manuelt.",
      };
    }

    try {
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      const base64 = btoa(bin);
      const ex = await extractReceiptFromImage(base64, mime);
      return {
        originalPath,
        mime,
        extracted: {
          company: ex.company || "",
          amount: Number(ex.amount) || 0,
          currency: ex.currency || "DKK",
          issued_date: ex.date || null,
          due_date: ex.due_date ?? null,
          document_type: ex.document_type || "receipt",
          category: ex.category || "Other",
          notes: ex.notes ?? null,
        },
        extractionOk: true,
      };
    } catch (e) {
      console.error("[extractReceipt] extraction failed", e);
      return {
        originalPath,
        mime,
        extracted: fallback,
        extractionOk: false,
        errorMessage: "Vi kunne ikke aflæse dokumentet automatisk. Udfyld felterne selv nedenfor.",
      };
    }
  });

export const findDuplicates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { company: string; amount: number; issued_date: string | null }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.company || !data.issued_date) return [];
    const { data: rows, error } = await supabase
      .from("receipts")
      .select("id, company, amount, issued_date, document_type")
      .eq("user_id", userId)
      .eq("issued_date", data.issued_date)
      .ilike("company", data.company)
      .limit(5);
    if (error) return [];
    const amt = Number(data.amount);
    return (rows ?? []).filter((r) => Math.abs(Number(r.amount) - amt) < 0.01);
  });

export const saveReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      originalPath: string;
      fields: ExtractedFields;
      lang?: "da" | "en";
    }) => {
      if (!data?.originalPath) throw new Error("Missing originalPath");
      if (!data?.fields) throw new Error("Missing fields");
      const f = data.fields;
      if (!f.company || f.company.trim().length === 0) throw new Error("Firma mangler");
      if (!Number.isFinite(Number(f.amount)) || Number(f.amount) <= 0) throw new Error("Beløb skal være større end 0");
      if (!f.issued_date) throw new Error("Dato mangler");
      return {
        originalPath: data.originalPath,
        lang: data.lang === "en" ? ("en" as const) : ("da" as const),
        fields: {
          company: f.company.trim(),
          amount: Number(f.amount),
          currency: (f.currency || "DKK").toUpperCase(),
          issued_date: f.issued_date,
          due_date: f.due_date || null,
          document_type: f.document_type === "invoice" ? "invoice" : "receipt",
          category: f.category || null,
          notes: f.notes || null,
        } as ExtractedFields,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { generateReceiptPdf } = await import("./receipt-pdf.server");
    const f = data.fields;

    const insert = await supabase
      .from("receipts")
      .insert({
        user_id: userId,
        company: f.company,
        amount: f.amount,
        currency: f.currency,
        issued_date: f.issued_date,
        due_date: f.due_date,
        document_type: f.document_type,
        category: f.category,
        notes: f.notes,
        original_path: data.originalPath,
        status: f.due_date ? "unpaid" : "paid",
      })
      .select("*")
      .single();
    if (insert.error) throw insert.error;
    const row = insert.data;

    try {
      const pdfBytes = await generateReceiptPdf({
        company: row.company,
        amount: Number(row.amount),
        currency: row.currency,
        date: row.issued_date ?? "",
        due_date: row.due_date,
        document_type: (row.document_type as "receipt" | "invoice") ?? "receipt",
        category: row.category,
        notes: row.notes,
        items: [],
        receipt_id: row.id,
        lang: data.lang,
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
    } catch (e) {
      console.error("[saveReceipt] pdf generation failed", e);
      return row;
    }
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
