"use client";

import { useEffect, useState } from "react";
import { pendingCount, OUTBOX_EVENT } from "@/lib/offline/outbox";

// État hors-ligne pour l'UI : connexion navigateur + nombre d'opérations
// en attente dans l'outbox (voir src/lib/offline/outbox.js).
//
// Rafraîchissement du compteur : au montage, sur les évènements online/offline,
// sur l'évènement OUTBOX_EVENT (émis à chaque createOp), au retour de focus,
// et par sécurité toutes les 15 s.
export function useOfflineStatus(ownerEmail) {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let alive = true;
    const refreshCount = async () => {
      try {
        const n = await pendingCount(ownerEmail);
        if (alive) setPending(n);
      } catch {
        /* IndexedDB indisponible : on laisse le compteur tel quel */
      }
    };
    const goOnline = () => { setOnline(true); refreshCount(); };
    const goOffline = () => { setOnline(false); refreshCount(); };
    const onFocus = () => { setOnline(navigator.onLine); refreshCount(); };

    refreshCount();
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener("focus", onFocus);
    window.addEventListener(OUTBOX_EVENT, refreshCount);
    const timer = setInterval(refreshCount, 15000);

    return () => {
      alive = false;
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(OUTBOX_EVENT, refreshCount);
      clearInterval(timer);
    };
  }, [ownerEmail]);

  return { online, pending };
}
