"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudOff, RefreshCw, AlertTriangle, X, Copy, Check } from "lucide-react";
import { getDashTokens, bodyFont, headFont } from "@/lib/dashTheme";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { flushOutbox, retryFailedOps, retryOp } from "@/lib/offline/sync";
import { failedOps, describeOp, discardOp, OUTBOX_EVENT } from "@/lib/offline/outbox";

// Bandeau d'état hors-ligne du dashboard.
//   - échecs de synchro : bandeau rouge + "Réessayer" + "Voir le détail" ;
//   - hors-ligne        : bandeau ambre (tout est enregistré sur l'appareil) ;
//   - en ligne + file   : bandeau discret, synchronisation en cours ;
//   - sinon             : rien.
export default function OfflineIndicator({ isDarkMode, ownerEmail }) {
  const T = getDashTokens(isDarkMode);
  const { online, pending, failed } = useOfflineStatus(ownerEmail);
  const [retrying, setRetrying] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (failed === 0) setDetailOpen(false);
  }, [failed]);

  if (online && pending === 0 && failed === 0) return null;

  const count = (n) => `${n} opération${n > 1 ? "s" : ""}`;

  const handleRetryAll = async () => {
    setRetrying(true);
    try {
      await retryFailedOps();
      await flushOutbox();
    } finally {
      setRetrying(false);
    }
  };

  let tone;
  if (failed > 0) {
    tone = {
      bg: T.badWash,
      fg: T.bad,
      icon: <AlertTriangle size={15} />,
      text: `${count(failed)} n'ont pas pu être synchronisées.`,
      action: (
        <span style={{ display: "inline-flex", gap: 8 }}>
          <button onClick={() => setDetailOpen(true)} style={ghostBtn(T)}>Voir le détail</button>
          <button onClick={handleRetryAll} disabled={retrying} style={solidBtn(T, retrying)}>
            {retrying ? "…" : "Tout réessayer"}
          </button>
        </span>
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
    <>
      <div
        role="status"
        aria-live="polite"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 12, flexWrap: "wrap", padding: "9px 20px",
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

      {detailOpen && (
        <FailedOpsModal T={T} ownerEmail={ownerEmail} onClose={() => setDetailOpen(false)} />
      )}
    </>
  );
}

function ghostBtn(T) {
  return {
    background: "transparent", color: T.bad, border: `1px solid ${T.bad}`,
    borderRadius: 999, padding: "4px 12px", fontSize: 11.5, fontWeight: 800,
    cursor: "pointer", whiteSpace: "nowrap",
  };
}
function solidBtn(T, busy) {
  return {
    background: T.bad, color: "#fff", border: "none", borderRadius: 999,
    padding: "5px 14px", fontSize: 11.5, fontWeight: 800,
    cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, whiteSpace: "nowrap",
  };
}

// --- Modale de détail des échecs -------------------------------------------

function FailedOpsModal({ T, ownerEmail, onClose }) {
  const [ops, setOps] = useState(null);
  const [busy, setBusy] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setOps(await failedOps(ownerEmail));
  }, [ownerEmail]);

  useEffect(() => {
    load();
    window.addEventListener(OUTBOX_EVENT, load);
    return () => window.removeEventListener(OUTBOX_EVENT, load);
  }, [load]);

  const fmtTime = (ms) =>
    new Date(ms).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const handleRetry = async (opId) => {
    setBusy(opId);
    try { await retryOp(opId); await load(); } finally { setBusy(""); }
  };

  const handleDiscard = async (op) => {
    const d = describeOp(op);
    if (!confirm(`Abandonner définitivement « ${d.title} » ? Cette opération ne sera pas envoyée au serveur.`)) return;
    setBusy(op.opId);
    try { await discardOp(op.opId); await load(); } finally { setBusy(""); }
  };

  const copyReport = async () => {
    const report = (ops || [])
      .map((op) => {
        const d = describeOp(op);
        return `- ${d.title}${d.sub ? ` (${d.sub})` : ""}\n  quand : ${fmtTime(op.clientCreatedAt)} · tentatives : ${op.attempts || 1}\n  type : ${op.kind}\n  erreur : ${op.lastError || "inconnue"}`;
      })
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(`Comptoir — opérations non synchronisées\n\n${report}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard indispo */ }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 900, display: "flex",
        alignItems: "center", justifyContent: "center", padding: 16,
        background: "rgba(0,0,0,.5)", backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto",
          background: T.surface, color: T.ink, border: `1px solid ${T.line}`,
          borderRadius: 16, boxShadow: T.shadow, fontFamily: bodyFont,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "20px 22px 14px", borderBottom: `1px solid ${T.line}` }}>
          <div>
            <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 16, margin: 0 }}>Opérations non synchronisées</h3>
            <p style={{ fontSize: 12, color: T.faint, margin: "4px 0 0", fontWeight: 600 }}>
              Ces actions ont été refusées par le serveur. Elles restent enregistrées ici.
            </p>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ background: "none", border: "none", color: T.faint, cursor: "pointer", padding: 2, flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {ops === null && <p style={{ fontSize: 13, color: T.faint, padding: 8 }}>Chargement…</p>}
          {ops?.length === 0 && <p style={{ fontSize: 13, color: T.faint, padding: 8 }}>Plus aucune opération en échec.</p>}
          {ops?.map((op) => {
            const d = describeOp(op);
            return (
              <div key={op.opId} style={{ border: `1px solid ${T.line}`, borderRadius: 12, padding: 14, background: T.surface2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                  <span style={{ fontWeight: 800, fontSize: 13.5 }}>{d.title}</span>
                  {d.sub && <span className="num" style={{ fontWeight: 800, fontSize: 13, color: T.muted, whiteSpace: "nowrap" }}>{d.sub}</span>}
                </div>
                <p style={{ fontSize: 11, color: T.faint, fontWeight: 600, margin: "3px 0 0" }}>
                  {fmtTime(op.clientCreatedAt)} · {op.attempts || 1} tentative{(op.attempts || 1) > 1 ? "s" : ""}
                </p>
                {op.lastError && (
                  <p style={{ fontSize: 11.5, color: T.bad, background: T.badWash, borderRadius: 8, padding: "7px 9px", margin: "8px 0 0", wordBreak: "break-word" }}>
                    {op.lastError}
                  </p>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={() => handleRetry(op.opId)} disabled={!!busy} style={{ ...solidBtn(T, !!busy), background: T.accent }}>
                    {busy === op.opId ? "…" : "Réessayer"}
                  </button>
                  <button onClick={() => handleDiscard(op)} disabled={!!busy} style={ghostBtn(T)}>
                    Abandonner
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {ops?.length > 0 && (
          <div style={{ padding: "12px 16px 18px", borderTop: `1px solid ${T.line}` }}>
            <button
              onClick={copyReport}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "none", border: `1px solid ${T.line}`, borderRadius: 999,
                padding: "7px 14px", fontSize: 12, fontWeight: 700, color: T.muted, cursor: "pointer",
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Rapport copié" : "Copier le rapport pour le support"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
