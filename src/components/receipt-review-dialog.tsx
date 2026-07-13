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
import { Checkbox } from "@/components/ui/checkbox";
import { ItemsEditor } from "@/components/items-editor";
import { useAppMode } from "@/lib/app-mode";
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
  const [fields, setFields] = useState<ExtractedFields | null>(null);
  const [mode] = useAppMode();
  const findDupFn = useServerFn(findDuplicates);
  const saveFn = useServerFn(saveReceipt);
  const listFn = useServerFn(listMyReceipts);
  const listQ = useQuery({ queryKey: ["receipts"], queryFn: () => listFn(), staleTime: 60_000 });
  const companySuggestions = useMemo(
    () => (listQ.data ?? []).map((r) => r.company).filter(Boolean),
    [listQ.data],
  );

  useEffect(() => {
    if (initial) setFields(initial.extracted);
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
      if (!initial || !fields) throw new Error("Mangler data");
      return await saveFn({ data: { originalPath: initial.originalPath, fields, lang } });
    },
    onSuccess: (row) => {
      toast.success(`Gemt: ${row.company}`);
      onSaved();
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      const raw = e instanceof Error ? e.message : "";
      // Known validation messages (thrown from the server inputValidator) are safe
      // Danish strings and can be shown as-is. Anything else is a technical
      // error (network / bundler / storage) — show a friendly Danish fallback.
      const isFriendly =
        !!raw &&
        raw.length < 120 &&
        !/[_${}]|toESM|undefined|Cannot|Error:|TypeError|extends/i.test(raw);
      if (!isFriendly) {
        console.error("[saveReceipt] failed", e);
      }
      toast.error("Kunne ikke gemme dokumentet", {
        description: isFriendly ? raw : "Noget gik galt. Prøv igen om et øjeblik.",
      });
    },
  });

  if (!fields) return null;

  const set = <K extends keyof ExtractedFields>(k: K, v: ExtractedFields[K]) =>
    setFields((f) => (f ? { ...f, [k]: v } : f));

  const duplicates = dupQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gennemgå og gem</DialogTitle>
          <DialogDescription>
            {initial?.extractionOk
              ? "Tjek at oplysningerne er rigtige — ret dem hvis noget er forkert."
              : "Automatisk aflæsning virkede ikke. Udfyld felterne selv."}
          </DialogDescription>
        </DialogHeader>

        {initial?.extractionOk ? (
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertTitle>AI-forslag</AlertTitle>
            <AlertDescription>Vi har foreslået værdier — ret dem hvis noget ser forkert ud.</AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Kunne ikke aflæse automatisk</AlertTitle>
            <AlertDescription>{initial?.errorMessage ?? "Udfyld felterne manuelt."}</AlertDescription>
          </Alert>
        )}

        {duplicates.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Muligt dublet</AlertTitle>
            <AlertDescription>
              Du har allerede {duplicates.length} dokument{duplicates.length === 1 ? "" : "er"} for “{fields.company}” på{" "}
              {fields.issued_date} med samme beløb. Gem alligevel, hvis det ikke er det samme.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="company">Firma</Label>
            <CompanyCombobox
              id="company"
              value={fields.company}
              onChange={(v) => set("company", v)}
              placeholder="Skriv eller vælg firma"
              suggestions={companySuggestions}
            />
          </div>

          <div>
            <Label htmlFor="amount">Beløb</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={Number.isFinite(fields.amount) ? fields.amount : 0}
              onChange={(e) => set("amount", parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <Label htmlFor="currency">Valuta</Label>
            <Select value={fields.currency} onValueChange={(v) => set("currency", v)}>
              <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="issued_date">Dato</Label>
            <Input
              id="issued_date"
              type="date"
              value={fields.issued_date ?? ""}
              onChange={(e) => set("issued_date", e.target.value || null)}
            />
          </div>

          <div>
            <Label htmlFor="document_type">Type</Label>
            <Select
              value={fields.document_type}
              onValueChange={(v) => set("document_type", v === "invoice" ? "invoice" : "receipt")}
            >
              <SelectTrigger id="document_type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="receipt">Kvittering</SelectItem>
                <SelectItem value="invoice">Faktura</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="due_date">Forfaldsdato {fields.document_type === "receipt" && <span className="text-muted-foreground">(valgfri)</span>}</Label>
            <Input
              id="due_date"
              type="date"
              value={fields.due_date ?? ""}
              onChange={(e) => set("due_date", e.target.value || null)}
            />
          </div>

          <div>
            <Label htmlFor="category">Kategori</Label>
            <Select value={fields.category ?? "Other"} onValueChange={(v) => set("category", v)}>
              <SelectTrigger id="category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="notes">Noter</Label>
            <Textarea id="notes" rows={2} value={fields.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        <ItemsEditor
          items={fields.items}
          currency={fields.currency}
          onChange={(items: LineItem[]) => set("items", items)}
        />





        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Annuller
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gemmer…</> : "Gem dokument"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
