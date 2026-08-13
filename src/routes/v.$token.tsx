import { createFileRoute } from "@tanstack/react-router";
import { verifyDocument } from "@/lib/verify.functions";

export const Route = createFileRoute("/v/$token")({
  loader: ({ params }) => verifyDocument({ data: { token: params.token } }),
  head: () => ({
    meta: [
      { title: "Verificér bilag — Kvitregn" },
      {
        name: "description",
        content: "Bekræft at et bilag er registreret i Kvitregn. Viser kun beløb, dato og udsteder.",
      },
      { property: "og:title", content: "Verificér bilag — Kvitregn" },
      {
        property: "og:description",
        content: "Bekræft at et bilag er registreret i Kvitregn.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyPage,
});

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("da-DK", { dateStyle: "long" }).format(d);
}

function VerifyPage() {
  const doc = Route.useLoaderData();

  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-xl font-semibold tracking-tight">Kvitregn</span>
          <p className="text-sm text-muted-foreground">Digital kvitteringsmappe</p>
        </div>

        {!doc ? (
          <div className="rounded-xl border bg-card p-6 text-center">
            <h1 className="text-lg font-semibold">Bilag ikke fundet</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Linket er ugyldigt, eller bilaget findes ikke længere i Kvitregn.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-6">
            <h1 className="text-lg font-semibold">Bilag verificeret</h1>
            <dl className="mt-6 space-y-4 text-sm">
              <Row label="Udsteder" value={doc.company || "—"} />
              <Row
                label="Beløb"
                value={new Intl.NumberFormat("da-DK", {
                  style: "currency",
                  currency: doc.currency || "DKK",
                }).format(doc.amount)}
              />
              <Row label="Valuta" value={doc.currency || "DKK"} />
              <Row label="Udstedelsesdato" value={fmtDate(doc.issued_date)} />
              <Row
                label="Dokumenttype"
                value={doc.document_type === "invoice" ? "Faktura" : "Kvittering"}
              />
            </dl>
            <p className="mt-6 border-t pt-4 text-xs text-muted-foreground">
              Registreret i Kvitregn {fmtDate(doc.registered_at)}
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Denne side viser kun bilagets grunddata. Ingen brugeroplysninger eller filer deles.
        </p>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
