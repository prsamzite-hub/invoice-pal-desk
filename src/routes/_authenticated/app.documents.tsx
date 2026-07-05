import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Plus, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/atoms/page-header";
import { SearchBar } from "@/components/atoms/search-bar";
import { DocumentCard, type DocumentCardData } from "@/components/atoms/document-card";
import { DocumentDetailSheet } from "@/components/document-detail-sheet";
import { EmptyState } from "@/components/atoms/empty-state";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { listMyReceipts, getReceiptPdfUrl } from "@/lib/receipts.functions";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/app/documents")({
  head: () => ({
    meta: [
      { title: "Documents — Kvittr" },
      { name: "description", content: "All your receipts and invoices, searchable and filterable." },
    ],
  }),
  component: DocumentsPage,
});

type Tab = "all" | "receipts" | "invoices" | "unpaid";

const CATEGORY_TONE: Record<string, "mint" | "peach" | "lavender" | "butter" | "sky"> = {
  Groceries: "mint",
  Dagligvarer: "mint",
  Utilities: "sky",
  Forsyning: "sky",
  Subscriptions: "lavender",
  Abonnementer: "lavender",
  Dining: "peach",
  Mad: "peach",
  Shopping: "butter",
  Transport: "sky",
};

function toneFor(cat?: string | null) {
  if (!cat) return "lavender" as const;
  return CATEGORY_TONE[cat] ?? "lavender";
}

function deriveStatus(row: { status: string; due_date: string | null }): "paid" | "unpaid" | "overdue" {
  if (row.status === "paid") return "paid";
  const today = new Date().toISOString().slice(0, 10);
  if (row.due_date && row.due_date < today) return "overdue";
  return "unpaid";
}

function DocumentsPage() {
  const { t } = useLang();
  const listFn = useServerFn(listMyReceipts);
  const pdfUrlFn = useServerFn(getReceiptPdfUrl);

  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const receipts = useQuery({ queryKey: ["receipts"], queryFn: () => listFn() });

  const docs: DocumentCardData[] = useMemo(() => {
    const rows = receipts.data ?? [];
    return rows.map((r) => ({
      id: r.id,
      company: r.company,
      amount: Number(r.amount),
      currency: r.currency,
      issuedDate: r.issued_date ?? r.created_at,
      dueDate: r.due_date,
      status: deriveStatus(r),
      type: (r.document_type as "receipt" | "invoice") ?? "receipt",
      category: r.category ? { label: r.category, tone: toneFor(r.category) } : undefined,
    }));
  }, [receipts.data]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return docs.filter((d) => {
      if (tab === "receipts" && d.type !== "receipt") return false;
      if (tab === "invoices" && d.type !== "invoice") return false;
      if (tab === "unpaid" && d.status === "paid") return false;
      if (!term) return true;
      return (
        d.company.toLowerCase().includes(term) ||
        (d.category?.label ?? "").toLowerCase().includes(term)
      );
    });
  }, [docs, tab, q]);

  const selected = docs.find((d) => d.id === selectedId) ?? null;

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

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: "all", label: t("docs.tab.all") },
    { id: "receipts", label: t("docs.tab.receipts") },
    { id: "invoices", label: t("docs.tab.invoices") },
    { id: "unpaid", label: t("docs.tab.unpaid") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("docs.title")}
        description={t("docs.description")}
        actions={
          <Button asChild className="rounded-full">
            <Link to="/app/upload">
              <Plus className="mr-2 h-4 w-4" />
              {t("docs.new")}
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar value={q} onChange={setQ} placeholder={t("docs.search")} />
        <div className="inline-flex rounded-full bg-muted p-1">
          {TABS.map((tt) => (
            <button
              key={tt.id}
              onClick={() => setTab(tt.id)}
              className={
                tab === tt.id
                  ? "rounded-full bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-soft"
                  : "rounded-full px-3 py-1 text-xs font-medium text-muted-foreground"
              }
            >
              {tt.label}
            </button>
          ))}
        </div>
      </div>

      {receipts.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t("docs.empty")}
          description={t("docs.emptyDesc")}
        />
      ) : (
        <div className="flex flex-col gap-3">
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
