import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ensureLogoForCompany, loadLogoBytesByName } from "./vendor-logos.functions";

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

export interface LineItem {
  description: string;
  quantity: number | null;
  unit_price: number | null;
  total: number;
}

export interface ExtractedFields {
  company: string;
  amount: number;
  currency: string;
  issued_date: string | null;
  due_date: string | null;
  document_type: "receipt" | "invoice";
  category: string | null;
  notes: string | null;
  items: LineItem[];
}

export interface ExtractResult {
  originalPath: string;
  mime: string;
  extracted: ExtractedFields;
  extractionOk: boolean;
  errorMessage?: string;
}

function sanitizeItems(input: unknown): LineItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw) => {
      const it = (raw ?? {}) as Record<string, unknown>;
      const desc = typeof it.description === "string" ? it.description.trim() : "";
      const qty = it.quantity == null || it.quantity === "" ? null : Number(it.quantity);
      const unit = it.unit_price == null || it.unit_price === "" ? null : Number(it.unit_price);
      const total = Number(it.total);
      if (!desc && !Number.isFinite(total)) return null;
      return {
        description: desc,
        quantity: Number.isFinite(qty as number) ? (qty as number) : null,
        unit_price: Number.isFinite(unit as number) ? (unit as number) : null,
        total: Number.isFinite(total) ? total : 0,
      } as LineItem;
    })
    .filter((x): x is LineItem => x !== null);
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
      items: [],
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
          items: sanitizeItems(ex.items),
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

function normalizeFields(f: ExtractedFields): ExtractedFields {
  if (!f.company || f.company.trim().length === 0) throw new Error("Firma mangler");
  if (!Number.isFinite(Number(f.amount)) || Number(f.amount) <= 0) throw new Error("Beløb skal være større end 0");
  if (!f.issued_date) throw new Error("Dato mangler");
  return {
    company: f.company.trim(),
    amount: Number(f.amount),
    currency: (f.currency || "DKK").toUpperCase(),
    issued_date: f.issued_date,
    due_date: f.due_date || null,
    document_type: f.document_type === "invoice" ? "invoice" : "receipt",
    category: f.category || null,
    notes: f.notes || null,
    items: sanitizeItems(f.items),
  };
}

