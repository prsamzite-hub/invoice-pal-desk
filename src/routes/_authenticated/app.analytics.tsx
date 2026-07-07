import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, Wallet, PiggyBank, Pencil } from "lucide-react";

import { PageHeader } from "@/components/atoms/page-header";
import { StatCard } from "@/components/atoms/stat-card";
import { MoneyAmount } from "@/components/atoms/money-amount";
import { BudgetProgressBar } from "@/components/atoms/budget-progress-bar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/app/analytics")({
  head: () => ({
    meta: [
      { title: "Analyse & budgetter — Kvitregn" },
      { name: "description", content: "Se hvor dine kroner går hen og hold styr på dine månedlige budgetter." },
    ],
  }),
  component: AnalyticsPage,
});

const CATEGORIES: Array<{ label: string; value: number; tone: "mint" | "peach" | "lavender" | "butter" | "sky" }> = [
  { label: "Dagligvarer", value: 1850, tone: "mint" },
  { label: "Forsyning", value: 892, tone: "sky" },
  { label: "Abonnementer", value: 620, tone: "lavender" },
  { label: "Mad ude", value: 410, tone: "peach" },
  { label: "Shopping", value: 515, tone: "butter" },
];

const TONE_BG = {
  mint: "bg-mint",
  peach: "bg-peach",
  lavender: "bg-lavender",
  butter: "bg-butter",
  sky: "bg-sky",
} as const;

const DEFAULT_BUDGETS: Record<string, number> = {
  "I alt": 6000,
  Dagligvarer: 2500,
  Forsyning: 1200,
  Abonnementer: 500,
  "Mad ude": 800,
  Shopping: 1000,
};

const STORAGE_KEY = "kvitregn.budgets";

function loadBudgets(): Record<string, number> {
  if (typeof window === "undefined") return DEFAULT_BUDGETS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BUDGETS;
    return { ...DEFAULT_BUDGETS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BUDGETS;
  }
}

function AnalyticsPage() {
  const { t } = useLang();
  const total = CATEGORIES.reduce((s, c) => s + c.value, 0);
  const [budgets, setBudgets] = useState<Record<string, number>>(DEFAULT_BUDGETS);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    setBudgets(loadBudgets());
  }, []);

  const openEdit = () => {
    const b = loadBudgets();
    setDraft(Object.fromEntries(Object.keys(DEFAULT_BUDGETS).map((k) => [k, String(b[k] ?? DEFAULT_BUDGETS[k])])));
    setEditing(true);
  };

  const save = () => {
    const next: Record<string, number> = {};
    for (const [k, v] of Object.entries(draft)) {
      const num = Number(v);
      if (Number.isFinite(num) && num >= 0) next[k] = num;
    }
    setBudgets({ ...DEFAULT_BUDGETS, ...next });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setEditing(false);
  };

  const spentByLabel: Record<string, number> = Object.fromEntries(CATEGORIES.map((c) => [c.label, c.value]));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t("analytics.title")}
        description="Juni 2026 · alle beløb i DKK"
        actions={
          <Button variant="outline" className="rounded-full" onClick={openEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            {t("analytics.editBudgets")}
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Brugt i denne måned" value={<MoneyAmount value={total} size="lg" />} hint="+12% vs. maj" icon={Wallet} tone="lavender" />
        <StatCard label="Gennemsnit pr. måned" value={<MoneyAmount value={3920} size="lg" />} hint="Sidste 6 måneder" icon={TrendingUp} tone="sky" />
        <StatCard label="Sparet i forhold til budget" value={<MoneyAmount value={Math.max(0, budgets["I alt"] - total)} size="lg" />} hint={`${Math.max(0, Math.round(((budgets["I alt"] - total) / budgets["I alt"]) * 100))}% under målet`} icon={PiggyBank} tone="mint" />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="shadow-soft lg:col-span-3 flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-foreground">Forbrug pr. kategori</h2>
            <MoneyAmount value={total} size="md" className="text-muted-foreground" />
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            {CATEGORIES.map((c) => (
              <div key={c.label} className={TONE_BG[c.tone]} style={{ width: `${(c.value / total) * 100}%` }} aria-label={c.label} />
            ))}
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {CATEGORIES.map((c) => (
              <li key={c.label} className="flex items-center justify-between py-2.5">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span className={`h-2.5 w-2.5 rounded-full ${TONE_BG[c.tone]}`} />
                  {c.label}
                </span>
                <span className="flex items-baseline gap-3 text-xs text-muted-foreground">
                  <span>{Math.round((c.value / total) * 100)}%</span>
                  <MoneyAmount value={c.value} size="sm" className="text-foreground" />
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="shadow-soft lg:col-span-2 flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold text-foreground">Budgetter</h2>
          <BudgetProgressBar label="I alt" spent={total} budget={budgets["I alt"]} />
          <div className="h-px bg-border" />
          {Object.keys(DEFAULT_BUDGETS).filter((k) => k !== "I alt").map((label) => (
            <BudgetProgressBar
              key={label}
              label={label}
              spent={spentByLabel[label] ?? 0}
              budget={budgets[label] ?? DEFAULT_BUDGETS[label]}
            />
          ))}
        </div>
      </section>

      <section className="shadow-soft rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-bold text-foreground">Månedlig udvikling</h2>
        <div className="flex h-40 items-end gap-3">
          {[3200, 4100, 3650, 4480, 3920, total].map((v, i) => {
            const max = Math.max(3200, 4100, 3650, 4480, 3920, total);
            const h = Math.round((v / max) * 100);
            const months = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun"];
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className={`w-full rounded-t-xl ${i === 5 ? "bg-primary" : "bg-lavender"}`} style={{ height: `${h}%` }} />
                <span className="text-xs font-medium text-muted-foreground">{months[i]}</span>
              </div>
            );
          })}
        </div>
      </section>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("analytics.editBudgets")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            {Object.keys(DEFAULT_BUDGETS).map((k) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <Label htmlFor={`budget-${k}`} className="text-sm">{k}</Label>
                <Input
                  id={`budget-${k}`}
                  type="number"
                  min={0}
                  className="w-40"
                  value={draft[k] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>{t("analytics.cancel")}</Button>
            <Button onClick={save}>{t("analytics.saveBudgets")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
