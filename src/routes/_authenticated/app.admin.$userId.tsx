import { useEffect, useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Eye, FileText, Mail, MoreHorizontal, Pencil, Trash2, User as UserIcon } from "lucide-react";
import { AdminDocumentEditDialog } from "@/components/admin-document-edit-dialog";
import { toast } from "sonner";

import { useLang } from "@/lib/i18n";
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

function AdminUserPage() {
  const { t, formatDate } = useLang();
  const fmt = (d: string | null | undefined) => (d ? formatDate(d) : "—");
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
      toast.success(t("admin.toast.userUpdated"));
      q.refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? t("admin.toast.cannotSave")),
  });
  const del = useMutation({
    mutationFn: useServerFn(adminDeleteUser),
    onSuccess: () => {
      toast.success(t("admin.toast.userDeleted"));
      navigate({ to: "/app/admin" });
    },
    onError: (e: any) => toast.error(e?.message ?? t("admin.toast.cannotDelete")),
  });
  const setRole = useMutation({
    mutationFn: useServerFn(adminSetUserRole),
    onSuccess: () => {
      toast.success(t("admin.toast.roleUpdated"));
      setConfirmRole(null);
      rolesQ.refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? t("admin.toast.cannotVerify")),
  });
  const recovery = useMutation({
    mutationFn: useServerFn(adminSendPasswordReset),
    onSuccess: () => toast.success(t("admin.toast.resetSent")),
    onError: (e: any) => toast.error(e?.message ?? t("admin.toast.cannotSend")),
  });
  const magic = useMutation({
    mutationFn: useServerFn(adminSendMagicLink),
    onSuccess: () => toast.success(t("admin.toast.magicSent")),
    onError: (e: any) => toast.error(e?.message ?? t("admin.toast.cannotSend")),
  });
  const resend = useMutation({
    mutationFn: useServerFn(adminResendConfirmation),
    onSuccess: () => toast.success(t("admin.toast.confirmResent")),
    onError: (e: any) => toast.error(e?.message ?? t("admin.toast.cannotSend")),
  });
  const verify = useMutation({
    mutationFn: useServerFn(adminVerifyEmail),
    onSuccess: () => {
      toast.success(t("admin.toast.verified"));
      q.refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? t("admin.toast.cannotVerify")),
  });
  const delDoc = useMutation({
    mutationFn: useServerFn(adminDeleteDocument),
    onSuccess: () => {
      toast.success(t("admin.toast.docDeleted"));
      setDocToDelete(null);
      q.refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? t("admin.toast.cannotDelete")),
  });

  const userEmail = q.data?.auth.email ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="rounded-full">
          <Link to="/app/admin">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("common.back")}
          </Link>
        </Button>
      </div>

      <PageHeader
        title={q.data?.profile?.display_name || q.data?.auth.email || t("common.unknown")}
        description={t("admin.user.title")}
      />

      {q.isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : q.isError || !q.data ? (
        <p className="text-sm text-destructive">{t("admin.user.cannotFetch")}</p>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            <div className="shadow-soft flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <UserIcon className="h-4 w-4 text-muted-foreground" /> {t("admin.user.profile")}
                </div>
                {isAdmin ? (
                  <Badge className="rounded-full bg-primary/15 text-primary">{t("admin.badge.admin")}</Badge>
                ) : null}
              </div>
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" /> {q.data.auth.email || "—"}
                </div>
                <div>{t("admin.user.created")} {fmt(q.data.auth.created_at)}</div>
                <div>{t("admin.user.lastSignIn")} {fmt(q.data.auth.last_sign_in_at)}</div>
              </div>

              <div className="mt-2 flex flex-col gap-2">
                <div>
                  <Label htmlFor="dn" className="text-xs">{t("admin.user.name")}</Label>
                  <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="em" className="text-xs">{t("admin.user.email")}</Label>
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
                    {t("common.save")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="shadow-soft flex flex-col gap-2 rounded-2xl border border-border bg-card p-5">
              <div className="text-sm font-semibold">{t("admin.user.actions")}</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => recovery.mutate({ data: { email: userEmail } })}>
                  {t("admin.action.sendReset")}
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => magic.mutate({ data: { email: userEmail } })}>
                  {t("admin.action.sendMagic")}
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => resend.mutate({ data: { email: userEmail } })}>
                  {t("admin.action.resendConfirm")}
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => verify.mutate({ data: { userId } })}>
                  {t("admin.action.markVerified")}
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => setConfirmRole(!isAdmin)}>
                  {isAdmin ? t("admin.action.removeAdmin") : t("admin.action.makeAdmin")}
                </Button>
                <Button size="sm" variant="destructive" className="rounded-full" onClick={() => setConfirmDeleteUser(true)}>
                  {t("admin.action.deleteUser")}
                </Button>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{t("admin.user.documents")}</h2>
              <Badge variant="secondary" className="rounded-full">
                {q.data.documents.length}
              </Badge>
            </div>
            {q.data.documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                <FileText className="mx-auto mb-2 h-6 w-6" /> {t("admin.user.emptyDocs")}
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
                        {fmt(d.issued_date)} · {d.document_type === "invoice" ? t("docs.type.invoice") : t("docs.type.receipt")}
                        {d.category ? ` · ${d.category}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <MoneyAmount value={Number(d.amount)} currency={d.currency || "DKK"} size="sm" />
                      <Button variant="outline" size="sm" className="rounded-full" onClick={() => setDocId(d.id)}>
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> {t("admin.user.view")}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditDocId(d.id)}>
                            <Pencil className="mr-2 h-4 w-4" /> {t("admin.action.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => setDocToDelete(d.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> {t("common.delete")}
                          </DropdownMenuItem>
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
            <DialogTitle>{t("admin.doc.dialogTitle")}</DialogTitle>
            <DialogDescription>{t("admin.doc.dialogDesc")}</DialogDescription>
          </DialogHeader>
          {docQ.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : docQ.data ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">{t("admin.doc.company")}</div>
                  <div className="font-semibold">{docQ.data.row.company}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("admin.doc.amount")}</div>
                  <MoneyAmount value={Number(docQ.data.row.amount)} currency={docQ.data.row.currency} size="sm" />
                </div>
                <div>
                  <div className="text-muted-foreground">{t("admin.doc.date")}</div>
                  <div>{fmt(docQ.data.row.issued_date)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("admin.doc.due")}</div>
                  <div>{fmt(docQ.data.row.due_date)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("admin.doc.type")}</div>
                  <div>{docQ.data.row.document_type === "invoice" ? t("docs.type.invoice") : t("docs.type.receipt")}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("admin.doc.category")}</div>
                  <div>{docQ.data.row.category ?? "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("admin.doc.status")}</div>
                  <div>{docQ.data.row.status}</div>
                </div>
              </div>
              {docQ.data.row.notes ? (
                <div className="text-sm">
                  <div className="text-muted-foreground">{t("admin.doc.notes")}</div>
                  <div>{docQ.data.row.notes}</div>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {docQ.data.pdfUrl ? (
                  <Button asChild variant="outline" className="rounded-full">
                    <a href={docQ.data.pdfUrl} target="_blank" rel="noreferrer">{t("admin.doc.openPdf")}</a>
                  </Button>
                ) : null}
                {docQ.data.originalUrl ? (
                  <Button asChild variant="outline" className="rounded-full">
                    <a href={docQ.data.originalUrl} target="_blank" rel="noreferrer">{t("admin.doc.openOriginal")}</a>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-destructive">{t("admin.doc.edit.cannotFetch")}</p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDocId(null)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteUser} onOpenChange={setConfirmDeleteUser}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.confirm.deleteUser.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.confirm.deleteUser.desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => del.mutate({ data: { userId } })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRole !== null} onOpenChange={(o) => !o && setConfirmRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmRole ? t("admin.confirm.role.makeTitle") : t("admin.confirm.role.removeTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRole
                ? t("admin.confirm.role.makeDesc")
                : t("admin.confirm.role.removeDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => setRole.mutate({ data: { userId, makeAdmin: !!confirmRole } })}
            >
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!docToDelete} onOpenChange={(o) => !o && setDocToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.confirm.deleteDoc.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.confirm.deleteDoc.desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => docToDelete && delDoc.mutate({ data: { id: docToDelete } })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdminDocumentEditDialog
        documentId={editDocId}
        onOpenChange={(o) => !o && setEditDocId(null)}
        onSaved={() => q.refetch()}
      />
    </div>
  );
}
