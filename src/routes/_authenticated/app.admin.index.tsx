import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MoreHorizontal, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { useLang } from "@/lib/i18n";
import { PageHeader } from "@/components/atoms/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  adminDeleteUser,
  adminListUserRoles,
  adminListUsers,
  adminResendConfirmation,
  adminSendMagicLink,
  adminSendPasswordReset,
  adminSetUserRole,
  adminVerifyEmail,
  isCurrentUserAdmin,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/app/admin/")({
  beforeLoad: async () => {
    const ok = await isCurrentUserAdmin();
    if (!ok) throw redirect({ to: "/app" });
  },
  head: () => ({
    meta: [
      { title: "Admin — Kvitregn" },
      { name: "description", content: "Administrer brugere og dokumenter." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { t } = useLang();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const listFn = useServerFn(adminListUsers);
  const users = useQuery({
    queryKey: ["admin-users", submitted],
    queryFn: () => listFn({ data: { q: submitted } }),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("admin.users.title")}
        description={t("admin.users.desc")}
      />

      <div className="flex gap-2">
        <Button asChild variant="outline" className="rounded-full" size="sm">
          <Link to="/app/admin">{t("admin.tab.users")}</Link>
        </Button>
        <Button asChild variant="ghost" className="rounded-full" size="sm">
          <Link to="/app/admin/documents">{t("admin.tab.documents")}</Link>
        </Button>
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(q);
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("admin.search.users")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button type="submit" className="rounded-full">{t("common.search")}</Button>
      </form>

      {users.isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : users.isError ? (
        <p className="text-sm text-destructive">{t("admin.users.cannotFetch")}</p>
      ) : (users.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Users className="mx-auto mb-2 h-6 w-6" />
          {t("admin.empty.users")}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {(users.data ?? []).map((u) => (
            <UserRow key={u.id} user={u} onChanged={() => users.refetch()} />
          ))}
        </ul>
      )}
    </div>
  );
}

function UserRow({
  user,
  onChanged,
}: {
  user: {
    id: string;
    email: string;
    display_name: string | null;
    document_count: number;
  };
  onChanged: () => void;
}) {
  const { t } = useLang();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRole, setConfirmRole] = useState<null | boolean>(null);

  const rolesFn = useServerFn(adminListUserRoles);
  const rolesQ = useQuery({
    queryKey: ["admin-user-roles", user.id],
    queryFn: () => rolesFn({ data: { userId: user.id } }),
  });
  const isAdmin = (rolesQ.data ?? []).includes("admin");

  const del = useMutation({
    mutationFn: useServerFn(adminDeleteUser),
    onSuccess: () => {
      toast.success(t("admin.toast.userDeleted"));
      setConfirmDelete(false);
      onChanged();
    },
    onError: (e: any) => toast.error(e?.message ?? t("admin.toast.cannotDelete")),
  });
  const setRole = useMutation({
    mutationFn: useServerFn(adminSetUserRole),
    onSuccess: () => {
      toast.success(t("admin.toast.roleUpdated"));
      setConfirmRole(null);
      qc.invalidateQueries({ queryKey: ["admin-user-roles", user.id] });
    },
    onError: (e: any) => toast.error(e?.message ?? t("admin.toast.cannotRole")),
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
      onChanged();
    },
    onError: (e: any) => toast.error(e?.message ?? t("admin.toast.cannotVerify")),
  });

  return (
    <li className="shadow-soft flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
      <Link
        to="/app/admin/$userId"
        params={{ userId: user.id }}
        className="min-w-0 flex-1 transition-opacity hover:opacity-80"
      >
        <p className="truncate text-sm font-semibold text-foreground">
          {user.display_name || user.email || t("common.unknown")}
        </p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </Link>
      <div className="flex items-center gap-2">
        {isAdmin ? (
          <Badge className="rounded-full bg-primary/15 text-primary">{t("admin.badge.admin")}</Badge>
        ) : null}
        <Badge variant="secondary" className="rounded-full">
          {user.document_count} {t("admin.badge.docsShort")}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={() => recovery.mutate({ data: { email: user.email } })}>
              {t("admin.action.sendReset")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => magic.mutate({ data: { email: user.email } })}>
              {t("admin.action.sendMagic")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => resend.mutate({ data: { email: user.email } })}>
              {t("admin.action.resendConfirm")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => verify.mutate({ data: { userId: user.id } })}>
              {t("admin.action.markVerified")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setConfirmRole(!isAdmin)}>
              {isAdmin ? t("admin.action.removeAdmin") : t("admin.action.makeAdmin")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setConfirmDelete(true)}
            >
              {t("admin.action.deleteUser")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
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
              onClick={() => del.mutate({ data: { userId: user.id } })}
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
              onClick={() =>
                setRole.mutate({
                  data: { userId: user.id, makeAdmin: !!confirmRole },
                })
              }
            >
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
