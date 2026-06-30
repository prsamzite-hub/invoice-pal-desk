import { createFileRoute } from "@tanstack/react-router";
import { LogOut, Mail, User } from "lucide-react";

import { PageHeader } from "@/components/atoms/page-header";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Kvittr" },
      { name: "description", content: "Manage your Kvittr profile, theme and account." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Settings" description="Make Kvittr feel like home." />

      <section className="shadow-soft flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-bold text-foreground">Profile</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field icon={User} label="Display name" value="Kira" />
          <Field icon={Mail} label="Email" value="kira@example.dk" />
        </div>
      </section>

      <section className="shadow-soft flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Appearance</h2>
            <p className="text-sm text-muted-foreground">Toggle between light and dark.</p>
          </div>
          <ThemeToggle />
        </div>
      </section>

      <section className="shadow-soft flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-bold text-foreground">Account</h2>
        <p className="text-sm text-muted-foreground">
          Sign-out and account management will be wired up once authentication is enabled.
        </p>
        <div>
          <Button variant="outline" className="rounded-full" disabled>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
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
