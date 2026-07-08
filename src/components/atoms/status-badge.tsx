import { cn } from "@/lib/utils";

export type ReceiptStatus = "paid" | "unpaid" | "overdue";

const STATUS_LABEL: Record<ReceiptStatus, string> = {
  paid: "Betalt",
  unpaid: "Ubetalt",
  overdue: "Forfalden",
};

const STATUS_CLASS: Record<ReceiptStatus, string> = {
  paid: "bg-status-paid text-status-paid-foreground",
  unpaid: "bg-status-unpaid text-status-unpaid-foreground",
  overdue: "bg-status-overdue text-status-overdue-foreground",
};

/**
 * Derive the effective status from a stored row.
 * "Forfalden" is computed automatically once the due date has passed —
 * it is never stored in the database.
 */
export function deriveReceiptStatus(row: {
  status: string;
  due_date: string | null;
}): ReceiptStatus {
  if (row.status === "paid") return "paid";
  if (row.due_date) {
    const today = new Date().toISOString().slice(0, 10);
    if (row.due_date < today) return "overdue";
  }
  return "unpaid";
}

export function StatusBadge({
  status,
  className,
}: {
  status: ReceiptStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        STATUS_CLASS[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}
