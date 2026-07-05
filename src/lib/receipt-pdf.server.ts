import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface ReceiptPdfLineItem {
  description: string;
  quantity?: number | null;
  unit_price?: number | null;
  total: number;
}

export interface ReceiptPdfData {
  company: string;
  amount: number;
  currency: string;
  date: string;
  due_date?: string | null;
  document_type: "receipt" | "invoice";
  category?: string | null;
  notes?: string | null;
  items?: ReceiptPdfLineItem[];
  receipt_id: string;
}

function fmtMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("da-DK", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export async function generateReceiptPdf(data: ReceiptPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.09, 0.11, 0.16);
  const muted = rgb(0.42, 0.45, 0.55);
  const line = rgb(0.88, 0.9, 0.94);
  const accent = rgb(0.36, 0.55, 0.98);

  // Header band
  page.drawRectangle({ x: 0, y: height - 110, width, height: 110, color: rgb(0.97, 0.98, 1) });
  page.drawText("KVITTR", { x: 48, y: height - 55, size: 22, font: bold, color: accent });
  page.drawText("Digital receipt", {
    x: 48,
    y: height - 78,
    size: 10,
    font,
    color: muted,
  });

  const label = data.document_type === "invoice" ? "INVOICE" : "RECEIPT";
  const labelWidth = bold.widthOfTextAtSize(label, 12);
  page.drawText(label, {
    x: width - 48 - labelWidth,
    y: height - 55,
    size: 12,
    font: bold,
    color: ink,
  });
  const idText = `#${data.receipt_id.slice(0, 8).toUpperCase()}`;
  const idWidth = font.widthOfTextAtSize(idText, 10);
  page.drawText(idText, {
    x: width - 48 - idWidth,
    y: height - 78,
    size: 10,
    font,
    color: muted,
  });

  // Company block
  let y = height - 160;
  page.drawText("Billed by", { x: 48, y, size: 9, font, color: muted });
  y -= 18;
  page.drawText(data.company || "Unknown", { x: 48, y, size: 20, font: bold, color: ink });

  // Meta grid
  y -= 44;
  const rows: Array<[string, string]> = [
    ["Date issued", data.date || "—"],
    ...(data.due_date ? ([["Due date", data.due_date]] as Array<[string, string]>) : []),
    ["Category", data.category || "Uncategorized"],
    ["Document ID", data.receipt_id],
  ];
  for (const [k, v] of rows) {
    page.drawText(k, { x: 48, y, size: 9, font, color: muted });
    page.drawText(v, { x: 200, y, size: 11, font, color: ink });
    y -= 22;
  }

  // Divider
  y -= 6;
  page.drawLine({
    start: { x: 48, y },
    end: { x: width - 48, y },
    thickness: 1,
    color: line,
  });

  // Amount card
  y -= 40;
  page.drawRectangle({
    x: 48,
    y: y - 60,
    width: width - 96,
    height: 90,
    color: rgb(0.97, 0.98, 1),
    borderColor: line,
    borderWidth: 1,
  });
  page.drawText("Total amount", { x: 68, y: y + 8, size: 10, font, color: muted });
  const amountText = fmtMoney(data.amount || 0, data.currency || "DKK");
  page.drawText(amountText, {
    x: 68,
    y: y - 30,
    size: 30,
    font: bold,
    color: ink,
  });

  // Items table
  y -= 100;
  const items = data.items ?? [];
  if (items.length > 0) {
    page.drawText("Items", { x: 48, y, size: 9, font, color: muted });
    y -= 18;
    // Header row
    page.drawText("Description", { x: 48, y, size: 9, font: bold, color: ink });
    page.drawText("Qty", { x: width - 240, y, size: 9, font: bold, color: ink });
    page.drawText("Unit", { x: width - 190, y, size: 9, font: bold, color: ink });
    const totalHeaderW = bold.widthOfTextAtSize("Total", 9);
    page.drawText("Total", { x: width - 48 - totalHeaderW, y, size: 9, font: bold, color: ink });
    y -= 8;
    page.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 0.5, color: line });
    y -= 14;

    const descMaxW = width - 48 - 260;
    for (const it of items) {
      if (y < 120) break;
      // Truncate description if too long
      let desc = it.description || "";
      while (font.widthOfTextAtSize(desc, 10) > descMaxW && desc.length > 3) {
        desc = desc.slice(0, -2);
      }
      if (desc !== (it.description || "")) desc = desc.slice(0, -1) + "…";
      page.drawText(desc, { x: 48, y, size: 10, font, color: ink });
      if (it.quantity != null) {
        page.drawText(String(it.quantity), { x: width - 240, y, size: 10, font, color: ink });
      }
      if (it.unit_price != null) {
        page.drawText(fmtMoney(it.unit_price, data.currency || "DKK"), {
          x: width - 190, y, size: 10, font, color: ink,
        });
      }
      const totalText = fmtMoney(it.total, data.currency || "DKK");
      const tW = font.widthOfTextAtSize(totalText, 10);
      page.drawText(totalText, { x: width - 48 - tW, y, size: 10, font, color: ink });
      y -= 16;
    }
    y -= 8;
  }

  // Notes
  if (data.notes) {
    if (y < 140) y = 140;
    page.drawText("Notes", { x: 48, y, size: 9, font, color: muted });
    y -= 16;
    const words = data.notes.split(/\s+/);
    let curLine = "";
    const maxW = width - 96;
    for (const w of words) {
      const test = curLine ? `${curLine} ${w}` : w;
      if (font.widthOfTextAtSize(test, 10) > maxW) {
        page.drawText(curLine, { x: 48, y, size: 10, font, color: ink });
        y -= 14;
        curLine = w;
      } else {
        curLine = test;
      }
    }
    if (curLine) page.drawText(curLine, { x: 48, y, size: 10, font, color: ink });
  }

  // Footer
  page.drawLine({
    start: { x: 48, y: 80 },
    end: { x: width - 48, y: 80 },
    thickness: 1,
    color: line,
  });
  page.drawText("Generated by Kvittr — your receipts and invoices wallet.", {
    x: 48,
    y: 60,
    size: 9,
    font,
    color: muted,
  });
  page.drawText(new Date().toISOString().slice(0, 10), {
    x: 48,
    y: 46,
    size: 9,
    font,
    color: muted,
  });

  return await doc.save();
}
