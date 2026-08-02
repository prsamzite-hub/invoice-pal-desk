import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { PdfCanvas } from "@/components/pdf-canvas";

export function PdfViewerDialog({
  open,
  onOpenChange,
  url,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
  title: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] overflow-hidden rounded-2xl p-0 sm:max-w-[720px] sm:p-0 lg:max-w-[960px] [&>button]:hidden">
        <div className="flex items-center gap-3 border-b border-border px-4 py-2 sm:px-5">
          <DialogTitle className="min-w-0 flex-1 truncate text-sm font-semibold">
            {title}
          </DialogTitle>
          <div className="flex shrink-0 items-center gap-3">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center rounded-md px-2 text-xs font-medium text-primary hover:underline"
              >
                Åbn PDF i ny fane
              </a>
            ) : null}
            <DialogClose className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <X className="h-4 w-4" />
              <span className="sr-only">Luk</span>
            </DialogClose>
          </div>
        </div>
        <div className="max-h-[75dvh] overflow-auto bg-muted">
          {url ? (
            <PdfCanvas url={url} className="w-full" maxPages={10} />
          ) : (
            <div className="flex h-[50dvh] items-center justify-center text-sm text-muted-foreground">
              Ingen fil vedhæftet endnu.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
