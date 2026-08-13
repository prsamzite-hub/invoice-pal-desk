import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { shareSplit } from "./vat";
import { buildCsv, exportFilename, type ExportDoc, type ExportScope } from "./export-format";

export const getExportManifest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { from: string; to: string; scope: ExportScope }) => {
    if (!data?.from || !data?.to) throw new Error("Vælg en periode");
    const scope: ExportScope =
      data.scope === "private" || data.scope === "business" ? data.scope : "all";
    return { from: data.from.slice(0, 10), to: data.to.slice(0, 10), scope };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("receipts")
      .select(
        "id, doc_number, issued_date, due_date, company, supplier_cvr, amount, currency, category, document_type, status, is_business, vat_amount, vat_rate, private_share_pct, created_at",
      )
      .eq("user_id", userId)
      .gte("issued_date", data.from)
      .lte("issued_date", data.to)
      .order("doc_number", { ascending: true });
    if (data.scope === "business") q = q.eq("is_business", true);
    if (data.scope === "private") q = q.eq("is_business", false);
    const { data: rows, error } = await q;
    if (error) throw error;

    const docs: ExportDoc[] = (rows ?? []).map((r: any) => {
      const total = Number(r.amount ?? 0);
      const vat = r.vat_amount == null ? null : Number(r.vat_amount);
      const split = shareSplit(total, vat, r.private_share_pct);
      const hasSplit = r.private_share_pct != null;
      return {
        id: r.id,
        docNumber: r.doc_number ?? null,
        filename: exportFilename(r.doc_number ?? null, r.issued_date ?? null, r.company ?? ""),
        date: r.issued_date ?? null,
        dueDate: r.due_date ?? null,
        company: r.company ?? "",
        cvr: r.supplier_cvr ?? null,
        amountExVat: vat == null ? total : Math.round((total - vat) * 100) / 100,
        vatAmount: vat,
        vatRate: r.vat_rate == null ? null : Number(r.vat_rate),
        amountInclVat: total,
        currency: r.currency ?? "DKK",
        category: r.category ?? null,
        documentType: r.document_type === "invoice" ? "invoice" : "receipt",
        status: r.status ?? "paid",
        isBusiness: r.is_business === true,
        privateSharePct: hasSplit ? split.pct : null,
        businessAmount: split.businessAmount,
        businessVat: split.businessVat,
      };
    });

    return { docs, csv: buildCsv(docs) };
  });

/** Fetch a small batch of document PDFs as base64 so the client can stream them into a ZIP. */
export const getExportPdfBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { ids: string[]; lang?: "da" | "en" }) => {
    const ids = Array.isArray(data?.ids) ? data.ids.filter(Boolean).slice(0, 5) : [];
    if (!ids.length) throw new Error("Ingen dokumenter");
    return { ids, lang: data.lang === "en" ? ("en" as const) : ("da" as const) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { regeneratePdfFor } = await import("./pdf-regen.server");

    const toBase64 = (bytes: Uint8Array) => {
      let s = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        s += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      return btoa(s);
    };

    const out: { id: string; base64: string | null }[] = [];
    for (const id of data.ids) {
      try {
        const { data: row } = await supabase
          .from("receipts")
          .select("pdf_path")
          .eq("id", id)
          .eq("user_id", userId)
          .maybeSingle();
        let path: string | null = row?.pdf_path ?? null;
        if (!path) path = await regeneratePdfFor(supabase, userId, id, data.lang);
        const dl = await supabase.storage.from("receipts").download(path!);
        if (dl.error || !dl.data) {
          out.push({ id, base64: null });
          continue;
        }
        const bytes = new Uint8Array(await dl.data.arrayBuffer());
        out.push({ id, base64: toBase64(bytes) });
      } catch (e) {
        console.error("[export] pdf failed", id, e);
        out.push({ id, base64: null });
      }
    }
    return out;
  });
