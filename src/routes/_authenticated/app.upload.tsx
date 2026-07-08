import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UploadCloud, Sparkles, FileText, Loader2, Eye, Download } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/atoms/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/atoms/empty-state";
import { MoneyAmount } from "@/components/atoms/money-amount";
import { StatusBadge } from "@/components/atoms/status-badge";
import { PdfViewerDialog } from "@/components/pdf-viewer-dialog";
import { ReceiptReviewDialog } from "@/components/receipt-review-dialog";
import { useLang } from "@/lib/i18n";
import {
  extractReceipt,
  listMyReceipts,
  getReceiptPdfUrl,
  type ExtractResult,
} from "@/lib/receipts.functions";

export const Route = createFileRoute("/_authenticated/app/upload")({
  head: () => ({
    meta: [
      { title: "Upload — Kvitregn" },
      { name: "description", content: "Læg en kvittering eller faktura ind — Kvitregn læser den for dig." },
    ],
  }),
  component: UploadPage,
});

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const ACCEPTED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
]);
const ACCEPTED_EXT = /\.(pdf|jpe?g|png|heic|heif)$/i;

function isAcceptedFile(f: File): boolean {
  if (f.type && ACCEPTED_MIME.has(f.type.toLowerCase())) return true;
  // Some browsers give empty type for HEIC — fall back to extension.
  return ACCEPTED_EXT.test(f.name);
}

function UploadPage() {
  const { lang } = useLang();
  const qc = useQueryClient();
  const extractFn = useServerFn(extractReceipt);
  const listFn = useServerFn(listMyReceipts);
  const pdfUrlFn = useServerFn(getReceiptPdfUrl);

  const inputRef = useRef<HTMLInputElement>(null);
  const [pdfState, setPdfState] = useState<{ open: boolean; url: string | null; title: string }>({
    open: false,
    url: null,
    title: "",
  });
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewData, setReviewData] = useState<ExtractResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState<string>("");

  const receipts = useQuery({
    queryKey: ["receipts"],
    queryFn: () => listFn(),
  });

  const extract = useMutation({
    mutationFn: async (file: File) => {
      setProgress(10);
      setProgressLabel("Uploader fil…");
      const fd = new FormData();
      fd.append("file", file);
      // Simulate visible progress while the server function runs.
      const timer = setInterval(() => {
        setProgress((p) => {
          if (p < 40) {
            setProgressLabel("Uploader fil…");
            return p + 5;
          }
          if (p < 85) {
            setProgressLabel("AI aflæser dokumentet…");
            return p + 3;
          }
          return p;
        });
      }, 300);
      try {
        const res = await extractFn({ data: fd });
        setProgress(100);
        setProgressLabel("Klar til gennemgang");
        return res;
      } finally {
        clearInterval(timer);
      }
    },
    onSuccess: (res) => {
      setReviewData(res);
      setReviewOpen(true);
      setTimeout(() => {
        setProgress(0);
        setProgressLabel("");
      }, 400);
    },
    onError: (e: unknown) => {
      setProgress(0);
      setProgressLabel("");
      toast.error("Upload mislykkedes", {
        description: e instanceof Error ? e.message : "Prøv igen.",
      });
    },
  });

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!isAcceptedFile(file)) {
      toast.error("Filtype ikke understøttet", {
        description: "Vi accepterer kun PDF, JPG, PNG eller HEIC.",
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Filen er for stor", {
        description: `Maksimal størrelse er ${Math.round(MAX_BYTES / (1024 * 1024))} MB.`,
      });
      return;
    }
    extract.mutate(file);
  };

  const openPdf = async (id: string, title: string) => {
    setPdfState({ open: true, url: null, title });
    try {
      const { url } = await pdfUrlFn({ data: { id } });
      setPdfState({ open: true, url, title });
    } catch (e) {
      toast.error("Kunne ikke åbne PDF", {
        description: e instanceof Error ? e.message : "Prøv igen",
      });
      setPdfState({ open: false, url: null, title: "" });
    }
  };

  const isBusy = extract.isPending;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Tilføj et dokument"
        description="Tag et billede, træk det ind eller vedhæft — vi udfylder resten."
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
                {isBusy ? progressLabel || "Arbejder…" : "Slip dine kvitteringer her"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                PDF, JPG, PNG eller HEIC — op til 15 MB. Vi laver hver enkelt til en pæn PDF.
              </p>
            </div>

            {isBusy && (
              <div className="w-full max-w-xs">
                <Progress value={progress} />
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.heic,.heif"
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button className="rounded-full" onClick={() => inputRef.current?.click()} disabled={isBusy}>
                Vælg fil
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => inputRef.current?.click()}
                disabled={isBusy}
              >
                Tag et billede
              </Button>
            </div>
          </div>
        </div>

        <aside className="shadow-soft flex flex-col gap-4 rounded-3xl border border-border bg-card p-6">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-mint text-mint-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">AI klarer skrivearbejdet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Kvitregn læser hvert dokument og foreslår firma, beløb, dato og kategori. Du gennemgår og retter
              før vi gemmer.
            </p>
          </div>
          <ul className="flex flex-col gap-2 text-sm text-foreground">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-status-paid" /> Virker på dansk og engelsk
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-status-paid" /> Skelner kvittering fra faktura
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-status-paid" /> Advarer om dubletter
            </li>
          </ul>
        </aside>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-foreground">Seneste uploads</h2>
        {receipts.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Indlæser…
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
                      {r.issued_date ?? ""} · {r.category ?? "Ukategoriseret"} ·{" "}
                      {r.document_type === "invoice" ? "faktura" : "kvittering"}
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
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> Se PDF
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
            title="Ingen dokumenter endnu"
            description="Så snart du uploader dit første dokument, dukker det op her mens vi aflæser detaljerne."
          />
        )}
      </section>

      <PdfViewerDialog
        open={pdfState.open}
        onOpenChange={(o) => setPdfState((s) => ({ ...s, open: o }))}
        url={pdfState.url}
        title={pdfState.title}
      />

      <ReceiptReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        initial={reviewData}
        lang={lang}
        onSaved={() => qc.invalidateQueries({ queryKey: ["receipts"] })}
      />
    </div>
  );
}
