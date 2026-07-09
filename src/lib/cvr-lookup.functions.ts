import { createServerFn } from "@tanstack/react-start";

export type CvrLookupResult =
  | {
      ok: true;
      cvr: string;
      company_name: string;
      address: string | null;
      postal_code: string | null;
      city: string | null;
    }
  | { ok: false; reason: "invalid" | "not_found" | "rate_limited" | "unavailable" };

// Simple in-memory cache per Worker instance. 24h TTL.
type CacheEntry = { at: number; value: CvrLookupResult };
const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 500;

function cacheGet(key: string): CvrLookupResult | null {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    CACHE.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key: string, value: CvrLookupResult) {
  if (CACHE.size >= MAX_ENTRIES) {
    // drop oldest ~50 entries
    const keys = Array.from(CACHE.keys()).slice(0, 50);
    for (const k of keys) CACHE.delete(k);
  }
  CACHE.set(key, { at: Date.now(), value });
}

// Basic per-instance rate limit: max 10 upstream calls / 10s.
const CALL_TIMES: number[] = [];
function allowUpstreamCall(): boolean {
  const now = Date.now();
  while (CALL_TIMES.length && now - CALL_TIMES[0] > 10_000) CALL_TIMES.shift();
  if (CALL_TIMES.length >= 10) return false;
  CALL_TIMES.push(now);
  return true;
}

function s(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export const lookupCvr = createServerFn({ method: "POST" })
  .inputValidator((data: { cvr: string }) => {
    const cvr = (data?.cvr ?? "").replace(/\D/g, "");
    if (!/^[0-9]{8}$/.test(cvr)) throw new Error("CVR skal være 8 cifre");
    return { cvr };
  })
  .handler(async ({ data }): Promise<CvrLookupResult> => {
    const { cvr } = data;
    const cached = cacheGet(cvr);
    if (cached) return cached;

    if (!allowUpstreamCall()) {
      return { ok: false, reason: "rate_limited" };
    }

    const url = `https://cvrapi.dk/api?search=${encodeURIComponent(cvr)}&country=dk`;
    // Respect cvrapi.dk terms: identify the app and provide contact info.
    const userAgent = "Kvitregn/1.0 (+https://kvitregn.dk; kontakt@kvitregn.dk)";

    let result: CvrLookupResult;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, {
        method: "GET",
        headers: { "User-Agent": userAgent, Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.status === 404) {
        result = { ok: false, reason: "not_found" };
      } else if (res.status === 429) {
        result = { ok: false, reason: "rate_limited" };
      } else if (!res.ok) {
        result = { ok: false, reason: "unavailable" };
      } else {
        const json = (await res.json()) as Record<string, unknown>;
        if (json && (json as { error?: unknown }).error) {
          const err = String((json as { error: unknown }).error);
          if (err.toUpperCase().includes("NOT_FOUND")) {
            result = { ok: false, reason: "not_found" };
          } else if (err.toUpperCase().includes("QUOTA") || err.toUpperCase().includes("LIMIT")) {
            result = { ok: false, reason: "rate_limited" };
          } else {
            result = { ok: false, reason: "unavailable" };
          }
        } else {
          const name = s(json.name);
          if (!name) {
            result = { ok: false, reason: "not_found" };
          } else {
            result = {
              ok: true,
              cvr,
              company_name: name,
              address: s(json.address),
              postal_code: s(json.zipcode) ?? s((json as { zip?: unknown }).zip),
              city: s(json.city),
            };
          }
        }
      }
    } catch {
      result = { ok: false, reason: "unavailable" };
    }

    cacheSet(cvr, result);
    return result;
  });
