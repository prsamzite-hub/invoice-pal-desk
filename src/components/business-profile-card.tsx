import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Save, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { CvrLookupField, type CvrAutofill } from "@/components/cvr-lookup-field";
import {
  getMyBusinessProfile,
  upsertMyBusinessProfile,
  deleteMyBusinessProfile,
} from "@/lib/business-profile.functions";

type FormState = {
  company_name: string;
  cvr: string;
  address: string;
  postal_code: string;
  city: string;
  phone: string;
  email: string;
};

const empty: FormState = {
  company_name: "",
  cvr: "",
  address: "",
  postal_code: "",
  city: "",
  phone: "",
  email: "",
};

export function BusinessProfileCard() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getMyBusinessProfile);
  const saveFn = useServerFn(upsertMyBusinessProfile);
  const deleteFn = useServerFn(deleteMyBusinessProfile);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-business-profile"],
    queryFn: () => fetchFn(),
  });

  const [enabled, setEnabled] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (profile) {
      setEnabled(true);
      setForm({
        company_name: profile.company_name ?? "",
        cvr: profile.cvr ?? "",
        address: profile.address ?? "",
        postal_code: profile.postal_code ?? "",
        city: profile.city ?? "",
        phone: profile.phone ?? "",
        email: profile.email ?? "",
      });
    } else {
      setEnabled(false);
      setForm(empty);
    }
  }, [profile]);

  function set<K extends keyof FormState>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleToggle(v: boolean) {
    setEnabled(v);
    if (!v && profile) {
      // Turning off with an existing profile: ask to remove
      setRemoving(true);
      try {
        await deleteFn();
        await qc.invalidateQueries({ queryKey: ["my-business-profile"] });
        setForm(empty);
        toast.success("Virksomhedsprofil slået fra");
      } catch (e) {
        setEnabled(true);
        toast.error("Kunne ikke slå fra", {
          description: e instanceof Error ? e.message : "",
        });
      } finally {
        setRemoving(false);
      }
    }
  }

  async function save() {
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
          email: form.email.trim() || null,
        },
      });
      await qc.invalidateQueries({ queryKey: ["my-business-profile"] });
      toast.success("Virksomhedsprofil gemt");
    } catch (e) {
      toast.error("Kunne ikke gemme", {
        description: e instanceof Error ? e.message : "",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="shadow-soft flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Building2 className="h-4 w-4" />
            Virksomhed
          </h2>
          <p className="text-sm text-muted-foreground">
            Aktivér virksomhedsprofil og udfyld dine oplysninger.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {removing ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            aria-label="Aktivér virksomhedsprofil"
            disabled={isLoading || removing}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : enabled ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <CvrLookupField
                id="bp_cvr"
                value={form.cvr}
                onChange={(v) => set("cvr", v)}
                onAutofill={(f: CvrAutofill) =>
                  setForm((s) => ({
                    ...s,
                    company_name: f.company_name ?? s.company_name,
                    address: f.address ?? s.address,
                    postal_code: f.postal_code ?? s.postal_code,
                    city: f.city ?? s.city,
                  }))
                }
              />
            </div>
            <Field id="bp_company" label="Firmanavn" value={form.company_name} onChange={(v) => set("company_name", v)} required className="sm:col-span-2" />
            <Field id="bp_address" label="Adresse" value={form.address} onChange={(v) => set("address", v)} className="sm:col-span-2" />
            <Field id="bp_postal" label="Postnr." value={form.postal_code} onChange={(v) => set("postal_code", v)} />
            <Field id="bp_city" label="By" value={form.city} onChange={(v) => set("city", v)} />
            <Field id="bp_phone" label="Telefon" value={form.phone} onChange={(v) => set("phone", v)} inputMode="tel" />
            <Field id="bp_email" label="Email" value={form.email} onChange={(v) => set("email", v)} inputMode="email" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={saving} className="rounded-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Gem virksomhed
            </Button>
            {profile ? (
              <Button
                variant="outline"
                className="rounded-full"
                disabled={removing}
                onClick={() => handleToggle(false)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Slå fra
              </Button>
            ) : null}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Slå til for at tilføje CVR, adresse og kontaktoplysninger for din virksomhed.
        </p>
      )}
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
  placeholder,
  inputMode,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id} className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
      />
    </div>
  );
}
