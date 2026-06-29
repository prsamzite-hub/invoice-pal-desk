import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "mint" | "peach" | "lavender" | "butter" | "sky";

const TONE_CLASS: Record<Tone, string> = {
  mint: "bg-mint text-mint-foreground",
  peach: "bg-peach text-peach-foreground",
  lavender: "bg-lavender text-lavender-foreground",
  butter: "bg-butter text-butter-foreground",
  sky: "bg-sky text-sky-foreground",
};

export function CategoryChip({
  label,
  icon: Icon,
  tone = "lavender",
  className,
}: {
  label: string;
  icon?: LucideIcon;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {label}
    </span>
  );
}
