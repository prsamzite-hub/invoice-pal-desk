import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  AlertCircle,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  Upload,
  FileText,
} from "lucide-react";

import { PageHeader } from "@/components/atoms/page-header";
import { StatCard } from "@/components/atoms/stat-card";
import { MoneyAmount } from "@/components/atoms/money-amount";
import { DocumentCard, type DocumentCardData } from "@/components/atoms/document-card";
import { EmptyState } from "@/components/atoms/empty-state";
import { DocumentDetailSheet } from "@/components/document-detail-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { deriveReceiptStatus } from "@/components/atoms/status-badge";
import { listMyReceipts, getReceiptPdfUrl } from "@/lib/receipts.functions";
import { useLang } from "@/lib/i18n";
import { useVendorLogoByIdMap } from "@/hooks/use-vendors";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Oversigt — Kvitregn" },
      { name: "description", content: "Dit månedlige forbrug i overblik med Kvitregn." },
    ],
  }),
  component: DashboardPage,
});

const CATEGORY_TONE: Record<string, "mint" | "peach" | "lavender" | "butter" | "sky"> = {
  Groceries: "mint",
  Utilities: "sky",
  Subscriptions: "lavender",
  Dining: "peach",
  Shopping: "butter",
  Transport: "sky",
  Health: "mint",
  Other: "lavender",
};

function ymKey(iso: string) {
  return iso.slice(0, 7); // YYYY-MM
}

