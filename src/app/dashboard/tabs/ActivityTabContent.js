"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ShoppingBag, Wallet, FileText, Lock, XCircle, Trash2, Loader2, CloudOff, Cloud,
} from "lucide-react";
import { getDashTokens, card, headFont, radiusSm } from "@/lib/dashTheme";
import { getActivityLog } from "@/lib/data/activity";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { useSyncedRefresh } from "@/hooks/useSyncedRefresh";

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
            {g.items.map((e) => <Row key={e.id} T={T} e={e} />)}
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

function Row({ T, e }) {
  const meta = ACTIONS[e.action] || { label: e.action, icon: FileText, color: "muted" };
  const Icon = meta.icon;
  const accentFg = T[meta.color] || T.muted;
  const accentBg = T[`${meta.color}Wash`] || T.surface2;
  const time = new Date(e.occurred_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ ...card(T, { padding: 14 }), display: "flex", alignItems: "flex-start", gap: 12 }}>
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
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 4 }}>
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
