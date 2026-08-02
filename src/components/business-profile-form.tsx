import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getMyBusinessProfile,
  upsertMyBusinessProfile,
  deleteMyBusinessProfile,
  lookupCvr,
} from "@/lib/business.functions";
import { useLang } from "@/lib/i18n";
import { writeMode } from "@/lib/app-mode";

type Form = {
  company_name: string;
  cvr: string;
  address: string;
  postal_code: string;
  city: string;
  phone: string;
  email: string;
};

const EMPTY: Form = {
  company_name: "", cvr: "", address: "", postal_code: "", city: "", phone: "", email: "",
};

export function BusinessProfileForm({
  onSaved,
  showDelete = true,
}: {
  onSaved?: () => void;
  showDelete?: boolean;
}) {
  const { t } = useLang();
  const qc = useQueryClient();
  const fetchBiz = useServerFn(getMyBusinessProfile);
  const saveFn = useServerFn(upsertMyBusinessProfile);
  const deleteFn = useServerFn(deleteMyBusinessProfile);
  const lookupFn = useServerFn(lookupCvr);

  const { data: existing } = useQuery({ queryKey: ["my-business"], queryFn: () => fetchBiz() });
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [looking, setLooking] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (existing) {
      setForm({
        company_name: existing.company_name ?? "",
        cvr: existing.cvr ?? "",
        address: existing.address ?? "",
        postal_code: existing.postal_code ?? "",
        city: existing.city ?? "",
        phone: existing.phone ?? "",
        email: existing.email ?? "",
      });
    }
  }, [existing]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function doLookup() {
    const cvr = form.cvr.replace(/\D/g, "");
    if (!/^\d{8}$/.test(cvr)) { toast.error(t("biz.cvrInvalid")); return; }
    setLooking(true);
    try {
      const r = await lookupFn({ data: { cvr } });
      if (!r) { toast.error(t("biz.notFound")); return; }
      setForm((f) => ({
        ...f,
        cvr,
        company_name: r.company_name || f.company_name,
        address: r.address ?? f.address,
        postal_code: r.postal_code ?? f.postal_code,
        city: r.city ?? f.city,
        phone: r.phone ?? f.phone,
        email: r.email ?? f.email,
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("For mange opslag")) toast.error(msg);
      else toast.error(t("biz.lookupFailed"));
    } finally { setLooking(false); }

  }

  async function save() {
    const cvr = form.cvr.replace(/\D/g, "");
    if (!form.company_name.trim() || !form.address.trim() || !form.postal_code.trim() || !form.city.trim()) {
      toast.error(t("biz.requiredFields"));
      return;
    }
    if (!/^\d{8}$/.test(cvr)) { toast.error(t("biz.cvrInvalid")); return; }
    setSaving(true);
    try {
      await saveFn({ data: { ...form, cvr } });
      await qc.invalidateQueries({ queryKey: ["my-business"] });
      await qc.invalidateQueries({ queryKey: ["business-gate"] });
      writeMode("erhverv");
      toast.success(t("biz.saved"));
      onSaved?.();
    } catch (e) {
      toast.error(t("biz.cannotSave"), { description: e instanceof Error ? e.message : "" });
    } finally { setSaving(false); }
  }

  async function remove() {
    setRemoving(true);
    try {
      await deleteFn();
      await qc.invalidateQueries({ queryKey: ["my-business"] });
      await qc.invalidateQueries({ queryKey: ["business-gate"] });
      setForm(EMPTY);
      writeMode("privat");
      toast.success(t("biz.deleted"));
    } catch (e) {
      toast.error(t("biz.cannotSave"), { description: e instanceof Error ? e.message : "" });
    } finally { setRemoving(false); }
  }


  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field id="cvr" label={t("biz.cvr")}>
          <div className="flex items-center gap-2">
            <Input id="cvr" inputMode="numeric" maxLength={8} placeholder={t("biz.cvrPh")}
              value={form.cvr} onChange={set("cvr")} />
            <Button type="button" variant="outline" className="shrink-0 rounded-full" onClick={doLookup} disabled={looking}>
              {looking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">{t("biz.lookup")}</span>
            </Button>
          </div>
        </Field>
        <Field id="company_name" label={t("biz.company")}>
          <Input id="company_name" value={form.company_name} onChange={set("company_name")} />
        </Field>
        <Field id="address" label={t("biz.address")}>
          <Input id="address" value={form.address} onChange={set("address")} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <Field id="postal_code" label={t("biz.zip")}>
              <Input id="postal_code" value={form.postal_code} onChange={set("postal_code")} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field id="city" label={t("biz.city")}>
              <Input id="city" value={form.city} onChange={set("city")} />
            </Field>
          </div>
        </div>
        <Field id="phone" label={t("biz.phone")}>
          <Input id="phone" value={form.phone} onChange={set("phone")} />
        </Field>
        <Field id="biz_email" label={t("biz.email")}>
          <Input id="biz_email" type="email" value={form.email} onChange={set("email")} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={saving} className="rounded-full">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {t("biz.save")}
        </Button>
        {showDelete && existing ? (
          <Button variant="outline" onClick={remove} disabled={removing} className="rounded-full">
            {removing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            {t("biz.delete")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
