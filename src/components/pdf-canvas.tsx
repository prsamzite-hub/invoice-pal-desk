import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Renders a PDF client-side with PDF.js into canvases.
 * Immune to Chrome's iframe/plugin blocking and iOS Safari's refusal to
 * embed PDFs, and works regardless of Content-Disposition on the file URL.
 */
export function PdfCanvas({
  url,
  className,
  maxPages = 3,
}: {
  url: string;
  className?: string;
  maxPages?: number;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = "";
    setState("loading");

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        // Mobile Safari / older Android WebViews can fail on module workers.
        // Try the worker, and silently fall back to main-thread rendering.
        try {
          const workerSrc = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
          pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
        } catch {
          (pdfjs.GlobalWorkerOptions as { workerSrc?: string }).workerSrc = "";
        }

        const res = await fetch(url, { mode: "cors", credentials: "omit" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = new Uint8Array(await res.arrayBuffer());

        const open = async (useWorker: boolean) => {
          if (!useWorker) {
            (pdfjs.GlobalWorkerOptions as { workerSrc?: string }).workerSrc = "";
          }
          return await pdfjs.getDocument({
            data: data.slice(),
            isEvalSupported: false,
            useWorkerFetch: false,
            disableAutoFetch: true,
            ...(useWorker ? {} : { disableWorker: true }),
          } as never).promise;
        };

        let doc;
        try {
          doc = await open(true);
        } catch (err) {
          console.warn("[PdfCanvas] worker render failed, retrying on main thread", err);
          doc = await open(false);
        }
        if (cancelled) return;

        const width = host.clientWidth || host.parentElement?.clientWidth || 600;
        // iOS Safari hard-caps canvas area (~16.7M px) — keep well below it.
        const MAX_PIXELS = 4_000_000;
        const MAX_SIDE = 4096;
        const pages = Math.min(doc.numPages, maxPages);
        for (let p = 1; p <= pages; p++) {
          const page = await doc.getPage(p);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          let scale = (width / base.width) * Math.min(window.devicePixelRatio || 1, 2);
          const clampSide = Math.min(
            MAX_SIDE / base.width,
            MAX_SIDE / base.height,
            Math.sqrt(MAX_PIXELS / (base.width * base.height)),
          );
          if (scale > clampSide) scale = clampSide;
          if (!Number.isFinite(scale) || scale <= 0) scale = 1;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          canvas.className = "bg-white";
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvas, canvasContext: ctx, viewport } as never).promise;
          if (cancelled) return;
          host.appendChild(canvas);
          setState("ok");
        }
        setState("ok");
      } catch (e) {
        console.error("[PdfCanvas] render failed", e);
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, maxPages]);

  return (
    <div className={className}>
      <div ref={hostRef} className="flex flex-col gap-2" />
      {state === "loading" && (
        <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Indlæser PDF…
        </div>
      )}
      {state === "error" && (
        <div className="p-6 text-center text-sm text-muted-foreground">
          PDF-visning kunne ikke indlæses. Brug linket for at åbne filen i en ny fane.
        </div>
      )}
    </div>
  );
}
