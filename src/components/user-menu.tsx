import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Settings, LogOut, ShieldCheck, Briefcase } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "@/lib/profile.functions";
import { isCurrentUserAdmin } from "@/lib/admin.functions";
import { useLang } from "@/lib/i18n";

export function UserMenu() {
  const { t } = useLang();
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getMyProfile);
  const fetchIsAdmin = useServerFn(isCurrentUserAdmin);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile() });
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"], queryFn: () => fetchIsAdmin(), staleTime: 5 * 60_000,
  });

  const source = profile?.display_name?.trim() || email || "";
  const initial = source.charAt(0).toUpperCase() || "•";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("user.menu")}
        title={t("user.menu")}
        className="ml-1 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#6b93a8] text-sm font-bold text-[#f5f2ea] outline-none ring-1 ring-transparent ring-offset-2 ring-offset-background transition hover:brightness-110 hover:ring-[#6b93a8]/50 focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:ring-[#6b93a8]"
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onSelect={() => {
            if (mode === "erhverv") { setMode("privat"); return; }
            if (business) setMode("erhverv");
            else navigate({ to: "/app/business" });
          }}
        >
          <Briefcase className="mr-2 h-4 w-4" />
          {mode === "erhverv" ? t("mode.switchToPrivat") : t("mode.switchToErhverv")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isAdmin ? (
          <>
            <DropdownMenuItem onSelect={() => navigate({ to: "/app/admin" })}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              {t("user.admin")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem onSelect={() => navigate({ to: "/app/settings" })}>
          <Settings className="mr-2 h-4 w-4" />
          {t("user.settings")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          {t("user.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
