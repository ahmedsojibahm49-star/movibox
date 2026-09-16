"use client";
import * as React from "react";

/** Registers the service worker in production (offline app shell). */
export function SWRegister() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is best-effort */
    });
  }, []);
  return null;
}
