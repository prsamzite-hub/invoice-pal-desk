import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard,
  Receipt,
  Upload,
  PieChart,
  Settings,
  Shield,
  FileText,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { isCurrentUserAdmin } from "@/lib/admin.functions";
import { useLang } from "@/lib/i18n";

export function AppSidebar() {
  const { t } = useLang();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) =>
    url === "/app"
      ? currentPath === "/app"
      : url === "/app/admin"
        ? currentPath === "/app/admin" || currentPath.startsWith("/app/admin/") && !currentPath.startsWith("/app/admin/documents")
        : currentPath.startsWith(url);

  const ITEMS = [
    { title: t("sidebar.overview"), url: "/app", icon: LayoutDashboard },
    { title: t("sidebar.documents"), url: "/app/documents", icon: Receipt },
    { title: t("sidebar.upload"), url: "/app/upload", icon: Upload },
    { title: t("sidebar.analytics"), url: "/app/analytics", icon: PieChart },
    { title: t("sidebar.settings"), url: "/app/settings", icon: Settings },
  ] as const;

  const ADMIN_ITEMS = [
    { title: t("sidebar.admin.users"), url: "/app/admin", icon: Shield },
    { title: t("sidebar.admin.documents"), url: "/app/admin/documents", icon: FileText },
  ] as const;

  const adminFn = useServerFn(isCurrentUserAdmin);
  const adminQ = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => adminFn(),
    staleTime: 5 * 60_000,
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/app" aria-label="Kvitregn" className="flex items-center px-2 py-2">
          <img src="/brand/icon.svg" alt="" className="h-8 w-8 shrink-0 dark:hidden" />
          <img src="/brand/icon-on-dark.svg" alt="" className="hidden h-8 w-8 shrink-0 dark:block" />
          <img src="/brand/wordmark-on-light.svg" alt="Kvitregn" className="ml-2 h-6 w-auto dark:hidden group-data-[collapsible=icon]:hidden" />
          <img src="/brand/wordmark-on-dark.svg" alt="Kvitregn" className="ml-2 hidden h-6 w-auto dark:block group-data-[collapsible=icon]:!hidden" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.section.myFolder")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ITEMS.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {adminQ.data ? (
          <SidebarGroup>
            <SidebarGroupLabel>{t("sidebar.section.admin")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ADMIN_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
    </Sidebar>
  );
}
