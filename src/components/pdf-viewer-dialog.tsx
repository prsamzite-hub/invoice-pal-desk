import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className="overflow-hidden rounded-2xl p-0 sm:max-w-[680px] sm:p-0 lg:max-w-[960px]">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <DialogTitle className="truncate text-sm font-semibold">{title}</DialogTitle>
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-primary hover:underline"
            >
              Åbn PDF i ny fane
            </a>
          ) : null}
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

