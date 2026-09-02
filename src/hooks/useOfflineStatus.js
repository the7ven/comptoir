"use client";

import { useEffect, useState } from "react";
import {
  pendingCount, failedCount, OUTBOX_EVENT, SYNCED_EVENT,
} from "@/lib/offline/outbox";

// État hors-ligne pour l'UI : connexion navigateur + opérations de l'outbox
// (en attente d'envoi / en échec).
//
// Rafraîchissement des compteurs : au montage, sur online/offline, sur
// OUTBOX_EVENT (createOp / rejeu) et SYNCED_EVENT, au retour de focus, et
// par sécurité toutes les 15 s.
export function useOfflineStatus(ownerEmail) {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const [p, f] = await Promise.all([
          pendingCount(ownerEmail),
          failedCount(ownerEmail),
        ]);
        if (alive) { setPending(p); setFailed(f); }
      } catch {
        /* IndexedDB indisponible : compteurs laissés tels quels */
      }
    };
    const goOnline = () => { setOnline(true); refresh(); };
    const goOffline = () => { setOnline(false); refresh(); };
    const onFocus = () => { setOnline(navigator.onLine); refresh(); };

    refresh();
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener("focus", onFocus);
    window.addEventListener(OUTBOX_EVENT, refresh);
    window.addEventListener(SYNCED_EVENT, refresh);
    const timer = setInterval(refresh, 15000);

    return () => {
      alive = false;
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(OUTBOX_EVENT, refresh);
      window.removeEventListener(SYNCED_EVENT, refresh);
      clearInterval(timer);
    };
  }, [ownerEmail]);

  return { online, pending, failed };
}
