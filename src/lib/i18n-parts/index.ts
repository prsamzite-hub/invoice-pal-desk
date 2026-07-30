import { legal } from "./legal";
import { landing } from "./landing";
import { appPages } from "./app-pages";
import { admin } from "./admin";

export const EXTRA = {
  da: { ...legal.da, ...landing.da, ...appPages.da, ...admin.da },
  en: { ...legal.en, ...landing.en, ...appPages.en, ...admin.en },
};
