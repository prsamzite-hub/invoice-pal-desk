import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Eye, FileText, Mail, User as UserIcon } from "lucide-react";

import { PageHeader } from "@/components/atoms/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MoneyAmount } from "@/components/atoms/money-amount";
import { adminGetDocument, adminGetUser, isCurrentUserAdmin } from "@/lib/admin.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/app/admin/$userId")({
  beforeLoad: async () => {
    const ok = await isCurrentUserAdmin();
    if (!ok) throw redirect({ to: "/app" });
  },
  head: () => ({
    meta: [
      { title: "Admin: bruger — Kvitregn" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminUserPage,
});

const dateFmt = new Intl.DateTimeFormat("da-DK", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
function fmt(d: string | null | undefined) {
  return d ? dateFmt.format(new Date(d)) : "—";
}

function AdminUserPage() {
  const { userId } = Route.useParams();
  const getUser = useServerFn(adminGetUser);
  const getDoc = useServerFn(adminGetDocument);
  const q = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => getUser({ data: { userId } }),
  });
  const [docId, setDocId] = useState<string | null>(null);
  const docQ = useQuery({
    enabled: !!docId,
    queryKey: ["admin-doc", docId],
    queryFn: () => getDoc({ data: { id: docId! } }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="rounded-full">
          <Link to="/app/admin">
            <ArrowLeft className="mr-2 h-4 w-4" /> Tilbage
          </Link>
        </Button>
      </div>

      <PageHeader
        title={q.data?.profile?.display_name || q.data?.auth.email || "Bruger"}
        description="Læseadgang — ingen ændringer mulige."
      />

      {q.isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : q.isError || !q.data ? (
        <p className="text-sm text-destructive">Kunne ikke hente brugeren.</p>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            <div className="shadow-soft flex flex-col gap-2 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <UserIcon className="h-4 w-4 text-muted-foreground" /> Profil
              </div>
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" /> {q.data.auth.email || "—"}
                </div>
                <div>Oprettet: {fmt(q.data.auth.created_at)}</div>
                <div>Sidst logget ind: {fmt(q.data.auth.last_sign_in_at)}</div>
                {q.data.profile?.display_name ? (
                  <div>Navn: {q.data.profile.display_name}</div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Dokumenter</h2>
              <Badge variant="secondary" className="rounded-full">
                {q.data.documents.length}
              </Badge>
            </div>
            {q.data.documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                <FileText className="mx-auto mb-2 h-6 w-6" /> Ingen dokumenter.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {q.data.documents.map((d: any) => (
                  <li
                    key={d.id}
                    className="shadow-soft flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{d.company}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {fmt(d.issued_date)} · {d.document_type === "invoice" ? "Faktura" : "Kvittering"}
                        {d.category ? ` · ${d.category}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <MoneyAmount value={Number(d.amount)} currency={d.currency || "DKK"} size="sm" />
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setDocId(d.id)}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Vis
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <Dialog open={!!docId} onOpenChange={(o) => !o && setDocId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dokument</DialogTitle>
            <DialogDescription>Læseadgang — visning er logget.</DialogDescription>
          </DialogHeader>
          {docQ.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : docQ.data ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Firma</div>
                  <div className="font-semibold">{docQ.data.row.company}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Beløb</div>
                  <MoneyAmount value={Number(docQ.data.row.amount)} currency={docQ.data.row.currency} size="sm" />
                </div>
                <div>
                  <div className="text-muted-foreground">Dato</div>
                  <div>{fmt(docQ.data.row.issued_date)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Forfald</div>
                  <div>{fmt(docQ.data.row.due_date)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Type</div>
                  <div>{docQ.data.row.document_type === "invoice" ? "Faktura" : "Kvittering"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Kategori</div>
                  <div>{docQ.data.row.category ?? "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Erhverv</div>
                  <div>{docQ.data.row.is_business ? "Ja" : "Nej"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <div>{docQ.data.row.status}</div>
                </div>
              </div>
              {docQ.data.row.notes ? (
                <div className="text-sm">
                  <div className="text-muted-foreground">Noter</div>
                  <div>{docQ.data.row.notes}</div>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {docQ.data.pdfUrl ? (
                  <Button asChild variant="outline" className="rounded-full">
                    <a href={docQ.data.pdfUrl} target="_blank" rel="noreferrer">Åbn PDF</a>
                  </Button>
                ) : null}
                {docQ.data.originalUrl ? (
                  <Button asChild variant="outline" className="rounded-full">
                    <a href={docQ.data.originalUrl} target="_blank" rel="noreferrer">Åbn original fil</a>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-destructive">Kunne ikke hente dokumentet.</p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDocId(null)}>Luk</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
