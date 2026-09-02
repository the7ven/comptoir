"use client";

import { useEffect } from "react";

// Enregistre le Service Worker (voir public/sw.js) en production.
// En dev : désenregistre tout SW résiduel (venu d'un précédent `npm start`)
// et vide ses caches — sinon il continue de servir les bundles de l'ancien
// build sur localhost:3000 et masque les changements de code.
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .then((unregistered) => {
          if (unregistered.some(Boolean) && typeof caches !== "undefined") {
            return caches.keys().then((keys) =>
              Promise.all(keys.filter((k) => k.startsWith("comptoir-")).map((k) => caches.delete(k))),
            );
          }
        })
        .catch(() => {});
      return;
    }

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
