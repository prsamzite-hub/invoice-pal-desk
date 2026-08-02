import { Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { useAppMode } from "@/lib/app-mode";
import { getMyBusinessGate } from "@/lib/business.functions";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  const { mode } = useAppMode();
  const location = useLocation();
  const navigate = useNavigate();
  const gateFn = useServerFn(getMyBusinessGate);
  const onForm = location.pathname.startsWith("/app/business");

  const { data: gate, isLoading } = useQuery({
    queryKey: ["business-gate"],
    queryFn: () => gateFn(),
    enabled: mode === "erhverv",
    staleTime: 30_000,
  });

  const blocked = mode === "erhverv" && !isLoading && gate ? !gate.complete : false;

  useEffect(() => {
    if (blocked && !onForm) navigate({ to: "/app/business", replace: true });
  }, [blocked, onForm, navigate]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar />
          <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto w-full max-w-6xl">
              {blocked && !onForm ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Outlet />
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
