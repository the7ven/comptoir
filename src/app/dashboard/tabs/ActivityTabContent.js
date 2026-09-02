"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ShoppingBag, Wallet, FileText, Lock, XCircle, Trash2, Loader2, CloudOff, Cloud, Receipt,
} from "lucide-react";
import { getDashTokens, card, headFont, radiusSm } from "@/lib/dashTheme";
import { getActivityLog, getActivityInvoice } from "@/lib/data/activity";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { useSyncedRefresh } from "@/hooks/useSyncedRefresh";

const INVOICE_ACTIONS = new Set(["payment.create", "order.create", "order.cancel"]);

const ACTIONS = {
  "order.create":   { label: "Nouvelle commande",     icon: ShoppingBag, color: "accent" },
  "order.cancel":   { label: "Annulation de commande", icon: XCircle,     color: "bad" },
  "payment.create": { label: "Encaissement",           icon: Wallet,      color: "good" },
  "expense.create": { label: "Dépense",                icon: FileText,    color: "warn" },
  "expense.delete": { label: "Suppression de dépense",  icon: Trash2,      color: "bad" },
  "closing.create": { label: "Clôture de caisse",       icon: Lock,        color: "accent" },
};

const FILTERS = [
  { id: "all", label: "Tout" },
  { id: "order.create", label: "Commandes" },
  { id: "payment.create", label: "Encaissements" },
  { id: "expense.create", label: "Dépenses" },
  { id: "closing.create", label: "Clôtures" },
  { id: "order.cancel", label: "Annulations", ownerOnly: true },
];

const money = (v) => (v == null ? "" : `${Number(v).toLocaleString("fr-FR")} F`);

function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yst = new Date(Date.now() - 86400000);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Aujourd'hui";
  if (same(d, yst)) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default function ActivityTabContent({ isDarkMode, userProfile }) {
  const T = getDashTokens(isDarkMode);
  const isOwner = userProfile?.role === "owner";
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const [filter, setFilter] = useState("all");
  const [source, setSource] = useState("all"); // all | online | offline
  const [invoiceFor, setInvoiceFor] = useState(null); // entrée dont on regarde la facture

  const load = useCallback(async () => {
    if (!userProfile) return;
    try {
      const rows = await getActivityLog(userProfile.owner_email, { isOwner });
      setEntries(rows);
      setAtEnd(rows.length === 0);
    } catch (err) {
      console.error("Journal indisponible:", err?.message);
    } finally {
      setLoading(false);
    }
  }, [userProfile, isOwner]);

  useEffect(() => { load(); }, [load]);
  useRealtimeRefresh("activity_log_live", ["activity_log"], () => load(), !!userProfile);
  useSyncedRefresh(() => load(), !!userProfile);

  const loadMore = async () => {
    const oldest = entries[entries.length - 1];
    if (!oldest) return;
    setLoadingMore(true);
    try {
      const more = await getActivityLog(userProfile.owner_email, { isOwner, before: oldest.occurred_at });
      if (more.length === 0) setAtEnd(true);
      else setEntries((cur) => [...cur, ...more.filter((m) => !cur.some((c) => c.id === m.id))]);
    } catch (err) {
      console.error(err?.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const visible = entries.filter((e) => {
    if (filter !== "all" && e.action !== filter) return false;
    if (source !== "all" && e.source !== source) return false;
    return true;
  });

  // Regroupement par jour.
  const groups = [];
  for (const e of visible) {
    const key = (e.occurred_at || "").slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(e);
    else groups.push({ key, label: dayLabel(e.occurred_at), items: [e] });
  }

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 240, opacity: .5 }}>
        <Loader2 className="animate-spin" color={T.accent} style={{ marginBottom: 8 }} />
        <p style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>Chargement du journal…</p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "left", paddingBottom: 40, maxWidth: 760 }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 22, margin: 0 }}>Journal d&apos;activité</h3>
        <p style={{ fontSize: 11, fontWeight: 600, color: T.faint, margin: "4px 0 0" }}>
          Toutes les caisses · en ligne et hors-ligne
        </p>
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        {FILTERS.filter((f) => !f.ownerOnly || isOwner).map((f) => (
          <Chip key={f.id} T={T} active={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</Chip>
        ))}
        <span style={{ width: 1, background: T.line, margin: "2px 4px" }} />
        {[["all", "Tous"], ["online", "En ligne"], ["offline", "Hors-ligne"]].map(([id, lbl]) => (
          <Chip key={id} T={T} active={source === id} onClick={() => setSource(id)}>{lbl}</Chip>
        ))}
      </div>

      {visible.length === 0 && (
        <p style={{ opacity: .4, fontStyle: "italic", fontSize: 13, padding: "24px 0" }}>Aucune activité pour ce filtre.</p>
      )}

      {groups.map((g) => (
        <div key={g.key} style={{ marginBottom: 22 }}>
          <p style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: T.faint, margin: "0 0 10px" }}>{g.label}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {g.items.map((e) => (
              <Row
                key={e.id}
                T={T}
                e={e}
                onOpen={INVOICE_ACTIONS.has(e.action) && e.entity_id ? () => setInvoiceFor(e) : null}
              />
            ))}
          </div>
        </div>
      ))}

      {!atEnd && visible.length > 0 && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          style={{ marginTop: 4, background: "none", border: `1px solid ${T.line}`, borderRadius: 999, padding: "8px 18px", fontSize: 12, fontWeight: 700, color: T.muted, cursor: loadingMore ? "default" : "pointer" }}
        >
          {loadingMore ? "…" : "Charger plus"}
        </button>
      )}

      {invoiceFor && (
        <InvoiceModal
          T={T}
          entry={invoiceFor}
          ownerEmail={userProfile.owner_email}
          onClose={() => setInvoiceFor(null)}
        />
      )}
    </div>
  );
}

