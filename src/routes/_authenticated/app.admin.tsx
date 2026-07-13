import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, Users } from "lucide-react";

import { PageHeader } from "@/components/atoms/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { adminListUsers, isCurrentUserAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/app/admin")({
  beforeLoad: async () => {
    const ok = await isCurrentUserAdmin();
    if (!ok) throw redirect({ to: "/app" });
  },
  head: () => ({
    meta: [
      { title: "Admin — Kvitregn" },
      { name: "description", content: "Læseadgang for administratorer." },
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
        title="Admin"
        description="Læseadgang til brugere og deres dokumenter. Alle opslag logges."
      />

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
            <li key={u.id}>
              <Link
                to="/app/admin/$userId"
                params={{ userId: u.id }}
                className="shadow-soft hover:shadow-card flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {u.display_name || u.email || "Ukendt"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  {u.company_name ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {u.company_name}
                      {u.cvr ? ` · CVR ${u.cvr}` : ""}
                    </p>
                  ) : null}
                </div>
                <Badge variant="secondary" className="rounded-full">
                  {u.document_count} dok.
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
