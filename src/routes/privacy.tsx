import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";

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
          <ArrowLeft className="h-3.5 w-3.5" /> Tilbage
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Privatlivspolitik</h1>
        <p className="mt-2 text-sm text-muted-foreground">Senest opdateret: 7. juli 2026</p>

        <div className="prose prose-neutral mt-8 max-w-none text-foreground [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_p]:mt-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-1 [&_li]:text-sm [&_li]:text-muted-foreground">
          <p>
            Denne privatlivspolitik beskriver, hvordan Kvitregn behandler dine personoplysninger,
            når du bruger vores tjeneste. Vi følger databeskyttelsesforordningen (GDPR).
          </p>

          <h2>1. Dataansvarlig</h2>
          <p>
            Kvitregn ApS er dataansvarlig for behandlingen af dine oplysninger. Kontakt:
            <a href="mailto:privacy@kvitregn.dk" className="text-primary hover:underline"> privacy@kvitregn.dk</a>.
          </p>

          <h2>2. Hvilke oplysninger vi behandler</h2>
          <ul>
            <li><strong>Kontooplysninger:</strong> navn og email — brugt til login og kommunikation.</li>
            <li><strong>Dokumenter:</strong> kvitteringer og fakturaer du uploader, samt data aflæst
              fra dem (fx firma, beløb, dato, kategori).</li>
            <li><strong>Tekniske oplysninger:</strong> log-data, IP-adresse og enhedsinfo brugt til
              drift og sikkerhed.</li>
          </ul>

          <h2>3. Formål og retsgrundlag</h2>
          <p>
            Vi bruger dine oplysninger til at levere tjenesten (opfyldelse af aftale, GDPR art. 6,
            stk. 1, litra b), til at beskytte kontoen (legitim interesse, litra f) og til at overholde
            lovkrav som fx bogføring (litra c).
          </p>

          <h2>4. Databehandlere</h2>
          <p>
            Vi bruger følgende typer underleverandører til drift af tjenesten: hosting og database
            (i EU), AI-tjeneste til aflæsning af dokumenter, samt email-udbyder. Alle er bundet af
            databehandleraftaler.
          </p>

          <h2>5. Opbevaring</h2>
          <p>
            Vi opbevarer dine dokumenter og kontooplysninger, så længe din konto er aktiv. Sletter
            du kontoen, fjerner vi dine data inden for 30 dage, med mindre lovgivningen kræver
            længere opbevaring (fx bogføringsloven).
          </p>

          <h2>6. Dine rettigheder</h2>
          <ul>
            <li>Ret til indsigt i, hvilke oplysninger vi har om dig.</li>
            <li>Ret til at få rettet eller slettet dine oplysninger.</li>
            <li>Ret til at få begrænset behandlingen eller til dataportabilitet.</li>
            <li>Ret til at trække samtykke tilbage og til at klage til Datatilsynet
              (<a href="https://datatilsynet.dk" className="text-primary hover:underline">datatilsynet.dk</a>).</li>
          </ul>

          <h2>7. Sikkerhed</h2>
          <p>
            Dine dokumenter opbevares privat og krypteres under transport. Adgang er beskyttet af
            adgangskoder og row-level security, så kun du kan se dine egne filer.
          </p>

          <h2>8. Cookies</h2>
          <p>
            Vi bruger kun tekniske cookies, der er nødvendige for at holde dig logget ind. Vi bruger
            ikke tredjeparts-tracking eller reklamecookies.
          </p>

          <h2>9. Kontakt</h2>
          <p>
            Har du spørgsmål eller vil du udøve dine rettigheder, så skriv til
            <a href="mailto:privacy@kvitregn.dk" className="text-primary hover:underline"> privacy@kvitregn.dk</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
