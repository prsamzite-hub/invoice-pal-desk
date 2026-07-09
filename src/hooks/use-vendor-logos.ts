import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { listMyVendorLogos, logoSlug, type VendorLogoEntry } from "@/lib/vendor-logos.functions";

export function useVendorLogos() {
  const fn = useServerFn(listMyVendorLogos);
  return useQuery<VendorLogoEntry[]>({
    queryKey: ["vendor-logos"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
}

/**
 * Map from company name (any casing) → signed logo URL, or null if none cached.
 */
export function useVendorLogoByName() {
  const q = useVendorLogos();
  const map = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of q.data ?? []) m.set(e.slug, e.url);
    return m;
  }, [q.data]);
  const lookup = (name: string | null | undefined): string | null => {
    if (!name) return null;
    return map.get(logoSlug(name)) ?? null;
  };
  return { lookup, isLoading: q.isLoading };
}
