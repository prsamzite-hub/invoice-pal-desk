import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ItemsEditor } from "@/components/items-editor";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CompanyAvatar } from "@/components/atoms/company-avatar";
import { StatusBadge } from "@/components/atoms/status-badge";
import { CategoryChip } from "@/components/atoms/category-chip";
import { MoneyAmount } from "@/components/atoms/money-amount";
import { PdfViewerDialog } from "./pdf-viewer-dialog";
import type { DocumentCardData } from "@/components/atoms/document-card";
import {
  CATEGORIES,
  deleteReceipt,
  getReceiptItems,
  getReceiptOriginalUrl,
  markReceiptPaid,
  updateReceipt,
  type ExtractedFields,
  type LineItem,
} from "@/lib/receipts.functions";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("da-DK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

const CURRENCIES = ["DKK", "EUR", "USD", "GBP", "SEK", "NOK"];

export interface DetailRow extends DocumentCardData {
  notes?: string | null;
}

export function DocumentDetailSheet({
  doc,
  open,
  onOpenChange,
  fileUrl = null,
  filename,
}: {
  doc: DetailRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl?: string | null;
  filename?: string;
}) {
  const qc = useQueryClient();
  const [pdfOpen, setPdfOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateFn = useServerFn(updateReceipt);
  const deleteFn = useServerFn(deleteReceipt);
  const markPaidFn = useServerFn(markReceiptPaid);
  const originalUrlFn = useServerFn(getReceiptOriginalUrl);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["receipts"] });

  const markPaid = useMutation({
    mutationFn: (id: string) => markPaidFn({ data: { id, paid: true } }),
    onSuccess: () => {
      toast.success("Markeret som betalt");
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error("Kunne ikke opdatere", { description: e instanceof Error ? e.message : "" }),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Dokument slettet");
      setConfirmDelete(false);
      onOpenChange(false);
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error("Kunne ikke slette", { description: e instanceof Error ? e.message : "" }),
  });

  const downloadOriginal = async () => {
    if (!doc) return;
    try {
      const { url } = await originalUrlFn({ data: { id: doc.id } });
      window.open(url, "_blank");
    } catch (e) {
      toast.error("Kunne ikke hente original", {
        description: e instanceof Error ? e.message : "",
      });
    }
  };

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
                      {doc.type === "invoice" ? "Faktura" : "Kvittering"}
                    </SheetDescription>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
              </SheetHeader>

              <div className="rounded-2xl bg-gradient-card p-5 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Beløb
                </p>
                <MoneyAmount
                  value={doc.amount}
                  currency={doc.currency ?? "DKK"}
                  size="xl"
                  className="mt-1 block"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field icon={CalendarDays} label="Dato" value={formatDate(doc.issuedDate)} />
                {doc.type === "invoice" && doc.dueDate ? (
                  <Field icon={CalendarClock} label="Forfaldsdato" value={formatDate(doc.dueDate)} />
                ) : null}
                {doc.category ? (
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Kategori
                    </span>
                    <CategoryChip
                      label={doc.category.label}
                      tone={doc.category.tone ?? "lavender"}
                    />
                  </div>
                ) : null}
                {doc.notes ? (
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Noter
                    </span>
                    <p className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                      {doc.notes}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Vedhæftning
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={!fileUrl}
                    onClick={() => setPdfOpen(true)}
                  >
                    <Eye className="mr-2 h-4 w-4" /> Se PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={!fileUrl}
                    onClick={() => fileUrl && window.open(fileUrl, "_blank")}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={downloadOriginal}
                  >
                    <FileText className="mr-2 h-4 w-4" /> Original fil
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                {doc.status !== "paid" ? (
                  <Button
                    className="rounded-full"
                    disabled={markPaid.isPending}
                    onClick={() => markPaid.mutate(doc.id)}
                  >
                    {markPaid.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Markér som betalt
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Rediger
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-full text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Slet
                </Button>
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

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slet dokument?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette sletter dokumentet permanent, inklusive den vedhæftede fil. Handlingen kan
              ikke fortrydes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Annuller</AlertDialogCancel>
            <AlertDialogAction
              disabled={del.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (doc) del.mutate(doc.id);
              }}
            >
              {del.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Slet permanent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {doc ? (
        <EditReceiptDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          doc={doc}
          onSaved={() => {
            invalidate();
            setEditOpen(false);
          }}
          updateFn={updateFn}
        />
      ) : null}
    </>
  );
}

function EditReceiptDialog({
  open,
  onOpenChange,
  doc,
  onSaved,
  updateFn,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doc: DetailRow;
  onSaved: () => void;
  updateFn: ReturnType<typeof useServerFn<typeof updateReceipt>>;
}) {
  const itemsFn = useServerFn(getReceiptItems);
  const itemsQuery = useQuery({
    enabled: open,
    queryKey: ["receipt-items", doc.id],
    queryFn: () => itemsFn({ data: { id: doc.id } }),
  });

  const seed = (): ExtractedFields => ({
    company: doc.company,
    amount: doc.amount,
    currency: doc.currency ?? "DKK",
    issued_date: doc.issuedDate ? doc.issuedDate.slice(0, 10) : null,
    due_date: doc.dueDate ? doc.dueDate.slice(0, 10) : null,
    document_type: doc.type,
    category: doc.category?.label ?? null,
    notes: doc.notes ?? null,
    items: itemsQuery.data ?? [],
  });

  const [fields, setFields] = useState<ExtractedFields>(seed);

  useEffect(() => {
    if (open) setFields(seed());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, doc, itemsQuery.data]);


  const save = useMutation({
    mutationFn: () => updateFn({ data: { id: doc.id, fields } }),
    onSuccess: () => {
      toast.success("Dokument opdateret");
      onSaved();
    },
    onError: (e: unknown) =>
      toast.error("Kunne ikke gemme", {
        description: e instanceof Error ? e.message : "Prøv igen.",
      }),
  });

  const set = <K extends keyof ExtractedFields>(k: K, v: ExtractedFields[K]) =>
    setFields((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rediger dokument</DialogTitle>
          <DialogDescription>Opdater felterne og gem.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="e-company">Firma</Label>
            <Input
              id="e-company"
              value={fields.company}
              onChange={(e) => set("company", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="e-amount">Beløb</Label>
            <Input
              id="e-amount"
              type="number"
              step="0.01"
              min="0"
              value={Number.isFinite(fields.amount) ? fields.amount : 0}
              onChange={(e) => set("amount", parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label htmlFor="e-currency">Valuta</Label>
            <Select value={fields.currency} onValueChange={(v) => set("currency", v)}>
              <SelectTrigger id="e-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="e-date">Dato</Label>
            <Input
              id="e-date"
              type="date"
              value={fields.issued_date ?? ""}
              onChange={(e) => set("issued_date", e.target.value || null)}
            />
          </div>
          <div>
            <Label htmlFor="e-type">Type</Label>
            <Select
              value={fields.document_type}
              onValueChange={(v) =>
                set("document_type", v === "invoice" ? "invoice" : "receipt")
              }
            >
              <SelectTrigger id="e-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receipt">Kvittering</SelectItem>
                <SelectItem value="invoice">Faktura</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="e-due">Forfaldsdato</Label>
            <Input
              id="e-due"
              type="date"
              value={fields.due_date ?? ""}
              onChange={(e) => set("due_date", e.target.value || null)}
            />
          </div>
          <div>
            <Label htmlFor="e-cat">Kategori</Label>
            <Select
              value={fields.category ?? "Other"}
              onValueChange={(v) => set("category", v)}
            >
              <SelectTrigger id="e-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="e-notes">Noter</Label>
            <Textarea
              id="e-notes"
              rows={2}
              value={fields.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>
        <div className="mt-2">
          <ItemsEditor
            items={fields.items}
            currency={fields.currency}
            onChange={(items: LineItem[]) => set("items", items)}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Annuller
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gemmer…
              </>
            ) : (
              "Gem ændringer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {value}
      </span>
    </div>
  );
}
