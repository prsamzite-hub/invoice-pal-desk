import { cn } from "@/lib/utils";

const PALETTE = [
  "bg-mint text-mint-foreground",
  "bg-peach text-peach-foreground",
  "bg-lavender text-lavender-foreground",
  "bg-butter text-butter-foreground",
  "bg-sky text-sky-foreground",
] as const;

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function CompanyAvatar({
  name,
  className,
  size = "md",
}: {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "•";
  const palette = PALETTE[hash(name) % PALETTE.length];
  const sizeClass = {
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-14 w-14 text-xl",
  }[size];
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-2xl font-bold",
        palette,
        sizeClass,
        className,
      )}
      aria-hidden
    >
      {initial}
    </div>
  );
}
