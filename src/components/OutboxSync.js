"use client";

import { useEffect } from "react";
import { flushOutbox } from "@/lib/offline/sync";

// Déclenche le rejeu de l'outbox : au montage, au retour de connexion, au
// retour de focus sur l'onglet, et par sécurité toutes les 60 s.
// flushOutbox() est réentrant-safe et ne fait rien si l'outbox est vide ou
// si on est hors-ligne — on peut donc l'appeler librement.
export default function OutboxSync() {
  useEffect(() => {
    const run = () => { flushOutbox().catch(() => {}); };

    run();
    const onOnline = () => run();
    const onVisible = () => { if (document.visibilityState === "visible") run(); };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(run, 60000);

    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, []);

  return null;
}
