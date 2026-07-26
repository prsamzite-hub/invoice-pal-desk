## Exact build error

```
[UNLOADABLE_DEPENDENCY] Could not load node_modules/unenv/dist/runtime/node/punycode.mjs/
   ╭─[ node_modules/tr46/index.js:3:26 ]
 3 │ const punycode = require("punycode/");
   │                          ─────┬─────
   │                               ╰─── Not a directory (os error 20)
```

Rolldown (Vite 8 Workers SSR build) can't resolve unenv's `punycode` shim while bundling `tr46`. `tr46` is pulled in via `jscanify → jsdom → whatwg-url → tr46`. Even a dynamic `import("jscanify")` from a browser-only module keeps the graph reachable, and `ssr.external` is forbidden on this stack.

## Fix — remove the dependency chain, reimplement detection on raw OpenCV

### 1. Uninstall `jscanify`

- `bun remove jscanify`, then prune stale transitive dirs (`jsdom`, `whatwg-url`, `tr46`, `data-urls`) and `bun install` so the lockfile no longer references them.
- Verify: `ls node_modules/tr46 node_modules/jsdom` → both gone.

### 2. Reimplement paper detection in `src/lib/scan-image.ts`

Replace the `jscanify` calls in `scanImageBlob` with a direct OpenCV pipeline (no new dependencies):

```
src → cvtColor(GRAY)
    → GaussianBlur(5×5)
    → Canny(75, 200)
    → dilate(3×3, iter=1)         // close small gaps
    → findContours(RETR_EXTERNAL, CHAIN_APPROX_SIMPLE)
    → for each contour sorted by area desc (top ~10):
        peri = arcLength(true)
        approx = approxPolyDP(0.02 * peri, true)
        if approx.rows === 4 && isContourConvex(approx)
          && contourArea(approx) / imgArea >= 0.2
          && contourArea(approx) / imgArea <= 0.98
        → accept
    → order the 4 points (tl, tr, br, bl) by sum/diff of x+y
    → compute output size from max edge lengths
    → getPerspectiveTransform(src4, dst4)
    → warpPerspective → HTMLCanvasElement
    → existing enhance() (gray-world WB + gentle contrast)
```

If no quad passes the confidence gate, catch and fall through to the existing fallback: mild `enhance()` on the raw canvas, returned with `ok: false`. Every allocated `cv.Mat` / `cv.MatVector` is wrapped in `try/finally` and `.delete()`d to avoid WASM heap leaks.

### 3. Preserve all previous constraints

- OpenCV.js still lazy-loaded via the existing CDN `<script>` injector on first use inside `scanImageBlob`.
- Module still browser-only: `typeof window === "undefined"` guard at the top of every exported function (already present on `scanImageBlob`; add to `heicToJpegIfNeeded`).
- Only reached via `await import("@/lib/scan-image")` from the upload mutation — never at any module top level, never in `*.server.ts`, never in a server function.
- Review dialog's Behandlet scan / Originalfoto toggle unchanged.
- HEIC path (`heic2any` npm dep) unchanged — it does not pull tr46/jsdom.

### 4. Verify

- `bun run build` completes; no `UNLOADABLE_DEPENDENCY`, prerender step succeeds.
- `grep -r "jscanify\|jsdom\|tr46" node_modules/.package-lock.json` → no results.
- Three-photo manual test on `/app/upload`:
  1. Angled receipt photo → detected quad, warped to a straight rectangle.
  2. Straight top-down photo → detected quad ≈ image bounds, output nearly identical (only enhance applied).
  3. Blurry / no-clear-edges photo → no confident quad, `ok: false`, review dialog defaults to Originalfoto without a broken crop.

## Technical details

- Files changed: `src/lib/scan-image.ts` (swap jscanify block for OpenCV pipeline, add window guard to `heicToJpegIfNeeded`), `package.json` + `bun.lockb` (remove jscanify), `src/types/scan-modules.d.ts` (drop `declare module "jscanify"`).
- Files NOT changed: `vite.config.ts` (no `ssr.external`), `src/routes/_authenticated/app.upload.tsx`, `src/components/receipt-review-dialog.tsx`, server functions in `src/lib/receipts.functions.ts`, storage schema.
