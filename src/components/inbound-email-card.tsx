import { useState } from "react";
import { Mail, Copy, Check } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function InboundEmailCard({ token }: { token: string | null }) {
  const [copied, setCopied] = useState(false);
  const address = token ? `${token}@receipts.kvitregn.dk` : "—";

  function copy() {
    if (!token) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      toast.success("Email kopieret til udklipsholderen");
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
          <h2 className="text-base font-bold text-foreground">Videresend kvitteringer på email</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Send eller videresend dine kvitteringer hertil — Kvitregn læser dem automatisk.
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
          <AccordionTrigger className="text-sm">Sådan sætter du videresendelse op i Gmail</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">
            Indstillinger → Videresendelse og POP/IMAP → Tilføj en videresendelsesadresse. Indsæt
            din Kvitregn-adresse ovenfor og opret et filter, der matcher "kvittering" eller "receipt".
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="outlook">
          <AccordionTrigger className="text-sm">Sådan sætter du videresendelse op i Outlook / Hotmail</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">
            Indstillinger → Mail → Regler → Tilføj ny regel. Betingelse: emne indeholder "kvittering"
            eller "receipt". Handling: videresend til din Kvitregn-adresse ovenfor.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
