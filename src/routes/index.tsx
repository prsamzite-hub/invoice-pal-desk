import { useEffect } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  Receipt,
  ShieldCheck,
  Search,
  FileText,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/atoms/status-badge";
import { MoneyAmount } from "@/components/atoms/money-amount";
import { CompanyAvatar } from "@/components/atoms/company-avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kvitregn — Saml dine kvitteringer og fakturaer ét sted" },
      {
        name: "description",
        content:
          "Kvitregn er en rolig og legesyg mappe til hver kvittering og faktura. Upload, søg og find dem igen — bygget til Danmark.",
      },
      { property: "og:title", content: "Kvitregn — Saml dine kvitteringer og fakturaer ét sted" },
      {
        property: "og:description",
        content: "Mist aldrig en kvittering. Kvitregn er din venlige digitale dokumentmappe.",
      },
      { property: "og:url", content: "https://kvitregn.dk/" },
      { property: "og:image", content: "https://kvitregn.dk/__l5e/assets-v1/9be3c540-f8d9-4cac-abeb-40c530cee740/kvitregn-og.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://kvitregn.dk/__l5e/assets-v1/9be3c540-f8d9-4cac-abeb-40c530cee740/kvitregn-og.png" },
    ],
    links: [
      { rel: "canonical", href: "https://kvitregn.dk/" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate({ to: "/app", replace: true });
    });
    return () => { active = false; };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" className="flex items-center gap-2" aria-label="Kvitregn — forside">
          <img src="/brand/lockup-on-light.png" alt="Kvitregn logo" className="h-10 w-auto dark:hidden" />
          <img src="/brand/lockup-on-dark.png" alt="Kvitregn logo" className="hidden h-10 w-auto dark:block" />
        </Link>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" className="rounded-full">
            <Link to="/auth">Log ind</Link>
          </Button>
          <Button asChild className="rounded-full">
            <Link to="/auth">
              Kom i gang
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col gap-6">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-lavender px-3 py-1 text-xs font-semibold text-lavender-foreground">
                <Sparkles className="h-3.5 w-3.5" /> Lavet i Danmark · priser i DKK
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Hver kvittering og faktura,{" "}
                <span className="bg-gradient-hero rounded-2xl px-2 py-1 text-primary">
                  samlet ét sted.
                </span>
              </h1>
              <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
                Kvitregn holder styr på hver kvittering og faktura — pænt, søgbart og altid ved
                hånden. Skoæsken under sengen kan endelig gå på pension.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-full">
                  <Link to="/auth">
                    Åbn min mappe
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full">
                  <a href="#preview">Se hvordan det ser ud</a>
                </Button>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-status-paid-foreground" />
                  Privat som standard
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-lavender-foreground" />
                  AI udfylder de kedelige felter
                </li>
              </ul>
            </div>

            <div id="preview">
              <HeroPreview />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              En roligere måde at holde styr på papirerne.
            </h2>
            <p className="mt-2 text-muted-foreground">
              Bygget omkring tre ting: gem det, find det, del det.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <FeatureCard
              tone="lavender"
              icon={Receipt}
              title="Upload alt"
              body="Træk en PDF ind eller tag et billede — Kvitregn læser det og arkiverer det for dig."
            />
            <FeatureCard
              tone="sky"
              icon={Search}
              title="Find det på et sekund"
              body="Søg efter firma, dato eller beløb. Filtre der faktisk forstår en kvittering."
            />
            <FeatureCard
              tone="mint"
              icon={FileText}
              title="Altid en pæn PDF"
              body="Hvert dokument bliver til en ren, delbar PDF — klar til bogholderen eller din egen mappe."
            />
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="shadow-pop relative overflow-hidden rounded-3xl bg-gradient-hero p-10 text-center sm:p-16">
            <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
              Få styr på papirerne.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-primary/80">
              Kom i gang på under et minut. Gratis mens vi bygger.
            </p>
            <div className="mt-6 flex justify-center">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/auth">
                  Åbn Kvitregn
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/brand/lockup-on-light.png" alt="Kvitregn logo" className="h-7 w-auto dark:hidden" />
            <img src="/brand/lockup-on-dark.png" alt="Kvitregn logo" className="hidden h-7 w-auto dark:block" />
            <span className="hidden sm:inline">· Lavet med omhu i København</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-foreground">Vilkår</Link>
            <Link to="/privacy" className="hover:text-foreground">Privatlivspolitik</Link>
            <a href="https://kvitregn.dk" className="hover:text-foreground">kvitregn.dk</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  tone,
  icon: Icon,
  title,
  body,
}: {
  tone: "lavender" | "sky" | "mint" | "peach" | "butter";
  icon: typeof Receipt;
  title: string;
  body: string;
}) {
  const toneBg = {
    lavender: "bg-lavender text-lavender-foreground",
    sky: "bg-sky text-sky-foreground",
    mint: "bg-mint text-mint-foreground",
    peach: "bg-peach text-peach-foreground",
    butter: "bg-butter text-butter-foreground",
  }[tone];
  return (
    <div className="shadow-soft hover:shadow-card flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 transition-all hover:-translate-y-1">
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${toneBg}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}



function HeroPreview() {
  return (
    <div className="relative">
      <div className="bg-gradient-hero shadow-pop absolute -inset-6 -z-10 rounded-[36px] opacity-70 blur-2xl" />
      <div className="shadow-card rounded-3xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Juni i alt
            </p>
            <MoneyAmount value={4287.5} size="xl" className="block text-foreground" />
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-mint-foreground">
            +12% vs. maj
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <PreviewRow company="Netto" amount={247.5} status="paid" date="26. jun" />
          <PreviewRow company="Ørsted" amount={892} status="unpaid" date="Forfalder 5. jul" />
          <PreviewRow company="Telenor" amount={199} status="overdue" date="Forfalder 25. jun" />
        </div>
      </div>
    </div>
  );
}

function PreviewRow({
  company,
  amount,
  status,
  date,
}: {
  company: string;
  amount: number;
  status: "paid" | "unpaid" | "overdue";
  date: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/60 p-3">
      <CompanyAvatar name={company} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{company}</p>
        <p className="text-xs text-muted-foreground">{date}</p>
      </div>
      <MoneyAmount value={amount} size="sm" />
      <StatusBadge status={status} />
    </div>
  );
}
