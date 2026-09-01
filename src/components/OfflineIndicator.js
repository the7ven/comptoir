"use client";

import { useState } from "react";
import { CloudOff, RefreshCw, AlertTriangle } from "lucide-react";
import { getDashTokens, bodyFont } from "@/lib/dashTheme";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { flushOutbox, retryFailedOps } from "@/lib/offline/sync";

// Bandeau d'état hors-ligne du dashboard.
//   - échecs de synchro : bandeau rouge + bouton "Réessayer" ;
//   - hors-ligne        : bandeau ambre (tout est enregistré sur l'appareil) ;
//   - en ligne + file   : bandeau discret, synchronisation en cours ;
//   - sinon             : rien.
export default function OfflineIndicator({ isDarkMode, ownerEmail }) {
  const T = getDashTokens(isDarkMode);
  const { online, pending, failed } = useOfflineStatus(ownerEmail);
  const [retrying, setRetrying] = useState(false);

  if (online && pending === 0 && failed === 0) return null;

  const count = (n) => `${n} opération${n > 1 ? "s" : ""}`;

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await retryFailedOps();
      await flushOutbox();
    } finally {
      setRetrying(false);
    }
  };

  let tone; // { bg, fg, icon, text, action? }
  if (failed > 0) {
    tone = {
      bg: T.badWash,
      fg: T.bad,
      icon: <AlertTriangle size={15} />,
      text: `${count(failed)} n'ont pas pu être synchronisées. Réessayez ; si le problème persiste, contactez le support.`,
      action: (
        <button
          onClick={handleRetry}
          disabled={retrying}
          style={{
            background: T.bad, color: "#fff", border: "none", borderRadius: 999,
            padding: "5px 14px", fontSize: 11.5, fontWeight: 800, cursor: retrying ? "default" : "pointer",
            opacity: retrying ? 0.6 : 1, whiteSpace: "nowrap",
          }}
        >
          {retrying ? "…" : "Réessayer"}
        </button>
      ),
    };
  } else if (!online) {
    tone = {
      bg: T.warnWash,
      fg: T.warn,
      icon: <CloudOff size={15} />,
      text: `Hors ligne — vos changements sont enregistrés sur cet appareil${pending > 0 ? ` (${count(pending)} en attente)` : ""}.`,
    };
  } else {
    tone = {
      bg: T.accentWash,
      fg: T.accent,
      icon: <RefreshCw size={15} />,
      text: `${count(pending)} en cours de synchronisation…`,
    };
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 12, flexWrap: "wrap",
        padding: "9px 20px",
        background: tone.bg, color: tone.fg,
        borderBottom: `1px solid ${T.line}`,
        fontFamily: bodyFont, fontSize: 12.5, fontWeight: 700, textAlign: "center",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {tone.icon}
        <span>{tone.text}</span>
      </span>
      {tone.action}
    </div>
  );
}
