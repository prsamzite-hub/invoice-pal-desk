import { Receipt, FileText } from "lucide-react";
import { VendorAvatar } from "./vendor-avatar";
import { StatusBadge } from "./status-badge";
import { MoneyAmount } from "./money-amount";
import { CategoryChip } from "./category-chip";
import { cn } from "@/lib/utils";

export interface DocumentCardData {
  id: string;
  company: string;
  amount: number;
  currency?: string;
  issuedDate: string; // ISO
  dueDate?: string | null;
  status: "paid" | "unpaid" | "overdue";
  type: "receipt" | "invoice";
  category?: { label: string; tone?: "mint" | "peach" | "lavender" | "butter" | "sky" };
  vendorLogoUrl?: string | null;
  isBusiness?: boolean;
  docNumber?: number | null;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("da-DK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function DocumentCard({
  doc,
  onClick,
  className,
  duplicateLabel,
  onDismissDuplicate,
  dismissLabel,
}: {
  doc: DocumentCardData;
  onClick?: () => void;
  className?: string;
  duplicateLabel?: string;
  onDismissDuplicate?: () => void;
  dismissLabel?: string;
}) {
  const TypeIcon = doc.type === "invoice" ? FileText : Receipt;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shadow-soft hover:shadow-card group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5",
        className,
      )}
    >
      <VendorAvatar name={doc.company} logoUrl={doc.vendorLogoUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{doc.company}</p>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <TypeIcon className="h-3 w-3" />
            {doc.type === "invoice" ? "Faktura" : "Kvittering"}
          </span>
          {doc.isBusiness ? (
            <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Erhverv
            </span>
          ) : null}
          {duplicateLabel ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3 w-3" />
              {duplicateLabel}
              {onDismissDuplicate ? (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={dismissLabel}
                  title={dismissLabel}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismissDuplicate();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onDismissDuplicate();
                    }
                  }}
                  className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-amber-500/20"
                >
                  <X className="h-3 w-3" />
                </span>
              ) : null}
            </span>
          ) : null}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {doc.docNumber != null ? (
            <span className="font-medium tabular-nums text-foreground/70">
              Bilagsnr. {String(doc.docNumber).padStart(4, "0")}
            </span>
          ) : null}
          <span>{formatDate(doc.issuedDate)}</span>
          {doc.dueDate ? <span>· Forfald {formatDate(doc.dueDate)}</span> : null}
          {doc.category ? (
            <CategoryChip label={doc.category.label} tone={doc.category.tone ?? "lavender"} />
          ) : null}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <MoneyAmount value={doc.amount} currency={doc.currency ?? "DKK"} />
        <StatusBadge status={doc.status} />
      </div>
    </button>
  );
}
