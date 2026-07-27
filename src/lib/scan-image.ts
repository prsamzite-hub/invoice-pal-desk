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

// HEIC conversion lives in src/lib/heic.ts so heic2any is only pulled in
// via a separate dynamic import when a .heic file is actually selected.


/* eslint-disable @typescript-eslint/no-explicit-any */

// Order 4 points as [tl, tr, br, bl] using x+y sum and x-y diff.
function orderQuad(pts: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  const bySum = [...pts].sort((a, b) => a.x + a.y - (b.x + b.y));
  const tl = bySum[0];
  const br = bySum[3];
  const byDiff = [...pts].sort((a, b) => a.x - a.y - (b.x - b.y));
  const bl = byDiff[0];
  const tr = byDiff[3];
  return [tl, tr, br, bl];
}

// Detect the largest, most rectangular 4-point contour. Runs on a downscaled
// copy for speed and robustness, then rescales the quad to source coordinates.
function detectPaperQuad(
  cv: any,
  srcCanvas: HTMLCanvasElement,
): Array<{ x: number; y: number }> | null {
  const DETECT_MAX = 1000;
  const scale = Math.min(1, DETECT_MAX / Math.max(srcCanvas.width, srcCanvas.height));
  let work: HTMLCanvasElement = srcCanvas;
  if (scale < 1) {
    work = document.createElement("canvas");
    work.width = Math.max(1, Math.round(srcCanvas.width * scale));
    work.height = Math.max(1, Math.round(srcCanvas.height * scale));
    const wctx = work.getContext("2d");
    if (!wctx) return null;
    wctx.drawImage(srcCanvas, 0, 0, work.width, work.height);
  }

  const invScale = srcCanvas.width / work.width;
  const imgArea = work.width * work.height;

  const src = cv.imread(work);
  const gray = new cv.Mat();
  const blur = new cv.Mat();
  const thresh = new cv.Mat();
  const dilated = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
    // Adaptive threshold copes with uneven lighting far better than raw Canny
    // for receipts on desks / hands / dark backgrounds.
    cv.adaptiveThreshold(
      blur,
      thresh,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      15,
      10,
    );
    cv.dilate(thresh, dilated, kernel, new cv.Point(-1, -1), 2);
    cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const candidates: Array<{ index: number; area: number }> = [];
    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i);
      const a = cv.contourArea(c);
      if (a / imgArea >= 0.05) candidates.push({ index: i, area: a });
      c.delete();
    }
    candidates.sort((a, b) => b.area - a.area);

    let best: { score: number; pts: Array<{ x: number; y: number }> } | null = null;
    for (const { index } of candidates.slice(0, 15)) {
      const c = contours.get(index);
      const peri = cv.arcLength(c, true);
      const approx = new cv.Mat();
      // Try a few epsilon values — some receipts don't collapse to 4 pts at 0.02.
      let quadMat: any = null;
      for (const eps of [0.02, 0.03, 0.04, 0.05]) {
        cv.approxPolyDP(c, approx, eps * peri, true);
        if (approx.rows === 4 && cv.isContourConvex(approx)) {
          quadMat = approx;
          break;
        }
      }
      try {
        if (quadMat) {
          const area = cv.contourArea(quadMat);
          const ratio = area / imgArea;
          if (ratio >= 0.12 && ratio <= 0.98) {
            const rect = cv.minAreaRect(quadMat);
            const rectArea = rect.size.width * rect.size.height || 1;
            const rectangularity = area / rectArea; // 1.0 = perfect rectangle
            const score = area * Math.max(0.3, rectangularity);
            if (!best || score > best.score) {
              const pts: Array<{ x: number; y: number }> = [];
              for (let k = 0; k < 4; k++) {
                pts.push({
                  x: quadMat.intAt(k, 0) * invScale,
                  y: quadMat.intAt(k, 1) * invScale,
                });
              }
              best = { score, pts: orderQuad(pts) };
            }
          }
        }
      } finally {
        approx.delete();
        c.delete();
      }
    }
    return best?.pts ?? null;
  } finally {
    src.delete();
    gray.delete();
    blur.delete();
    thresh.delete();
    dilated.delete();
    contours.delete();
    hierarchy.delete();
    kernel.delete();
  }
}

function warpToCanvas(
  cv: any,
  srcCanvas: HTMLCanvasElement,
  quad: Array<{ x: number; y: number }>,
): HTMLCanvasElement {
  const [tl, tr, br, bl] = quad;
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  const wTop = dist(tl, tr);
  const wBot = dist(bl, br);
  const hLeft = dist(tl, bl);
  const hRight = dist(tr, br);
  let outW = Math.round(Math.max(wTop, wBot));
  let outH = Math.round(Math.max(hLeft, hRight));
  outW = Math.max(600, Math.min(MAX_DIM, outW));
  outH = Math.max(600, Math.min(MAX_DIM, outH));

  const src = cv.imread(srcCanvas);
  const dst = new cv.Mat();
  const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y,
  ]);
  const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0, outW, 0, outW, outH, 0, outH,
  ]);
  const M = cv.getPerspectiveTransform(srcTri, dstTri);
  try {
    cv.warpPerspective(src, dst, M, new cv.Size(outW, outH), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    cv.imshow(out, dst);
    return out;
  } finally {
    src.delete();
    dst.delete();
    srcTri.delete();
    dstTri.delete();
    M.delete();
  }
}

// Runs edge detection + perspective correction + enhancement on a raw image blob.
// If detection fails or confidence is low, returns the mildly-enhanced raw
// image with ok=false so callers can fall back gracefully.
export async function scanImageBlob(input: Blob): Promise<ScanResult> {
  if (typeof window === "undefined") throw new Error("client only");
  const img = await blobToImage(input);
  const srcCanvas = drawToCanvas(img);

  await loadOpenCV();
  const cv = (window as unknown as { cv: any }).cv;
  try {
    const quad = detectPaperQuad(cv, srcCanvas);
    if (quad) {
      const warped = warpToCanvas(cv, srcCanvas, quad);
      enhance(warped);
      const blob = await canvasToBlob(warped);
      return { blob, ok: true, width: warped.width, height: warped.height };
    }
  } catch (e) {
    console.warn("[scanImageBlob] detection error, falling back", e);
  }
  // Fall back: mild enhancement on the raw photo, no warp. ok=false.
  enhance(srcCanvas);
  const blob = await canvasToBlob(srcCanvas);
  return { blob, ok: false, width: srcCanvas.width, height: srcCanvas.height };
}

