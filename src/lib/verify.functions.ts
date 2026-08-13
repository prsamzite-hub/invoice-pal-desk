import { createServerFn } from "@tanstack/react-start";

export interface VerifiedDocument {
  company: string;
  amount: number;
  currency: string;
  issued_date: string | null;
  document_type: string;
  registered_at: string;
}

/**
 * Public, unauthenticated lookup of a document by its verification token.
 * Returns only non-identifying summary fields — never the owner, files, or
 * any other document.
 */
export const verifyDocument = createServerFn({ method: "GET" })
  .inputValidator((data: { token: string }) => ({ token: String(data?.token ?? "").slice(0, 128) }))
  .handler(async ({ data }): Promise<VerifiedDocument | null> => {
    if (!/^[a-f0-9]{16,64}$/i.test(data.token)) return null;
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const url = process.env.SUPABASE_URL!;
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: any, init: any) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: rows, error } = await client.rpc("verify_document", { _token: data.token });
    if (error) {
      console.error("[verifyDocument]", error);
      return null;
    }
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return null;
    return {
      company: row.company ?? "",
      amount: Number(row.amount ?? 0),
      currency: row.currency ?? "DKK",
      issued_date: row.issued_date ?? null,
      document_type: row.document_type ?? "receipt",
      registered_at: row.registered_at ?? "",
    };
  });
