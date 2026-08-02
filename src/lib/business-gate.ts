/** Shared rules for when a business profile is "complete" enough to use erhvervs-mode. */
export type BusinessProfileish = {
  company_name?: string | null;
  cvr?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
} | null | undefined;

const ok = (v: unknown) => typeof v === "string" && v.trim().length > 0;

export function isBusinessProfileComplete(p: BusinessProfileish): boolean {
  if (!p) return false;
  return (
    ok(p.company_name) &&
    typeof p.cvr === "string" &&
    /^\d{8}$/.test(p.cvr.replace(/\D/g, "")) &&
    ok(p.address) &&
    ok(p.postal_code) &&
    ok(p.city)
  );
}
