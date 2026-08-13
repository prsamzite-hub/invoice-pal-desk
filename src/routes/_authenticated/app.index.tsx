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
import { businessShareOf } from "@/lib/vat";
import { useLang } from "@/lib/i18n";
import { useVendorLogoByName } from "@/hooks/use-vendor-logos";
import { useAppMode } from "@/lib/app-mode";
import { getMyBusinessProfile } from "@/lib/business.functions";
import { MonthCloseCard } from "@/components/month-close-card";

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
  Representation: "peach",
  TravelTransport: "sky",
  Fuel: "butter",
  OfficeSupplies: "lavender",
  SoftwareSubscriptions: "lavender",
  PhoneInternet: "sky",
  ToolsMaterials: "butter",
  Marketing: "peach",
  Insurance: "mint",
  Accounting: "sky",
  OperatingCosts: "lavender",
};

function ymKey(iso: string) {
  return iso.slice(0, 7); // YYYY-MM
}

function DashboardPage() {
  const { t, formatDate, formatMoney } = useLang();
  const listFn = useServerFn(listMyReceipts);
  const pdfUrlFn = useServerFn(getReceiptPdfUrl);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const receipts = useQuery({ queryKey: ["receipts"], queryFn: () => listFn() });

  const { mode } = useAppMode();
  const isBiz = mode === "erhverv";
  const bizFn = useServerFn(getMyBusinessProfile);
  const bizProfile = useQuery({
    queryKey: ["business-profile"],
    queryFn: () => bizFn(),
    enabled: isBiz,
    staleTime: 60_000,
  });

  const stats = useMemo(() => {
    const all = receipts.data ?? [];
    const rows = isBiz ? all.filter((r) => r.is_business === true) : all;
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prev.toISOString().slice(0, 7);
    const today = now.toISOString().slice(0, 10);
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let currentTotal = 0;
    let currentVat = 0;
    let prevTotal = 0;
    let dueThisWeek = 0;
    const upcoming: typeof rows = [];
    const overdue: typeof rows = [];

    for (const r of rows) {
      const iso = r.issued_date ?? r.created_at?.slice(0, 10) ?? "";
      const ym = ymKey(iso);
      const amt =
        r.is_business === true
          ? businessShareOf(r.amount, (r as { private_share_pct?: number | null }).private_share_pct)
          : Number(r.amount) || 0;
      if (ym === currentMonth) {
        currentTotal += amt;
        currentVat +=
          r.is_business === true
            ? businessShareOf(r.vat_amount, (r as { private_share_pct?: number | null }).private_share_pct)
            : Number(r.vat_amount) || 0;
      }
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
      currentVat,
      currentExVat: currentTotal - currentVat,
      prevTotal,

      diff,
      pct,
      dueThisWeek,
      upcoming: upcoming.slice(0, 5),
      overdue: overdue.slice(0, 5),
      count: rows.length,
      monthCount: rows.filter(
        (r) => ymKey(r.issued_date ?? r.created_at?.slice(0, 10) ?? "") === currentMonth,
      ).length,
      rows,
    };
  }, [receipts.data, isBiz]);

  const { lookup: logoFor } = useVendorLogoByName();
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
    vendorLogoUrl: logoFor(r.company),
    isBusiness: r.is_business === true,
    docNumber: r.doc_number ?? null,
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

  const monthLabel = formatDate(new Date(), { month: "long", year: "numeric" });
  const prevMonthLabel = formatDate(
    new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
    { month: "long" },
  );

  const trendHint = (() => {
    if (receipts.isLoading) return t("app.loading");
    if (stats.pct === null) {
      return stats.prevTotal === 0 && stats.currentTotal === 0
        ? t("dashboard.stat.noData")
        : `${t("dashboard.stat.noDataFor")} ${prevMonthLabel}`;
    }
    const arrow = stats.diff >= 0 ? "▲" : "▼";
    return `${arrow} ${Math.abs(stats.pct)}% vs. ${prevMonthLabel}`;
  })();

  const isLoading = receipts.isLoading;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={isBiz ? (bizProfile.data?.company_name ?? t("dashboard.title")) : t("dashboard.title")}
        description={
          isBiz
            ? `${t("biz.business")} · ${monthLabel}`
            : `${t("dashboard.greeting")} · ${monthLabel}`
        }
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
              label={isBiz ? t("dashboard.biz.total") : `${t("dashboard.stat.spentIn")} ${monthLabel}`}
              value={<MoneyAmount value={stats.currentTotal} size="lg" />}
              hint={
                isBiz
                  ? `${t("vat.exVatShort")} ${formatMoney(stats.currentExVat, "DKK", { maximumFractionDigits: 0 })} · ${trendHint}`
                  : trendHint
              }
              icon={stats.diff >= 0 ? TrendingUp : TrendingDown}
              tone="lavender"
            />

            <StatCard
              label={`${t("dashboard.stat.lastMonth")} (${prevMonthLabel})`}
              value={<MoneyAmount value={stats.prevTotal} size="lg" />}
              hint={
                stats.prevTotal === 0
                  ? t("dashboard.stat.noAmounts")
                  : `${t("dashboard.stat.diff")} ${stats.diff >= 0 ? "+" : "−"}${formatMoney(Math.abs(stats.diff), "DKK", { maximumFractionDigits: 0 })}`
              }
              icon={Wallet}
              tone="sky"
            />
            {isBiz ? (
              <StatCard
                label={t("dashboard.biz.count")}
                value={<span className="tabular-nums">{stats.monthCount}</span>}
                hint={`${stats.count} ${t("dashboard.biz.docs")}`}
                icon={FileText}
                tone="butter"
              />
            ) : (
            <StatCard
              label={t("dashboard.stat.dueThisWeek")}
              value={<MoneyAmount value={stats.dueThisWeek} size="lg" />}
              hint={`${stats.upcoming.filter((u) => u.due_date && u.due_date <= new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)).length} ${t("dashboard.stat.upcoming")}`}
              icon={CalendarClock}
              tone="butter"
            />
            )}
            <StatCard
              label={t("dashboard.stat.overdueInvoices")}
              value={<span className="tabular-nums">{stats.overdue.length}</span>}
              hint={
                stats.overdue.length > 0
                  ? t("dashboard.stat.needsAction")
                  : t("dashboard.stat.underControl")
              }
              icon={AlertCircle}
              tone={stats.overdue.length > 0 ? "peach" : "mint"}
            />
          </>
        )}
      </section>

      {isBiz && !isLoading ? (
        <MonthCloseCard rows={stats.rows} onOpenDoc={openDoc} />
      ) : null}

      {!isLoading && stats.overdue.length > 0 ? (
        <section className="shadow-soft flex flex-col gap-3 rounded-2xl border border-status-overdue/40 bg-status-overdue/10 p-5">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-status-overdue-foreground" />
            <h2 className="text-base font-bold text-status-overdue-foreground">
              {isBiz ? t("dashboard.biz.overdue") : t("dashboard.overdue")}
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
            <h2 className="text-lg font-bold text-foreground">
              {isBiz ? t("dashboard.biz.upcoming") : t("dashboard.upcoming")}
            </h2>
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
              title={isBiz ? t("dashboard.biz.none") : t("dashboard.empty.upcoming.title")}
              description={isBiz ? t("dashboard.biz.noneDesc") : t("dashboard.empty.upcoming.desc")}
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
          ) : stats.rows.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t("dashboard.empty.docs.title")}
              description={t("dashboard.empty.docs.desc")}
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
              {stats.rows.slice(0, 5).map((r) => (
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
