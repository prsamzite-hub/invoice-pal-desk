import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UploadCloud, Sparkles, FileText, Loader2, Eye, Download } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/atoms/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/atoms/empty-state";
import { MoneyAmount } from "@/components/atoms/money-amount";
import { StatusBadge } from "@/components/atoms/status-badge";
import { PdfViewerDialog } from "@/components/pdf-viewer-dialog";
import { useLang } from "@/lib/i18n";
import {
  uploadReceipt,
  listMyReceipts,
  getReceiptPdfUrl,
} from "@/lib/receipts.functions";

export const Route = createFileRoute("/_authenticated/app/upload")({
  head: () => ({
    meta: [
      { title: "Upload — Kvittr" },
      { name: "description", content: "Drop a receipt or invoice and Kvittr will read it for you." },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const qc = useQueryClient();
  const uploadFn = useServerFn(uploadReceipt);
  const listFn = useServerFn(listMyReceipts);
  const pdfUrlFn = useServerFn(getReceiptPdfUrl);

  const inputRef = useRef<HTMLInputElement>(null);
  const [pdfState, setPdfState] = useState<{ open: boolean; url: string | null; title: string }>({
    open: false,
    url: null,
    title: "",
  });

  const receipts = useQuery({
    queryKey: ["receipts"],
    queryFn: () => listFn(),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return await uploadFn({ data: fd });
    },
    onSuccess: (row) => {
      toast.success(`Added ${row.company}`, {
        description: "We extracted the details and generated a PDF.",
      });
      qc.invalidateQueries({ queryKey: ["receipts"] });
    },
    onError: (e: unknown) => {
      toast.error("Upload failed", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    },
  });

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => upload.mutate(f));
  };

  const openPdf = async (id: string, title: string) => {
    setPdfState({ open: true, url: null, title });
    try {
      const { url } = await pdfUrlFn({ data: { id } });
      setPdfState({ open: true, url, title });
    } catch (e) {
      toast.error("Could not open PDF", {
        description: e instanceof Error ? e.message : "Try again",
      });
      setPdfState({ open: false, url: null, title: "" });
    }
  };

  const isBusy = upload.isPending;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Add a document"
        description="Snap, drop, or attach — we'll fill in the rest."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
            className="shadow-soft flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-border bg-gradient-card p-10 text-center"
          >
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-lavender text-lavender-foreground">
              {isBusy ? <Loader2 className="h-7 w-7 animate-spin" /> : <UploadCloud className="h-7 w-7" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {isBusy ? "Reading your document…" : "Drop your receipts here"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                PDFs, photos, screenshots — anything works. We'll turn each one into a clean PDF.
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button className="rounded-full" onClick={() => inputRef.current?.click()} disabled={isBusy}>
                Choose files
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => inputRef.current?.click()}
                disabled={isBusy}
              >
                Take a photo
              </Button>
            </div>
          </div>
        </div>

        <aside className="shadow-soft flex flex-col gap-4 rounded-3xl border border-border bg-card p-6">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-mint text-mint-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">AI does the typing</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Kvittr reads each document, prefills the company, amount, date, and category, then
              generates a polished PDF you can share.
            </p>
          </div>
          <ul className="flex flex-col gap-2 text-sm text-foreground">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-status-paid" /> Works in Danish & English
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-status-paid" /> Detects receipt vs. invoice
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-status-paid" /> Generates a printable PDF
            </li>
          </ul>
        </aside>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-foreground">Recent uploads</h2>
        {receipts.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : receipts.data && receipts.data.length > 0 ? (
          <div className="flex flex-col gap-2">
            {receipts.data.map((r) => (
              <div
                key={r.id}
                className="shadow-soft flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{r.company}</p>
                      <StatusBadge status={r.status as "paid" | "unpaid" | "overdue"} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.issued_date ?? ""} · {r.category ?? "Uncategorized"} ·{" "}
                      {r.document_type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MoneyAmount value={Number(r.amount)} currency={r.currency} />
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={!r.pdf_path}
                    onClick={() => openPdf(r.id, `${r.company} — ${r.issued_date ?? ""}`)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> View PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    disabled={!r.pdf_path}
                    onClick={async () => {
                      const { url } = await pdfUrlFn({ data: { id: r.id } });
                      window.open(url, "_blank");
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="Nothing here yet"
            description="Once you upload your first document, it'll appear here while we extract the details."
          />
        )}
      </section>

      <PdfViewerDialog
        open={pdfState.open}
        onOpenChange={(o) => setPdfState((s) => ({ ...s, open: o }))}
        url={pdfState.url}
        title={pdfState.title}
      />
    </div>
  );
}
