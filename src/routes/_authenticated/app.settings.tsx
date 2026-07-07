import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, Mail, User } from "lucide-react";

import { PageHeader } from "@/components/atoms/page-header";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { InboundEmailCard } from "@/components/inbound-email-card";
import { getMyProfile } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getMyProfile);
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
  });

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Du er logget ud");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Indstillinger" description="Gør Kvitregn til dit eget." />

      <section className="shadow-soft flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-bold text-foreground">Profil</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field icon={User} label="Vist navn" value={profile?.display_name ?? "—"} />
          <Field icon={Mail} label="Valuta" value={profile?.currency ?? "DKK"} />
        </div>
      </section>

      <InboundEmailCard token={profile?.email_inbox_token ?? null} />

      <section className="shadow-soft flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Udseende</h2>
            <p className="text-sm text-muted-foreground">Skift mellem lyst og mørkt tema.</p>
          </div>
          <ThemeToggle />
        </div>
      </section>

      <section className="shadow-soft flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-bold text-foreground">Konto</h2>
        <p className="text-sm text-muted-foreground">Log ud af Kvitregn på denne enhed.</p>
        <div>
          <Button variant="outline" className="rounded-full" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Log ud
          </Button>
        </div>
      </section>
    </div>
  );
}

function Field({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {value}
      </span>
    </div>
  );
}
