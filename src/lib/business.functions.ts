import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SELECT = "id, user_id, company_name, cvr, address, postal_code, city, phone, email";

export const getMyBusinessProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("business_profiles")
      .select(SELECT)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

function clean(v: unknown, max = 200): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

export const upsertMyBusinessProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      company_name: string;
      cvr?: string | null;
      address?: string | null;
      postal_code?: string | null;
      city?: string | null;
      phone?: string | null;
      email?: string | null;
    }) => {
      const company_name = clean(data?.company_name, 120);
      if (!company_name) throw new Error("Virksomhedsnavn er påkrævet");
      const cvr = clean(data?.cvr, 8);
      if (cvr && !/^\d{8}$/.test(cvr)) throw new Error("CVR skal være 8 cifre");
      const email = clean(data?.email, 160);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Ugyldig email");
      return {
        company_name,
        cvr,
        address: clean(data?.address, 200),
        postal_code: clean(data?.postal_code, 10),
        city: clean(data?.city, 80),
        phone: clean(data?.phone, 40),
        email,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("business_profiles")
      .upsert({ ...data, user_id: userId }, { onConflict: "user_id" })
      .select(SELECT)
      .single();
    if (error) throw error;
    return row;
  });

export const deleteMyBusinessProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("business_profiles").delete().eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });

export interface CvrResult {
  company_name: string;
  cvr: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
}

// Simple in-process cache + per-user rate limiting (best effort on stateless workers).
const cvrCache = new Map<string, { at: number; value: CvrResult | null }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;
const hits = new Map<string, number[]>();
const RATE_WINDOW = 60_000;
const RATE_MAX = 10;

export const lookupCvr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { cvr: string }) => {
    const cvr = (data?.cvr ?? "").replace(/\D/g, "");
    if (!/^\d{8}$/.test(cvr)) throw new Error("CVR skal være 8 cifre");
    return { cvr };
  })
  .handler(async ({ data, context }): Promise<CvrResult | null> => {
    const cached = cvrCache.get(data.cvr);
    if (cached && Date.now() - cached.at < CACHE_TTL) return cached.value;

    const now = Date.now();
    const recent = (hits.get(context.userId) ?? []).filter((t) => now - t < RATE_WINDOW);
    if (recent.length >= RATE_MAX) throw new Error("For mange opslag. Prøv igen om lidt.");
    recent.push(now);
    hits.set(context.userId, recent);

    const res = await fetch(
      `https://cvrapi.dk/api?search=${data.cvr}&country=dk`,
      { headers: { "User-Agent": "Kvitregn/1.0 (kvitregn.dk; kontakt@kvitregn.dk)" } },
    );
    if (res.status === 404) {
      cvrCache.set(data.cvr, { at: Date.now(), value: null });
      return null;
    }
    if (!res.ok) throw new Error("CVR-opslag mislykkedes");
    const json = (await res.json()) as Record<string, unknown>;
    const value: CvrResult = {
      company_name: String(json["name"] ?? ""),
      cvr: data.cvr,
      address: (json["address"] as string) ?? null,
      postal_code: json["zipcode"] ? String(json["zipcode"]) : null,
      city: (json["city"] as string) ?? null,
      phone: json["phone"] ? String(json["phone"]) : null,
      email: (json["email"] as string) ?? null,
    };
    cvrCache.set(data.cvr, { at: Date.now(), value });
    return value;
  });
