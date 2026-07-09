import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import type { LineItem } from "@/lib/receipts.functions";

function fmtMoney(n: number, currency = "DKK") {
  try {
    return new Intl.NumberFormat("da-DK", { style: "currency", currency }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

export function ItemsEditor({
  items,
  currency = "DKK",
  onChange,
}: {
  items: LineItem[];
  currency?: string;
  onChange: (items: LineItem[]) => void;
}) {
  const set = (i: number, patch: Partial<LineItem>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const add = () =>
    onChange([...items, { description: "", quantity: null, unit_price: null, total: 0 }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  const sum = items.reduce((s, it) => s + (Number(it.total) || 0), 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Varer</span>
        <Button type="button" size="sm" variant="ghost" onClick={add}>
          <Plus className="mr-1 h-4 w-4" /> Tilføj vare
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          Ingen varer aflæst. Tilføj manuelt hvis du ønsker en detaljeret opdeling.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((it, i) => (
            <div
              key={i}
              className="grid grid-cols-12 items-center gap-2 rounded-lg border border-border bg-background p-2"
            >
              <Input
                aria-label="Beskrivelse"
                placeholder="Beskrivelse (f.eks. Mælk, Rabat, Pant)"
                className="col-span-12 sm:col-span-5"
                value={it.description}
                onChange={(e) => set(i, { description: e.target.value })}
              />
              <Input
                aria-label="Antal"
                type="number"
                step="0.001"
                placeholder="Antal"
                className="col-span-3 sm:col-span-2"
                value={it.quantity ?? ""}
                onChange={(e) =>
                  set(i, { quantity: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
              <Input
                aria-label="Enhedspris"
                type="number"
                step="0.01"
                placeholder="Enhedspris"
                className="col-span-4 sm:col-span-2"
                value={it.unit_price ?? ""}
                onChange={(e) =>
                  set(i, { unit_price: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
              <Input
                aria-label="Linjetotal"
                type="number"
                step="0.01"
                placeholder="Total"
                className="col-span-4 sm:col-span-2"
                value={Number.isFinite(it.total) ? it.total : 0}
                onChange={(e) => set(i, { total: Number(e.target.value) || 0 })}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Fjern vare"
                className="col-span-1 justify-self-end text-destructive hover:text-destructive"
                onClick={() => remove(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <p className="text-right text-xs text-muted-foreground">
            Sum af varer: <span className="font-medium text-foreground">{fmtMoney(sum, currency)}</span>
          </p>
        </div>
      )}
    </div>
  );
}
