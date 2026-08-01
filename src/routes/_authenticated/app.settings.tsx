import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, Mail, User, Save, KeyRound, Trash2, Loader2, Languages } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/atoms/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { InboundEmailCard } from "@/components/inbound-email-card";
import { BusinessProfileForm } from "@/components/business-profile-form";
import { useLang } from "@/lib/i18n";
import { authErrorKey } from "@/lib/auth-errors";

import { getMyProfile, updateMyProfile, deleteMyAccount } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({
    meta: [
      { title: "Indstillinger — Kvitregn" },
      { name: "description", content: "Administrer din Kvitregn-profil, tema og konto." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const updateFn = useServerFn(updateMyProfile);
  const deleteFn = useServerFn(deleteMyAccount);

  const { data: profile, isLoading } = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile() });

  const [name, setName] = useState("");
  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name);
  }, [profile?.display_name]);

  const [savingName, setSavingName] = useState(false);
  async function saveName() {
    if (!name.trim()) { toast.error(t("settings.nameEmpty")); return; }
    setSavingName(true);
    try {
      await updateFn({ data: { display_name: name.trim() } });
      await qc.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success(t("settings.saved"));
    } catch (e) {
      toast.error(t("settings.cannotSave"), { description: e instanceof Error ? e.message : "" });
    } finally { setSavingName(false); }
  }

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  async function changePassword() {
    if (pw1.length < 8) { toast.error(t("settings.pwShort")); return; }
    if (pw1 !== pw2) { toast.error(t("settings.pwMismatch")); return; }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      setPw1(""); setPw2("");
      toast.success(t("settings.passwordChanged"));
    } catch (e) {
      toast.error(t("settings.cannotChangePw"), { description: t(authErrorKey(e)) });
    } finally { setSavingPw(false); }
  }

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  async function deleteAccount() {
    setDeleting(true);
    try {
      await deleteFn();
      await supabase.auth.signOut();
      qc.clear();
      toast.success(t("settings.deleted"));
      navigate({ to: "/auth", replace: true });
    } catch (e) {
      toast.error(t("settings.cannotDelete"), { description: e instanceof Error ? e.message : "" });
      setDeleting(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    qc.clear();
    toast.success(t("user.signedOut"));
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("settings.title")} description={t("settings.desc")} />

      <section className="shadow-soft flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-bold text-foreground">{t("settings.profile")}</h2>
        {isLoading ? (
          <div className="flex flex-col gap-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="display_name" className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("settings.displayName")}
              </Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="display_name" className="pl-9" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("settings.displayNamePh")} />
                </div>
                <Button onClick={saveName} disabled={savingName} className="rounded-full">
                  {savingName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {t("common.save")}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ReadonlyField icon={Mail} label={t("settings.currency")} value={profile?.currency ?? "DKK"} />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("settings.language")}</span>
                <Select value={lang} onValueChange={(v) => setLang(v as "da" | "en")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="da"><Languages className="mr-2 inline h-3.5 w-3.5" />Dansk (DA)</SelectItem>
                    <SelectItem value="en"><Languages className="mr-2 inline h-3.5 w-3.5" />English (EN)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </section>

      <InboundEmailCard token={profile?.email_inbox_token ?? null} />

      <section className="shadow-soft flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <h2 className="text-base font-bold text-foreground">{t("biz.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("biz.desc")}</p>
        </div>
        <BusinessProfileForm />
      </section>

      <section className="shadow-soft flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">{t("settings.appearance")}</h2>
            <p className="text-sm text-muted-foreground">{t("settings.appearanceDesc")}</p>
          </div>
          <ThemeToggle />
        </div>
      </section>

      <section className="shadow-soft flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <h2 className="text-base font-bold text-foreground">{t("settings.password")}</h2>
          <p className="text-sm text-muted-foreground">{t("settings.passwordDesc")}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pw1" className="text-xs uppercase tracking-wide text-muted-foreground">{t("settings.newPassword")}</Label>
            <Input id="pw1" type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pw2" className="text-xs uppercase tracking-wide text-muted-foreground">{t("settings.confirmPassword")}</Label>
            <Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        <div>
          <Button onClick={changePassword} disabled={savingPw} className="rounded-full">
            {savingPw ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
            {t("settings.changePassword")}
          </Button>
        </div>
      </section>

      <section className="shadow-soft flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-bold text-foreground">{t("settings.account")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings.accountDesc")}</p>
        <div>
          <Button variant="outline" className="rounded-full" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            {t("user.signOut")}
          </Button>
        </div>
      </section>

      <section className="shadow-soft flex flex-col gap-4 rounded-2xl border border-destructive/40 bg-card p-6">
        <div>
          <h2 className="text-base font-bold text-destructive">{t("settings.delete")}</h2>
          <p className="text-sm text-muted-foreground">{t("settings.deleteDesc")}</p>
        </div>
        <div>
          <Button variant="destructive" className="rounded-full" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t("settings.deleteBtn")}
          </Button>
        </div>
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("settings.deleteConfirm.desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void deleteAccount(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {t("common.deletePermanent")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReadonlyField({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {value}
      </span>
    </div>
  );
}
