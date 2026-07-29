import { Bell } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { SearchBar } from "@/components/atoms/search-bar";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { useLang } from "@/lib/i18n";

export function AppTopbar() {
  const { t } = useLang();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-3 backdrop-blur sm:px-5">
      <SidebarTrigger className="rounded-full" />
      <div className="hidden flex-1 sm:block">
        <SearchBar placeholder={t("docs.search")} />
      </div>
      <div className="flex flex-1 items-center justify-end gap-1 sm:flex-none">
        <LanguageToggle />
        <ThemeToggle />
        <Button variant="ghost" size="icon" aria-label={t("topbar.notifications")} className="rounded-full">
          <Bell className="h-4 w-4" />
        </Button>
        <UserMenu />
      </div>
    </header>
  );
}
