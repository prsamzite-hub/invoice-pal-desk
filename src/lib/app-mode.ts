import { useCallback, useEffect, useState } from "react";

export type AppMode = "privat" | "erhverv";

const KEY = "kvitregn.mode";
const EVENT = "kvitregn:mode";

export function readMode(): AppMode {
  if (typeof window === "undefined") return "privat";
  return window.localStorage.getItem(KEY) === "erhverv" ? "erhverv" : "privat";
}

export function writeMode(mode: AppMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, mode);
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** App-wide privat/erhverv mode, persisted in localStorage. */
export function useAppMode() {
  const [mode, setModeState] = useState<AppMode>("privat");

  useEffect(() => {
    setModeState(readMode());
    const sync = () => setModeState(readMode());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setMode = useCallback((m: AppMode) => {
    writeMode(m);
    setModeState(m);
  }, []);

  return { mode, setMode };
}
