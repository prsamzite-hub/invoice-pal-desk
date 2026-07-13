import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Settings, LogOut, Building2, User, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "@/lib/profile.functions";
import { getMyBusinessProfile } from "@/lib/business-profile.functions";
import { isCurrentUserAdmin } from "@/lib/admin.functions";
import { useAppMode } from "@/lib/app-mode";

export function UserMenu() {
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getMyProfile);
  const fetchBusiness = useServerFn(getMyBusinessProfile);
  const [email, setEmail] = useState<string | null>(null);
  const [mode, setMode] = useAppMode();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
  });

  const { data: business } = useQuery({
    queryKey: ["my-business-profile"],
    queryFn: () => fetchBusiness(),
  });

  const source = profile?.display_name?.trim() || email || "";
  const initial = source.charAt(0).toUpperCase() || "•";
  const hasBusiness = !!business?.id;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  function switchMode(next: "privat" | "erhverv") {
    if (next === "erhverv" && !hasBusiness) {
      navigate({ to: "/onboarding", search: { mode: "business" } });
      return;
    }
    setMode(next);
    toast.success(next === "erhverv" ? "Skiftet til Erhverv" : "Skiftet til Privat");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Brugermenu"
        title="Brugermenu"
        className="ml-1 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#6b93a8] text-sm font-bold text-[#f5f2ea] outline-none ring-1 ring-transparent ring-offset-2 ring-offset-background transition hover:brightness-110 hover:ring-[#6b93a8]/50 focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:ring-[#6b93a8]"
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          Tilstand: <span className="font-medium text-foreground">{mode === "erhverv" ? "Erhverv" : "Privat"}</span>
        </div>
        {mode === "erhverv" ? (
          <DropdownMenuItem onSelect={() => switchMode("privat")}>
            <User className="mr-2 h-4 w-4" />
            Skift til Privat
          </DropdownMenuItem>
        ) : hasBusiness ? (
          <DropdownMenuItem onSelect={() => switchMode("erhverv")}>
            <Building2 className="mr-2 h-4 w-4" />
            Skift til Erhverv
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => switchMode("erhverv")}>
            <Building2 className="mr-2 h-4 w-4" />
            Opret virksomhedsprofil
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: "/app/settings" })}>
          <Settings className="mr-2 h-4 w-4" />
          Indstillinger
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Log ud
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