function DashboardPage() {
  const { t } = useLang();
  const listFn = useServerFn(listMyReceipts);
  const pdfUrlFn = useServerFn(getReceiptPdfUrl);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const receipts = useQuery({ queryKey: ["receipts"], queryFn: () => listFn() });

  const stats = useMemo(() => {
    const rows = receipts.data ?? [];
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prev.toISOString().slice(0, 7);
    const today = now.toISOString().slice(0, 10);
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let currentTotal = 0;
    let prevTotal = 0;
    let dueThisWeek = 0;
    const upcoming: typeof rows = [];
    const overdue: typeof rows = [];

    for (const r of rows) {
      const iso = r.issued_date ?? r.created_at?.slice(0, 10) ?? "";
      const ym = ymKey(iso);
      const amt = Number(r.amount) || 0;
      if (ym === currentMonth) currentTotal += amt;
      if (ym === prevMonth) prevTotal += amt;

      const status = deriveReceiptStatus({ status: r.status ?? "", due_date: r.due_date });
      if (status === "overdue") overdue.push(r);
      else if (status === "unpaid" && r.due_date) {
        upcoming.push(r);
        if (r.due_date <= in7 && r.due_date >= today) dueThisWeek += amt;
      }
    }

    upcoming.sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
    overdue.sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));

    const diff = currentTotal - prevTotal;
    const pct = prevTotal > 0 ? Math.round((diff / prevTotal) * 100) : null;

    return {
      currentTotal,
      prevTotal,
      diff,
      pct,
      dueThisWeek,
      upcoming: upcoming.slice(0, 5),
      overdue: overdue.slice(0, 5),
      count: rows.length,
    };
  }, [receipts.data]);

  const { map: vendorLogoMap } = useVendorLogoByIdMap();
  const toCard = (r: NonNullable<typeof receipts.data>[number]): DocumentCardData => ({
    id: r.id,
    company: r.company,
    amount: Number(r.amount),
    currency: r.currency,
    issuedDate: r.issued_date ?? r.created_at,
    dueDate: r.due_date,
    status: deriveReceiptStatus({ status: r.status ?? "", due_date: r.due_date }),
    type: (r.document_type as "receipt" | "invoice") ?? "receipt",
    category: r.category
      ? { label: r.category, tone: CATEGORY_TONE[r.category] ?? "lavender" }
      : undefined,
    vendorLogoUrl: r.vendor_id ? vendorLogoMap.get(r.vendor_id) ?? null : null,
  });

  const selectedRow = (receipts.data ?? []).find((r) => r.id === selectedId);
  const selected = selectedRow ? toCard(selectedRow) : null;

  const openDoc = async (id: string) => {
    setSelectedId(id);
    setPdfUrl(null);
    try {
      const { url } = await pdfUrlFn({ data: { id } });
      setPdfUrl(url);
    } catch {
      setPdfUrl(null);
    }
  };

  const monthLabel = new Intl.DateTimeFormat("da-DK", { month: "long", year: "numeric" }).format(new Date());
  const prevMonthLabel = new Intl.DateTimeFormat("da-DK", { month: "long" }).format(
    new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
  );

  const trendHint = (() => {
    if (receipts.isLoading) return "Indlæser…";
    if (stats.pct === null) {
      return stats.prevTotal === 0 && stats.currentTotal === 0
        ? "Ingen data endnu"
        : `Ingen data for ${prevMonthLabel}`;
    }
    const arrow = stats.diff >= 0 ? "▲" : "▼";
    return `${arrow} ${Math.abs(stats.pct)}% vs. ${prevMonthLabel}`;
  })();

  const isLoading = receipts.isLoading;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Oversigt"
        description={`${t("dashboard.greeting")} · ${monthLabel}`}
        actions={
          <Button asChild className="rounded-full">
            <Link to="/app/upload">
              <Upload className="mr-2 h-4 w-4" />
              {t("dashboard.add")}
            </Link>
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label={`Brugt i ${monthLabel}`}
              value={<MoneyAmount value={stats.currentTotal} size="lg" />}
              hint={trendHint}
              icon={stats.diff >= 0 ? TrendingUp : TrendingDown}
              tone="lavender"
            />
            <StatCard
              label={`Sidste måned (${prevMonthLabel})`}
              value={<MoneyAmount value={stats.prevTotal} size="lg" />}
              hint={
                stats.prevTotal === 0
                  ? "Ingen registrerede beløb"
                  : `Forskel ${stats.diff >= 0 ? "+" : "−"}${new Intl.NumberFormat("da-DK", {
                      style: "currency",
                      currency: "DKK",
                      maximumFractionDigits: 0,
                    }).format(Math.abs(stats.diff))}`
              }
              icon={Wallet}
              tone="sky"
            />
            <StatCard
              label="Forfalder i denne uge"
              value={<MoneyAmount value={stats.dueThisWeek} size="lg" />}
              hint={`${stats.upcoming.filter((u) => u.due_date && u.due_date <= new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)).length} kommende`}
              icon={CalendarClock}
              tone="butter"
            />
            <StatCard
              label="Forfaldne fakturaer"
              value={<span className="tabular-nums">{stats.overdue.length}</span>}
              hint={
                stats.overdue.length > 0
                  ? `Kræver handling nu`
                  : "Alt er under kontrol"
              }
              icon={AlertCircle}
              tone={stats.overdue.length > 0 ? "peach" : "mint"}
            />
          </>
        )}
      </section>

      {!isLoading && stats.overdue.length > 0 ? (
        <section className="shadow-soft flex flex-col gap-3 rounded-2xl border border-status-overdue/40 bg-status-overdue/10 p-5">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-status-overdue-foreground" />
            <h2 className="text-base font-bold text-status-overdue-foreground">
              Forfaldne fakturaer
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {stats.overdue.map((r) => (
              <DocumentCard key={r.id} doc={toCard(r)} onClick={() => openDoc(r.id)} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Kommende fakturaer</h2>
            <Button variant="ghost" asChild className="rounded-full">
              <Link to="/app/documents">{t("dashboard.viewAll")}</Link>
            </Button>
          </div>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : stats.upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Ingen kommende fakturaer"
              description="Når du tilføjer en faktura med forfaldsdato, dukker den op her."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {stats.upcoming.map((r) => (
                <DocumentCard key={r.id} doc={toCard(r)} onClick={() => openDoc(r.id)} />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">{t("dashboard.recent")}</h2>
            <Button variant="ghost" asChild className="rounded-full">
              <Link to="/app/documents">{t("dashboard.viewAll")}</Link>
            </Button>
          </div>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : (receipts.data ?? []).length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Ingen dokumenter endnu"
              description="Upload din første kvittering for at komme i gang."
              action={
                <Button asChild className="rounded-full">
                  <Link to="/app/upload">
                    <Upload className="mr-2 h-4 w-4" />
                    {t("dashboard.add")}
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {(receipts.data ?? []).slice(0, 5).map((r) => (
                <DocumentCard key={r.id} doc={toCard(r)} onClick={() => openDoc(r.id)} />
              ))}
            </div>
          )}
        </div>
      </section>

      <DocumentDetailSheet
        doc={selected}
        open={selectedId !== null}
        onOpenChange={(o) => {
          if (!o) {
            setSelectedId(null);
            setPdfUrl(null);
          }
        }}
        fileUrl={pdfUrl}
      />
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="shadow-soft flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="shadow-soft flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-14" />
      </div>
    </div>
  );
}
