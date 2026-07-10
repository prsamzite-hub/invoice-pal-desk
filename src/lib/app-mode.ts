import { useEffect, useState, useCallback } from "react";

export type AppMode = "privat" | "erhverv";

const MODE_KEY = "kvitregn.app-mode";
const LAST_AUTH_MODE_KEY = "kvitregn.last-auth-mode";

function read(key: string): AppMode | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(key);
  return v === "privat" || v === "erhverv" ? v : null;
}

export function getStoredAppMode(): AppMode {
  return read(MODE_KEY) ?? "privat";
}

export function setStoredAppMode(mode: AppMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MODE_KEY, mode);
  window.dispatchEvent(new CustomEvent("kvitregn:app-mode", { detail: mode }));
}

export function getLastAuthMode(): AppMode {
  return read(LAST_AUTH_MODE_KEY) ?? "privat";
}

export function setLastAuthMode(mode: AppMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_AUTH_MODE_KEY, mode);
}

export function useAppMode(): [AppMode, (m: AppMode) => void] {
  const [mode, setMode] = useState<AppMode>("privat");

  useEffect(() => {
    setMode(getStoredAppMode());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<AppMode>).detail;
      if (detail === "privat" || detail === "erhverv") setMode(detail);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === MODE_KEY) setMode(getStoredAppMode());
    };
    window.addEventListener("kvitregn:app-mode", onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("kvitregn:app-mode", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const update = useCallback((m: AppMode) => {
    setStoredAppMode(m);
    setMode(m);
  }, []);

  return [mode, update];
}
