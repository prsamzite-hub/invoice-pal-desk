import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { zipSync, strToU8 } from "fflate";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { SegmentedControl } from "@/components/atoms/segmented-control";
import { getExportManifest, getExportPdfBatch } from "@/lib/export.functions";
import { quickRange, type ExportScope, type QuickRange } from "@/lib/export-format";
import { useLang } from "@/lib/i18n";

const QUICK: { key: QuickRange; label: string }[] = [
  { key: "thisMonth", label: "Denne måned" },
  { key: "lastMonth", label: "Sidste måned" },
  { key: "thisQuarter", label: "Dette kvartal" },
  { key: "lastQuarter", label: "Sidste kvartal" },
  { key: "thisYear", label: "I år" },
];

const BATCH = 5;

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function ExportDialog({ defaultScope = "business" }: { defaultScope?: ExportScope }) {
  const { lang } = useLang();
  const manifestFn = useServerFn(getExportManifest);
  const batchFn = useServerFn(getExportPdfBatch);

  const [open, setOpen] = useState(false);
  const initial = quickRange("thisMonth");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [scope, setScope] = useState<ExportScope>(defaultScope);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);

  const applyQuick = (k: QuickRange) => {
    const r = quickRange(k);
    setFrom(r.from);
    setTo(r.to);
  };

  const run = async () => {
    setBusy(true);
    setDone(0);
    setTotal(0);
    try {
      const { docs, csv } = await manifestFn({ data: { from, to, scope } });
      if (!docs.length) {
        toast.error("Ingen dokumenter i den valgte periode");
        return;
      }
      setTotal(docs.length);
      const files: Record<string, Uint8Array> = {
        "bogholder.csv": strToU8("\uFEFF" + csv),
      };
      const seen = new Set<string>();
      for (let i = 0; i < docs.length; i += BATCH) {
        const slice = docs.slice(i, i + BATCH);
        const res = await batchFn({
          data: { ids: slice.map((d) => d.id), lang: lang === "en" ? "en" : "da" },
        });
        for (const r of res) {
          const doc = slice.find((d) => d.id === r.id);
          if (!doc || !r.base64) continue;
          let name = doc.filename;
          let n = 2;
          while (seen.has(name)) name = doc.filename.replace(/\.pdf$/, `-${n++}.pdf`);
          seen.add(name);
          files[name] = b64ToBytes(r.base64);
        }
        setDone(Math.min(i + BATCH, docs.length));
      }

      const zipped = zipSync(files, { level: 0 });
      const blob = new Blob([zipped as unknown as BlobPart], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kvitregn-eksport_${from}_${to}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success(`Eksport klar — ${docs.length} bilag`);
      setOpen(false);
    } catch (e) {
      console.error("[export]", e);
      toast.error("Eksporten mislykkedes. Prøv igen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (busy ? null : setOpen(o))}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full">
          <Download className="mr-2 h-4 w-4" />
          Eksportér til bogholder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Eksportér til bogholder</DialogTitle>
          <DialogDescription>
            Download en ZIP-fil med alle bilags-PDF'er og en CSV-oversigt (semikolon-separeret til
            dansk Excel).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <Button
                key={q.key}
                type="button"
                size="sm"
                variant="secondary"
                className="rounded-full"
                onClick={() => applyQuick(q.key)}
                disabled={busy}
              >
                {q.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="export-from">Fra dato</Label>
              <Input
                id="export-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="export-to">Til dato</Label>
              <Input
                id="export-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Bilag</Label>
            <SegmentedControl<ExportScope>
              ariaLabel="Bilagstype"
              value={scope}
              onChange={setScope}
              options={[
                { value: "all", label: "Alle" },
                { value: "private", label: "Privat" },
                { value: "business", label: "Erhverv" },
              ]}
            />
          </div>

          {busy && (
            <div className="space-y-2">
              <Progress value={total ? (done / total) * 100 : 8} />
              <p className="text-sm text-muted-foreground">
                {total
                  ? `Henter bilag ${Math.min(done, total)} af ${total}…`
                  : "Finder dokumenter…"}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Annullér
          </Button>
          <Button onClick={run} disabled={busy || !from || !to} className="rounded-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Eksportér
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
