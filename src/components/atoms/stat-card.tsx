import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "mint" | "peach" | "lavender" | "butter" | "sky" | "primary";

const TONE_BG: Record<Tone, string> = {
  mint: "bg-mint text-mint-foreground",
  peach: "bg-peach text-peach-foreground",
  lavender: "bg-lavender text-lavender-foreground",
  butter: "bg-butter text-butter-foreground",
  sky: "bg-sky text-sky-foreground",
  primary: "bg-primary text-primary-foreground",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "lavender",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "shadow-soft hover:shadow-card group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-shadow",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <div
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-xl",
              TONE_BG[tone],
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
