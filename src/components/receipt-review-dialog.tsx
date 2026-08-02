import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CompanyCombobox } from "@/components/company-combobox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ItemsEditor } from "@/components/items-editor";
import { useLang } from "@/lib/i18n";
import { CATEGORIES, findDuplicates, listMyReceipts, saveReceipt, type ExtractResult, type ExtractedFields, type LineItem } from "@/lib/receipts.functions";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: ExtractResult | null;
  lang: "da" | "en";
  onSaved: () => void;
}

const CURRENCIES = ["DKK", "EUR", "USD", "GBP", "SEK", "NOK"];

export function ReceiptReviewDialog({ open, onOpenChange, initial, lang, onSaved }: Props) {
  const { t, tCategory } = useLang();
  const [fields, setFields] = useState<ExtractedFields | null>(null);
  const [useScan, setUseScan] = useState(true);
  const findDupFn = useServerFn(findDuplicates);
  const saveFn = useServerFn(saveReceipt);
  const listFn = useServerFn(listMyReceipts);
  const listQ = useQuery({ queryKey: ["receipts"], queryFn: () => listFn(), staleTime: 60_000 });
  const companySuggestions = useMemo(
    () => (listQ.data ?? []).map((r) => r.company).filter(Boolean),
    [listQ.data],
  );

  useEffect(() => {
    if (initial) {
      setFields({ ...initial.extracted });
      setUseScan(!!initial.scanUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const dupQuery = useQuery({
    enabled: !!fields && !!fields.company && !!fields.issued_date && fields.amount > 0,
    queryKey: ["dup", fields?.company, fields?.amount, fields?.issued_date],
    queryFn: () =>
      findDupFn({
        data: {
          company: fields!.company,
          amount: Number(fields!.amount),
          issued_date: fields!.issued_date,
        },
      }),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!initial || !fields) throw new Error("Missing data");
      return await saveFn({
        data: {
          originalPath: initial.originalPath,
          scanPath: initial.scanPath,
          useScan,
          fields,
          lang,
        },
      });
    },
    onSuccess: (row) => {
      toast.success(`${t("review.toast.savedPrefix")} ${row.company}`);
      onSaved();
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      const raw = e instanceof Error ? e.message : "";
      const isFriendly =
        !!raw &&
        raw.length < 120 &&
        !/[_${}]|toESM|undefined|Cannot|Error:|TypeError|extends/i.test(raw);
      if (!isFriendly) console.error("[saveReceipt] failed", e);
      toast.error(t("review.toast.cannotSave"), {
        description: isFriendly ? raw : t("review.toast.retry"),
      });
    },
  });

  if (!fields) return null;

  const set = <K extends keyof ExtractedFields>(k: K, v: ExtractedFields[K]) =>
    setFields((f) => (f ? { ...f, [k]: v } : f));

  const duplicates = dupQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[680px] lg:max-w-[960px]">
        <DialogHeader>
          <DialogTitle>{t("review.title")}</DialogTitle>
          <DialogDescription>
            {initial?.extractionOk ? t("review.desc.ok") : t("review.desc.err")}
          </DialogDescription>
        </DialogHeader>

        {initial?.extractionOk ? (
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertTitle>{t("review.ai.title")}</AlertTitle>
            <AlertDescription>{t("review.ai.desc")}</AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("review.err.title")}</AlertTitle>
            <AlertDescription>{initial?.errorMessage ?? t("review.err.desc")}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          {(initial?.scanUrl || initial?.originalUrl) && (
            <div className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-0 lg:self-start">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("review.preview")}
                </span>
                {initial?.scanUrl ? (
                  <div className="inline-flex overflow-hidden rounded-full border border-border text-xs">
                    <button type="button" onClick={() => setUseScan(true)}
                      className={`px-3 py-1 transition ${useScan ? "bg-foreground text-background" : "bg-background text-foreground hover:bg-muted"}`}>
                      {t("review.scan")}
                    </button>
                    <button type="button" onClick={() => setUseScan(false)}
                      className={`px-3 py-1 transition ${!useScan ? "bg-foreground text-background" : "bg-background text-foreground hover:bg-muted"}`}>
                      {t("review.original")}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">{t("review.onlyOriginal")}</span>
                )}
              </div>
              <div className="flex max-h-[60dvh] justify-center overflow-auto rounded-2xl border border-border bg-muted">
                {(() => {
                  const src = useScan && initial?.scanUrl ? initial.scanUrl : initial?.originalUrl;
                  if (!src) return null;
                  const isPdf =
                    (!useScan || !initial?.scanUrl) &&
                    (initial?.mime === "application/pdf" || /\.pdf(\?|$)/i.test(src));
                  return isPdf ? (
                    <PdfCanvas url={src} className="w-full" />
                  ) : (
                    <img src={src} alt={useScan ? t("review.scan") : t("review.original")}
                      className="w-auto max-w-full object-contain" />
                  );
                })()}
              </div>
              {initial?.mime === "application/pdf" && initial?.originalUrl && (
                <a href={initial.originalUrl} target="_blank" rel="noreferrer"
                  className="text-xs font-medium text-primary hover:underline">
                  Åbn PDF i ny fane
                </a>
              )}

              {initial?.scanUrl && !useScan && (
                <p className="text-xs text-muted-foreground">{t("review.originalNote")}</p>
              )}
            </div>
          )}

          <div className="flex min-w-0 flex-col gap-4">
            {duplicates.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t("review.dup.title")}</AlertTitle>
                <AlertDescription>
                  {t("review.dup.desc.pre")} {duplicates.length}{" "}
                  {duplicates.length === 1 ? t("review.dup.doc.one") : t("review.dup.doc.many")}{" "}
                  {t("review.dup.desc.mid")} “{fields.company}” {t("review.dup.desc.on")}{" "}
                  {fields.issued_date} {t("review.dup.desc.suffix")}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="company">{t("review.field.company")}</Label>
                <CompanyCombobox id="company" value={fields.company} onChange={(v) => set("company", v)}
                  placeholder={t("review.field.companyPh")} suggestions={companySuggestions} />
              </div>

              <div>
                <Label htmlFor="amount">{t("review.field.amount")}</Label>
                <Input id="amount" type="number" step="0.01" min="0"
                  value={Number.isFinite(fields.amount) ? fields.amount : 0}
                  onChange={(e) => set("amount", parseFloat(e.target.value) || 0)} />
              </div>

              <div>
                <Label htmlFor="currency">{t("review.field.currency")}</Label>
                <Select value={fields.currency} onValueChange={(v) => set("currency", v)}>
                  <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="issued_date">{t("review.field.date")}</Label>
                <Input id="issued_date" type="date" value={fields.issued_date ?? ""}
                  onChange={(e) => set("issued_date", e.target.value || null)} />
              </div>

              <div>
                <Label htmlFor="document_type">{t("review.field.type")}</Label>
                <Select value={fields.document_type}
                  onValueChange={(v) => set("document_type", v === "invoice" ? "invoice" : "receipt")}>
                  <SelectTrigger id="document_type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receipt">{t("docs.type.receipt")}</SelectItem>
                    <SelectItem value="invoice">{t("docs.type.invoice")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="due_date">
                  {t("review.field.due")}{" "}
                  {fields.document_type === "receipt" && <span className="text-muted-foreground">({t("common.optional")})</span>}
                </Label>
                <Input id="due_date" type="date" value={fields.due_date ?? ""}
                  onChange={(e) => set("due_date", e.target.value || null)} />
              </div>

              <div>
                <Label htmlFor="category">{t("review.field.category")}</Label>
                <Select value={fields.category ?? "Other"} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{tCategory(c)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="notes">{t("review.field.notes")}</Label>
                <Textarea id="notes" rows={2} value={fields.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <ItemsEditor items={fields.items} currency={fields.currency} onChange={(items: LineItem[]) => set("items", items)} />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("app.saving")}</> : t("review.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

