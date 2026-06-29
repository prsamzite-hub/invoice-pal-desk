import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Sparkles,
  Receipt,
  ShieldCheck,
  Search,
  PieChart,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/atoms/status-badge";
import { MoneyAmount } from "@/components/atoms/money-amount";
import { CompanyAvatar } from "@/components/atoms/company-avatar";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kvittr — Receipts & invoices, finally in one place" },
      {
        name: "description",
        content:
          "A playful, calm home for every kvittering and faktura. Upload, search, and pay — built for Denmark.",
      },
      { property: "og:title", content: "Kvittr — Receipts & invoices, finally in one place" },
      {
        property: "og:description",
        content: "Never lose a receipt. Never miss an invoice. Kvittr is your friendly document wallet.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero shadow-soft">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-foreground">kvittr</span>
        </Link>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" className="rounded-full">
            <Link to="/app">Sign in</Link>
          </Button>
          <Button asChild className="rounded-full">
            <Link to="/app">
              Get started
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
                <Sparkles className="h-3.5 w-3.5" /> Made in Denmark · launching in DKK
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Every receipt and invoice,{" "}
                <span className="bg-gradient-hero rounded-2xl px-2 py-1 text-primary">
                  in one happy wallet.
                </span>
              </h1>
              <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
                Kvittr keeps every kvittering and faktura tidy, searchable, and paid on time —
                so the shoebox under your bed can finally retire.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-full">
                  <Link to="/app">
                    Open my wallet
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full">
                  <Link to="/app/upload">See it in action</Link>
                </Button>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-status-paid-foreground" />
                  Private by default
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-lavender-foreground" />
                  AI fills the boring fields
                </li>
              </ul>
            </div>

            <HeroPreview />
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              A calmer way to handle paperwork.
            </h2>
            <p className="mt-2 text-muted-foreground">
              Built around three things: capture it, find it, pay it.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <FeatureCard
              tone="lavender"
              icon={Receipt}
              title="Capture anything"
              body="Drag in a PDF, snap a photo, forward an email — Kvittr reads it and files it for you."
            />
            <FeatureCard
              tone="sky"
              icon={Search}
              title="Find it in a second"
              body="Search by company, date, or amount. Filters that actually understand a kvittering."
            />
            <FeatureCard
              tone="mint"
              icon={PieChart}
              title="Pay on time, every time"
              body="See unpaid invoices at a glance, set monthly budgets, and never miss a due date."
            />
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="shadow-pop relative overflow-hidden rounded-3xl bg-gradient-hero p-10 text-center sm:p-16">
            <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
              Bring your paperwork home.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-primary/80">
              Start your wallet in under a minute. It's free while we build.
            </p>
            <div className="mt-6 flex justify-center">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/app">
                  Open Kvittr
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <span>© 2026 Kvittr · Made with care in Copenhagen</span>
          <span>kvittr.dk</span>
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
              June total
            </p>
            <MoneyAmount value={4287.5} size="xl" className="block text-foreground" />
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-mint-foreground">
            +12% vs. May
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <PreviewRow company="Netto" amount={247.5} status="paid" date="26 Jun" />
          <PreviewRow company="Ørsted" amount={892} status="unpaid" date="Due 5 Jul" />
          <PreviewRow company="Telenor" amount={199} status="overdue" date="Due 25 Jun" />
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
