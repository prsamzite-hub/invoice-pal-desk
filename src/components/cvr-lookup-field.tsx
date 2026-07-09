import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lookupCvr, type CvrLookupResult } from "@/lib/cvr-lookup.functions";

export type CvrAutofill = {
  company_name?: string;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
};

/**
 * CVR input with automatic lookup against the Danish CVR register.
 * When the user enters a valid 8-digit CVR, we fetch and autofill the
 * caller-owned fields via `onAutofill`. Fields remain editable.
 */
export function CvrLookupField({
  id = "cvr",
  value,
  onChange,
  onAutofill,
  label = "CVR (8 cifre)",
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  onAutofill: (fields: CvrAutofill) => void;
  label?: string;
}) {
  const lookup = useServerFn(lookupCvr);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "missing" | "error">("idle");
  const lastLookupRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runLookup = useCallback(
    async (cvr: string) => {
      if (lastLookupRef.current === cvr) return;
      lastLookupRef.current = cvr;
      setStatus("loading");
      try {
        const res: CvrLookupResult = await lookup({ data: { cvr } });
        if (!res.ok) {
          if (res.reason === "not_found") {
            setStatus("missing");
            toast.info("CVR ikke fundet", {
              description: "Vi kunne ikke finde nummeret. Udfyld felterne manuelt.",
            });
          } else if (res.reason === "rate_limited") {
            setStatus("error");
            toast.error("Der er for mange opslag lige nu — prøv igen om lidt.");
          } else {
            setStatus("error");
            toast.error("Kunne ikke slå CVR op. Udfyld manuelt.");
          }
          return;
        }
        onAutofill({
          company_name: res.company_name,
          address: res.address,
          postal_code: res.postal_code,
          city: res.city,
        });
        setStatus("ok");
      } catch {
        setStatus("error");
        toast.error("Kunne ikke slå CVR op. Udfyld manuelt.");
      }
    },
    [lookup, onAutofill],
  );

  // Debounced auto-lookup when the field becomes 8 digits.
  useEffect(() => {
    const cvr = value.replace(/\D/g, "");
    if (cvr.length !== 8) {
      setStatus("idle");
      lastLookupRef.current = null;
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void runLookup(cvr);
    }, 400);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, runLookup]);

  const cvrDigits = value.replace(/\D/g, "");
  const canManual = cvrDigits.length === 8 && status !== "loading";

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="12345678"
            inputMode="numeric"
            autoComplete="off"
          />
          {status === "loading" ? (
            <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={() => {
            lastLookupRef.current = null;
            void runLookup(cvrDigits);
          }}
          disabled={!canManual}
        >
          Slå op
        </Button>
      </div>
      {status === "ok" ? (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-mint px-2.5 py-1 text-xs font-medium text-mint-foreground">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Hentet fra CVR-registret
        </span>
      ) : status === "missing" ? (
        <span className="text-xs text-muted-foreground">
          CVR ikke fundet — udfyld felterne manuelt.
        </span>
      ) : status === "error" ? (
        <span className="text-xs text-muted-foreground">
          Kunne ikke slå op lige nu — du kan udfylde manuelt.
        </span>
      ) : null}
    </div>
  );
}
