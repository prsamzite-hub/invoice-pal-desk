import { useId } from "react";
import { Input } from "@/components/ui/input";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suggestions: string[];
  id?: string;
}

/**
 * Lightweight company input: a plain text field with a browser-native
 * datalist of the user's existing company names. Typing is never blocked
 * and never rewritten — suggestions are advisory only.
 */
export function CompanyCombobox({ value, onChange, placeholder, suggestions, id }: Props) {
  const auto = useId();
  const listId = `${(id ?? auto).replace(/[^a-zA-Z0-9_-]/g, "")}-companies`;
  // De-dupe case-insensitively while keeping original casing.
  const seen = new Set<string>();
  const options: string[] = [];
  for (const s of suggestions) {
    const key = s.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    options.push(s.trim());
  }
  return (
    <>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Firmanavn"}
        list={listId}
        autoComplete="off"
        spellCheck={false}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}
