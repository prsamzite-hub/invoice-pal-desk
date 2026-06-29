import { createFileRoute } from "@tanstack/react-router";
import { Filter, Plus } from "lucide-react";

import { PageHeader } from "@/components/atoms/page-header";
import { SearchBar } from "@/components/atoms/search-bar";
import { DocumentCard, type DocumentCardData } from "@/components/atoms/document-card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/documents")({
  head: () => ({
    meta: [
      { title: "Documents — Kvittr" },
      { name: "description", content: "All your receipts and invoices, searchable and filterable." },
    ],
  }),
  component: DocumentsPage,
});

const DOCS: DocumentCardData[] = [
  { id: "1", company: "Netto", amount: 247.5, issuedDate: "2026-06-26", status: "paid", type: "receipt", category: { label: "Groceries", tone: "mint" } },
  { id: "2", company: "Ørsted", amount: 892, issuedDate: "2026-06-22", dueDate: "2026-07-05", status: "unpaid", type: "invoice", category: { label: "Utilities", tone: "sky" } },
  { id: "3", company: "Telenor", amount: 199, issuedDate: "2026-06-18", dueDate: "2026-06-25", status: "overdue", type: "invoice", category: { label: "Subscriptions", tone: "lavender" } },
  { id: "4", company: "Joe & The Juice", amount: 68, issuedDate: "2026-06-15", status: "paid", type: "receipt", category: { label: "Dining", tone: "peach" } },
  { id: "5", company: "DSB", amount: 124, issuedDate: "2026-06-12", status: "paid", type: "receipt", category: { label: "Transport", tone: "sky" } },
  { id: "6", company: "Spotify", amount: 99, issuedDate: "2026-06-08", dueDate: "2026-06-30", status: "unpaid", type: "invoice", category: { label: "Subscriptions", tone: "lavender" } },
  { id: "7", company: "Føtex", amount: 412.2, issuedDate: "2026-06-05", status: "paid", type: "receipt", category: { label: "Groceries", tone: "mint" } },
  { id: "8", company: "Magasin", amount: 1289, issuedDate: "2026-06-02", status: "paid", type: "receipt", category: { label: "Shopping", tone: "butter" } },
];

const TABS = ["All", "Receipts", "Invoices", "Unpaid"] as const;

function DocumentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Documents"
        description="Every kvittering and faktura you've tracked."
        actions={
          <Button className="rounded-full">
            <Plus className="mr-2 h-4 w-4" />
            New document
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar />
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full bg-muted p-1">
            {TABS.map((t, i) => (
              <button
                key={t}
                className={
                  i === 0
                    ? "rounded-full bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-soft"
                    : "rounded-full px-3 py-1 text-xs font-medium text-muted-foreground"
                }
              >
                {t}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="rounded-full">
            <Filter className="mr-2 h-3.5 w-3.5" />
            Filter
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {DOCS.map((d) => (
          <DocumentCard key={d.id} doc={d} />
        ))}
      </div>
    </div>
  );
}
