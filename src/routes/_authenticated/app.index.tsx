import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Kvittr" },
      { name: "description", content: "Your monthly spending at a glance with Kvittr." },
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
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="God morgen, K 👋"
        description="Here's how your kvitteringer are stacking up this month."
        actions={
          <Button asChild className="rounded-full">
            <Link to="/app/upload">
              <Upload className="mr-2 h-4 w-4" />
              Add document
            </Link>
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Spent this month"
          value={<MoneyAmount value={4287.5} size="lg" />}
          hint="+12% vs. May"
          icon={Wallet}
          tone="lavender"
        />
        <StatCard
          label="Unpaid invoices"
          value={<MoneyAmount value={1091} size="lg" />}
          hint="2 invoices waiting"
          icon={AlertCircle}
          tone="butter"
        />
        <StatCard
          label="Due this week"
          value={<MoneyAmount value={199} size="lg" />}
          hint="Telenor · overdue"
          icon={CalendarClock}
          tone="peach"
        />
        <StatCard
          label="Tracked documents"
          value={<span className="tabular-nums">128</span>}
          hint="+9 this month"
          icon={TrendingUp}
          tone="mint"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Recent activity</h2>
            <Button variant="ghost" asChild className="rounded-full">
              <Link to="/app/documents">View all</Link>
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {SAMPLE_DOCS.map((d) => (
              <DocumentCard key={d.id} doc={d} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-foreground">June budget</h2>
          <div className="shadow-soft flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
            <BudgetProgressBar label="Overall" spent={4287.5} budget={6000} />
            <div className="h-px bg-border" />
            <BudgetProgressBar label="Groceries" spent={1850} budget={2500} />
            <BudgetProgressBar label="Utilities" spent={892} budget={1200} />
            <BudgetProgressBar label="Subscriptions" spent={620} budget={500} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <CategoryTile icon={ShoppingBag} label="Groceries" tone="mint" />
            <CategoryTile icon={Zap} label="Utilities" tone="sky" />
            <CategoryTile icon={Coffee} label="Dining" tone="peach" />
          </div>
        </div>
      </section>
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
