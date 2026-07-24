import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MoreHorizontal, Search, Users } from "lucide-react";
import { toast } from "sonner";

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

export const Route = createFileRoute("/_authenticated/app/admin")({
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
        title="Admin — Brugere"
        description="Administrer brugere, verifikation og roller. Alle handlinger logges."
      />

      <div className="flex gap-2">
        <Button asChild variant="outline" className="rounded-full" size="sm">
          <Link to="/app/admin">Brugere</Link>
        </Button>
        <Button asChild variant="ghost" className="rounded-full" size="sm">
          <Link to="/app/admin/documents">Dokumenter</Link>
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
            placeholder="Søg på email eller navn…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button type="submit" className="rounded-full">Søg</Button>
      </form>

      {users.isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : users.isError ? (
        <p className="text-sm text-destructive">Kunne ikke hente brugere.</p>
      ) : (users.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Users className="mx-auto mb-2 h-6 w-6" />
          Ingen brugere matcher søgningen.
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
      toast.success("Bruger slettet");
      setConfirmDelete(false);
      onChanged();
    },
    onError: (e: any) => toast.error(e?.message ?? "Kunne ikke slette"),
  });
  const setRole = useMutation({
    mutationFn: useServerFn(adminSetUserRole),
    onSuccess: () => {
      toast.success("Rolle opdateret");
      setConfirmRole(null);
      qc.invalidateQueries({ queryKey: ["admin-user-roles", user.id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Kunne ikke opdatere rolle"),
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
      onChanged();
    },
    onError: (e: any) => toast.error(e?.message ?? "Kunne ikke opdatere"),
  });

  return (
    <li className="shadow-soft flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
      <Link
        to="/app/admin/$userId"
        params={{ userId: user.id }}
        className="min-w-0 flex-1 transition-opacity hover:opacity-80"
      >
        <p className="truncate text-sm font-semibold text-foreground">
          {user.display_name || user.email || "Ukendt"}
        </p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </Link>
      <div className="flex items-center gap-2">
        {isAdmin ? (
          <Badge className="rounded-full bg-primary/15 text-primary">Admin</Badge>
        ) : null}
        <Badge variant="secondary" className="rounded-full">
          {user.document_count} dok.
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={() => recovery.mutate({ data: { email: user.email } })}>
              Send nulstil-mail
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => magic.mutate({ data: { email: user.email } })}>
              Send login-link
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => resend.mutate({ data: { email: user.email } })}>
              Gensend bekræftelse
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => verify.mutate({ data: { userId: user.id } })}>
              Marker verificeret
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setConfirmRole(!isAdmin)}>
              {isAdmin ? "Fjern admin" : "Gør til admin"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setConfirmDelete(true)}
            >
              Slet bruger
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
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
              onClick={() => del.mutate({ data: { userId: user.id } })}
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
              onClick={() =>
                setRole.mutate({
                  data: { userId: user.id, makeAdmin: !!confirmRole },
                })
              }
            >
              Bekræft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
