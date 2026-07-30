import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, Wallet, PiggyBank, Pencil } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/atoms/page-header";
import { StatCard } from "@/components/atoms/stat-card";
import { MoneyAmount } from "@/components/atoms/money-amount";
import { BudgetProgressBar } from "@/components/atoms/budget-progress-bar";
import { SegmentedControl } from "@/components/atoms/segmented-control";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/app/analytics")({
  head: () => ({
    meta: [
      { title: "Analyse & budgetter — Kvitregn" },
      {
        name: "description",
        content:
          "Se hvor dine kroner går hen og hold styr på dine månedlige budgetter.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const BRAND_PRIMARY = "#6b93a8";
const BRAND_PRIMARY_DARK = "#4d7488";
const BRAND_INK = "#23241f";

const CATEGORY_COLORS: Record<string, string> = {
  Dagligvarer: "#6b93a8",
  Forsyning: "#8fb3c4",
  Abonnementer: "#4d7488",
  "Mad ude": "#c5a880",
  Shopping: "#a8846b",
};

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  Dagligvarer: "analytics.cat.groceries",
  Forsyning: "analytics.cat.utilities",
  Abonnementer: "analytics.cat.subscriptions",
  "Mad ude": "analytics.cat.dining",
  Shopping: "analytics.cat.shopping",
};

const CATEGORIES: Array<{ label: string; value: number }> = [
  { label: "Dagligvarer", value: 1850 },
  { label: "Forsyning", value: 892 },
  { label: "Abonnementer", value: 620 },
  { label: "Mad ude", value: 410 },
  { label: "Shopping", value: 515 },
];

const DEFAULT_BUDGETS: Record<string, number> = {
  "I alt": 6000,
  Dagligvarer: 2500,
  Forsyning: 1200,
  Abonnementer: 500,
  "Mad ude": 800,
  Shopping: 1000,
};

const STORAGE_KEY = "kvitregn.budgets";
const PREFS_KEY = "kvitregn.analytics.prefs";

const MONTH_SERIES = [
  { monthIndex: 0, value: 3200 },
  { monthIndex: 1, value: 4100 },
  { monthIndex: 2, value: 3650 },
  { monthIndex: 3, value: 4480 },
  { monthIndex: 4, value: 3920 },
];

const WEEK_SERIES = [
  { weekNum: 18, value: 820 },
  { weekNum: 19, value: 1180 },
  { weekNum: 20, value: 940 },
  { weekNum: 21, value: 1360 },
  { weekNum: 22, value: 1010 },
  { weekNum: 23, value: 970 },
  { weekNum: 24, value: 890 },
];

type TrendChart = "bar" | "line";
type CategoryChart = "list" | "donut";
type Grouping = "month" | "week";

interface Prefs {
  trend: TrendChart;
  category: CategoryChart;
  grouping: Grouping;
}

const DEFAULT_PREFS: Prefs = {
  trend: "bar",
  category: "list",
  grouping: "month",
};

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

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function BrandTooltip({ active, payload, label, formatMoney }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-soft">
      {label != null && (
        <div className="mb-1 font-semibold text-foreground">{label}</div>
      )}
      {payload.map((p: any) => (
        <div key={p.name ?? p.dataKey} className="flex items-center gap-2 text-foreground">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: p.color ?? p.payload?.fill ?? BRAND_PRIMARY }}
          />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-semibold">{formatMoney(p.value as number, "DKK", { maximumFractionDigits: 0 })}</span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsPage() {
  const { t, lang, locale, formatMoney } = useLang();
  const [budgets, setBudgets] = useState<Record<string, number>>(DEFAULT_BUDGETS);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const scaledCategories = CATEGORIES;
  const total = scaledCategories.reduce((s, c) => s + c.value, 0);

  useEffect(() => {
    setBudgets(loadBudgets());
    setPrefs(loadPrefs());
  }, []);

  const updatePref = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const openEdit = () => {
    const b = loadBudgets();
    setDraft(
      Object.fromEntries(
        Object.keys(DEFAULT_BUDGETS).map((k) => [k, String(b[k] ?? DEFAULT_BUDGETS[k])]),
      ),
    );
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

  const spentByLabel: Record<string, number> = Object.fromEntries(
    scaledCategories.map((c) => [c.label, c.value]),
  );

  const catLabel = (label: string) => {
    const key = CATEGORY_LABEL_KEYS[label];
    return key ? t(key) : label;
  };

  const monthName = (monthIndex: number) =>
    new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(2026, monthIndex, 1));

  const trendData = useMemo(() => {
    if (prefs.grouping === "week") {
      return WEEK_SERIES.map((p) => ({ name: `${t("analytics.weekPrefix")}${p.weekNum}`, value: p.value }));
    }
    const series = [...MONTH_SERIES, { monthIndex: 5, value: total }];
    return series.map((p) => ({ name: monthName(p.monthIndex), value: p.value }));
  }, [prefs.grouping, total, lang]);

  const pieData = [...scaledCategories]
    .sort((a, b) => b.value - a.value)
    .map((c) => ({ name: c.label, value: c.value }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t("analytics.title")}
        description={t("analytics.pageDesc")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="rounded-full" onClick={openEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              {t("analytics.editBudgets")}
            </Button>
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={t("analytics.stat.spent")}
          value={<MoneyAmount value={total} size="lg" />}
          hint={t("analytics.stat.vsMay")}
          icon={Wallet}
          tone="lavender"
        />
        <StatCard
          label={t("analytics.stat.avg")}
          value={<MoneyAmount value={3920} size="lg" />}
          hint={t("analytics.stat.avgHint")}
          icon={TrendingUp}
          tone="sky"
        />
        <StatCard
          label={t("analytics.stat.saved")}
          value={<MoneyAmount value={Math.max(0, budgets["I alt"] - total)} size="lg" />}
          hint={`${Math.max(0, Math.round(((budgets["I alt"] - total) / budgets["I alt"]) * 100))}% ${t("analytics.stat.underGoal")}`}
          icon={PiggyBank}
          tone="mint"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="shadow-soft lg:col-span-3 flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-lg font-bold text-foreground">{t("analytics.byCategory")}</h2>
            <div className="flex items-center gap-3">
              <MoneyAmount value={total} size="md" className="text-muted-foreground" />
              <SegmentedControl<CategoryChart>
                ariaLabel={t("analytics.categoryView")}
                value={prefs.category}
                onChange={(v) => updatePref("category", v)}
                options={[
                  { value: "list", label: t("analytics.list") },
                  { value: "donut", label: t("analytics.donut") },
                ]}
              />
            </div>
          </div>

          {prefs.category === "list" ? (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full">
                {scaledCategories.map((c) => (
                  <div
                    key={c.label}
                    style={{
                      width: `${(c.value / total) * 100}%`,
                      background: CATEGORY_COLORS[c.label],
                    }}
                    aria-label={catLabel(c.label)}
                  />
                ))}
              </div>
              <ul className="flex flex-col divide-y divide-border">
                {scaledCategories.map((c) => (
                  <li key={c.label} className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: CATEGORY_COLORS[c.label] }}
                      />
                      {catLabel(c.label)}
                    </span>
                    <span className="flex items-baseline gap-3 text-xs text-muted-foreground">
                      <span>{Math.round((c.value / total) * 100)}%</span>
                      <MoneyAmount value={c.value} size="sm" className="text-foreground" />
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div className="h-64 w-full md:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={2}
                      stroke="var(--card)"
                      strokeWidth={2}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip content={<BrandTooltip formatMoney={formatMoney} />} cursor={false} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex w-full flex-col gap-2 md:w-1/2">
                {pieData.map((entry) => (
                  <li
                    key={entry.name}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ background: CATEGORY_COLORS[entry.name] }}
                      />
                      {catLabel(entry.name)}
                    </span>
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {formatMoney(entry.value, "DKK", { maximumFractionDigits: 0 })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="shadow-soft lg:col-span-2 flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold text-foreground">{t("analytics.budgets")}</h2>
          <BudgetProgressBar label={t("analytics.total")} spent={total} budget={budgets["I alt"]} />
          <div className="h-px bg-border" />
          {Object.keys(DEFAULT_BUDGETS)
            .filter((k) => k !== "I alt")
            .map((label) => (
              <BudgetProgressBar
                key={label}
                label={catLabel(label)}
                spent={spentByLabel[label] ?? 0}
                budget={budgets[label] ?? DEFAULT_BUDGETS[label]}
              />
            ))}
        </div>
      </section>

      <section className="shadow-soft rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">{t("analytics.overTime")}</h2>
          <div className="flex items-center gap-2">
            <SegmentedControl<Grouping>
              ariaLabel={t("analytics.grouping")}
              value={prefs.grouping}
              onChange={(v) => updatePref("grouping", v)}
              options={[
                { value: "month", label: t("analytics.month") },
                { value: "week", label: t("analytics.week") },
              ]}
            />
            <SegmentedControl<TrendChart>
              ariaLabel={t("analytics.chartType")}
              value={prefs.trend}
              onChange={(v) => updatePref("trend", v)}
              options={[
                { value: "bar", label: t("analytics.bar") },
                { value: "line", label: t("analytics.line") },
              ]}
            />
          </div>
        </div>
        <div className="h-56 w-full text-muted-foreground">
          <ResponsiveContainer width="100%" height="100%">
            {prefs.trend === "bar" ? (
              <BarChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="currentColor"
                  opacity={0.15}
                />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tick={{ fill: "currentColor" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tick={{ fill: "currentColor" }}
                  tickFormatter={(v) => formatMoney(v, "DKK", { maximumFractionDigits: 0 })}
                  width={80}
                />
                <Tooltip
                  content={<BrandTooltip formatMoney={formatMoney} />}
                  cursor={{ fill: BRAND_PRIMARY, opacity: 0.08 }}
                />
                <Bar
                  dataKey="value"
                  name={t("analytics.spend")}
                  fill={BRAND_PRIMARY}
                  radius={[8, 8, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            ) : (
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="brandLineFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND_PRIMARY} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={BRAND_PRIMARY} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="currentColor"
                  opacity={0.15}
                />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tick={{ fill: "currentColor" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tick={{ fill: "currentColor" }}
                  tickFormatter={(v) => formatMoney(v, "DKK", { maximumFractionDigits: 0 })}
                  width={80}
                />
                <Tooltip
                  content={<BrandTooltip formatMoney={formatMoney} />}
                  cursor={{ stroke: BRAND_PRIMARY, strokeOpacity: 0.3, strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  name={t("analytics.spend")}
                  stroke={BRAND_PRIMARY}
                  strokeWidth={2.5}
                  fill="url(#brandLineFill)"
                  dot={{ r: 4, fill: BRAND_PRIMARY, stroke: BRAND_PRIMARY }}
                  activeDot={{ r: 6, fill: BRAND_PRIMARY_DARK, stroke: "var(--card)", strokeWidth: 2 }}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
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
                <Label htmlFor={`budget-${k}`} className="text-sm">
                  {k === "I alt" ? t("analytics.total") : catLabel(k)}
                </Label>
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
            <Button variant="outline" onClick={() => setEditing(false)}>
              {t("analytics.cancel")}
            </Button>
            <Button onClick={save}>{t("analytics.saveBudgets")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
