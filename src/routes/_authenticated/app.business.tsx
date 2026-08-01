import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { PageHeader } from "@/components/atoms/page-header";
import { Button } from "@/components/ui/button";
import { BusinessProfileForm } from "@/components/business-profile-form";
import { useLang } from "@/lib/i18n";
import { useAppMode } from "@/lib/app-mode";

export const Route = createFileRoute("/_authenticated/app/business")({
  head: () => ({
    meta: [
      { title: "Virksomhed — Kvitregn" },
      { name: "description", content: "Tilføj eller rediger din virksomhedsprofil i Kvitregn." },
      { property: "og:title", content: "Virksomhed — Kvitregn" },
      { property: "og:description", content: "Tilføj eller rediger din virksomhedsprofil i Kvitregn." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BusinessPage,
});

function BusinessPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { setMode } = useAppMode();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("biz.onboard.title")} description={t("biz.onboard.desc")} />
      <section className="shadow-soft flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
        <BusinessProfileForm onSaved={() => navigate({ to: "/app" })} />
      </section>
      <div>
        <Button
          variant="ghost"
          className="rounded-full"
          onClick={() => { setMode("privat"); navigate({ to: "/app" }); }}
        >
          {t("biz.continuePrivate")}
        </Button>
      </div>
    </div>
  );
}
