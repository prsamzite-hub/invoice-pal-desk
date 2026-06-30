import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export function FilePreviewCard({
  filename,
  size,
  onOpen,
  className,
}: {
  filename: string;
  size?: string;
  onOpen?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "shadow-soft hover:shadow-card group flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-all hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-peach text-peach-foreground">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{filename}</p>
        {size ? <p className="text-xs text-muted-foreground">{size}</p> : null}
      </div>
      <span className="text-xs font-medium text-primary group-hover:underline">Open</span>
    </button>
  );
}
