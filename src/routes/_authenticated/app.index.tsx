import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  AlertCircle,
  CalendarClock,
  TrendingUp,
  Upload,
  ShoppingBag,
  Zap,
  Coffee,
} from "lucide-react";

import { PageHeader } from "@/components/atoms/page-header";
import { StatCard } from "@/components/atoms/stat-card";
import { MoneyAmount } from "@/components/atoms/money-amount";
import { DocumentCard, type DocumentCardData } from "@/components/atoms/document-card";
import { BudgetProgressBar } from "@/components/atoms/budget-progress-bar";
import { DocumentDetailSheet } from "@/components/document-detail-sheet";
import { Button } from "@/components/ui/button";
import { listMyReceipts, getReceiptPdfUrl } from "@/lib/receipts.functions";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Oversigt — Kvitregn" },
      { name: "description", content: "Dit månedlige forbrug i overblik med Kvitregn." },
    ],
  }),
  component: DashboardPage,
});

const SAMPLE_DOCS: DocumentCardData[] = [
  {
    id: "1",
    company: "Netto",
    amount: 247.5,
    issuedDate: "2026-06-26",
    status: "paid",
    type: "receipt",
    category: { label: "Groceries", tone: "mint" },
  },
  {
    id: "2",
    company: "Ørsted",
    amount: 892.0,
    issuedDate: "2026-06-22",
    dueDate: "2026-07-05",
    status: "unpaid",
    type: "invoice",
    category: { label: "Utilities", tone: "sky" },
  },
  {
    id: "3",
    company: "Telenor",
    amount: 199.0,
    issuedDate: "2026-06-18",
    dueDate: "2026-06-25",
    status: "overdue",
    type: "invoice",
    category: { label: "Subscriptions", tone: "lavender" },
  },
  {
    id: "4",
    company: "Joe & The Juice",
    amount: 68.0,
    issuedDate: "2026-06-15",
    status: "paid",
    type: "receipt",
    category: { label: "Dining", tone: "peach" },
  },
];

function DashboardPage() {
  const { t } = useLang();
  const listFn = useServerFn(listMyReceipts);
  const pdfUrlFn = useServerFn(getReceiptPdfUrl);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const receipts = useQuery({ queryKey: ["receipts"], queryFn: () => listFn() });

  const liveDocs: DocumentCardData[] = useMemo(() => {
    return (receipts.data ?? []).slice(0, 6).map((r) => ({
      id: r.id,
      company: r.company,
      amount: Number(r.amount),
      currency: r.currency,
      issuedDate: r.issued_date ?? r.created_at,
      dueDate: r.due_date,
      status: (r.status as "paid" | "unpaid" | "overdue") ?? "paid",
      type: (r.document_type as "receipt" | "invoice") ?? "receipt",
      category: r.category ? { label: r.category, tone: "lavender" } : undefined,
    }));
  }, [receipts.data]);

  const docs = liveDocs.length > 0 ? liveDocs : SAMPLE_DOCS;
  const isLive = liveDocs.length > 0;
  const selected = docs.find((d) => d.id === selectedId) ?? null;

  const openDoc = async (id: string) => {
    setSelectedId(id);
    setPdfUrl(null);
    if (!isLive) return;
    try {
      const { url } = await pdfUrlFn({ data: { id } });
      setPdfUrl(url);
    } catch {
      setPdfUrl(null);
    }
  };

  const totalMonth = docs.reduce((s, d) => s + d.amount, 0);
  const unpaidTotal = docs.filter((d) => d.status !== "paid").reduce((s, d) => s + d.amount, 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t("dashboard.greeting")}
        description={t("dashboard.subtitle")}
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
        <StatCard
          label="Brugt i denne måned"
          value={<MoneyAmount value={totalMonth} size="lg" />}
          hint={isLive ? `${docs.length} dokumenter` : "+12% vs. maj"}
          icon={Wallet}
          tone="lavender"
        />
        <StatCard
          label="Ubetalte fakturaer"
          value={<MoneyAmount value={unpaidTotal} size="lg" />}
          hint={`${docs.filter((d) => d.status !== "paid").length} venter`}
          icon={AlertCircle}
          tone="butter"
        />
        <StatCard
          label="Forfalder i denne uge"
          value={<MoneyAmount value={199} size="lg" />}
          hint="Telenor · forfalden"
          icon={CalendarClock}
          tone="peach"
        />
        <StatCard
          label="Registrerede dokumenter"
          value={<span className="tabular-nums">{docs.length}</span>}
          hint="live fra dine uploads"
          icon={TrendingUp}
          tone="mint"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">{t("dashboard.recent")}</h2>
            <Button variant="ghost" asChild className="rounded-full">
              <Link to="/app/documents">{t("dashboard.viewAll")}</Link>
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {docs.map((d) => (
              <DocumentCard key={d.id} doc={d} onClick={() => openDoc(d.id)} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-foreground">Budget</h2>
          <div className="shadow-soft flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
            <BudgetProgressBar label="I alt" spent={totalMonth} budget={6000} />
            <div className="h-px bg-border" />
            <BudgetProgressBar label="Dagligvarer" spent={1850} budget={2500} />
            <BudgetProgressBar label="Forsyning" spent={892} budget={1200} />
            <BudgetProgressBar label="Abonnementer" spent={620} budget={500} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <CategoryTile icon={ShoppingBag} label="Dagligvarer" tone="mint" />
            <CategoryTile icon={Zap} label="Forsyning" tone="sky" />
            <CategoryTile icon={Coffee} label="Mad ude" tone="peach" />
          </div>
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



function CategoryTile({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof ShoppingBag;
  label: string;
  tone: "mint" | "peach" | "lavender" | "butter" | "sky";
}) {
  const toneClass = {
    mint: "bg-mint text-mint-foreground",
    peach: "bg-peach text-peach-foreground",
    lavender: "bg-lavender text-lavender-foreground",
    butter: "bg-butter text-butter-foreground",
    sky: "bg-sky text-sky-foreground",
  }[tone];
  return (
    <div className={`flex flex-col items-center gap-1 rounded-2xl ${toneClass} p-3 text-center`}>
      <Icon className="h-5 w-5" />
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}
