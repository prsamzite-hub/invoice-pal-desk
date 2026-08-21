import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { zipSync, strToU8 } from "fflate";
import { Download, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getFullExportManifest, getExportOriginalBatch, getExportPdfBatch } from "@/lib/export.functions";
import { useLang } from "@/lib/i18n";

const BATCH = 5;

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function FullExportCard() {
  const { t, lang } = useLang();
  const manifestFn = useServerFn(getFullExportManifest);
  const pdfFn = useServerFn(getExportPdfBatch);
  const originalFn = useServerFn(getExportOriginalBatch);

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);

  const run = async () => {
    setBusy(true);
    setDone(0);
    setTotal(0);
    try {
      const { docs, csv } = await manifestFn();
      if (!docs.length) {
        toast.error(t("dataexport.empty"));
        return;
      }
      setTotal(docs.length);
      const files: Record<string, Uint8Array> = {
        "alle-data.csv": strToU8("\uFEFF" + csv),
      };
      const seen = new Set<string>();
      for (let i = 0; i < docs.length; i += BATCH) {
        const slice = docs.slice(i, i + BATCH);
        const ids = slice.map((d) => d.id);
        const [pdfs, originals] = await Promise.all([
          pdfFn({ data: { ids, lang: lang === "en" ? "en" : "da" } }),
          originalFn({ data: { ids } }),
        ]);
        for (const doc of slice) {
          let base = doc.filename.replace(/\.pdf$/, "");
          let n = 2;
          while (seen.has(base)) base = `${doc.filename.replace(/\.pdf$/, "")}-${n++}`;
          seen.add(base);
          const pdf = pdfs.find((p) => p.id === doc.id);
          if (pdf?.base64) files[`pdf/${base}.pdf`] = b64ToBytes(pdf.base64);
          const org = originals.find((o) => o.id === doc.id);
          if (org?.base64) files[`originaler/${base}.${org.ext || "bin"}`] = b64ToBytes(org.base64);
        }
        setDone(Math.min(i + BATCH, docs.length));
      }

      const zipped = zipSync(files, { level: 0 });
      const blob = new Blob([zipped as unknown as BlobPart], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kvitregn-alle-mine-data_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success(t("dataexport.ready"));
    } catch (e) {
      console.error("[full-export]", e);
      toast.error(t("dataexport.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="shadow-soft flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
      <div>
        <h2 className="text-base font-bold text-foreground">{t("dataexport.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("dataexport.desc")}</p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs leading-relaxed text-muted-foreground">{t("retention.body")}</p>
      </div>

      {busy && (
        <div className="space-y-2">
          <Progress value={total ? (done / total) * 100 : 8} />
          <p className="text-sm text-muted-foreground">
            {total ? t("dataexport.progress").replace("{done}", String(Math.min(done, total))).replace("{total}", String(total)) : t("dataexport.finding")}
          </p>
        </div>
      )}

      <div>
        <Button onClick={run} disabled={busy} className="rounded-full">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          {t("dataexport.button")}
        </Button>
      </div>
    </section>
  );
}
