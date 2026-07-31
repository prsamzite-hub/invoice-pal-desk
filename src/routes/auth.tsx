import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { authErrorKey } from "@/lib/auth-errors";
import { useLang } from "@/lib/i18n";


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Log ind eller opret bruger — Kvitregn" },
      { name: "description", content: "Log ind på Kvitregn og hold styr på dine kvitteringer og fakturaer." },
      { property: "og:title", content: "Log ind eller opret bruger — Kvitregn" },
      { property: "og:description", content: "Log ind på Kvitregn og hold styr på dine kvitteringer og fakturaer." },
      { property: "og:url", content: "https://kvitregn.dk/auth" },
    ],
    links: [{ rel: "canonical", href: "https://kvitregn.dk/auth" }],
  }),
  component: AuthPage,
});

type View = "signin" | "signup" | "forgot";

function AuthPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [view, setView] = useState<View>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<"google" | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().trim().email(t("auth.invalidEmail")),
        password: z.string().min(8, t("reset.tooShort")),
      }),
    [t]
  );

  async function goToApp() {
    await router.invalidate();
    navigate({ to: "/app", replace: true });
  }


  // If already signed in, bounce to /app
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        navigate({ to: "/app", replace: true });
      } else {
        setChecking(false);
      }
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("auth.checkInputs"));
      return;
    }
    setLoading(true);
    try {
      if (view === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        // Supabase may return a success response with an obfuscated user when
        // the email is already registered (identities array is empty).
        const identities = (data.user as { identities?: unknown[] } | null)?.identities;
        if (data.user && Array.isArray(identities) && identities.length === 0) {
          showEmailExistsToast();
          return;
        }
        if (!data.session) {
          toast.success(t("auth.check.emailDesc"));
          return;
        }
        toast.success(t("auth.welcomeNew"));
        await goToApp();
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("auth.welcomeBack"));
      }
      await goToApp();

    } catch (err) {
      const key = authErrorKey(err);
      if (key === "err.emailExists") showEmailExistsToast();
      else toast.error(t(key));
    } finally {
      setLoading(false);
    }
  }

  function showEmailExistsToast() {
    toast.error(t("err.emailExists"), {
      action: {
        label: t("auth.tab.signin"),
        onClick: () => {
          setView("signin");
          setPassword("");
        },
      },
    });
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().trim().email().safeParse(email);
    if (!parsed.success) {
      toast.error(t("auth.invalidEmail"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
      toast.success(t("auth.check.reset"));
    } catch (err) {
      toast.error(t(authErrorKey(err)));
    } finally {
      setLoading(false);
    }
  }

  async function oauth(provider: "google") {
    setOauthBusy(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(t(authErrorKey(result.error)));
        setOauthBusy(null);
        return;
      }
      if (result.redirected) return;
      await goToApp();

    } catch (err) {
      toast.error(t(authErrorKey(err)));
      setOauthBusy(null);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-hero">
        <Loader2 className="h-6 w-6 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-hero">
      <Link to="/" className="absolute left-6 top-6 inline-flex items-center gap-2" aria-label="Kvitregn — forside">
        <img src="/brand/lockup-on-light.png" alt="Kvitregn logo" className="h-8 w-auto shrink-0 object-contain dark:hidden sm:h-10" />
        <img src="/brand/lockup-on-dark.png" alt="Kvitregn logo" className="hidden h-8 w-auto shrink-0 object-contain dark:block sm:h-10" />
      </Link>

      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <div className="shadow-card rounded-3xl border border-border bg-card p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-background shadow-soft">
              <img src="/brand/icon.svg" alt="" aria-hidden="true" className="h-8 w-8 dark:hidden" />
              <img src="/brand/icon-on-dark.svg" alt="" aria-hidden="true" className="hidden h-8 w-8 dark:block" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {view === "forgot" ? t("auth.title.reset") : t("auth.title.welcome")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {view === "forgot"
                ? t("auth.subtitle.reset")
                : t("auth.subtitle.welcome")}
            </p>
          </div>

          {view === "forgot" ? (
            <div className="flex flex-col gap-4">
              {resetSent ? (
                <div className="rounded-2xl border border-border bg-mint/40 p-4 text-sm text-foreground">
                  {t("auth.check.resetSentTo")} <strong>{email}</strong>. {t("auth.check.resetInbox")}
                </div>
              ) : (
                <form onSubmit={onForgot} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email">{t("auth.email")}</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email" type="email" autoComplete="email" required
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("auth.emailPlaceholder")} className="pl-9"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="rounded-full" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t("auth.submit.reset")}
                  </Button>
                </form>
              )}
              <button
                type="button"
                onClick={() => { setView("signin"); setResetSent(false); }}
                className="inline-flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> {t("auth.backToLogin")}
              </button>
            </div>
          ) : (
            <>
              <Tabs value={view} onValueChange={(v) => setView(v as View)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-full">
                  <TabsTrigger value="signin" className="rounded-full">{t("auth.tab.signin")}</TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-full">{t("auth.tab.signup")}</TabsTrigger>
                </TabsList>



                <TabsContent value="signin" className="mt-6">
                  <EmailForm
                    email={email} setEmail={setEmail}
                    password={password} setPassword={setPassword}
                    onSubmit={onSubmit} loading={loading}
                    submitLabel={t("auth.submit.signin")}
                    footer={
                      <button
                        type="button"
                        onClick={() => setView("forgot")}
                        className="self-end text-xs text-muted-foreground hover:text-foreground"
                      >
                        {t("auth.forgot")}
                      </button>
                    }
                  />
                </TabsContent>
                <TabsContent value="signup" className="mt-6">
                  <EmailForm
                    email={email} setEmail={setEmail}
                    password={password} setPassword={setPassword}
                    onSubmit={onSubmit} loading={loading}
                    submitLabel={t("auth.submit.signup")}
                  />
                </TabsContent>
              </Tabs>

              <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                {t("auth.or")}
                <div className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button" variant="outline" className="w-full rounded-full"
                onClick={() => oauth("google")} disabled={oauthBusy !== null}
              >
                {oauthBusy === "google" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
                {t("auth.google")}
              </Button>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                {t("auth.terms.prefix")}{" "}
                <Link to="/terms" className="underline hover:text-foreground">{t("auth.terms.terms")}</Link>
                {" "}{t("auth.terms.and")}{" "}
                <Link to="/privacy" className="underline hover:text-foreground">{t("auth.terms.privacy")}</Link>.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmailForm({
  email, setEmail, password, setPassword, onSubmit, loading, submitLabel, footer,
}: {
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void; loading: boolean; submitLabel: string;
  footer?: React.ReactNode;
}) {
  const { t } = useLang();
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t("auth.email")}</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email" type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.emailPlaceholder")} className="pl-9"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t("auth.password")}</Label>
        <Input
          id="password" type="password" autoComplete="current-password" required minLength={8}
          value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder={t("auth.passwordPlaceholder")}
        />
        {footer}
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
