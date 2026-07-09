import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface VendorRow {
  id: string;
  name: string;
  normalized_name: string;
  domain: string | null;
  logo_path: string | null;
  logo_url: string | null; // signed URL, short-lived
}

// Hand-picked mapping for common Danish chains (and a few internationals).
// Keys are normalized (lowercased, spaces stripped).
const DOMAIN_MAP: Record<string, string> = {
  lidl: "lidl.dk",
  netto: "netto.dk",
  rema1000: "rema1000.dk",
  rema: "rema1000.dk",
  føtex: "foetex.dk",
  foetex: "foetex.dk",
  fotex: "foetex.dk",
  bilka: "bilka.dk",
  kvickly: "kvickly.dk",
  superbrugsen: "superbrugsen.dk",
  daglibrugsen: "daglibrugsen.dk",
  meny: "meny.dk",
  coop365: "coop365.dk",
  coop: "coop.dk",
  aldi: "aldi.dk",
  fakta: "fakta.dk",
  irma: "irma.dk",
  jysk: "jysk.dk",
  ikea: "ikea.dk",
  elgiganten: "elgiganten.dk",
  power: "power.dk",
  matas: "matas.dk",
  normal: "normal.dk",
  silvan: "silvan.dk",
  bauhaus: "bauhaus.dk",
  hm: "hm.com",
  zalando: "zalando.dk",
  amazon: "amazon.com",
  dsb: "dsb.dk",
  circlek: "circlek.dk",
  q8: "q8.dk",
  shell: "shell.dk",
  ok: "ok.dk",
  telia: "telia.dk",
  yousee: "yousee.dk",
  tdc: "tdc.dk",
  telenor: "telenor.dk",
  "3": "3.dk",
  netflix: "netflix.com",
  spotify: "spotify.com",
  apple: "apple.com",
  google: "google.com",
  microsoft: "microsoft.com",
};

export function normalizeName(raw: string): string {
  return raw.trim().toLowerCase();
}

function keyForMap(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9æøå]/g, "");
}

export function guessDomainForName(name: string): string | null {
  const k = keyForMap(name);
  if (!k) return null;
  if (DOMAIN_MAP[k]) return DOMAIN_MAP[k];
  // Fallback guess: .dk with ascii-fied name (only if letters remain)
  const ascii = k.replace(/[æå]/g, "a").replace(/ø/g, "o").replace(/[^a-z0-9]/g, "");
  if (ascii.length >= 3 && ascii.length <= 24) return `${ascii}.dk`;
  return null;
}

async function signLogoUrl(
  supabase: any,
  logo_path: string | null,
): Promise<string | null> {
  if (!logo_path) return null;
  const { data, error } = await supabase.storage
    .from("vendor-logos")
    .createSignedUrl(logo_path, 60 * 60 * 24);
  if (error) return null;
  return data?.signedUrl ?? null;
}

async function withSignedLogos(supabase: any, rows: any[]): Promise<VendorRow[]> {
  return await Promise.all(
    (rows ?? []).map(async (r) => ({
      id: r.id,
      name: r.name,
      normalized_name: r.normalized_name,
      domain: r.domain ?? null,
      logo_path: r.logo_path ?? null,
      logo_url: await signLogoUrl(supabase, r.logo_path ?? null),
    })),
  );
}

export const listVendors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VendorRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("vendors")
      .select("id, name, normalized_name, domain, logo_path")
      .eq("user_id", userId)
      .order("name", { ascending: true });
    if (error) throw error;
    return withSignedLogos(supabase, data ?? []);
  });

async function tryFetchFavicon(domain: string): Promise<Uint8Array | null> {
  const url = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    // Google returns ~150 byte default icon when the domain is unknown.
    if (buf.byteLength < 400) return null;
    return buf;
  } catch {
    return null;
  }
}

// Resolve or create a vendor for the current user by name.
// Used server-side by save/updateReceipt.
export async function resolveVendorForCurrentUser(
  supabase: any,
  userId: string,
  rawName: string,
): Promise<string | null> {
  const name = rawName.trim();
  if (!name) return null;
  const normalized = normalizeName(name);

  const existing = await supabase
    .from("vendors")
    .select("id")
    .eq("user_id", userId)
    .eq("normalized_name", normalized)
    .maybeSingle();
  if (existing.data?.id) return existing.data.id;

  const domain = guessDomainForName(name);
  const insert = await supabase
    .from("vendors")
    .insert({
      user_id: userId,
      name,
      normalized_name: normalized,
      domain,
    })
    .select("id")
    .single();
  if (insert.error) {
    // Unique race: fetch again
    const again = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", userId)
      .eq("normalized_name", normalized)
      .maybeSingle();
    return again.data?.id ?? null;
  }
  const vendorId = insert.data.id as string;

  // Fire-and-forget logo fetch (awaited so save can return logo, but errors ignored)
  try {
    await fetchAndStoreLogo(supabase, userId, vendorId, name, domain);
  } catch (e) {
    console.warn("[vendors] logo fetch failed", e);
  }
  return vendorId;
}

