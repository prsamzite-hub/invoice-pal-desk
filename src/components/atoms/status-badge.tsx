import { cn } from "@/lib/utils";

type Status = "paid" | "unpaid" | "overdue";

const STATUS_LABEL: Record<Status, string> = {
  paid: "Paid",
  unpaid: "Unpaid",
  overdue: "Overdue",
};

const STATUS_CLASS: Record<Status, string> = {
  paid: "bg-status-paid text-status-paid-foreground",
  unpaid: "bg-status-unpaid text-status-unpaid-foreground",
  overdue: "bg-status-overdue text-status-overdue-foreground",
};

export function StatusBadge({
  status,
  className,
}: {
  status: Status;
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
