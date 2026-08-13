// Shared VAT (moms) helpers. VAT is stored on the receipt row — never
// recomputed silently at render time.

export const DEFAULT_VAT_RATE = 25;

export interface VatValues {
  vat_amount: number | null;
  vat_rate: number | null;
  vat_is_calculated: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Breakdown for display: excl. VAT / VAT / incl. VAT. */
export function vatBreakdown(gross: number, vatAmount: number | null | undefined) {
  const total = Number.isFinite(gross) ? gross : 0;
  const vat = vatAmount == null || !Number.isFinite(Number(vatAmount)) ? null : Number(vatAmount);
  return {
    total,
    vat,
    exVat: vat == null ? total : round2(total - vat),
  };
}

/** VAT amount implied by a gross total and a rate in percent. */
export function vatFromRate(gross: number, rate: number): number {
  if (!Number.isFinite(gross) || !Number.isFinite(rate) || rate <= -100) return 0;
  return round2(gross - gross / (1 + rate / 100));
}

/** Rate in percent implied by a gross total and a VAT amount. */
export function rateFromVat(gross: number, vat: number): number | null {
  const ex = gross - vat;
  if (!Number.isFinite(ex) || ex <= 0) return null;
  return Math.round((vat / ex) * 10000) / 100;
}

/**
 * Resolve what should be stored.
 * - VAT stated on the document wins and is never flagged as calculated.
 * - Nothing stated + business document → suggest 25% and flag it "beregnet".
 * - Otherwise VAT stays null (private/foreign documents).
 */
export function resolveVat(
  gross: number,
  input: Partial<VatValues>,
  isBusiness: boolean,
): VatValues {
  const stated =
    input.vat_amount != null && Number.isFinite(Number(input.vat_amount))
      ? Number(input.vat_amount)
      : null;
  const rateIn =
    input.vat_rate != null && Number.isFinite(Number(input.vat_rate)) ? Number(input.vat_rate) : null;

  if (stated != null) {
    return {
      vat_amount: round2(stated),
      vat_rate: rateIn ?? rateFromVat(gross, stated),
      vat_is_calculated: input.vat_is_calculated === true,
    };
  }
  if (isBusiness) {
    const rate = rateIn ?? DEFAULT_VAT_RATE;
    return { vat_amount: vatFromRate(gross, rate), vat_rate: rate, vat_is_calculated: true };
  }
  return { vat_amount: null, vat_rate: rateIn, vat_is_calculated: false };
}

// ---------------------------------------------------------------------------
// Privat andel (private share of a business expense)
// ---------------------------------------------------------------------------

/** Clamp a user-entered private share to 0-100, or null when unset. */
export function normalizeSharePct(input: unknown): number | null {
  if (input === null || input === undefined || input === "") return null;
  const n = Number(input);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.min(100, Math.max(0, n));
  return Math.round(clamped * 100) / 100;
}

export interface ShareSplit {
  /** Private share in percent (0-100). 0 when no split is set. */
  pct: number;
  businessAmount: number;
  privateAmount: number;
  businessVat: number | null;
  privateVat: number | null;
}

/** Split a gross amount and its VAT into the business and private share. */
export function shareSplit(
  gross: number,
  vatAmount: number | null | undefined,
  pct: number | null | undefined,
): ShareSplit {
  const total = Number.isFinite(gross) ? gross : 0;
  const share = normalizeSharePct(pct) ?? 0;
  const bizFactor = (100 - share) / 100;
  const vat = vatAmount == null || !Number.isFinite(Number(vatAmount)) ? null : Number(vatAmount);
  return {
    pct: share,
    businessAmount: round2(total * bizFactor),
    privateAmount: round2(total - total * bizFactor),
    businessVat: vat == null ? null : round2(vat * bizFactor),
    privateVat: vat == null ? null : round2(vat - vat * bizFactor),
  };
}

/**
 * The amount that counts as a business expense for totals and analytics:
 * the full amount, or the business share when a "privat andel" is set.
 */
export function businessShareOf(
  amount: number | string | null | undefined,
  privateSharePct: number | string | null | undefined,
): number {
  const total = Number(amount) || 0;
  const pct = normalizeSharePct(privateSharePct);
  if (pct == null || pct <= 0) return total;
  return round2(total * ((100 - pct) / 100));
}
