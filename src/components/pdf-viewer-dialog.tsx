import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

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
      <DialogContent className="max-w-5xl rounded-2xl p-0 sm:p-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <DialogTitle className="truncate text-sm font-semibold">{title}</DialogTitle>
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-primary hover:underline"
            >
              Open in new tab
            </a>
          ) : null}
        </div>
        <div className="bg-muted">
          {url ? (
            <iframe
              src={`${url}#toolbar=1&navpanes=0`}
              title={title}
              className="h-[80vh] w-full rounded-b-2xl bg-white"
            />
          ) : (
            <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
              No file attached yet.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
