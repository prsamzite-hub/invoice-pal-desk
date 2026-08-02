import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { rateFromVat, vatFromRate, vatBreakdown } from "@/lib/vat";

export interface VatFieldValues {
  amount: number;
  vat_amount?: number | null;
  vat_rate?: number | null;
  vat_is_calculated?: boolean;
}

/**
 * Editable Moms / Momssats fields with a live excl. / VAT / incl. breakdown.
 * Editing any of the three keeps the others consistent.
 */
export function VatFields({
  idPrefix = "vat",
  values,
  currency = "DKK",
  onChange,
}: {
  idPrefix?: string;
  values: VatFieldValues;
  currency?: string;
  onChange: (patch: Partial<VatFieldValues>) => void;
}) {
  const { t, formatMoney } = useLang();
  const gross = Number.isFinite(values.amount) ? values.amount : 0;
  const { exVat, vat } = vatBreakdown(gross, values.vat_amount ?? null);

  const setVat = (raw: string) => {
    if (raw === "") {
      onChange({ vat_amount: null, vat_is_calculated: false });
      return;
    }
    const v = parseFloat(raw);
    if (!Number.isFinite(v)) return;
    onChange({ vat_amount: v, vat_rate: rateFromVat(gross, v), vat_is_calculated: false });
  };

  const setRate = (raw: string) => {
    if (raw === "") {
      onChange({ vat_rate: null, vat_is_calculated: false });
      return;
    }
    const r = parseFloat(raw);
    if (!Number.isFinite(r)) return;
    onChange({ vat_rate: r, vat_amount: vatFromRate(gross, r), vat_is_calculated: false });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{t("vat.section")}</span>
        {values.vat_is_calculated ? (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            {t("vat.calculated")}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`${idPrefix}-amount`}>{t("vat.amount")}</Label>
          <Input
            id={`${idPrefix}-amount`}
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={values.vat_amount ?? ""}
            onChange={(e) => setVat(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-rate`}>{t("vat.rate")} (%)</Label>
          <Input
            id={`${idPrefix}-rate`}
            type="number"
            step="0.1"
            min="0"
            inputMode="decimal"
            value={values.vat_rate ?? ""}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
      </div>

      {values.vat_is_calculated ? (
        <p className="text-xs text-muted-foreground">{t("vat.calculatedHint")}</p>
      ) : null}

      <dl className="flex flex-col gap-1 text-xs">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t("vat.exVat")}</dt>
          <dd className="tabular-nums">{formatMoney(exVat, currency)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t("vat.vat")}</dt>
          <dd className="tabular-nums">
            {vat == null ? t("vat.none") : formatMoney(vat, currency)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-border pt-1 font-semibold">
          <dt>{t("vat.total")}</dt>
          <dd className="tabular-nums">{formatMoney(gross, currency)}</dd>
        </div>
      </dl>

      {values.vat_amount != null ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="self-end"
          onClick={() =>
            onChange({ vat_amount: null, vat_rate: null, vat_is_calculated: false })
          }
        >
          {t("vat.clear")}
        </Button>
      ) : null}
    </div>
  );
}
