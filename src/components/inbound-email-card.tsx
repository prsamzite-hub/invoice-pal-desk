import { useState } from "react";
import { Mail, Copy, Check } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";

export function InboundEmailCard({ token }: { token: string | null }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const address = token ? `${token}@receipts.kvitregn.dk` : "—";

  function copy() {
    if (!token) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      toast.success(t("settings.inbound.copied"));
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
          <h2 className="text-base font-bold text-foreground">{t("settings.inbound.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("settings.inbound.desc")}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
        <code className="flex-1 truncate font-mono text-sm">{address}</code>
        <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={copy} disabled={!token}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="gmail">
          <AccordionTrigger className="text-sm">{t("settings.inbound.gmail")}</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">{t("settings.inbound.gmailDesc")}</AccordionContent>
        </AccordionItem>
        <AccordionItem value="outlook">
          <AccordionTrigger className="text-sm">{t("settings.inbound.outlook")}</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">{t("settings.inbound.outlookDesc")}</AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
