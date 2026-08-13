import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExportDialog } from "@/components/export-dialog";
import { useLang } from "@/lib/i18n";

export interface CloseRow {
  id: string;
  company: string | null;
  amount: number | string | null;
  issued_date: string | null;
  created_at?: string | null;
  vat_amount: number | string | null;
  vat_is_calculated?: boolean | null;
  is_business?: boolean | null;
  doc_number?: number | null;
  original_path?: string | null;
  scan_path?: string | null;
}

type IssueKey =
  | "amount"
  | "vat"
  | "date"
  | "supplier"
  | "scan"
  | "review";

const ISSUE_ORDER: IssueKey[] = ["amount", "supplier", "date", "vat", "scan", "review"];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(key: string) {
  const [y, m] = key.split("-").map(Number);
  const from = `${key}-01`;
  const last = new Date(y, m, 0).getDate();
  return { from, to: `${key}-${String(last).padStart(2, "0")}` };
}

function docLabel(r: CloseRow) {
  const nr = r.doc_number != null ? `#${String(r.doc_number).padStart(4, "0")}` : null;
  const name = r.company?.trim() ? r.company.trim() : null;
  return [nr, name].filter(Boolean).join(" · ") || "—";
}

export function MonthCloseCard({
  rows,
  onOpenDoc,
}: {
  rows: CloseRow[];
  onOpenDoc: (id: string) => void;
}) {
  const { t, formatDate } = useLang();
  const [month, setMonth] = useState(() => monthKey(new Date()));

  const { issues, total, monthRows } = useMemo(() => {
    const monthRows = rows.filter((r) => {
      const iso = r.issued_date ?? r.created_at?.slice(0, 10) ?? "";
      return iso.slice(0, 7) === month;
    });

    const map: Record<IssueKey, CloseRow[]> = {
      amount: [],
      vat: [],
      date: [],
      supplier: [],
      scan: [],
      review: [],
    };

    for (const r of monthRows) {
      const amount = Number(r.amount) || 0;
      const company = (r.company ?? "").trim();
      const noAmount = amount <= 0;
      const noSupplier = !company || company.toLowerCase() === "unknown";
      if (noAmount) map.amount.push(r);
      if (noSupplier) map.supplier.push(r);
      if (!r.issued_date) map.date.push(r);
      if (r.vat_amount == null || !Number.isFinite(Number(r.vat_amount))) map.vat.push(r);
      if ((r.original_path || r.scan_path) && noAmount && noSupplier) map.scan.push(r);
      if (r.vat_is_calculated === true) map.review.push(r);
    }

    const issues = ISSUE_ORDER.map((key) => ({ key, docs: map[key] })).filter(
      (g) => g.docs.length > 0,
    );
    const total = issues.reduce((n, g) => n + g.docs.length, 0);
    return { issues, total, monthRows };
  }, [rows, month]);

  const shift = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    setMonth(monthKey(new Date(y, m - 1 + delta, 1)));
  };

  const range = monthRange(month);
  const [y, m] = month.split("-").map(Number);
  const label = formatDate(new Date(y, m - 1, 1), { month: "long", year: "numeric" });
  const isCurrent = month === monthKey(new Date());

  return (
    <section className="shadow-soft flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 className="text-base font-bold text-foreground sm:text-lg">
            {t("close.title")}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            aria-label={t("close.prevMonth")}
            onClick={() => shift(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[9rem] text-center text-sm font-semibold capitalize text-foreground">
            {label}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            aria-label={t("close.nextMonth")}
            onClick={() => shift(1)}
            disabled={isCurrent}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {monthRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("close.noDocs")}</p>
      ) : total === 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-status-paid/40 bg-status-paid/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-status-paid-foreground" aria-hidden />
            <div>
              <p className="text-sm font-bold text-status-paid-foreground">{t("close.readyTitle")}</p>
              <p className="text-sm text-muted-foreground">
                {monthRows.length} {t("close.readyDesc")}
              </p>
            </div>
          </div>
          <ExportDialog
            defaultScope="business"
            defaultFrom={range.from}
            defaultTo={range.to}
            triggerLabel={t("close.exportMonth")}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {total} {t("close.issuesDesc")}
          </p>
          <ul className="flex flex-col gap-3">
            {issues.map((g) => (
              <li key={g.key} className="rounded-xl border border-border bg-background/60 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-status-overdue-foreground" aria-hidden />
                  <span className="text-sm font-semibold text-foreground">
                    {t(`close.issue.${g.key}`)}
                  </span>
                  <Badge variant="secondary" className="rounded-full">
                    {g.docs.length}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {g.docs.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onOpenDoc(r.id)}
                      className="min-h-11 rounded-full border border-border bg-card px-3 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {docLabel(r)}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
