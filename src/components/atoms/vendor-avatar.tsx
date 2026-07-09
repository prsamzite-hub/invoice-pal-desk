import { cn } from "@/lib/utils";
import { CompanyAvatar } from "./company-avatar";

export function VendorAvatar({
  name,
  logoUrl,
  className,
  size = "md",
}: {
  name: string;
  logoUrl?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
  }[size];

  if (logoUrl) {
    return (
      <div
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-card",
          sizeClass,
          className,
        )}
        aria-hidden
      >
        <img
          src={logoUrl}
          alt=""
          className="h-full w-full object-contain p-1"
          loading="lazy"
        />
      </div>
    );
  }
  return <CompanyAvatar name={name} size={size} className={className} />;
}