async function replaceItems(supabase: any, documentId: string, items: LineItem[]) {
  await supabase.from("document_items").delete().eq("document_id", documentId);
  if (items.length === 0) return;
  const rows = items.map((it, i) => ({
    document_id: documentId,
    position: i,
    description: it.description,
    quantity: it.quantity,
    unit_price: it.unit_price,
    total: it.total,
  }));
  const ins = await supabase.from("document_items").insert(rows);
  if (ins.error) throw ins.error;
}


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
      return {
        originalPath: data.originalPath,
        lang: data.lang === "en" ? ("en" as const) : ("da" as const),
        fields: normalizeFields(data.fields),
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
      await replaceItems(supabase, row.id, f.items);
    } catch (e) {
      console.error("[saveReceipt] items insert failed", e);
    }

    // Best-effort cache the vendor logo for this company name.
    try {
      await ensureLogoForCompany(supabase, userId, f.company);
    } catch (e) {
      console.warn("[saveReceipt] logo cache failed", e);
    }

    try {
      const vendorLogo = await loadLogoBytesByName(supabase, userId, f.company);
      const pdfBytes = await generateReceiptPdf({
        company: row.company,
        amount: Number(row.amount),
        currency: row.currency,
        date: row.issued_date ?? "",
        due_date: row.due_date,
        document_type: (row.document_type as "receipt" | "invoice") ?? "receipt",
        category: row.category,
        notes: row.notes,
        items: f.items,
        receipt_id: row.id,
        vendor_logo: vendorLogo,
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
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const getReceiptItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Ensure ownership through receipts join (RLS also enforces this)
    const { data: row, error: rErr } = await supabase
      .from("receipts")
      .select("id, user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (rErr) throw rErr;
    if (!row || row.user_id !== userId) throw new Error("Ikke fundet");
    const { data: items, error } = await supabase
      .from("document_items")
      .select("description, quantity, unit_price, total, position")
      .eq("document_id", data.id)
      .order("position", { ascending: true });
    if (error) throw error;
    return (items ?? []).map((it) => ({
      description: it.description ?? "",
      quantity: it.quantity == null ? null : Number(it.quantity),
      unit_price: it.unit_price == null ? null : Number(it.unit_price),
      total: Number(it.total ?? 0),
    })) as LineItem[];
  });

async function loadVendorLogoBytes(
  supabase: any,
  vendorId: string | null,
): Promise<Uint8Array | null> {
  if (!vendorId) return null;
  const { data: v } = await supabase
    .from("vendors")
    .select("logo_path")
    .eq("id", vendorId)
    .maybeSingle();
  if (!v?.logo_path) return null;
  const dl = await supabase.storage.from("vendor-logos").download(v.logo_path);
  if (dl.error || !dl.data) return null;
  return new Uint8Array(await dl.data.arrayBuffer());
}

async function regenerateAndStorePdf(
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
  const vendorLogo = await loadVendorLogoBytes(supabase, row.vendor_id ?? null);
  const pdfBytes = await generateReceiptPdf({
    company: row.company,
    amount: Number(row.amount),
    currency: row.currency,
    date: row.issued_date ?? "",
    due_date: row.due_date,
    document_type: (row.document_type as "receipt" | "invoice") ?? "receipt",
    category: row.category,
    notes: row.notes,
    items: (items ?? []).map((it: any) => ({
      description: it.description ?? "",
      quantity: it.quantity == null ? null : Number(it.quantity),
      unit_price: it.unit_price == null ? null : Number(it.unit_price),
      total: Number(it.total ?? 0),
    })),
    receipt_id: row.id,
    vendor_logo: vendorLogo,
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

export const getReceiptPdfUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; lang?: "da" | "en" }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const lang = data.lang === "en" ? ("en" as const) : ("da" as const);
    // Always regenerate so existing documents get the new brand template.
    const pdfPath = await regenerateAndStorePdf(supabase, userId, data.id, lang);
    const signed = await supabase.storage.from("receipts").createSignedUrl(pdfPath, 60 * 10);
    if (signed.error) throw signed.error;
    return { url: signed.data.signedUrl };
  });

export const getReceiptOriginalUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("receipts")
      .select("original_path, user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!row || row.user_id !== userId || !row.original_path) throw new Error("Not found");
    const signed = await supabase.storage
      .from("receipts")
      .createSignedUrl(row.original_path, 60 * 10);
    if (signed.error) throw signed.error;
    return { url: signed.data.signedUrl };
  });

export const updateReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; fields: ExtractedFields }) => {
    if (!data?.id) throw new Error("Missing id");
    return { id: data.id, fields: normalizeFields(data.fields) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const f = data.fields;
    const { data: existing, error: exErr } = await supabase
      .from("receipts")
      .select("status")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (exErr) throw exErr;
    if (!existing) throw new Error("Ikke fundet");
    const nextStatus = existing.status === "paid" ? "paid" : f.due_date ? "unpaid" : "paid";
    const vendorId = await resolveVendorForCurrentUser(supabase, userId, f.company);
    const { data: row, error } = await supabase
      .from("receipts")
      .update({
        company: f.company,
        vendor_id: vendorId,
        amount: f.amount,
        currency: f.currency,
        issued_date: f.issued_date,
        due_date: f.due_date,
        document_type: f.document_type,
        category: f.category,
        notes: f.notes,
        status: nextStatus,
      })
      .eq("id", data.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw error;

    try {
      await replaceItems(supabase, data.id, f.items);
    } catch (e) {
      console.error("[updateReceipt] items update failed", e);
    }

    return row;
  });

export const markReceiptPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; paid: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("receipts")
      .update({ status: data.paid ? "paid" : "unpaid" })
      .eq("id", data.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("receipts")
      .select("id, user_id, original_path, pdf_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!row || row.user_id !== userId) throw new Error("Ikke fundet");
    const paths = [row.original_path, row.pdf_path].filter(Boolean) as string[];
    if (paths.length > 0) {
      await supabase.storage.from("receipts").remove(paths);
    }
    const del = await supabase.from("receipts").delete().eq("id", data.id).eq("user_id", userId);
    if (del.error) throw del.error;
    return { ok: true };
  });
