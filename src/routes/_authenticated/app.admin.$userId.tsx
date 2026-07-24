import { useEffect, useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Eye, FileText, Mail, MoreHorizontal, Pencil, Trash2, User as UserIcon } from "lucide-react";
import { AdminDocumentEditDialog } from "@/components/admin-document-edit-dialog";
import { toast } from "sonner";

import { PageHeader } from "@/components/atoms/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyAmount } from "@/components/atoms/money-amount";
import {
  adminDeleteDocument,
  adminDeleteUser,
  adminGetDocument,
  adminGetUser,
  adminListUserRoles,
  adminResendConfirmation,
  adminSendMagicLink,
  adminSendPasswordReset,
  adminSetUserRole,
  adminUpdateUser,
  adminVerifyEmail,
  isCurrentUserAdmin,
} from "@/lib/admin.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const navigate = useNavigate();
  const getUser = useServerFn(adminGetUser);
  const getDoc = useServerFn(adminGetDocument);
  const rolesFn = useServerFn(adminListUserRoles);
  const q = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => getUser({ data: { userId } }),
  });
  const rolesQ = useQuery({
    queryKey: ["admin-user-roles", userId],
    queryFn: () => rolesFn({ data: { userId } }),
  });
  const isAdmin = (rolesQ.data ?? []).includes("admin");

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  useEffect(() => {
    if (q.data) {
      setDisplayName(q.data.profile?.display_name ?? "");
      setEmail(q.data.auth.email ?? "");
    }
  }, [q.data]);

  const [docId, setDocId] = useState<string | null>(null);
  const [editDocId, setEditDocId] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(false);
  const [confirmRole, setConfirmRole] = useState<null | boolean>(null);

  const docQ = useQuery({
    enabled: !!docId,
    queryKey: ["admin-doc", docId],
    queryFn: () => getDoc({ data: { id: docId! } }),
  });

  const update = useMutation({
    mutationFn: useServerFn(adminUpdateUser),
    onSuccess: () => {
      toast.success("Bruger opdateret");
      q.refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Kunne ikke gemme"),
  });
  const del = useMutation({
    mutationFn: useServerFn(adminDeleteUser),
    onSuccess: () => {
      toast.success("Bruger slettet");
      navigate({ to: "/app/admin" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Kunne ikke slette"),
  });
  const setRole = useMutation({
    mutationFn: useServerFn(adminSetUserRole),
    onSuccess: () => {
      toast.success("Rolle opdateret");
      setConfirmRole(null);
      rolesQ.refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Kunne ikke opdatere"),
  });
  const recovery = useMutation({
    mutationFn: useServerFn(adminSendPasswordReset),
    onSuccess: () => toast.success("Nulstil-mail sendt"),
    onError: (e: any) => toast.error(e?.message ?? "Kunne ikke sende"),
  });
  const magic = useMutation({
    mutationFn: useServerFn(adminSendMagicLink),
    onSuccess: () => toast.success("Login-link sendt"),
    onError: (e: any) => toast.error(e?.message ?? "Kunne ikke sende"),
  });
  const resend = useMutation({
    mutationFn: useServerFn(adminResendConfirmation),
    onSuccess: () => toast.success("Bekræftelse sendt"),
    onError: (e: any) => toast.error(e?.message ?? "Kunne ikke sende"),
  });
  const verify = useMutation({
    mutationFn: useServerFn(adminVerifyEmail),
    onSuccess: () => {
      toast.success("Email markeret som verificeret");
      q.refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Kunne ikke opdatere"),
  });
  const delDoc = useMutation({
    mutationFn: useServerFn(adminDeleteDocument),
    onSuccess: () => {
      toast.success("Dokument slettet");
      setDocToDelete(null);
      q.refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Kunne ikke slette"),
  });

  const userEmail = q.data?.auth.email ?? "";

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
        description="Administrer bruger, roller og dokumenter."
      />

      {q.isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : q.isError || !q.data ? (
        <p className="text-sm text-destructive">Kunne ikke hente brugeren.</p>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            <div className="shadow-soft flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <UserIcon className="h-4 w-4 text-muted-foreground" /> Profil
                </div>
                {isAdmin ? (
                  <Badge className="rounded-full bg-primary/15 text-primary">Admin</Badge>
                ) : null}
              </div>
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" /> {q.data.auth.email || "—"}
                </div>
                <div>Oprettet: {fmt(q.data.auth.created_at)}</div>
                <div>Sidst logget ind: {fmt(q.data.auth.last_sign_in_at)}</div>
              </div>

              <div className="mt-2 flex flex-col gap-2">
                <div>
                  <Label htmlFor="dn" className="text-xs">Navn</Label>
                  <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="em" className="text-xs">Email</Label>
                  <Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="rounded-full"
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate({
                        data: {
                          userId,
                          display_name: displayName,
                          ...(email !== q.data?.auth.email ? { email } : {}),
                        },
                      })
                    }
                  >
                    Gem
                  </Button>
                </div>
              </div>
            </div>

            <div className="shadow-soft flex flex-col gap-2 rounded-2xl border border-border bg-card p-5">
              <div className="text-sm font-semibold">Handlinger</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => recovery.mutate({ data: { email: userEmail } })}>
                  Send nulstil-mail
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => magic.mutate({ data: { email: userEmail } })}>
                  Send login-link
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => resend.mutate({ data: { email: userEmail } })}>
                  Gensend bekræftelse
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => verify.mutate({ data: { userId } })}>
                  Marker verificeret
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => setConfirmRole(!isAdmin)}>
                  {isAdmin ? "Fjern admin" : "Gør til admin"}
                </Button>
                <Button size="sm" variant="destructive" className="rounded-full" onClick={() => setConfirmDeleteUser(true)}>
                  Slet bruger
                </Button>
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
                      <p className="truncate text-sm font-semibold text-foreground">{d.company}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmt(d.issued_date)} · {d.document_type === "invoice" ? "Faktura" : "Kvittering"}
                        {d.category ? ` · ${d.category}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <MoneyAmount value={Number(d.amount)} currency={d.currency || "DKK"} size="sm" />
                      <Button variant="outline" size="sm" className="rounded-full" onClick={() => setDocId(d.id)}>
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Vis
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => setDocToDelete(d.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Slet
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </DropdownMenuContent>
                      </DropdownMenu>
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
            <DialogDescription>Visning er logget.</DialogDescription>
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

      <AlertDialog open={confirmDeleteUser} onOpenChange={setConfirmDeleteUser}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slet bruger?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette sletter brugeren, alle dokumenter og filer permanent. Handlingen kan ikke fortrydes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuller</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => del.mutate({ data: { userId } })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Slet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRole !== null} onOpenChange={(o) => !o && setConfirmRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmRole ? "Gør til administrator?" : "Fjern administrator-rolle?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRole
                ? "Brugeren får fuld adgang til admin-området."
                : "Brugeren mister adgang til admin-området."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuller</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => setRole.mutate({ data: { userId, makeAdmin: !!confirmRole } })}
            >
              Bekræft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!docToDelete} onOpenChange={(o) => !o && setDocToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slet dokument?</AlertDialogTitle>
            <AlertDialogDescription>
              Dokumentet og tilhørende filer slettes permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuller</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => docToDelete && delDoc.mutate({ data: { id: docToDelete } })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Slet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
