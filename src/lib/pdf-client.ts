// Browser-only PDF handling. Dynamically imported so pdfjs never enters the
// SSR/worker bundle. Extracts the text layer when the PDF has one, otherwise
// renders the first pages to JPEG for the vision model.
export interface PdfExtraction {
  text: string | null; // meaningful text layer, if any
  pageImages: Blob[]; // rendered page images (only when no text layer)
}

const MAX_PAGES = 2;

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  return pdfjs;
}

export function isPdfFile(f: File): boolean {
  return f.type === "application/pdf" || /\.pdf$/i.test(f.name);
}

export async function extractFromPdf(file: File): Promise<PdfExtraction> {
  if (typeof window === "undefined") throw new Error("client only");
  const pdfjs = await loadPdfjs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages = Math.min(doc.numPages, MAX_PAGES);

  // 1) Try the text layer.
  let text = "";
  for (let p = 1; p <= pages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => (typeof (it as { str?: string }).str === "string" ? (it as { str: string }).str : ""))
      .join(" ");
    text += `\n\n--- Side ${p} ---\n${pageText}`;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  const letters = compact.replace(/[^\p{L}\p{N}]/gu, "").length;
  if (letters >= 120) {
    return { text: text.trim(), pageImages: [] };
  }

  // 2) Scanned/image-only PDF → render pages to JPEG.
  const pageImages: Blob[] = [];
  for (let p = 1; p <= pages; p++) {
    const page = await doc.getPage(p);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2200 / Math.max(base.width, base.height), 3);
    const viewport = page.getViewport({ scale: scale > 0 ? scale : 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport } as never).promise;
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.9));
    if (blob) pageImages.push(blob);
  }
  return { text: null, pageImages };
}
