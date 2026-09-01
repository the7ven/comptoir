"use client";

import { useEffect, useRef } from "react";
import { SYNCED_EVENT } from "@/lib/offline/outbox";

// Rappelle `onSynced` quand le rejeu de l'outbox a confirmé au moins une
// opération côté serveur — les onglets s'en servent pour recharger leurs
// données (le realtime Supabase ne se déclenche pas pour nos propres
// écritures rejouées depuis ce même appareil).
//
// Même pattern de ref que useRealtimeRefresh : la souscription n'est pas
// recréée quand `onSynced` change de référence.
export function useSyncedRefresh(onSynced, enabled = true) {
  const ref = useRef(onSynced);
  useEffect(() => { ref.current = onSynced; });

  useEffect(() => {
    if (!enabled) return;
    const handler = () => ref.current?.();
    window.addEventListener(SYNCED_EVENT, handler);
    return () => window.removeEventListener(SYNCED_EVENT, handler);
  }, [enabled]);
}
