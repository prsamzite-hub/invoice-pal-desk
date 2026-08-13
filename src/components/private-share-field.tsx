import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLang } from "@/lib/i18n";
import { shareSplit } from "@/lib/vat";

/**
 * "Privat andel" — optional 0-100% split of a business expense between
 * private and business use (e.g. a phone bill split 50/50).
 * Shows the resulting business/private amounts and VAT live.
 */
export function PrivateShareField({
  idPrefix = "share",
  amount,
  vatAmount,
  currency = "DKK",
  value,
  onChange,
}: {
  idPrefix?: string;
  amount: number;
  vatAmount?: number | null;
  currency?: string;
  value: number | null | undefined;
  onChange: (pct: number | null) => void;
}) {
  const { t, formatMoney } = useLang();
  const split = shareSplit(Number(amount) || 0, vatAmount ?? null, value);
  const active = value != null && split.pct > 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          <Label htmlFor={`${idPrefix}-pct`}>{t("share.field")}</Label>
          <p className="text-xs text-muted-foreground">{t("share.hint")}</p>
        </div>
        <Input
          id={`${idPrefix}-pct`}
          type="number"
          step="1"
          min="0"
          max="100"
          inputMode="decimal"
          className="w-full min-h-11 sm:w-28"
          placeholder="0"
          value={value ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") return onChange(null);
            const n = parseFloat(raw);
            if (!Number.isFinite(n)) return;
            onChange(Math.min(100, Math.max(0, n)));
          }}
        />
      </div>

      {active ? (
        <dl className="flex flex-col gap-1 text-xs">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("share.business")}</dt>
            <dd className="tabular-nums">{formatMoney(split.businessAmount, currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("share.private")}</dt>
            <dd className="tabular-nums">{formatMoney(split.privateAmount, currency)}</dd>
          </div>
          {split.businessVat != null ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("share.businessVat")}</dt>
              <dd className="tabular-nums">{formatMoney(split.businessVat, currency)}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">{t("share.none")}</p>
      )}
    </div>
  );
}
