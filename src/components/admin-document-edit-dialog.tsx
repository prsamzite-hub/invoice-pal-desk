import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { useLang } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminGetDocument, adminUpdateDocument } from "@/lib/admin.functions";

type Props = {
  documentId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

function toDateInput(v: string | null | undefined) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function AdminDocumentEditDialog({ documentId, onOpenChange, onSaved }: Props) {
  const { t } = useLang();
  const open = !!documentId;
  const getDoc = useServerFn(adminGetDocument);
  const updateDoc = useServerFn(adminUpdateDocument);

  const q = useQuery({
    enabled: open,
    queryKey: ["admin-doc-edit", documentId],
    queryFn: () => getDoc({ data: { id: documentId! } }),
  });

  const [company, setCompany] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("DKK");
  const [issuedDate, setIssuedDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [documentType, setDocumentType] = useState("receipt");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("processed");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (q.data?.row) {
      const r = q.data.row;
      setCompany(r.company ?? "");
      setAmount(r.amount != null ? String(r.amount) : "");
      setCurrency(r.currency ?? "DKK");
      setIssuedDate(toDateInput(r.issued_date));
      setDueDate(toDateInput(r.due_date));
      setDocumentType(r.document_type ?? "receipt");
      setCategory(r.category ?? "");
      setStatus(r.status ?? "processed");
      setNotes(r.notes ?? "");
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: (payload: any) => updateDoc({ data: payload }),
    onSuccess: () => {
      toast.success(t("admin.doc.saved"));
      onSaved?.();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? t("admin.toast.cannotSave")),
  });

  const handleSave = () => {
    if (!documentId) return;
    const amt = Number(amount.replace(",", "."));
    if (isNaN(amt)) {
      toast.error(t("admin.doc.invalidAmount"));
      return;
    }
    save.mutate({
      id: documentId,
      company: company.trim(),
      amount: amt,
      currency: currency.trim() || "DKK",
      issued_date: issuedDate || null,
      due_date: dueDate || null,
      document_type: documentType,
      category: category.trim() || null,
      status,
      notes: notes.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("admin.doc.edit.title")}</DialogTitle>
          <DialogDescription>
            {t("admin.doc.edit.desc")}
          </DialogDescription>
        </DialogHeader>
        {q.isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : q.isError || !q.data ? (
          <p className="text-sm text-destructive">{t("admin.doc.edit.cannotFetch")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="a-company">{t("admin.doc.company")}</Label>
              <Input id="a-company" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="a-amount">{t("admin.doc.amount")}</Label>
              <Input
                id="a-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="a-currency">Valuta</Label>
              <Input id="a-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="a-issued">{t("admin.doc.date")}</Label>
              <Input
                id="a-issued"
                type="date"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="a-due">{t("admin.doc.due")}</Label>
              <Input
                id="a-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("admin.doc.type")}</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receipt">{t("docs.type.receipt")}</SelectItem>
                  <SelectItem value="invoice">{t("docs.type.invoice")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("admin.doc.status")}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="processing">{t("admin.doc.status.processing")}</SelectItem>
                  <SelectItem value="processed">{t("admin.doc.status.processed")}</SelectItem>
                  <SelectItem value="paid">{t("admin.doc.status.paid")}</SelectItem>
                  <SelectItem value="failed">{t("admin.doc.status.failed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="a-category">{t("admin.doc.category")}</Label>
              <Input id="a-category" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="a-notes">{t("admin.doc.notes")}</Label>
              <Textarea
                id="a-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            {(q.data.pdfUrl || q.data.originalUrl) && (
              <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
                {q.data.pdfUrl && (
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <a href={q.data.pdfUrl} target="_blank" rel="noreferrer">{t("admin.doc.openPdf")}</a>
                  </Button>
                )}
                {q.data.originalUrl && (
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <a href={q.data.originalUrl} target="_blank" rel="noreferrer">{t("admin.doc.openOriginal")}</a>
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={save.isPending || !q.data}>
            {save.isPending ? t("app.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
