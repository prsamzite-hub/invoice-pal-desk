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
