import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Store } from "lucide-react";

import { PageHeader } from "@/components/atoms/page-header";
import { EmptyState } from "@/components/atoms/empty-state";
import { VendorAvatar } from "@/components/atoms/vendor-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MoneyAmount } from "@/components/atoms/money-amount";
import { listMyReceipts } from "@/lib/receipts.functions";
import { useVendorLogoByName } from "@/hooks/use-vendor-logos";

export const Route = createFileRoute("/_authenticated/app/vendors")({
  head: () => ({
    meta: [
      { title: "Firmaer — Kvitregn" },
      { name: "description", content: "Oversigt over alle firmaer på tværs af dine dokumenter." },
    ],
  }),
  component: VendorsPage,
});

interface Group {
  name: string;
  count: number;
  total: number;
  currency: string;
}

function VendorsPage() {
  const listFn = useServerFn(listMyReceipts);
  const receipts = useQuery({ queryKey: ["receipts"], queryFn: () => listFn() });
  const { lookup: logoFor } = useVendorLogoByName();

  const groups: Group[] = useMemo(() => {
    const rows = receipts.data ?? [];
    const map = new Map<string, Group>();
    for (const r of rows) {
      const name = (r.company ?? "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const g = map.get(key);
      const amt = Number(r.amount) || 0;
      if (g) {
        g.count += 1;
        g.total += amt;
      } else {
        map.set(key, { name, count: 1, total: amt, currency: r.currency ?? "DKK" });
      }
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [receipts.data]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Firmaer"
        description="Alle dine dokumenter grupperet efter firma. Klik for at se dokumenterne."
      />

      {receipts.isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Ingen firmaer endnu"
          description="Så snart du gemmer dit første dokument, dukker firmaet op her."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map((g) => (
            <li key={g.name}>
              <Link
                to="/app/documents"
                search={{ q: g.name } as never}
                className="shadow-soft flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40"
              >
                <VendorAvatar name={g.name} logoUrl={logoFor(g.name)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{g.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {g.count} {g.count === 1 ? "dokument" : "dokumenter"}
                  </p>
                </div>
                <MoneyAmount value={g.total} currency={g.currency} size="md" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
