import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Vilkår — Kvitregn" },
      { name: "description", content: "Vilkår for brug af Kvitregn — din digitale mappe til kvitteringer og fakturaer." },
      { property: "og:title", content: "Vilkår — Kvitregn" },
      { property: "og:description", content: "Vilkår for brug af Kvitregn." },
    ],
    links: [{ rel: "canonical", href: "https://kvitregn.dk/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
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
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Vilkår for brug</h1>
        <p className="mt-2 text-sm text-muted-foreground">Senest opdateret: 7. juli 2026</p>

        <div className="prose prose-neutral mt-8 max-w-none text-foreground [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_p]:mt-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-1 [&_li]:text-sm [&_li]:text-muted-foreground">
          <p>
            Disse vilkår gælder for din brug af Kvitregn ("tjenesten"), som drives af Kvitregn ApS. Ved at
            oprette en konto eller bruge tjenesten accepterer du vilkårene her.
          </p>

          <h2>1. Om tjenesten</h2>
          <p>
            Kvitregn er en digital mappe, hvor du kan uploade kvitteringer og fakturaer, få dem
            aflæst automatisk og gemt som pæne PDF-filer. Tjenesten er beregnet til personlig og
            småerhvervsmæssig brug.
          </p>

          <h2>2. Din konto</h2>
          <p>
            Du er ansvarlig for at holde dine loginoplysninger fortrolige og for alle handlinger på
            din konto. Kontakt os hvis du har mistanke om uautoriseret brug.
          </p>

          <h2>3. Dit indhold</h2>
          <p>
            Du beholder alle rettigheder til de dokumenter, du uploader. Du giver Kvitregn en
            begrænset ret til at behandle indholdet med det ene formål at levere tjenesten til dig
            — herunder at aflæse tekst, kategorisere dokumenter og generere PDF-filer.
          </p>

          <h2>4. Acceptabel brug</h2>
          <ul>
            <li>Upload kun materiale du selv har ret til.</li>
            <li>Forsøg ikke at få uautoriseret adgang til andres konti eller data.</li>
            <li>Brug ikke tjenesten til ulovlige formål eller til at gemme følsomt materiale, der
              kræver særlig sikring (fx sundhedsjournaler).</li>
          </ul>

          <h2>5. Priser og betaling</h2>
          <p>
            Tjenesten er gratis mens vi bygger den. Vi giver dig besked i god tid, inden vi
            introducerer betalte planer, og du kan altid vælge ikke at fortsætte.
          </p>

          <h2>6. Ansvarsfraskrivelse</h2>
          <p>
            Tjenesten leveres "som den er". Vi bestræber os på høj oppetid og korrekt aflæsning,
            men kan ikke garantere at data altid er fejlfri. Kontrollér vigtige oplysninger som
            beløb og datoer, før du bruger dem til bogføring eller indberetning.
          </p>

          <h2>7. Opsigelse</h2>
          <p>
            Du kan når som helst slette din konto fra indstillingerne. Vi kan lukke konti, der
            bryder disse vilkår eller misbruger tjenesten.
          </p>

          <h2>8. Lovvalg</h2>
          <p>
            Vilkårene er underlagt dansk ret. Eventuelle tvister afgøres ved de danske domstole.
          </p>

          <h2>9. Kontakt</h2>
          <p>
            Har du spørgsmål til vilkårene, så skriv til <a href="mailto:hej@kvitregn.dk" className="text-primary hover:underline">hej@kvitregn.dk</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
