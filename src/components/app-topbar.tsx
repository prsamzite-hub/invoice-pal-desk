import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Bell } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { SearchBar } from "@/components/atoms/search-bar";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { getMyBusinessProfile } from "@/lib/business-profile.functions";
import { useAppMode } from "@/lib/app-mode";

export function AppTopbar() {
  const fetchBusiness = useServerFn(getMyBusinessProfile);
  const [mode] = useAppMode();
  const { data: business } = useQuery({
    queryKey: ["my-business-profile"],
    queryFn: () => fetchBusiness(),
  });
  const showCompany = mode === "erhverv" && !!business?.company_name;


  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-3 backdrop-blur sm:px-5">
      <SidebarTrigger className="rounded-full" />
      {showCompany ? (
        <div
          className="hidden max-w-[220px] items-center gap-1.5 truncate rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground md:inline-flex"
          title={business.company_name}
        >
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate">{business.company_name}</span>
        </div>
      ) : null}
      <div className="hidden flex-1 sm:block">
        <SearchBar />
      </div>
      <div className="flex flex-1 items-center justify-end gap-1 sm:flex-none">
        <LanguageToggle />
        <ThemeToggle />
        <Button variant="ghost" size="icon" aria-label="Notifikationer" className="rounded-full">
          <Bell className="h-4 w-4" />
        </Button>
        <UserMenu />
      </div>
    </header>
  );
}
