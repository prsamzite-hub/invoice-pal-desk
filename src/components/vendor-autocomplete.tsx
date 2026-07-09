import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useVendors } from "@/hooks/use-vendors";
import { VendorAvatar } from "@/components/atoms/vendor-avatar";

interface Props {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
}

export function VendorAutocomplete({ value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: vendors } = useVendors();

  const list = vendors ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((v) => v.name.toLowerCase().includes(q));
  }, [list, query]);

  const showCreate =
    query.trim().length > 0 &&
    !list.some((v) => v.normalized_name === query.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder || "Søg eller opret firma…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Søg eller opret firma…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>Ingen match</CommandEmpty>
            {filtered.length > 0 && (
              <CommandGroup heading="Dine leverandører">
                {filtered.map((v) => (
                  <CommandItem
                    key={v.id}
                    value={v.name}
                    onSelect={() => {
                      onChange(v.name);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex items-center gap-2"
                  >
                    <VendorAvatar name={v.name} logoUrl={v.logo_url} size="sm" />
                    <span className="flex-1 truncate">{v.name}</span>
                    {value.trim().toLowerCase() === v.normalized_name && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showCreate && (
              <CommandGroup heading="Ny">
                <CommandItem
                  value={`__create_${query}`}
                  onSelect={() => {
                    onChange(query.trim());
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Opret “{query.trim()}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
