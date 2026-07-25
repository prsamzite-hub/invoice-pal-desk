// Client-only document scanner. Deterministic image processing only:
// edge detection (via OpenCV.js + jscanify), perspective transform (warp),
// and mild readability enhancement (gray-world white balance + gentle contrast).
// No generative AI — the pixels remain the authentic photograph.

const OPENCV_URL = "https://docs.opencv.org/4.10.0/opencv.js";
const MAX_DIM = 2000;

let cvReadyPromise: Promise<void> | null = null;

function loadOpenCV(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("client only"));
  const w = window as unknown as { cv?: { imread?: unknown; onRuntimeInitialized?: () => void } };
  if (w.cv && typeof w.cv.imread === "function") return Promise.resolve();
  if (cvReadyPromise) return cvReadyPromise;

  cvReadyPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-opencv]`);
    const finish = () => {
      const cv = (window as unknown as { cv?: { imread?: unknown; onRuntimeInitialized?: () => void } }).cv;
      if (cv && typeof cv.imread === "function") return resolve();
      if (cv) {
        cv.onRuntimeInitialized = () => resolve();
        return;
      }
      setTimeout(finish, 100);
    };
    if (existing) {
      finish();
      return;
    }
    const s = document.createElement("script");
    s.src = OPENCV_URL;
    s.async = true;
    s.dataset.opencv = "1";
    s.onload = finish;
    s.onerror = () => reject(new Error("Kunne ikke indlæse billedbehandling"));
    document.head.appendChild(s);
  });
  return cvReadyPromise;
}

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Kunne ikke læse billedet"));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

function drawToCanvas(img: HTMLImageElement, max = MAX_DIM): HTMLCanvasElement {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const scale = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas ikke tilgængelig");
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

function canvasToBlob(c: HTMLCanvasElement, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas encode fejl"))), "image/jpeg", quality),
  );
}

// Mild, non-destructive enhancement: gray-world white balance + gentle contrast.
function enhance(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const n = d.length / 4;
  let rs = 0, gs = 0, bs = 0;
  for (let i = 0; i < d.length; i += 4) {
    rs += d[i]; gs += d[i + 1]; bs += d[i + 2];
  }
  const rMean = rs / n || 1, gMean = gs / n || 1, bMean = bs / n || 1;
  const gray = (rMean + gMean + bMean) / 3;
  const rG = gray / rMean, gG = gray / gMean, bG = gray / bMean;
  const contrast = 1.1;
  const intercept = 128 * (1 - contrast);
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = Math.max(0, Math.min(255, d[i]     * rG * contrast + intercept));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] * gG * contrast + intercept));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] * bG * contrast + intercept));
  }
  ctx.putImageData(img, 0, 0);
}

export interface ScanResult {
  blob: Blob;
  ok: boolean; // true if edge detection produced a confident crop
  width: number;
  height: number;
}

export async function heicToJpegIfNeeded(file: File): Promise<File> {
  const isHeic = /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  if (!isHeic) return file;
  try {
    const mod = await import("heic2any");
    const heic2any = (mod as unknown as { default: (o: unknown) => Promise<Blob | Blob[]> }).default;
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    const b = Array.isArray(out) ? out[0] : out;
    return new File([b], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// Runs edge detection + perspective correction + enhancement on a raw image blob.
// If detection fails or confidence is low, returns the mildly-enhanced raw
// image with ok=false so callers can fall back gracefully.
export async function scanImageBlob(input: Blob): Promise<ScanResult> {
  if (typeof window === "undefined") throw new Error("client only");
  const img = await blobToImage(input);
  const srcCanvas = drawToCanvas(img);
  const imgArea = srcCanvas.width * srcCanvas.height;

  try {
    await loadOpenCV();
    const cv = (window as unknown as { cv: any }).cv; // eslint-disable-line @typescript-eslint/no-explicit-any
    const jsMod = await import("jscanify");
    const Scanner = (jsMod as unknown as { default: any }).default ?? (jsMod as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const scanner = new Scanner();

    const mat = cv.imread(srcCanvas);
    try {
      const contour = scanner.findPaperContour(mat);
      if (!contour) throw new Error("no contour");
      const area = cv.contourArea(contour);
      const conf = area / imgArea;
      if (conf < 0.2 || conf > 0.98) throw new Error("low confidence");
      const rect = cv.boundingRect(contour);
      const outW = Math.max(600, Math.min(MAX_DIM, rect.width));
      const outH = Math.max(600, Math.min(MAX_DIM, rect.height));
      const warped = scanner.extractPaper(srcCanvas, outW, outH, contour) as HTMLCanvasElement;
      enhance(warped);
      const blob = await canvasToBlob(warped);
      return { blob, ok: true, width: warped.width, height: warped.height };
    } finally {
      try { mat.delete?.(); } catch { /* noop */ }
    }
  } catch {
    // Fall back: mild enhancement on the raw photo, no warp. ok=false.
    enhance(srcCanvas);
    const blob = await canvasToBlob(srcCanvas);
    return { blob, ok: false, width: srcCanvas.width, height: srcCanvas.height };
  }
}
