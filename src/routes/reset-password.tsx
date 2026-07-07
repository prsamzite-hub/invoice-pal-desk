import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { danishAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nulstil adgangskode — Kvitregn" },
      { name: "description", content: "Vælg en ny adgangskode til din Kvitregn-konto." },
    ],
  }),
  component: ResetPasswordPage,
});

const passSchema = z
  .object({
    password: z.string().min(8, "Adgangskoden skal være mindst 8 tegn"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Adgangskoderne er ikke ens",
    path: ["confirm"],
  });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase recovery link puts a recovery session in the URL hash.
    // onAuthStateChange fires PASSWORD_RECOVERY once the session is set.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
        setChecking(false);
      }
    });

    // Fallback: if we already have a session (e.g. hash processed synchronously)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      setChecking(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = passSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Tjek dine oplysninger");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Adgangskoden er opdateret");
      setTimeout(() => navigate({ to: "/app", replace: true }), 1200);
    } catch (err) {
      toast.error(danishAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-hero">
      <Link to="/" className="absolute left-6 top-6 inline-flex items-center gap-2 text-sm font-bold text-foreground">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-lavender text-lavender-foreground">K</span>
        Kvitregn
      </Link>

      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <div className="shadow-card rounded-3xl border border-border bg-card p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-mint text-mint-foreground">
              {done ? <CheckCircle2 className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {done ? "Adgangskoden er opdateret" : "Vælg en ny adgangskode"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {done
                ? "Du bliver sendt videre til din konto…"
                : "Vælg en adgangskode på mindst 8 tegn."}
            </p>
          </div>

          {checking ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : done ? null : ready ? (
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Ny adgangskode</Label>
                <Input
                  id="password" type="password" autoComplete="new-password" required minLength={8}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mindst 8 tegn"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm">Bekræft adgangskode</Label>
                <Input
                  id="confirm" type="password" autoComplete="new-password" required minLength={8}
                  value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Skriv den samme igen"
                />
              </div>
              <Button type="submit" className="rounded-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Gem ny adgangskode
              </Button>
            </form>
          ) : (
            <div className="flex flex-col gap-4 text-center text-sm text-muted-foreground">
              <p>Linket er udløbet eller ugyldigt. Bed om et nyt fra login-siden.</p>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/auth">Tilbage til login</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
