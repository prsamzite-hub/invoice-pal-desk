import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, User, Loader2, ArrowRight, Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CvrLookupField, type CvrAutofill } from "@/components/cvr-lookup-field";
import { upsertMyBusinessProfile } from "@/lib/business-profile.functions";
import { setStoredAppMode } from "@/lib/app-mode";

const searchSchema = z.object({
  mode: z.enum(["business"]).optional(),
});

export const Route = createFileRoute("/_authenticated/onboarding")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Kom i gang — Kvitregn" },
      { name: "description", content: "Vælg om du bruger Kvitregn privat eller som virksomhed." },
    ],
  }),
  component: OnboardingPage,
});


type Mode = "choose" | "business";

function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const saveFn = useServerFn(upsertMyBusinessProfile);
  const search = Route.useSearch();

  const [mode, setMode] = useState<Mode>(search.mode === "business" ? "business" : "choose");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    cvr: "",
    address: "",
    postal_code: "",
    city: "",
    phone: "",
  });

  useEffect(() => {
    if (search.mode === "business") setMode("business");
  }, [search.mode]);

  function continueAsPrivat() {
    setStoredAppMode("privat");
    navigate({ to: "/app", replace: true });
  }


  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function saveBusiness(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name.trim()) {
      toast.error("Firmanavn må ikke være tomt");
      return;
    }
    if (form.cvr && !/^[0-9]{8}$/.test(form.cvr.trim())) {
      toast.error("CVR skal være 8 cifre");
      return;
    }
    setSaving(true);
    try {
      await saveFn({
        data: {
          company_name: form.company_name.trim(),
          cvr: form.cvr.trim() || null,
          address: form.address.trim() || null,
          postal_code: form.postal_code.trim() || null,
          city: form.city.trim() || null,
          phone: form.phone.trim() || null,
          email: null,
        },
      });
      await qc.invalidateQueries({ queryKey: ["my-business-profile"] });
      setStoredAppMode("erhverv");
      toast.success("Virksomhedsprofil oprettet");
      navigate({ to: "/app", replace: true });

    } catch (err) {
      toast.error("Kunne ikke gemme", {
        description: err instanceof Error ? err.message : "",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-hero">
      <Link to="/" className="absolute left-6 top-6 inline-flex items-center gap-2" aria-label="Kvitregn — forside">
        <img src="/brand/lockup-on-light.png" alt="Kvitregn logo" className="h-10 w-auto dark:hidden" />
        <img src="/brand/lockup-on-dark.png" alt="Kvitregn logo" className="hidden h-10 w-auto dark:block" />
      </Link>

      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
        {mode === "choose" ? (
          <div className="shadow-card rounded-3xl border border-border bg-card p-8">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-foreground">Bruger du Kvitregn privat eller som virksomhed?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Du kan altid ændre dit valg senere under Indstillinger → Virksomhed.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={continueAsPrivat}

                className="shadow-soft hover:shadow-card group flex flex-col items-start gap-3 rounded-2xl border border-border bg-background p-5 text-left transition hover:-translate-y-0.5"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-mint text-mint-foreground">
                  <User className="h-5 w-5" />
                </span>
                <span className="text-base font-bold text-foreground">Privat</span>
                <span className="text-sm text-muted-foreground">Kvitteringer og fakturaer i din egen mappe.</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  Kom i gang <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode("business")}
                className="shadow-soft hover:shadow-card group flex flex-col items-start gap-3 rounded-2xl border border-border bg-background p-5 text-left transition hover:-translate-y-0.5"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-lavender text-lavender-foreground">
                  <Building2 className="h-5 w-5" />
                </span>
                <span className="text-base font-bold text-foreground">Virksomhed</span>
                <span className="text-sm text-muted-foreground">CVR, adresse og bilag klar til bogholderen.</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  Udfyld firma <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={saveBusiness} className="shadow-card flex flex-col gap-5 rounded-3xl border border-border bg-card p-8">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                <Building2 className="h-5 w-5" />
                Dine virksomhedsoplysninger
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Vi bruger dem på dine bilag og PDF'er. Kun firmanavnet er påkrævet — resten kan udfyldes senere.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <CvrLookupField
                  id="ob_cvr"
                  value={form.cvr}
                  onChange={(v: string) => set("cvr", v)}
                  onAutofill={(fields: CvrAutofill) =>
                    setForm((s) => ({
                      ...s,
                      company_name: fields.company_name ?? s.company_name,
                      address: fields.address ?? s.address,
                      postal_code: fields.postal_code ?? s.postal_code,
                      city: fields.city ?? s.city,
                    }))
                  }
                />
              </div>
              <F id="ob_company" label="Firmanavn *" value={form.company_name} onChange={(v) => set("company_name", v)} className="sm:col-span-2" />
              <F id="ob_phone" label="Telefon" value={form.phone} onChange={(v) => set("phone", v)} inputMode="tel" />
              <F id="ob_address" label="Adresse" value={form.address} onChange={(v) => set("address", v)} className="sm:col-span-2" />
              <F id="ob_postal" label="Postnr." value={form.postal_code} onChange={(v) => set("postal_code", v)} />
              <F id="ob_city" label="By" value={form.city} onChange={(v) => set("city", v)} />
            </div>

            <div className="flex flex-wrap justify-between gap-2">
              <Button type="button" variant="ghost" className="rounded-full" onClick={() => setMode("choose")} disabled={saving}>
                Tilbage
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={continueAsPrivat}
                  disabled={saving}
                >
                  Fortsæt som privat
                </Button>

                <Button type="submit" className="rounded-full" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Gem og fortsæt
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function F({
  id,
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id} className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode} />
    </div>
  );
}
