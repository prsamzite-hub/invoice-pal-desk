import { useState } from "react";
import { CalendarClock, CalendarDays, CreditCard, Download } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CompanyAvatar } from "@/components/atoms/company-avatar";
import { StatusBadge } from "@/components/atoms/status-badge";
import { CategoryChip } from "@/components/atoms/category-chip";
import { MoneyAmount } from "@/components/atoms/money-amount";
import { FilePreviewCard } from "./file-preview-card";
import { PdfViewerDialog } from "./pdf-viewer-dialog";
import type { DocumentCardData } from "@/components/atoms/document-card";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(iso));
}

const STATUS_DA: Record<DocumentCardData["status"], string> = {
  paid: "Betalt",
  unpaid: "Ubetalt",
  overdue: "Overskredet",
};

export function DocumentDetailSheet({
  doc,
  open,
  onOpenChange,
  fileUrl = null,
  filename,
}: {
  doc: DocumentCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl?: string | null;
  filename?: string;
}) {
  const [pdfOpen, setPdfOpen] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {doc ? (
            <div className="flex flex-col gap-6">
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <CompanyAvatar name={doc.company} />
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="truncate text-lg">{doc.company}</SheetTitle>
                    <SheetDescription className="text-xs">
                      {doc.type === "invoice" ? "Faktura · Invoice" : "Kvittering · Receipt"}
                    </SheetDescription>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
              </SheetHeader>

              <div className="rounded-2xl bg-gradient-card p-5 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount</p>
                <MoneyAmount value={doc.amount} currency={doc.currency ?? "DKK"} size="xl" className="mt-1 block" />
                <p className="mt-1 text-xs text-muted-foreground">{STATUS_DA[doc.status]}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field icon={CalendarDays} label="Date issued" value={formatDate(doc.issuedDate)} />
                {doc.type === "invoice" && doc.dueDate ? (
                  <Field icon={CalendarClock} label="Payment due" value={formatDate(doc.dueDate)} />
                ) : null}
                {doc.category ? (
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</span>
                    <CategoryChip label={doc.category.label} tone={doc.category.tone ?? "lavender"} />
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Attachment</span>
                <FilePreviewCard
                  filename={filename ?? `${doc.company.toLowerCase()}-${doc.id}.pdf`}
                  size="PDF"
                  onOpen={() => setPdfOpen(true)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button variant="outline" className="rounded-full" disabled={!fileUrl}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                {doc.type === "invoice" && doc.status !== "paid" ? (
                  <Button className="rounded-full">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay invoice
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <PdfViewerDialog
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        url={fileUrl}
        title={doc ? `${doc.company} · ${formatDate(doc.issuedDate)}` : ""}
      />
    </>
  );
}

function Field({
  icon: Icon, label, value,
}: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {value}
      </span>
    </div>
  );
}
