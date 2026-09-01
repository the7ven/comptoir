"use client";

import { CloudOff, RefreshCw } from "lucide-react";
import { getDashTokens, bodyFont } from "@/lib/dashTheme";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";

// Bandeau d'état hors-ligne du dashboard (Phase 4).
//   - hors-ligne            : bandeau ambre, rappelle que tout est enregistré
//                             sur l'appareil ;
//   - en ligne + en attente : bandeau discret, compte les opérations pas
//                             encore synchronisées (l'envoi arrive en Phase 5).
// Rien ne s'affiche quand on est en ligne et que l'outbox est vide.
export default function OfflineIndicator({ isDarkMode, ownerEmail }) {
  const T = getDashTokens(isDarkMode);
  const { online, pending } = useOfflineStatus(ownerEmail);

  if (online && pending === 0) return null;

  const opsLabel = `${pending} opération${pending > 1 ? "s" : ""}`;

  const offline = !online;
  const bg = offline ? T.warnWash : T.accentWash;
  const fg = offline ? T.warn : T.accent;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        flexWrap: "wrap",
        padding: "9px 20px",
        background: bg,
        color: fg,
        borderBottom: `1px solid ${T.line}`,
        fontFamily: bodyFont,
        fontSize: 12.5,
        fontWeight: 700,
        textAlign: "center",
      }}
    >
      {offline ? <CloudOff size={15} /> : <RefreshCw size={15} />}
      {offline ? (
        <span>
          Hors ligne — vos changements sont enregistrés sur cet appareil
          {pending > 0 ? ` (${opsLabel} en attente)` : ""}.
        </span>
      ) : (
        <span>{opsLabel} enregistrée{pending > 1 ? "s" : ""} hors ligne, en attente de synchronisation.</span>
      )}
    </div>
  );
}
