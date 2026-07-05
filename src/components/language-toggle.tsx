import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === "da" ? "en" : "da")}
      className="rounded-full gap-1.5 px-2.5"
      aria-label="Switch language"
      title={lang === "da" ? "Skift til engelsk" : "Switch to Danish"}
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs font-semibold uppercase">{lang}</span>
    </Button>
  );
}