async function fetchAndStoreLogo(
  supabase: any,
  userId: string,
  vendorId: string,
  _name: string,
  domain: string | null,
): Promise<void> {
  if (!domain) return;
  const bytes = await tryFetchFavicon(domain);
  if (!bytes) return;
  const path = `${userId}/${vendorId}.png`;
  const up = await supabase.storage
    .from("vendor-logos")
    .upload(path, bytes, { contentType: "image/png", upsert: true });
  if (up.error) return;
  await supabase.from("vendors").update({ logo_path: path }).eq("id", vendorId);
}

export const refetchVendorLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { vendorId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: v, error } = await supabase
      .from("vendors")
      .select("id, name, domain")
      .eq("id", data.vendorId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!v) throw new Error("Ikke fundet");
    const domain = v.domain || guessDomainForName(v.name);
    await fetchAndStoreLogo(supabase, userId, v.id, v.name, domain);
    if (domain && !v.domain) {
      await supabase.from("vendors").update({ domain }).eq("id", v.id);
    }
    return { ok: true };
  });

export const renameVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { vendorId: string; name: string }) => {
    if (!data?.vendorId) throw new Error("Mangler vendor");
    if (!data?.name || data.name.trim().length === 0) throw new Error("Navn må ikke være tomt");
    return { vendorId: data.vendorId, name: data.name.trim() };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const normalized = normalizeName(data.name);
    // Check unique
    const dup = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", userId)
      .eq("normalized_name", normalized)
      .neq("id", data.vendorId)
      .maybeSingle();
    if (dup.data) throw new Error("Du har allerede en leverandør med det navn");
    const { error } = await supabase
      .from("vendors")
      .update({ name: data.name, normalized_name: normalized })
      .eq("id", data.vendorId)
      .eq("user_id", userId);
    if (error) throw error;
    // Also mirror on receipts.company for display consistency
    await supabase
      .from("receipts")
      .update({ company: data.name })
      .eq("user_id", userId)
      .eq("vendor_id", data.vendorId);
    return { ok: true };
  });

export const mergeVendors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sourceId: string; targetId: string }) => {
    if (!data?.sourceId || !data?.targetId) throw new Error("Mangler leverandører");
    if (data.sourceId === data.targetId) throw new Error("Vælg to forskellige leverandører");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const both = await supabase
      .from("vendors")
      .select("id, name, user_id")
      .in("id", [data.sourceId, data.targetId]);
    if (both.error) throw both.error;
    const rows = both.data ?? [];
    if (rows.length !== 2 || rows.some((r) => r.user_id !== userId))
      throw new Error("Ikke fundet");
    const target = rows.find((r) => r.id === data.targetId)!;
    // Move receipts
    const upd = await supabase
      .from("receipts")
      .update({ vendor_id: data.targetId, company: target.name })
      .eq("user_id", userId)
      .eq("vendor_id", data.sourceId);
    if (upd.error) throw upd.error;
    // Delete source
    const del = await supabase
      .from("vendors")
      .delete()
      .eq("id", data.sourceId)
      .eq("user_id", userId);
    if (del.error) throw del.error;
    return { ok: true };
  });

export const uploadVendorLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Expected FormData");
    const file = data.get("file");
    const vendorId = data.get("vendorId");
    if (!(file instanceof File)) throw new Error("Mangler fil");
    if (typeof vendorId !== "string" || !vendorId) throw new Error("Mangler leverandør");
    return { file, vendorId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const v = await supabase
      .from("vendors")
      .select("id")
      .eq("id", data.vendorId)
      .eq("user_id", userId)
      .maybeSingle();
    if (v.error || !v.data) throw new Error("Ikke fundet");
    const bytes = new Uint8Array(await data.file.arrayBuffer());
    const path = `${userId}/${data.vendorId}.png`;
    const up = await supabase.storage
      .from("vendor-logos")
      .upload(path, bytes, {
        contentType: data.file.type || "image/png",
        upsert: true,
      });
    if (up.error) throw up.error;
    await supabase.from("vendors").update({ logo_path: path }).eq("id", data.vendorId);
    return { ok: true };
  });

export const deleteVendorLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { vendorId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const v = await supabase
      .from("vendors")
      .select("id, logo_path")
      .eq("id", data.vendorId)
      .eq("user_id", userId)
      .maybeSingle();
    if (v.error || !v.data) throw new Error("Ikke fundet");
    if (v.data.logo_path) {
      await supabase.storage.from("vendor-logos").remove([v.data.logo_path]);
    }
    await supabase.from("vendors").update({ logo_path: null }).eq("id", data.vendorId);
    return { ok: true };
  });
