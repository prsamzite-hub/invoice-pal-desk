import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Vilkår — Kvitregn" },
      { name: "description", content: "Vilkår for brug af Kvitregn — din digitale mappe til kvitteringer og fakturaer." },
      { property: "og:title", content: "Vilkår — Kvitregn" },
      { property: "og:description", content: "Vilkår for brug af Kvitregn." },
      { property: "og:url", content: "https://kvitregn.dk/terms" },
    ],
    links: [{ rel: "canonical", href: "https://kvitregn.dk/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2 text-sm font-bold text-foreground">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-hero">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </span>
          Kvitregn
        </Link>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("common.back")}
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{t("terms.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("terms.updated")}</p>

        <div className="prose prose-neutral mt-8 max-w-none text-foreground [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_p]:mt-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-1 [&_li]:text-sm [&_li]:text-muted-foreground">
          <p>{t("terms.intro")}</p>

          <h2>{t("terms.section1.title")}</h2>
          <p>{t("terms.section1.body")}</p>

          <h2>{t("terms.section2.title")}</h2>
          <p>{t("terms.section2.body")}</p>

          <h2>{t("terms.section3.title")}</h2>
          <p>{t("terms.section3.body")}</p>

          <h2>{t("terms.section4.title")}</h2>
          <ul>
            <li>{t("terms.section4.item1")}</li>
            <li>{t("terms.section4.item2")}</li>
            <li>{t("terms.section4.item3")}</li>
          </ul>

          <h2>{t("terms.section5.title")}</h2>
          <p>{t("terms.section5.body")}</p>

          <h2>{t("terms.section6.title")}</h2>
          <p>{t("terms.section6.body")}</p>

          <h2>{t("terms.section7.title")}</h2>
          <p>{t("terms.section7.body")}</p>

          <h2>{t("terms.section8.title")}</h2>
          <p>{t("terms.section8.body")}</p>

          <h2>{t("terms.section9.title")}</h2>
          <p>{t("terms.section9.body")} <a href="mailto:hej@kvitregn.dk" className="text-primary hover:underline">hej@kvitregn.dk</a>.</p>
        </div>
      </main>
    </div>
  );
}
