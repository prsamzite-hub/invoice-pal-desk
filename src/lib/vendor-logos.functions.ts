import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Vendor logos, keyed by the normalized company name (per user).
 * We store one PNG per company in the `vendor-logos` bucket at
 * `${userId}/${logoSlug(company)}.png`. There is NO vendors table anymore —
 * the receipt's `company` text is the source of truth.
 */

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

export function normalizeCompany(raw: string): string {
  return (raw ?? "").trim().toLowerCase();
}

/** Filename-safe slug (ascii, alnum) used for storage paths. */
export function logoSlug(raw: string): string {
  const lowered = (raw ?? "").toLowerCase().trim();
  const ascii = lowered
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa")
    .replace(/[^a-z0-9]/g, "");
  return ascii.slice(0, 48) || "unknown";
}

function keyForMap(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9æøå]/g, "");
}

export function guessDomainForName(name: string): string | null {
  const k = keyForMap(name);
  if (!k) return null;
  if (DOMAIN_MAP[k]) return DOMAIN_MAP[k];
  const ascii = k.replace(/[æå]/g, "a").replace(/ø/g, "o").replace(/[^a-z0-9]/g, "");
  if (ascii.length >= 3 && ascii.length <= 24) return `${ascii}.dk`;
  return null;
}

async function tryFetchFavicon(domain: string): Promise<Uint8Array | null> {
  const url = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 400) return null; // Google's tiny "unknown" placeholder
    return buf;
  } catch {
    return null;
  }
}

function logoPath(userId: string, name: string): string {
  return `${userId}/${logoSlug(name)}.png`;
}

async function objectExists(supabase: any, path: string): Promise<boolean> {
  const idx = path.lastIndexOf("/");
  const dir = path.slice(0, idx);
  const file = path.slice(idx + 1);
  const { data } = await supabase.storage
    .from("vendor-logos")
    .list(dir, { search: file, limit: 1 });
  return !!(data && data.length > 0 && data.some((f: any) => f.name === file));
}

/**
 * Ensure a logo file exists for this company. Best-effort — never throws.
 * Only fetches when nothing is cached yet. Safe to call on every save.
 */
export async function ensureLogoForCompany(
  supabase: any,
  userId: string,
  name: string,
): Promise<void> {
  const clean = (name ?? "").trim();
  if (!clean) return;
  const path = logoPath(userId, clean);
  try {
    if (await objectExists(supabase, path)) return;
  } catch {
    // ignore listing failure and try to upload anyway
  }
  const domain = guessDomainForName(clean);
  if (!domain) return;
  const bytes = await tryFetchFavicon(domain);
  if (!bytes) return;
  try {
    await supabase.storage
      .from("vendor-logos")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
  } catch (e) {
    console.warn("[vendor-logos] upload failed", e);
  }
}

/** Load cached logo bytes for the PDF renderer. */
export async function loadLogoBytesByName(
  supabase: any,
  userId: string,
  name: string,
): Promise<Uint8Array | null> {
  const clean = (name ?? "").trim();
  if (!clean) return null;
  const path = logoPath(userId, clean);
  const dl = await supabase.storage.from("vendor-logos").download(path);
  if (dl.error || !dl.data) return null;
  return new Uint8Array(await dl.data.arrayBuffer());
}

export interface VendorLogoEntry {
  slug: string;
  url: string;
}

/** Return signed URLs for every cached logo the user has. Keyed by slug. */
export const listMyVendorLogos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VendorLogoEntry[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.storage
      .from("vendor-logos")
      .list(userId, { limit: 1000 });
    if (error) return [];
    const files = (data ?? []).filter((f: any) => f.name?.endsWith(".png"));
    const out: VendorLogoEntry[] = [];
    for (const f of files) {
      const path = `${userId}/${f.name}`;
      const s = await supabase.storage
        .from("vendor-logos")
        .createSignedUrl(path, 60 * 60 * 24);
      if (s.data?.signedUrl) {
        out.push({ slug: f.name.replace(/\.png$/, ""), url: s.data.signedUrl });
      }
    }
    return out;
  });

/** Refetch the logo for a company (manual "try again"). */
export const refetchLogoForCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string }) => {
    if (!data?.name?.trim()) throw new Error("Mangler navn");
    return { name: data.name.trim() };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Force re-fetch: remove existing then ensure
    const path = logoPath(userId, data.name);
    try {
      await supabase.storage.from("vendor-logos").remove([path]);
    } catch {
      // ignore
    }
    await ensureLogoForCompany(supabase, userId, data.name);
    return { ok: true };
  });

/** Upload a manual replacement logo for a company. */
export const uploadLogoForCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Expected FormData");
    const file = data.get("file");
    const name = data.get("name");
    if (!(file instanceof File)) throw new Error("Mangler fil");
    if (typeof name !== "string" || !name.trim()) throw new Error("Mangler firmanavn");
    return { file, name: name.trim() };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const bytes = new Uint8Array(await data.file.arrayBuffer());
    const path = logoPath(userId, data.name);
    const up = await supabase.storage
      .from("vendor-logos")
      .upload(path, bytes, {
        contentType: data.file.type || "image/png",
        upsert: true,
      });
    if (up.error) throw new Error(up.error.message);
    return { ok: true };
  });

/** Delete the cached logo for a company. */
export const deleteLogoForCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string }) => {
    if (!data?.name?.trim()) throw new Error("Mangler navn");
    return { name: data.name.trim() };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const path = logoPath(userId, data.name);
    await supabase.storage.from("vendor-logos").remove([path]);
    return { ok: true };
  });
