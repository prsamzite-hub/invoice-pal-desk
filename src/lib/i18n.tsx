import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "da" | "en";

const DICT = {
  da: {
    "topbar.notifications": "Notifikationer",
    "lang.switch": "Skift sprog",
    "docs.title": "Dokumenter",
    "docs.description": "Alle dine kvitteringer og fakturaer.",
    "docs.new": "Nyt dokument",
    "docs.search": "Søg efter firma, kategori…",
    "docs.filter": "Filter",
    "docs.tab.all": "Alle",
    "docs.tab.receipts": "Kvitteringer",
    "docs.tab.invoices": "Fakturaer",
    "docs.tab.unpaid": "Ubetalte",
    "docs.empty": "Ingen dokumenter endnu",
    "docs.emptyDesc": "Upload din første kvittering for at komme i gang.",
    "dashboard.greeting": "God morgen 👋",
    "dashboard.subtitle": "Sådan ser dine kvitteringer ud i denne måned.",
    "dashboard.add": "Tilføj dokument",
    "dashboard.recent": "Seneste aktivitet",
    "dashboard.viewAll": "Se alle",
    "analytics.title": "Analyse",
    "analytics.editBudgets": "Rediger budgetter",
    "analytics.saveBudgets": "Gem budgetter",
    "analytics.cancel": "Annuller",
    "analytics.budgetsFor": "Budgetter for",
    "upload.viewPdf": "Se PDF",
    "common.download": "Download",
    "common.close": "Luk",
  },
  en: {
    "topbar.notifications": "Notifications",
    "lang.switch": "Switch language",
    "docs.title": "Documents",
    "docs.description": "Every receipt and invoice you've tracked.",
    "docs.new": "New document",
    "docs.search": "Search by company, category…",
    "docs.filter": "Filter",
    "docs.tab.all": "All",
    "docs.tab.receipts": "Receipts",
    "docs.tab.invoices": "Invoices",
    "docs.tab.unpaid": "Unpaid",
    "docs.empty": "No documents yet",
    "docs.emptyDesc": "Upload your first receipt to get started.",
    "dashboard.greeting": "Good morning 👋",
    "dashboard.subtitle": "Here's how your receipts are stacking up this month.",
    "dashboard.add": "Add document",
    "dashboard.recent": "Recent activity",
    "dashboard.viewAll": "View all",
    "analytics.title": "Analytics",
    "analytics.editBudgets": "Edit budgets",
    "analytics.saveBudgets": "Save budgets",
    "analytics.cancel": "Cancel",
    "analytics.budgetsFor": "Budgets for",
    "upload.viewPdf": "View PDF",
    "common.download": "Download",
    "common.close": "Close",
  },
} as const;

type Key = keyof (typeof DICT)["da"];

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
  locale: string;
}

const LangContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("da");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("kvitregn.lang") : null;
    if (stored === "da" || stored === "en") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem("kvitregn.lang", l);
  };

  const t = (k: Key) => DICT[lang][k] ?? DICT.en[k] ?? k;
  const locale = lang === "da" ? "da-DK" : "en-GB";

  return <LangContext.Provider value={{ lang, setLang, t, locale }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) return { lang: "da" as Lang, setLang: () => {}, t: (k: string) => k, locale: "da-DK" };
  return ctx;
}
