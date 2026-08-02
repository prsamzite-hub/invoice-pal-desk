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
import { useAppMode } from "@/lib/app-mode";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyReceipts } from "@/lib/receipts.functions";

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
  Groceries: "#6b93a8",
  Utilities: "#8fb3c4",
  Subscriptions: "#4d7488",
  Dining: "#c5a880",
  Transport: "#7fa5a0",
  Shopping: "#a8846b",
  Health: "#9db98f",
  Other: "#b0aca4",
};

const DEFAULT_BUDGETS: Record<string, number> = {
  "I alt": 6000,
  Groceries: 2500,
  Utilities: 1200,
  Subscriptions: 500,
  Dining: 800,
  Shopping: 1000,
};

const STORAGE_KEY = "kvitregn.budgets";
const PREFS_KEY = "kvitregn.analytics.prefs";

type Scope = "all" | "private" | "business";

function ymKey(iso: string) {
  return iso.slice(0, 7);
}

function isoWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

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
  const { t, tCategory, locale, formatMoney } = useLang();
  const { mode } = useAppMode();
  const [budgets, setBudgets] = useState<Record<string, number>>(DEFAULT_BUDGETS);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [scope, setScope] = useState<Scope>("all");
  const [scopeTouched, setScopeTouched] = useState(false);

  const listFn = useServerFn(listMyReceipts);
  const receipts = useQuery({ queryKey: ["receipts"], queryFn: () => listFn() });

  useEffect(() => {
    setBudgets(loadBudgets());
    setPrefs(loadPrefs());
  }, []);

  useEffect(() => {
    if (!scopeTouched) setScope(mode === "erhverv" ? "business" : "all");
  }, [mode, scopeTouched]);

  const rows = useMemo(() => {
    const all = receipts.data ?? [];
    if (scope === "business") return all.filter((r) => r.is_business === true);
    if (scope === "private") return all.filter((r) => r.is_business !== true);
    return all;
  }, [receipts.data, scope]);

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);

  const monthRows = useMemo(
    () =>
      rows.filter(
        (r) => ymKey(r.issued_date ?? r.created_at?.slice(0, 10) ?? "") === currentMonth,
      ),
    [rows, currentMonth],
  );

  const scaledCategories = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of monthRows) {
      const key = r.category ?? "Other";
      map.set(key, (map.get(key) ?? 0) + (Number(r.amount) || 0));
    }
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthRows]);

  const total = scaledCategories.reduce((s, c) => s + c.value, 0);
  const totalVat = useMemo(
    () => monthRows.reduce((s, r) => s + (Number(r.vat_amount) || 0), 0),
    [monthRows],
  );
  const totalExVat = total - totalVat;


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

  const catLabel = (label: string) => tCategory(label);
  const colorFor = (label: string) => CATEGORY_COLORS[label] ?? "#b0aca4";

  const trendData = useMemo(() => {
    const out: Array<{ name: string; value: number }> = [];
    if (prefs.grouping === "week") {
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 7 * 86400000);
        const wk = isoWeek(d);
        const start = new Date(d);
        start.setDate(start.getDate() - ((start.getDay() || 7) - 1));
        const end = new Date(start.getTime() + 6 * 86400000);
        const from = start.toISOString().slice(0, 10);
        const to = end.toISOString().slice(0, 10);
        const value = rows.reduce((sum, r) => {
          const iso = (r.issued_date ?? r.created_at ?? "").slice(0, 10);
          return iso >= from && iso <= to ? sum + (Number(r.amount) || 0) : sum;
        }, 0);
        out.push({ name: `${t("analytics.weekPrefix")}${wk}`, value });
      }
      return out;
    }
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const value = rows.reduce((sum, r) => {
        const iso = (r.issued_date ?? r.created_at ?? "").slice(0, 10);
        return ymKey(iso) === ym ? sum + (Number(r.amount) || 0) : sum;
      }, 0);
      out.push({
        name: new Intl.DateTimeFormat(locale, { month: "short" }).format(d),
        value,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.grouping, rows, locale, t]);

  const monthlyAvg = useMemo(() => {
    const months = trendData.filter((p) => p.value > 0);
    if (!months.length) return 0;
    return months.reduce((s, p) => s + p.value, 0) / months.length;
  }, [trendData]);

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
            <SegmentedControl<Scope>
              ariaLabel={t("analytics.scope")}
              value={scope}
              onChange={(v) => {
                setScopeTouched(true);
                setScope(v);
              }}
              options={[
                { value: "all", label: t("biz.all") },
                { value: "private", label: t("biz.private") },
                { value: "business", label: t("biz.business") },
              ]}
            />
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
          hint={
            totalVat > 0
              ? `${t("vat.exVatShort")} ${formatMoney(totalExVat, "DKK", { maximumFractionDigits: 0 })} · ${monthRows.length} ${t("dashboard.biz.docs")}`
              : `${monthRows.length} ${t("dashboard.biz.docs")}`
          }
          icon={Wallet}
          tone="lavender"
        />

        <StatCard
          label={t("analytics.stat.avg")}
          value={<MoneyAmount value={Math.round(monthlyAvg)} size="lg" />}
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

          {scaledCategories.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t("analytics.noData")}
            </p>
          ) : prefs.category === "list" ? (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full">
                {scaledCategories.map((c) => (
                  <div
                    key={c.label}
                    style={{
                      width: `${total > 0 ? (c.value / total) * 100 : 0}%`,
                      background: colorFor(c.label),
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
                        style={{ background: colorFor(c.label) }}
                      />
                      {catLabel(c.label)}
                    </span>
                    <span className="flex items-baseline gap-3 text-xs text-muted-foreground">
                      <span>{total > 0 ? Math.round((c.value / total) * 100) : 0}%</span>
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
                        <Cell key={entry.name} fill={colorFor(entry.name)} />
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
                        style={{ background: colorFor(entry.name) }}
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
