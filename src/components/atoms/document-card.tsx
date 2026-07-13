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
}: {
  doc: DocumentCardData;
  onClick?: () => void;
  className?: string;
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
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{doc.company}</p>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <TypeIcon className="h-3 w-3" />
            {doc.type === "invoice" ? "Faktura" : "Kvittering"}
          </span>
          {doc.isBusiness ? (
            <span className="inline-flex items-center rounded-full bg-lavender px-2 py-0.5 text-[10px] font-medium text-lavender-foreground">
              Erhverv
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
