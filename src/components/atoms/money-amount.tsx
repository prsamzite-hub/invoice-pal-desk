import { cn } from "@/lib/utils";

export function MoneyAmount({
  value,
  currency = "DKK",
  locale = "da-DK",
  className,
  size = "md",
  sign = false,
}: {
  value: number;
  currency?: string;
  locale?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  sign?: boolean;
}) {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
  const formatted = formatter.format(Math.abs(value));
  const prefix = sign ? (value < 0 ? "−" : "+") : value < 0 ? "−" : "";

  const sizeClass = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl",
    xl: "text-4xl",
  }[size];

  return (
    <span className={cn("tabular-nums font-semibold", sizeClass, className)}>
      {prefix}
      {formatted}
    </span>
  );
}
