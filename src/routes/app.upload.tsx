import { createFileRoute } from "@tanstack/react-router";
import { UploadCloud, Sparkles, FileText } from "lucide-react";

import { PageHeader } from "@/components/atoms/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/atoms/empty-state";

export const Route = createFileRoute("/app/upload")({
  head: () => ({
    meta: [
      { title: "Upload — Kvittr" },
      { name: "description", content: "Drop a receipt or invoice and Kvittr will read it for you." },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Add a document"
        description="Snap, drop, or attach — we'll fill in the rest."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="shadow-soft flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-border bg-gradient-card p-10 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-lavender text-lavender-foreground">
              <UploadCloud className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Drop your receipts here</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                PDFs, photos, screenshots — anything works. Up to 10 files at a time.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button className="rounded-full">Choose files</Button>
              <Button variant="outline" className="rounded-full">
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
              Kvittr reads each document and prefills the company, amount, date, and category.
              You only confirm.
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
              <span className="h-1.5 w-1.5 rounded-full bg-status-paid" /> Suggests a category
            </li>
          </ul>
        </aside>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-foreground">Recent uploads</h2>
        <EmptyState
          icon={FileText}
          title="Nothing here yet"
          description="Once you upload your first document, it'll appear here while we extract the details."
        />
      </section>
    </div>
  );
}
