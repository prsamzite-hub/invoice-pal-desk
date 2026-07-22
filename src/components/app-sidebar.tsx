import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Receipt,
  Upload,
  PieChart,
  Settings,
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

const ITEMS = [
  { title: "Oversigt", url: "/app", icon: LayoutDashboard },
  { title: "Dokumenter", url: "/app/documents", icon: Receipt },
  { title: "Upload", url: "/app/upload", icon: Upload },
  { title: "Analyse", url: "/app/analytics", icon: PieChart },
  { title: "Indstillinger", url: "/app/settings", icon: Settings },

] as const;

export function AppSidebar() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) =>
    url === "/app" ? currentPath === "/app" : currentPath.startsWith(url);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/app" aria-label="Kvitregn" className="flex items-center px-2 py-2">
          <img
            src="/brand/icon.svg"
            alt=""
            className="h-8 w-8 shrink-0 dark:hidden"
          />
          <img
            src="/brand/icon-on-dark.svg"
            alt=""
            className="hidden h-8 w-8 shrink-0 dark:block"
          />
          <img
            src="/brand/wordmark-on-light.svg"
            alt="Kvitregn"
            className="ml-2 h-6 w-auto dark:hidden group-data-[collapsible=icon]:hidden"
          />
          <img
            src="/brand/wordmark-on-dark.svg"
            alt="Kvitregn"
            className="ml-2 hidden h-6 w-auto dark:block group-data-[collapsible=icon]:!hidden"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Min mappe</SidebarGroupLabel>
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
      </SidebarContent>
    </Sidebar>
  );
}