function InvoiceModal({ T, entry, ownerEmail, onClose }) {
  const [data, setData] = useState(undefined); // undefined = chargement, null = introuvable

  useEffect(() => {
    let alive = true;
    const entityType = entry.entity_type || (entry.action === "payment.create" ? "transaction" : "order");
    getActivityInvoice(entityType, entry.entity_id, ownerEmail)
      .then((d) => { if (alive) setData(d || null); })
      .catch(() => { if (alive) setData(null); });
    return () => { alive = false; };
  }, [entry, ownerEmail]);

  const isPayment = entry.action === "payment.create";

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)" }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ background: "#fff", color: "#000", padding: 22, borderRadius: 4, fontFamily: "monospace", fontSize: 11, lineHeight: 1.45, borderTop: "8px solid #000", boxShadow: "0 20px 50px -10px rgba(0,0,0,.5)" }}>
          <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: 12, marginBottom: 12 }}>
            <h4 style={{ fontSize: 15, fontWeight: 800, textTransform: "uppercase", fontStyle: "italic", margin: 0 }}>
              {isPayment ? "Facture" : entry.action === "order.cancel" ? "Commande annulée" : "Commande"}
            </h4>
            {data && (
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", margin: "4px 0 0" }}>
                {data.table_number || entry.label || "—"}
                {isPayment && data.payment_method ? ` · ${data.payment_method}` : ""}
              </p>
            )}
          </div>

          {data === undefined && (
            <p style={{ textAlign: "center", opacity: .5, padding: "20px 0" }}>Chargement…</p>
          )}
          {data === null && (
            <p style={{ textAlign: "center", opacity: .6, padding: "20px 0" }}>
              Détail indisponible (hors-ligne ou opération trop ancienne).
            </p>
          )}
          {data && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {(data.items || []).length === 0 && (
                  <p style={{ opacity: .5, fontStyle: "italic" }}>Aucun détail d&apos;articles.</p>
                )}
                {(data.items || []).map((it, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ flex: 1 }}>
                      <b>{it.quantity || 1}×</b> {(it.name || "").toUpperCase()}
                    </span>
                    <span style={{ fontWeight: 700 }}>
                      {((Number(it.price) || 0) * (it.quantity || 1)).toLocaleString("fr-FR")}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "3px solid #000", paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                <span style={{ textTransform: "uppercase", fontStyle: "italic" }}>Total</span>
                <span style={{ fontSize: 15 }}>{(data.amount || 0).toLocaleString("fr-FR")} F</span>
              </div>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          style={{ marginTop: 12, width: "100%", background: T.surface, color: T.ink, border: `1px solid ${T.line}`, borderRadius: radiusSm, padding: "11px 0", fontSize: 12, fontWeight: 800, textTransform: "uppercase", cursor: "pointer" }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

function Chip({ T, active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
        border: `1px solid ${active ? T.accent : T.line}`,
        background: active ? T.accentWash : "transparent",
        color: active ? T.accent : T.muted,
      }}
    >
      {children}
    </button>
  );
}

function Row({ T, e, onOpen }) {
  const meta = ACTIONS[e.action] || { label: e.action, icon: FileText, color: "muted" };
  const Icon = meta.icon;
  const accentFg = T[meta.color] || T.muted;
  const accentBg = T[`${meta.color}Wash`] || T.surface2;
  const time = new Date(e.occurred_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      onClick={onOpen || undefined}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={onOpen ? (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onOpen(); } } : undefined}
      style={{ ...card(T, { padding: 14 }), display: "flex", alignItems: "flex-start", gap: 12, cursor: onOpen ? "pointer" : "default" }}
    >
      <div style={{ width: 34, height: 34, borderRadius: radiusSm, background: accentBg, color: accentFg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
          <span style={{ fontWeight: 800, fontSize: 13.5 }}>
            {meta.label}{e.label ? ` · ${e.label}` : ""}
          </span>
          {e.amount != null && (
            <span className="num" style={{ fontWeight: 800, fontSize: 13, whiteSpace: "nowrap", color: meta.color === "bad" ? T.bad : T.ink }}>
              {money(e.amount)}
            </span>
          )}
        </div>
        {e.sub_label && (
          <p style={{ fontSize: 11.5, color: T.muted, fontWeight: 600, margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {e.sub_label}
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 5 }}>
          <span style={{ fontSize: 10.5, color: T.faint, fontWeight: 600 }}>
            {time}{e.actor_name ? ` · ${e.actor_name}` : ""}{e.actor_role === "cashier" ? " (caissier)" : ""}
          </span>
          <Badge T={T} tone={e.source === "offline" ? "warn" : "muted"} icon={e.source === "offline" ? CloudOff : Cloud}>
            {e.source === "offline" ? "hors-ligne" : "en ligne"}
          </Badge>
          {e._local && (
            <Badge T={T} tone={e._status === "failed" ? "bad" : "accent"}>
              {e._status === "failed" ? "échec synchro" : "en attente"}
            </Badge>
          )}
          {onOpen && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: T.accent }}>
              <Receipt size={11} /> Facture
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Badge({ T, tone, icon: Icon, children }) {
  const fg = T[tone] || T.muted;
  const bg = T[`${tone}Wash`] || T.surface2;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: fg, background: bg, padding: "2px 7px", borderRadius: 999 }}>
      {Icon && <Icon size={10} />}
      {children}
    </span>
  );
}
