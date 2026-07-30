import { legal } from "./legal";
import { landing } from "./landing";
import { appPages } from "./app-pages";
import { appPages2 } from "./app-pages2";
import { admin } from "./admin";

export const EXTRA = {
  da: { ...legal.da, ...landing.da, ...appPages.da, ...appPages2.da, ...admin.da },
  en: { ...legal.en, ...landing.en, ...appPages.en, ...appPages2.en, ...admin.en },
};
