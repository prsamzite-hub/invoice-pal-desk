import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isBusinessProfileComplete } from "@/lib/business-gate";

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

/** Server-side truth for the erhvervs-mode gate. */
export const getMyBusinessGate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("business_profiles")
      .select(SELECT)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return { complete: isBusinessProfileComplete(data), hasProfile: Boolean(data) };
  });

/** Any business-only server feature must call this first. Throws when the gate isn't passed. */
export const requireBusinessAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("business_profiles")
      .select(SELECT)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!isBusinessProfileComplete(data)) throw new Error("BUSINESS_PROFILE_REQUIRED");
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
      if (!cvr) throw new Error("CVR-nr. er påkrævet");
      if (!/^\d{8}$/.test(cvr)) throw new Error("CVR skal være 8 cifre");
      const address = clean(data?.address, 200);
      if (!address) throw new Error("Adresse er påkrævet");
      const postal_code = clean(data?.postal_code, 10);
      if (!postal_code) throw new Error("Postnr. er påkrævet");
      const city = clean(data?.city, 80);
      if (!city) throw new Error("By er påkrævet");
      const email = clean(data?.email, 160);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Ugyldig email");
      return {
        company_name,
        cvr,
        address,
        postal_code,
        city,
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

    let res: Response;
    try {
      res = await fetch(
        `https://cvrapi.dk/api?search=${data.cvr}&country=dk`,
        { headers: { "User-Agent": "Kvitregn/1.0 (kvitregn.dk; kontakt@kvitregn.dk)", Accept: "application/json" } },
      );
    } catch (e) {
      console.error("[cvr] network error", e);
      throw new Error("LOOKUP_FAILED");
    }
    if (res.status === 404) {
      cvrCache.set(data.cvr, { at: Date.now(), value: null });
      return null;
    }
    const raw = await res.text();
    if (!res.ok) {
      console.error("[cvr] http", res.status, raw.slice(0, 300));
      throw new Error("LOOKUP_FAILED");
    }
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      console.error("[cvr] unparseable body", raw.slice(0, 300));
      throw new Error("LOOKUP_FAILED");
    }
    if (json["error"]) {
      console.error("[cvr] api error", json["error"]);
      if (String(json["error"]).toUpperCase().includes("NOT_FOUND")) {
        cvrCache.set(data.cvr, { at: Date.now(), value: null });
        return null;
      }
      throw new Error("LOOKUP_FAILED");
    }
    const name = String(json["name"] ?? "").trim();
    if (!name) {
      cvrCache.set(data.cvr, { at: Date.now(), value: null });
      return null;
    }
    const value: CvrResult = {
      company_name: name,
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

