import { useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2, Mail, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Log ind eller opret bruger — Kvittr" },
      { name: "description", content: "Log ind på Kvittr og hold styr på dine kvitteringer og fakturaer." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Indtast en gyldig email"),
  password: z.string().min(8, "Mindst 8 tegn"),
});

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<"google" | "microsoft" | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Tjek dine oplysninger");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        toast.success("Velkommen til Kvittr! 🎉");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Du er logget ind");
      }
      await router.invalidate();
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Noget gik galt");
    } finally {
      setLoading(false);
    }
  }

  async function oauth(provider: "google" | "microsoft") {
    setOauthBusy(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Kunne ikke logge ind");
        setOauthBusy(null);
        return;
      }
      if (result.redirected) return;
      await router.invalidate();
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Noget gik galt");
      setOauthBusy(null);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-hero">
      <Link to="/" className="absolute left-6 top-6 inline-flex items-center gap-2 text-sm font-bold text-foreground">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-lavender text-lavender-foreground">K</span>
        Kvittr
      </Link>

      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <div className="shadow-card rounded-3xl border border-border bg-card p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-mint text-mint-foreground">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Velkommen</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Log ind eller opret en bruger for at samle dine kvitteringer ét sted.
            </p>
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-full">
              <TabsTrigger value="signin" className="rounded-full">Log ind</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full">Opret bruger</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <EmailForm
                email={email} setEmail={setEmail}
                password={password} setPassword={setPassword}
                onSubmit={onSubmit} loading={loading}
                submitLabel="Log ind"
              />
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <EmailForm
                email={email} setEmail={setEmail}
                password={password} setPassword={setPassword}
                onSubmit={onSubmit} loading={loading}
                submitLabel="Opret bruger"
              />
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            eller
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="button" variant="outline" className="rounded-full"
              onClick={() => oauth("google")} disabled={oauthBusy !== null}
            >
              {oauthBusy === "google" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
              Continue with Google
            </Button>
            <Button
              type="button" variant="outline" className="rounded-full"
              onClick={() => oauth("microsoft")} disabled={oauthBusy !== null}
            >
              {oauthBusy === "microsoft" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MicrosoftIcon />}
              Continue with Microsoft
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to Kvittr's terms.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmailForm({
  email, setEmail, password, setPassword, onSubmit, loading, submitLabel,
}: {
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void; loading: boolean; submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email" type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="dig@eksempel.dk" className="pl-9"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Adgangskode</Label>
        <Input
          id="password" type="password" autoComplete="current-password" required minLength={8}
          value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Mindst 8 tegn"
        />
      </div>
      <Button type="submit" className="rounded-full" disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {submitLabel}
      </Button>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.2-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.3-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.8 29 5 24 5 16.3 5 9.7 9.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43c5 0 9.5-1.9 12.9-5l-6-4.9c-2 1.4-4.5 2.4-6.9 2.4-5.3 0-9.7-3.1-11.3-7.5l-6.6 5.1C9.6 38.5 16.2 43 24 43z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4.1 5.2l6 4.9C40.9 35.4 43.5 30.1 43.5 24c0-1.2-.1-2.3-.3-3.5z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 23 23" aria-hidden>
      <path fill="#f25022" d="M1 1h10v10H1z"/>
      <path fill="#7fba00" d="M12 1h10v10H12z"/>
      <path fill="#00a4ef" d="M1 12h10v10H1z"/>
      <path fill="#ffb900" d="M12 12h10v10H12z"/>
    </svg>
  );
}
