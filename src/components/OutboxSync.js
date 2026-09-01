"use client";

import { useEffect } from "react";
import { flushOutbox } from "@/lib/offline/sync";
import { pullAll } from "@/lib/offline/pull";

// Orchestre la synchro du dashboard :
//   1. rejeu de l'outbox (flushOutbox) ;
//   2. synchro descendante des miroirs (pullAll).
//
// Déclencheurs : montage, retour de connexion, retour de focus (→ réconcilia-
// tion complète, qui capte les suppressions), et un delta léger toutes les
// 60 s. Toutes ces fonctions sont sûres à rappeler : réentrance verrouillée,
// no-op si l'outbox est vide ou si on est hors-ligne.
export default function OutboxSync({ ownerEmail }) {
  useEffect(() => {
    let cancelled = false;

    const cycle = async (full) => {
      await flushOutbox().catch(() => {});
      if (cancelled) return;
      await pullAll(ownerEmail, { full }).catch(() => {});
    };

    const onReconnect = () => cycle(true);
    const onTick = () => cycle(false);
    const onVisible = () => {
      if (document.visibilityState === "visible") onReconnect();
    };

    onReconnect();
    window.addEventListener("online", onReconnect);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(onTick, 60000);

    return () => {
      cancelled = true;
      window.removeEventListener("online", onReconnect);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [ownerEmail]);

  return null;
}
