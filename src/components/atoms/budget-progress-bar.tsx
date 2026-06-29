import { cn } from "@/lib/utils";
import { MoneyAmount } from "./money-amount";

export function BudgetProgressBar({
  label,
  spent,
  budget,
  currency = "DKK",
  className,
}: {
  label: string;
  spent: number;
  budget: number;
  currency?: string;
  className?: string;
}) {
  const pct = Math.min(100, Math.round((spent / budget) * 100));
  const over = spent > budget;
  const tone = over
    ? "bg-status-overdue"
    : pct > 80
      ? "bg-status-unpaid"
      : "bg-status-paid";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">
          <MoneyAmount value={spent} currency={currency} size="sm" /> /{" "}
          <MoneyAmount value={budget} currency={currency} size="sm" className="text-muted-foreground" />
        </p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {over ? `Over budget by ${pct - 100}%` : `${100 - pct}% left this month`}
      </p>
    </div>
  );
}
