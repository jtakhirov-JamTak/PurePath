import { useLocation, useSearch } from "wouter";
import { useCallback } from "react";

function isValidReturnTo(path: string | null): path is string {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("://")) return false;
  return true;
}

export function useReturnTo(fallback = "/dashboard") {
  const [, setLocation] = useLocation();
  const search = useSearch();

  const params = new URLSearchParams(search);
  const raw = params.get("returnTo");
  const returnTo = isValidReturnTo(raw) ? raw : fallback;

  const finish = useCallback(
    (overridePath?: string) => {
      setLocation(overridePath || returnTo);
    },
    [returnTo, setLocation],
  );

  return { returnTo, finish };
}

export function buildProcessUrl(path: string, returnTo?: string): string {
  if (!returnTo) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}returnTo=${encodeURIComponent(returnTo)}`;
}
