"use client";

import { useEffect } from "react";

// Enregistre le Service Worker (voir public/sw.js).
// Uniquement en production : en dev, un SW qui met en cache les bundles
// Turbopack provoque des rechargements incohérents.
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[sw] échec d'enregistrement", err));
    };

    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
