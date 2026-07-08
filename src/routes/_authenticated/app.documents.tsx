import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { FileText, Filter, Plus, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import { PageHeader } from "@/components/atoms/page-header";
import { SearchBar } from "@/components/atoms/search-bar";
import { DocumentCard, type DocumentCardData } from "@/components/atoms/document-card";
import { DocumentDetailSheet, type DetailRow } from "@/components/document-detail-sheet";
import { EmptyState } from "@/components/atoms/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { deriveReceiptStatus, type ReceiptStatus } from "@/components/atoms/status-badge";
import {
  CATEGORIES,
  getReceiptPdfUrl,
  listMyReceipts,
} from "@/lib/receipts.functions";

const CATEGORY_LABELS_DA: Record<string, string> = {
  Groceries: "Dagligvarer",
  Utilities: "Forsyning",
  Subscriptions: "Abonnementer",
  Dining: "Mad ude",
  Transport: "Transport",
  Shopping: "Shopping",
  Health: "Sundhed",
  Other: "Andet",
};
const labelForCategory = (c?: string | null) =>
  (c && CATEGORY_LABELS_DA[c]) || c || "Andet";

export const Route = createFileRoute("/_authenticated/app/documents")({
  head: () => ({
    meta: [
      { title: "Dokumenter — Kvitregn" },
      {
        name: "description",
        content: "Alle dine kvitteringer og fakturaer — søgbare og filtrerbare.",
      },
    ],
  }),
  component: DocumentsPage,
});

type TypeFilter = "all" | "receipt" | "invoice";
type StatusFilter = "all" | "paid" | "unpaid" | "overdue";
type SortKey = "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "company_asc";

const CATEGORY_TONE: Record<string, "mint" | "peach" | "lavender" | "butter" | "sky"> = {
  Groceries: "mint",
  Utilities: "sky",
  Subscriptions: "lavender",
  Dining: "peach",
  Shopping: "butter",
  Transport: "sky",
  Health: "mint",
  Other: "lavender",
};

function toneFor(cat?: string | null) {
  if (!cat) return "lavender" as const;
  return CATEGORY_TONE[cat] ?? "lavender";
}

interface EnrichedDoc extends DocumentCardData {
  notes: string | null;
  categoryRaw: string | null;
  amountNumber: number;
  dateIso: string;
}

function DocumentsPage() {
  const listFn = useServerFn(listMyReceipts);
  const pdfUrlFn = useServerFn(getReceiptPdfUrl);

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("date_desc");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const receipts = useQuery({ queryKey: ["receipts"], queryFn: () => listFn() });

  const docs: EnrichedDoc[] = useMemo(() => {
    const rows = receipts.data ?? [];
    return rows.map((r) => {
      const status: ReceiptStatus = deriveReceiptStatus(r);
      return {
        id: r.id,
        company: r.company,
        amount: Number(r.amount),
        amountNumber: Number(r.amount),
        currency: r.currency,
        issuedDate: r.issued_date ?? r.created_at,
        dateIso: (r.issued_date ?? r.created_at).slice(0, 10),
        dueDate: r.due_date,
        status,
        type: (r.document_type as "receipt" | "invoice") ?? "receipt",
        category: r.category
          ? { label: r.category, tone: toneFor(r.category) }
          : undefined,
        categoryRaw: r.category ?? null,
        notes: r.notes ?? null,
      };
    });
  }, [receipts.data]);

  const filtered = useMemo(() => {
    const term = q.trim();
    const lowered = term.toLowerCase();
    const normalized = term.replace(/\s/g, "").replace(",", ".");
    const isAmountPrefix = /^\d+(\.\d*)?$/.test(normalized) && normalized.length > 0;
    const list = docs.filter((d) => {
      if (typeFilter !== "all" && d.type !== typeFilter) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (category !== "all" && d.categoryRaw !== category) return false;
      if (dateFrom && d.dateIso < dateFrom) return false;
      if (dateTo && d.dateIso > dateTo) return false;
      if (!term) return true;
      const catLabel = labelForCategory(d.categoryRaw).toLowerCase();
      const inText =
        d.company.toLowerCase().includes(lowered) ||
        (d.categoryRaw ?? "").toLowerCase().includes(lowered) ||
        catLabel.includes(lowered) ||
        (d.notes ?? "").toLowerCase().includes(lowered);
      let inAmount = false;
      if (isAmountPrefix) {
        const amtStr = String(d.amountNumber);
        const amtFixed = d.amountNumber.toFixed(2);
        inAmount = amtStr.startsWith(normalized) || amtFixed.startsWith(normalized);
      }
      return inText || inAmount;
    });

    list.sort((a, b) => {
      switch (sort) {
        case "date_asc":
          return a.dateIso.localeCompare(b.dateIso);
        case "amount_desc":
          return b.amountNumber - a.amountNumber;
        case "amount_asc":
          return a.amountNumber - b.amountNumber;
        case "company_asc":
          return a.company.localeCompare(b.company, "da");
        case "date_desc":
        default:
          return b.dateIso.localeCompare(a.dateIso);
      }
    });
    return list;
  }, [docs, q, typeFilter, statusFilter, category, dateFrom, dateTo, sort]);

  const selected: DetailRow | null = useMemo(() => {
    const found = docs.find((d) => d.id === selectedId);
    if (!found) return null;
    return { ...found, notes: found.notes };
  }, [docs, selectedId]);

  const openDoc = async (id: string) => {
    setSelectedId(id);
    setPdfUrl(null);
    try {
      const { url } = await pdfUrlFn({ data: { id } });
      setPdfUrl(url);
    } catch {
      setPdfUrl(null);
    }
  };

  const activeFilterCount =
    (typeFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (category !== "all" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const clearFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setCategory("all");
    setDateFrom("");
    setDateTo("");
  };

  const isEmpty = (receipts.data?.length ?? 0) === 0;
  const noMatches = !isEmpty && filtered.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dokumenter"
        description="Alle dine kvitteringer og fakturaer."
        actions={
          <Button asChild className="rounded-full">
            <Link to="/app/upload">
              <Plus className="mr-2 h-4 w-4" />
              Nyt dokument
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchBar
            value={q}
            onChange={setQ}
            placeholder="Søg efter firma, beløb, note…"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="rounded-full">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtre
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2 rounded-full">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={typeFilter}
                      onValueChange={(v) => setTypeFilter(v as TypeFilter)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        <SelectItem value="receipt">Kvittering</SelectItem>
                        <SelectItem value="invoice">Faktura</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={statusFilter}
                      onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        <SelectItem value="paid">Betalt</SelectItem>
                        <SelectItem value="unpaid">Ubetalt</SelectItem>
                        <SelectItem value="overdue">Forfalden</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Kategori</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle kategorier</SelectItem>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{labelForCategory(c)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="from">Fra dato</Label>
                    <Input
                      id="from"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="to">Til dato</Label>
                    <Input
                      id="to"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full rounded-full"
                    onClick={clearFilters}
                  >
                    <X className="mr-2 h-4 w-4" /> Nulstil filtre
                  </Button>
                )}
              </PopoverContent>
            </Popover>

            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-44 rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Nyeste først</SelectItem>
                <SelectItem value="date_asc">Ældste først</SelectItem>
                <SelectItem value="amount_desc">Højeste beløb</SelectItem>
                <SelectItem value="amount_asc">Laveste beløb</SelectItem>
                <SelectItem value="company_asc">Firma A–Å</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Filtre aktive:</span>
            {typeFilter !== "all" && (
              <Badge variant="secondary" className="rounded-full">
                {typeFilter === "receipt" ? "Kvittering" : "Faktura"}
              </Badge>
            )}
            {statusFilter !== "all" && (
              <Badge variant="secondary" className="rounded-full">
                {statusFilter === "paid"
                  ? "Betalt"
                  : statusFilter === "unpaid"
                    ? "Ubetalt"
                    : "Forfalden"}
              </Badge>
            )}
            {category !== "all" && (
              <Badge variant="secondary" className="rounded-full">{category}</Badge>
            )}
            {dateFrom && (
              <Badge variant="secondary" className="rounded-full">Fra {dateFrom}</Badge>
            )}
            {dateTo && (
              <Badge variant="secondary" className="rounded-full">Til {dateTo}</Badge>
            )}
          </div>
        )}
      </div>

      {receipts.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shadow-soft flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-14" />
              </div>
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={FileText}
          title="Ingen dokumenter endnu"
          description="Upload din første kvittering eller faktura, så samler vi alt her — søgbart, sorterbart og klar til deling."
          action={
            <Button asChild className="rounded-full">
              <Link to="/app/upload">
                <Plus className="mr-2 h-4 w-4" />
                Upload dit første dokument
              </Link>
            </Button>
          }
        />
      ) : noMatches ? (
        <EmptyState
          icon={FileText}
          title="Ingen dokumenter matcher"
          description="Prøv at ændre din søgning eller nulstille filtrene."
          action={
            <Button variant="outline" className="rounded-full" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" /> Nulstil filtre
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Viser {filtered.length} af {docs.length} dokument{docs.length === 1 ? "" : "er"}
          </p>
          {filtered.map((d) => (
            <DocumentCard key={d.id} doc={d} onClick={() => openDoc(d.id)} />
          ))}
        </div>
      )}

      <DocumentDetailSheet
        doc={selected}
        open={selectedId !== null}
        onOpenChange={(o) => {
          if (!o) {
            setSelectedId(null);
            setPdfUrl(null);
          }
        }}
        fileUrl={pdfUrl}
      />
    </div>
  );
}
