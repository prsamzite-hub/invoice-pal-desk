/**
 * Server-only helpers for embedding the original document into the generated
 * PDF and for building the public verification URL.
 */
import type { ReceiptPdfData } from "./receipt-pdf.server";

export function siteBaseUrl(): string {
  const host = process.env.LOVABLE_PUBLISHED_HOST ?? "kvitregn.dk";
  return `https://${host}`;
}

export function verificationUrl(token: string | null | undefined): string | null {
  if (!token) return null;
  return `${siteBaseUrl()}/v/${token}`;
}

function kindForPath(path: string): "pdf" | "jpg" | "png" | null {
  const p = path.toLowerCase();
  if (p.endsWith(".pdf")) return "pdf";
  if (p.endsWith(".png")) return "png";
  if (/\.(jpe?g)$/.test(p)) return "jpg";
  return null;
}

/** Sniff the real type when the extension is missing or lies. */
function sniff(bytes: Uint8Array): "pdf" | "jpg" | "png" | null {
  if (bytes.length < 8) return null;
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "pdf";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  return null;
}

/**
 * Loads the document to append as "Originalbilag": the processed scan when one
 * exists, otherwise the raw original upload. Returns null when neither exists
 * or the format cannot be embedded (e.g. HEIC).
 */
export async function loadOriginalAttachment(
  supabase: any,
  row: { scan_path?: string | null; original_path?: string | null },
): Promise<ReceiptPdfData["attachment"]> {
  const candidates = [row.scan_path, row.original_path].filter(Boolean) as string[];
  for (const path of candidates) {
    try {
      const { data, error } = await supabase.storage.from("receipts").download(path);
      if (error || !data) continue;
      const bytes = new Uint8Array(await data.arrayBuffer());
      const kind = sniff(bytes) ?? kindForPath(path);
      if (!kind) continue;
      return { bytes, kind };
    } catch {
      // try the next candidate
    }
  }
  return null;
}
