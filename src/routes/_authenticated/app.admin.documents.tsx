import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, MoreHorizontal, Search } from "lucide-react";
import { toast } from "sonner";

import { useLang } from "@/lib/i18n";
import { PageHeader } from "@/components/atoms/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MoneyAmount } from "@/components/atoms/money-amount";
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
import { AdminDocumentEditDialog } from "@/components/admin-document-edit-dialog";
import {
  adminDeleteDocument,
  adminListDocuments,
  isCurrentUserAdmin,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/app/admin/documents")({
  beforeLoad: async () => {
    const ok = await isCurrentUserAdmin();
    if (!ok) throw redirect({ to: "/app" });
  },
  head: () => ({
    meta: [
      { title: "Admin: dokumenter — Kvitregn" },
      { name: "description", content: "Alle dokumenter på tværs af brugere." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminDocumentsPage,
});

function AdminDocumentsPage() {
  const { t, formatDate } = useLang();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const listFn = useServerFn(adminListDocuments);
  const query = useQuery({
    queryKey: ["admin-documents", submitted],
    queryFn: () => listFn({ data: { q: submitted } }),
  });
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const del = useMutation({
    mutationFn: useServerFn(adminDeleteDocument),
    onSuccess: () => {
      toast.success(t("admin.toast.docDeleted"));
      setToDelete(null);
      query.refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? t("admin.toast.cannotDelete")),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("admin.docs.title")}
        description={t("admin.docs.desc")}
      />

      <div className="flex gap-2">
        <Button asChild variant="ghost" className="rounded-full" size="sm">
          <Link to="/app/admin">{t("admin.tab.users")}</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full" size="sm">
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
            placeholder={t("admin.search.docs")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button type="submit" className="rounded-full">{t("common.search")}</Button>
      </form>

      {query.isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">{t("admin.docs.cannotFetch")}</p>
      ) : (query.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <FileText className="mx-auto mb-2 h-6 w-6" /> {t("admin.empty.docs")}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {(query.data ?? []).map((d: any) => (
            <li
              key={d.id}
              className="shadow-soft flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{d.company}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {d.issued_date ? formatDate(d.issued_date) : "—"} ·{" "}
                  {d.document_type === "invoice" ? t("docs.type.invoice") : t("docs.type.receipt")}
                  {d.category ? ` · ${d.category}` : ""}
                </p>
                <Link
                  to="/app/admin/$userId"
                  params={{ userId: d.user_id }}
                  className="truncate text-xs text-primary hover:underline"
                >
                  {d.owner_name || d.user_id.slice(0, 8)}
                </Link>
              </div>
              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <MoneyAmount value={Number(d.amount)} currency={d.currency || "DKK"} size="sm" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setEditId(d.id)}>
                      {t("admin.action.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/app/admin/$userId" params={{ userId: d.user_id }}>
                        {t("admin.action.viewAtUser")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => setToDelete(d.id)}
                    >
                      {t("admin.action.deleteDoc")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
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
              onClick={() => toDelete && del.mutate({ data: { id: toDelete } })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdminDocumentEditDialog
        documentId={editId}
        onOpenChange={(o) => !o && setEditId(null)}
        onSaved={() => query.refetch()}
      />
    </div>
  );
}
