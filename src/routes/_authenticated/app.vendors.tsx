import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pencil, RefreshCw, Upload as UploadIcon, Merge, Trash2, Store } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/atoms/page-header";
import { EmptyState } from "@/components/atoms/empty-state";
import { VendorAvatar } from "@/components/atoms/vendor-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVendors } from "@/hooks/use-vendors";
import {
  renameVendor,
  mergeVendors,
  uploadVendorLogo,
  refetchVendorLogo,
  deleteVendorLogo,
  type VendorRow,
} from "@/lib/vendors.functions";

export const Route = createFileRoute("/_authenticated/app/vendors")({
  head: () => ({
    meta: [
      { title: "Leverandører — Kvitregn" },
      { name: "description", content: "Se og administrer dine leverandører og deres logoer." },
    ],
  }),
  component: VendorsPage,
});

function VendorsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useVendors();
  const vendors = data ?? [];

  const [renameOpen, setRenameOpen] = useState<VendorRow | null>(null);
  const [mergeOpen, setMergeOpen] = useState<VendorRow | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["vendors"] });
    qc.invalidateQueries({ queryKey: ["receipts"] });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leverandører"
        description="Én række pr. butik eller firma. Omdøb, hent logo eller flet dubletter."
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Ingen leverandører endnu"
          description="Så snart du gemmer dit første dokument, dukker leverandøren op her."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {vendors.map((v) => (
            <VendorRowItem
              key={v.id}
              vendor={v}
              vendors={vendors}
              onRename={() => setRenameOpen(v)}
              onMerge={() => setMergeOpen(v)}
              invalidate={invalidate}
            />
          ))}
        </ul>
      )}

      {renameOpen && (
        <RenameDialog
          vendor={renameOpen}
          onClose={() => setRenameOpen(null)}
          invalidate={invalidate}
        />
      )}
      {mergeOpen && (
        <MergeDialog
          source={mergeOpen}
          vendors={vendors}
          onClose={() => setMergeOpen(null)}
          invalidate={invalidate}
        />
      )}
    </div>
  );
}

function VendorRowItem({
  vendor,
  onRename,
  onMerge,
  invalidate,
}: {
  vendor: VendorRow;
  vendors: VendorRow[];
  onRename: () => void;
  onMerge: () => void;
  invalidate: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadFn = useServerFn(uploadVendorLogo);
  const refetchFn = useServerFn(refetchVendorLogo);
  const deleteLogoFn = useServerFn(deleteVendorLogo);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("vendorId", vendor.id);
      return uploadFn({ data: fd });
    },
    onSuccess: () => {
      toast.success("Logo uploadet");
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error("Kunne ikke uploade logo", { description: e instanceof Error ? e.message : "" }),
  });

  const refetch = useMutation({
    mutationFn: () => refetchFn({ data: { vendorId: vendor.id } }),
    onSuccess: () => {
      toast.success("Logo opdateret");
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error("Kunne ikke hente logo", { description: e instanceof Error ? e.message : "" }),
  });

  const removeLogo = useMutation({
    mutationFn: () => deleteLogoFn({ data: { vendorId: vendor.id } }),
    onSuccess: () => {
      toast.success("Logo fjernet");
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error("Kunne ikke fjerne logo", { description: e instanceof Error ? e.message : "" }),
  });

  return (
    <li className="shadow-soft flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <VendorAvatar name={vendor.name} logoUrl={vendor.logo_url} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{vendor.name}</p>
        {vendor.domain ? (
          <p className="truncate text-xs text-muted-foreground">{vendor.domain}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload.mutate(f);
            e.currentTarget.value = "";
          }}
        />
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full"
          onClick={() => fileRef.current?.click()}
          disabled={upload.isPending}
          title="Upload logo"
        >
          {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadIcon className="h-4 w-4" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full"
          onClick={() => refetch.mutate()}
          disabled={refetch.isPending}
          title="Hent logo automatisk"
        >
          {refetch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
        {vendor.logo_path && (
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full text-muted-foreground"
            onClick={() => removeLogo.mutate()}
            disabled={removeLogo.isPending}
            title="Fjern logo"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <Button size="sm" variant="ghost" className="rounded-full" onClick={onRename} title="Omdøb">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" className="rounded-full" onClick={onMerge} title="Flet ind i…">
          <Merge className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

function RenameDialog({
  vendor,
  onClose,
  invalidate,
}: {
  vendor: VendorRow;
  onClose: () => void;
  invalidate: () => void;
}) {
  const [name, setName] = useState(vendor.name);
  const fn = useServerFn(renameVendor);
  const save = useMutation({
    mutationFn: () => fn({ data: { vendorId: vendor.id, name } }),
    onSuccess: () => {
      toast.success("Leverandør omdøbt");
      invalidate();
      onClose();
    },
    onError: (e: unknown) =>
      toast.error("Kunne ikke omdøbe", { description: e instanceof Error ? e.message : "" }),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Omdøb leverandør</DialogTitle>
          <DialogDescription>Ændringen slår igennem på alle dokumenter fra denne leverandør.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="v-name">Navn</Label>
          <Input id="v-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>Annuller</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name.trim()}>
            {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Gem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MergeDialog({
  source,
  vendors,
  onClose,
  invalidate,
}: {
  source: VendorRow;
  vendors: VendorRow[];
  onClose: () => void;
  invalidate: () => void;
}) {
  const [targetId, setTargetId] = useState<string>("");
  const fn = useServerFn(mergeVendors);
  const others = useMemo(() => vendors.filter((v) => v.id !== source.id), [vendors, source.id]);
  const merge = useMutation({
    mutationFn: () => fn({ data: { sourceId: source.id, targetId } }),
    onSuccess: () => {
      toast.success("Leverandører flettet");
      invalidate();
      onClose();
    },
    onError: (e: unknown) =>
      toast.error("Kunne ikke flette", { description: e instanceof Error ? e.message : "" }),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Flet leverandør</DialogTitle>
          <DialogDescription>
            Alle dokumenter fra “{source.name}” flyttes til den valgte leverandør, og “{source.name}” slettes.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label>Flet ind i</Label>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger><SelectValue placeholder="Vælg leverandør" /></SelectTrigger>
            <SelectContent>
              {others.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={merge.isPending}>Annuller</Button>
          <Button onClick={() => merge.mutate()} disabled={merge.isPending || !targetId}>
            {merge.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Flet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
