/** Shared, client-safe helpers for the "Eksportér til bogholder" feature. */

export type ExportScope = "all" | "private" | "business";

export interface ExportDoc {
  id: string;
  docNumber: number | null;
  filename: string;
  date: string | null;
  dueDate: string | null;
  company: string;
  cvr: string | null;
  amountExVat: number;
  vatAmount: number | null;
  vatRate: number | null;
  amountInclVat: number;
  currency: string;
  category: string | null;
  documentType: "receipt" | "invoice";
  status: string;
  isBusiness: boolean;
}

const CATEGORY_DA: Record<string, string> = {
  Groceries: "Dagligvarer",
  Utilities: "Forsyning",
  Subscriptions: "Abonnementer",
  Dining: "Mad ude",
  Transport: "Transport",
  Shopping: "Shopping",
  Health: "Sundhed",
  Other: "Andet",
};

export function padDocNumber(n: number | null | undefined): string {
  return String(n ?? 0).padStart(4, "0");
}

function slugCompany(name: string): string {
  const map: Record<string, string> = { æ: "ae", ø: "oe", å: "aa", ä: "ae", ö: "oe", ü: "ue" };
  return (
    (name || "Ukendt")
      .toLowerCase()
      .replace(/[æøåäöü]/g, (c) => map[c] ?? c)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .split("-")
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join("")
      .slice(0, 40) || "Ukendt"
  );
}

export function exportFilename(docNumber: number | null, date: string | null, company: string) {
  const d = (date ?? "").slice(0, 10) || "uden-dato";
  return `${padDocNumber(docNumber)}_${d}_${slugCompany(company)}.pdf`;
}

function daNumber(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "";
  return v.toFixed(2).replace(".", ",");
}

function daDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "";
  return `${d}-${m}-${y}`;
}

function cell(v: string): string {
  const s = v ?? "";
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const HEADERS = [
  "Bilagsnummer",
  "Dato",
  "Forfaldsdato",
  "Leverandør",
  "CVR",
  "Beløb ekskl. moms",
  "Moms",
  "Momssats",
  "Beløb inkl. moms",
  "Valuta",
  "Kategori",
  "Type",
  "Status",
  "Erhverv",
  "Filnavn",
];

/** UTF-8 CSV body (BOM added at download time), semicolon separated for Danish Excel. */
export function buildCsv(docs: ExportDoc[]): string {
  const lines = [HEADERS.join(";")];
  for (const d of docs) {
    lines.push(
      [
        padDocNumber(d.docNumber),
        daDate(d.date),
        daDate(d.dueDate),
        d.company ?? "",
        d.cvr ?? "",
        daNumber(d.amountExVat),
        daNumber(d.vatAmount),
        d.vatRate == null ? "" : `${daNumber(d.vatRate)}%`,
        daNumber(d.amountInclVat),
        d.currency || "DKK",
        d.category ? (CATEGORY_DA[d.category] ?? d.category) : "Ukategoriseret",
        d.documentType === "invoice" ? "Faktura" : "Kvittering",
        d.status === "paid" ? "Betalt" : "Ubetalt",
        d.isBusiness ? "Ja" : "Nej",
        d.filename,
      ]
        .map((v) => cell(String(v)))
        .join(";"),
    );
  }
  return lines.join("\r\n") + "\r\n";
}

/** Quick date-range picks, returned as ISO yyyy-mm-dd. */
export type QuickRange = "thisMonth" | "lastMonth" | "thisQuarter" | "lastQuarter" | "thisYear";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function quickRange(kind: QuickRange, now = new Date()): { from: string; to: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const q = Math.floor(m / 3);
  switch (kind) {
    case "thisMonth":
      return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
    case "lastMonth":
      return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    case "thisQuarter":
      return { from: iso(new Date(y, q * 3, 1)), to: iso(new Date(y, q * 3 + 3, 0)) };
    case "lastQuarter":
      return { from: iso(new Date(y, q * 3 - 3, 1)), to: iso(new Date(y, q * 3, 0)) };
    case "thisYear":
    default:
      return { from: iso(new Date(y, 0, 1)), to: iso(new Date(y, 11, 31)) };
  }
}
