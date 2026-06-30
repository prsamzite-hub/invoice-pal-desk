import { useState } from "react";
import { Mail, Copy, Check } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function InboundEmailCard({ token }: { token: string | null }) {
  const [copied, setCopied] = useState(false);
  const address = token ? `${token}@receipts.kvittr.dk` : "—";

  function copy() {
    if (!token) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      toast.success("Email copied to clipboard");
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <section className="shadow-soft flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky text-sky-foreground">
          <Mail className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-foreground">Forward receipts by email</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Send eller videresend dine kvitteringer hertil — Kvittr læser dem automatisk.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
        <code className="flex-1 truncate font-mono text-sm">{address}</code>
        <Button
          type="button" size="sm" variant="ghost" className="rounded-full"
          onClick={copy} disabled={!token}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="gmail">
          <AccordionTrigger className="text-sm">Set up forwarding in Gmail</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">
            Settings → Forwarding and POP/IMAP → Add a forwarding address. Paste your Kvittr
            address above and create a filter for receipts (e.g. matches "kvittering" OR "receipt").
            <br /><br />
            <strong>Dansk:</strong> Indstillinger → Videresendelse → Tilføj en adresse, og opret et
            filter med ordet "kvittering".
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="outlook">
          <AccordionTrigger className="text-sm">Set up forwarding in Outlook / Hotmail</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">
            Settings → Mail → Rules → Add new rule. Condition: subject contains "receipt" or
            "kvittering". Action: forward to your Kvittr address above.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
