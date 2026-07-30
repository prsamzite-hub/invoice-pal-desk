import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privatlivspolitik — Kvitregn" },
      { name: "description", content: "Sådan behandler Kvitregn dine personoplysninger og dokumenter." },
      { property: "og:title", content: "Privatlivspolitik — Kvitregn" },
      { property: "og:description", content: "Sådan behandler Kvitregn dine personoplysninger." },
      { property: "og:url", content: "https://kvitregn.dk/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://kvitregn.dk/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
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
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{t("privacy.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("privacy.updated")}</p>

        <div className="prose prose-neutral mt-8 max-w-none text-foreground [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_p]:mt-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-1 [&_li]:text-sm [&_li]:text-muted-foreground">
          <p>{t("privacy.intro")}</p>

          <h2>{t("privacy.section1.title")}</h2>
          <p>
            {t("privacy.section1.body")}
            <a href="mailto:privacy@kvitregn.dk" className="text-primary hover:underline"> privacy@kvitregn.dk</a>.
          </p>

          <h2>{t("privacy.section2.title")}</h2>
          <ul>
            <li><strong>{t("privacy.section2.item1.label")}</strong> {t("privacy.section2.item1.rest")}</li>
            <li><strong>{t("privacy.section2.item2.label")}</strong> {t("privacy.section2.item2.rest")}</li>
            <li><strong>{t("privacy.section2.item3.label")}</strong> {t("privacy.section2.item3.rest")}</li>
          </ul>

          <h2>{t("privacy.section3.title")}</h2>
          <p>{t("privacy.section3.body")}</p>

          <h2>{t("privacy.section4.title")}</h2>
          <p>{t("privacy.section4.body")}</p>

          <h2>{t("privacy.section5.title")}</h2>
          <p>{t("privacy.section5.body")}</p>

          <h2>{t("privacy.section6.title")}</h2>
          <ul>
            <li>{t("privacy.section6.item1")}</li>
            <li>{t("privacy.section6.item2")}</li>
            <li>{t("privacy.section6.item3")}</li>
            <li>{t("privacy.section6.item4.pre")}
              (<a href="https://datatilsynet.dk" className="text-primary hover:underline">datatilsynet.dk</a>).</li>
          </ul>

          <h2>{t("privacy.section7.title")}</h2>
          <p>{t("privacy.section7.body")}</p>

          <h2>{t("privacy.section8.title")}</h2>
          <p>{t("privacy.section8.body")}</p>

          <h2>{t("privacy.section9.title")}</h2>
          <p>
            {t("privacy.section9.body")}
            <a href="mailto:privacy@kvitregn.dk" className="text-primary hover:underline"> privacy@kvitregn.dk</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
