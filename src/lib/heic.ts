// Browser-only HEIC → JPEG conversion. Kept in its own module so heic2any
// only enters the bundle graph when explicitly dynamic-imported for a .heic
// file — never at page load, never in the SSR/worker bundle.
export async function heicToJpeg(file: File): Promise<File> {
  if (typeof window === "undefined") throw new Error("client only");
  const mod = await import("heic2any");
  const heic2any = (mod as unknown as { default: (o: unknown) => Promise<Blob | Blob[]> }).default;
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  const b = Array.isArray(out) ? out[0] : out;
  return new File([b], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" });
}

export function isHeicFile(f: File): boolean {
  return /heic|heif/i.test(f.type) || /\.hei[cf]$/i.test(f.name);
}
