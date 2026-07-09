import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { listVendors, type VendorRow } from "@/lib/vendors.functions";

export function useVendors() {
  const fn = useServerFn(listVendors);
  return useQuery<VendorRow[]>({
    queryKey: ["vendors"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
}

export function useVendorLogoByIdMap() {
  const q = useVendors();
  const map = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const v of q.data ?? []) m.set(v.id, v.logo_url);
    return m;
  }, [q.data]);
  return { map, isLoading: q.isLoading };
}
