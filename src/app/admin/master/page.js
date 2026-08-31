"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ShieldCheck, Store, TrendingUp,
  Loader2, CheckCircle2, AlertCircle, Search,
  Sun, Moon, Eye, Ban, RotateCcw, ChevronsUpDown, Trash2, X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from "@/context/ThemeContext";
import { getDashTokens, card, btnGhost, inputStyle, iconBtn, pill, eyebrow, headFont, radius, radiusSm } from '@/lib/dashTheme';
import { getRestaurantProfile, getAllRestaurants, updateRestaurantProfile, pingDatabase } from '@/lib/data/restaurants';
import { getAllTransactionAmounts } from '@/lib/data/transactions';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

export default function MasterAdminPage() {
  const { isDarkMode, toggleTheme } = useTheme();
  const T = getDashTokens(isDarkMode);
  const [mounted, setMounted] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [restaurants, setRestaurants] = useState([]);
  const [systemHealth, setSystemHealth] = useState({ status: 'checking', latency: 0 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', dir: 'desc' });

  const [toast, setToast] = useState(null);
  const toastTimeout = useRef(null);

  const router = useRouter();
  const portfolioRef = useRef(null);

  const showToast = (next, duration = 4000) => {
    setToast(next);
    clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), duration);
  };

  const fetchData = async () => {
    let restos, transData;
    try {
      [restos, transData] = await Promise.all([
        getAllRestaurants(),
        getAllTransactionAmounts(),
      ]);
    } catch (err) {
      return;
    }

    const salesByResto = transData.reduce((acc, curr) => {
      const id = curr.restaurant_id;
      acc[id] = (acc[id] || 0) + (Number(curr.amount) || 0);
      return acc;
    }, {});

    const restosWithSales = restos.map(r => ({
      ...r,
      total_sales: salesByResto[r.id] || 0
    }));

    setRestaurants(restosWithSales);
  };

  const checkAdminAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/auth/login');

      const profile = await getRestaurantProfile(user.id);

      if (!profile?.is_super_admin) {
        return router.replace('/dashboard');
      }

      await fetchData();
      setAuthLoading(false);
    } catch (err) {
      router.replace('/dashboard');
    }
  };

  const toggleStatus = async (restoId, currentStatus) => {
    try {
      const activating = !currentStatus;
      const payload = { is_active: activating };
      // approved_at et suspended_at sont des horodatages "dernière fois que
      // X est arrivé" — ni l'un ni l'autre n'est jamais effacé par l'action
      // inverse. C'est ce qui permet de distinguer, une fois is_active=false,
      // un compte jamais approuvé (approved_at NULL) d'un compte suspendu
      // après avoir été actif (approved_at rempli).
      if (activating) payload.approved_at = new Date().toISOString();
      else payload.suspended_at = new Date().toISOString();

      await updateRestaurantProfile(restoId, payload);
      fetchData();
      showToast({
        type: 'success',
        title: activating ? 'Restaurant activé' : 'Restaurant suspendu',
        detail: activating ? "L'accès a été rétabli." : "L'accès a été coupé.",
      });
    } catch (err) {
      showToast({ type: 'error', title: 'Action impossible', detail: 'Erreur technique.' }, 5000);
    }
  };

  const handleDelete = async (resto) => {
    const isOwner = resto.role === 'owner';
    const first = isOwner
      ? `Supprimer définitivement « ${resto.name} » ?\n\n`
        + `Cela efface le compte propriétaire, TOUS ses comptes caissier, et `
        + `TOUTES les données : menu, commandes, transactions, dépenses, stock, `
        + `tables, clôtures de caisse.\n\nAction IRRÉVERSIBLE.`
      : `Supprimer définitivement le compte caissier « ${resto.name} » ?\n\n`
        + `Les données du restaurant ne sont pas touchées.`;

    if (!window.confirm(first)) return;
    if (isOwner && !window.confirm(`Dernière confirmation : suppression totale de « ${resto.name} ».`)) return;

    try {
      const { data, error } = await supabase.rpc('admin_delete_restaurant', { target_id: resto.id });
      if (error) throw error;
      fetchData();
      showToast({
        type: 'success',
        title: isOwner ? 'Restaurant supprimé' : 'Compte caissier supprimé',
        detail: isOwner
          ? `« ${resto.name} » et ${data?.accounts_deleted ?? 1} compte(s) effacés définitivement.`
          : `« ${resto.name} » a été effacé.`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Suppression impossible',
        detail: err?.message || 'Erreur technique.',
      }, 5000);
    }
  };

  useEffect(() => {
    setMounted(true);
    checkAdminAndFetchData();

    const checkHealth = async () => {
      const start = performance.now();
      try {
        await pingDatabase();
        const end = performance.now();
        setSystemHealth({ status: 'online', latency: Math.round(end - start) });
      } catch (err) {
        setSystemHealth({ status: 'offline', latency: 0 });
      }
    };

    const healthInterval = setInterval(checkHealth, 30000);
    checkHealth();

    return () => clearInterval(healthInterval);
  }, []);

  useRealtimeRefresh("master_sync", ["restaurants"], () => fetchData(), true);

  const formatDateTime = (iso) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const timeAgo = (iso) => {
    if (!iso) return '';
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `il y a ${diffH} h`;
    const diffJ = Math.floor(diffH / 24);
    if (diffJ < 30) return `il y a ${diffJ} j`;
    const diffMonth = Math.floor(diffJ / 30);
    return `il y a ${diffMonth} mois`;
  };

  // --- LOGIQUE IMPERSONNATE ---
  const handleImpersonate = (restoId) => {
    // On stocke l'ID du restaurant cible
    localStorage.setItem('impersonate_resto_id', restoId);
    // On redirige vers le dashboard
    router.push('/dashboard');
  };

  const goToPortfolio = (filter) => {
    setStatusFilter(filter);
    portfolioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleSort = (key) => {
    setSortConfig(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'asc' });
  };

  const filteredRestos = restaurants.filter(r =>
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.owner_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // approved_at NULL => jamais approuvé => vraie inscription en attente.
  // approved_at rempli => a déjà été actif un jour => suspendu, pas "en attente".
  const pendingRestos = filteredRestos.filter(r => !r.is_active && !r.approved_at);
  const suspendedRestos = filteredRestos.filter(r => !r.is_active && r.approved_at);
  const activeRestos = filteredRestos.filter(r => r.is_active);

  const activeCA = activeRestos.reduce((acc, r) => acc + (r.total_sales || 0), 0);
  const alertsCount = pendingRestos.length + suspendedRestos.length;

  const tabs = [
    { key: 'all', label: 'Tous', count: filteredRestos.length },
    { key: 'pending', label: 'En attente', count: pendingRestos.length },
    { key: 'active', label: 'Actifs', count: activeRestos.length },
    { key: 'suspended', label: 'Suspendus', count: suspendedRestos.length },
  ];

  const portfolioRestos = statusFilter === 'all' ? filteredRestos
    : statusFilter === 'pending' ? pendingRestos
    : statusFilter === 'active' ? activeRestos
    : suspendedRestos;

  const sortedPortfolio = [...portfolioRestos].sort((a, b) => {
    let av, bv;
    if (sortConfig.key === 'ca') { av = a.total_sales || 0; bv = b.total_sales || 0; }
    else if (sortConfig.key === 'name') { av = (a.name || '').toLowerCase(); bv = (b.name || '').toLowerCase(); }
    else { av = a.created_at || ''; bv = b.created_at || ''; }
    if (av < bv) return sortConfig.dir === 'asc' ? -1 : 1;
    if (av > bv) return sortConfig.dir === 'asc' ? 1 : -1;
    return 0;
  });

  // Fil d'activité : fusionne created_at / approved_at / suspended_at de tous
  // les restaurants en une chronologie unique — la traçabilité qu'on a
  // construite au fil des dernières migrations, enfin visible d'un coup d'œil.
  const activityFeed = restaurants
    .flatMap(r => {
      const events = [{ type: 'new', name: r.name, when: r.created_at }];
      if (r.approved_at) events.push({ type: 'approved', name: r.name, when: r.approved_at });
      if (r.suspended_at) events.push({ type: 'suspended', name: r.name, when: r.suspended_at });
      return events;
    })
    .filter(e => e.when)
    .sort((a, b) => new Date(b.when) - new Date(a.when))
    .slice(0, 6);

  if (!mounted) return null;
  if (authLoading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
      <Loader2 className="animate-spin" color={T.accent} size={40} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", fontFamily: "var(--font-lexend)", padding: "32px 24px 80px", background: T.bg, color: T.ink }}>

      {/* HEADER */}
      <div style={{ maxWidth: 1280, margin: "0 auto 32px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 20, textAlign: "left" }}>
        <div>
          <div style={{ ...eyebrow(T), display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <ShieldCheck size={18} /> Master Control System
          </div>
          <h1 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 30, margin: 0 }}>Gestion du SaaS</h1>

          <div style={{
            marginTop: 14, display: "inline-flex", alignItems: "center", gap: 10, padding: "9px 16px", borderRadius: 999,
            background: systemHealth.status === 'online' ? T.goodWash : T.badWash,
            color: systemHealth.status === 'online' ? T.good : T.bad,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: systemHealth.status === 'online' ? T.good : T.bad,
              animation: systemHealth.status !== 'checking' ? "dash-pulse-dot 2s ease-in-out infinite" : "none",
            }} />
            <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {systemHealth.status === 'online' ? `Système OK (${systemHealth.latency}ms)` : systemHealth.status === 'offline' ? 'Panne détectée' : 'Vérification...'}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, width: "100%" }} className="dash-master-actions">
          <div style={{ ...card(T, { borderRadius: radiusSm }), position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
            <Search size={16} color={T.faint} style={{ position: "absolute", left: 14 }} />
            <input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={inputStyle(T, { border: "none", padding: "12px 16px 12px 42px", borderRadius: radiusSm })}
            />
          </div>
          <button onClick={toggleTheme} style={iconBtn(T, { width: 44, height: 44, borderRadius: radiusSm, color: isDarkMode ? "oklch(0.8 0.15 95)" : "oklch(0.5 0.15 280)" })}>
            {isDarkMode ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <Link href="/dashboard" style={{ ...btnGhost(T, { padding: "12px 22px", whiteSpace: "nowrap" }), textDecoration: "none" }}>
            Dashboard
          </Link>
        </div>
      </div>

      {/* BANDEAU D'ATTENTION — renvoie directement vers le tableau filtré */}
      {alertsCount > 0 && (
        <div style={{ maxWidth: 1280, margin: "0 auto 24px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: 20, borderRadius: radius, border: `1px dashed ${T.line}` }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: T.faint }}>
            Nécessite votre attention :
          </span>
          {pendingRestos.length > 0 && (
            <button onClick={() => goToPortfolio('pending')} style={{ ...pill(T, "warn"), border: "none", cursor: "pointer", padding: "8px 16px", fontSize: 10.5 }}>
              <AlertCircle size={13} /> {pendingRestos.length} en attente
            </button>
          )}
          {suspendedRestos.length > 0 && (
            <button onClick={() => goToPortfolio('suspended')} style={{ ...pill(T, "bad"), border: "none", cursor: "pointer", padding: "8px 16px", fontSize: 10.5 }}>
              <Ban size={13} /> {suspendedRestos.length} suspendu{suspendedRestos.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* STATS RAPIDES — uniquement des chiffres réels */}
      <div style={{ maxWidth: 1280, margin: "0 auto 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <StatCard T={T} label="Total Restos" value={restaurants.length} icon={<Store size={18} />} />
        <StatCard T={T} label="CA (comptes actifs)" value={`${activeCA.toLocaleString()} F`} icon={<TrendingUp size={18} />} accentColor={T.accent} />
        <StatCard T={T} label="Alertes ouvertes" value={alertsCount} icon={<AlertCircle size={18} />} highlight={alertsCount > 0} />
      </div>

      {/* ACTIVITÉ RÉCENTE — fusion de created_at / approved_at / suspended_at */}
      {activityFeed.length > 0 && (
        <div style={{ ...card(T, { padding: 28 }), maxWidth: 1280, margin: "0 auto 24px", textAlign: "left" }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 18px", color: T.muted }}>Activité récente</h3>
          <div>
            {activityFeed.map((evt, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i > 0 ? `1px solid ${T.line}` : "none" }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: evt.type === 'new' ? T.warn : evt.type === 'approved' ? T.good : T.bad,
                }} />
                <span style={{ fontSize: 12.5, fontWeight: 800, textTransform: "uppercase" }}>{evt.name}</span>
                <span style={{ fontSize: 12, color: T.faint }}>
                  {evt.type === 'new' ? '— inscription reçue' : evt.type === 'approved' ? '— approuvé' : '— suspendu'}
                </span>
                <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: T.faint, flexShrink: 0 }}>{timeAgo(evt.when)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PORTEFEUILLE — un seul tableau, filtré par statut au lieu de trois blocs distincts */}
      <div ref={portfolioRef} style={{ ...card(T), maxWidth: 1280, margin: "0 auto", overflow: "hidden", scrollMarginTop: 32 }}>
        <div style={{ padding: 24, borderBottom: `1px solid ${T.line}`, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 14, textAlign: "left" }}>
          <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 18, margin: 0 }}>Portefeuille</h3>
          <div style={{ display: "inline-flex", flexWrap: "wrap", padding: 3, borderRadius: 999, background: T.surface2, gap: 2 }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setStatusFilter(t.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 999, border: "none", cursor: "pointer",
                  fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em",
                  background: statusFilter === t.key ? T.accent : "none",
                  color: statusFilter === t.key ? T.accentInk : T.muted,
                }}
              >
                {t.label}
                <span className="num" style={{
                  padding: "1px 6px", borderRadius: 999, fontSize: 9.5,
                  background: statusFilter === t.key ? "rgba(0,0,0,.15)" : T.surfaceHover,
                }}>{t.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: T.surface2 }}>
                <SortableTh T={T} label="Restaurant" sortKey="name" sortConfig={sortConfig} onSort={toggleSort} />
                <th style={{ padding: "16px 24px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: T.faint }}>Propriétaire</th>
                <th style={{ padding: "16px 24px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: T.faint }}>Statut</th>
                <SortableTh T={T} label="Dates" sortKey="created_at" sortConfig={sortConfig} onSort={toggleSort} />
                <SortableTh T={T} label="CA" sortKey="ca" sortConfig={sortConfig} onSort={toggleSort} align="right" />
                <th style={{ padding: "16px 24px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: T.faint, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedPortfolio.map((resto) => (
                <PortfolioRow
                  key={resto.id}
                  T={T}
                  resto={resto}
                  formatDateTime={formatDateTime}
                  toggleStatus={toggleStatus}
                  handleImpersonate={handleImpersonate}
                  handleDelete={handleDelete}
                />
              ))}
              {sortedPortfolio.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "60px 24px", textAlign: "center", opacity: .4, fontStyle: "italic", fontSize: 13 }}>
                    Aucun restaurant ne correspond à ce filtre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="dash-master-toast"
          style={{
            position: "fixed", left: "50%", bottom: 28, zIndex: 1000,
            display: "flex", alignItems: "flex-start", gap: 14,
            width: "min(400px, calc(100vw - 32px))",
            padding: "16px 16px 16px 18px", borderRadius: radius,
            background: T.surface, border: `1px solid ${T.line}`, boxShadow: T.shadow,
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: radiusSm, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            background: toast.type === "success" ? T.goodWash : T.badWash,
            color: toast.type === "success" ? T.good : T.bad,
          }}>
            {toast.type === "success" ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 13.5, fontFamily: headFont }}>{toast.title}</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: T.faint, fontWeight: 700, lineHeight: 1.5 }}>{toast.detail}</p>
          </div>
          <button onClick={() => setToast(null)} aria-label="Fermer" style={{ background: "none", border: "none", color: T.faint, cursor: "pointer", padding: 2, flexShrink: 0, display: "flex" }}>
            <X size={16} />
          </button>
        </div>
      )}

      <style jsx global>{`
        @keyframes dash-pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
        .dash-master-row:hover { background: ${T.surface2}; }
        @media (min-width: 720px) { .dash-master-actions { width: auto; } }
        @media (max-width: 640px) { .dash-hide-sm { display: none !important; } }
        @keyframes dash-master-toast-in {
          from { opacity: 0; transform: translate(-50%, 14px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .dash-master-toast { animation: dash-master-toast-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @media (prefers-reduced-motion: reduce) {
          .dash-master-toast { animation: none; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}

function StatCard({ T, label, value, icon, accentColor, highlight = false }) {
  return (
    <div style={card(T, { padding: 22, textAlign: "left", ...(highlight ? { border: `1px solid ${T.warn}55`, background: T.warnWash } : {}) })}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, color: T.faint }}>
        {icon}
        <p style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>{label}</p>
      </div>
      <p className="num" style={{ fontFamily: headFont, fontSize: 24, fontWeight: 800, margin: 0, color: accentColor || T.ink }}>{value}</p>
    </div>
  );
}

function SortableTh({ T, label, sortKey, sortConfig, onSort, align }) {
  const active = sortConfig.key === sortKey;
  return (
    <th style={{ padding: "16px 24px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: T.faint, textAlign: align === "right" ? "right" : "left" }}>
      <button
        onClick={() => onSort(sortKey)}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit", color: "inherit", textTransform: "uppercase", letterSpacing: "0.04em" }}
      >
        {label}
        <ChevronsUpDown size={12} color={active ? T.accent : T.faint} style={{ opacity: active ? 1 : .5 }} />
      </button>
    </th>
  );
}

function PortfolioRow({ T, resto, formatDateTime, toggleStatus, handleImpersonate, handleDelete }) {
  const isPending = !resto.is_active && !resto.approved_at;
  const isSuspended = !resto.is_active && resto.approved_at;
  const isActive = resto.is_active;

  return (
    <tr className="dash-master-row" style={{ borderTop: `1px solid ${T.line}` }}>
      <td style={{ padding: "18px 24px" }}>
        <p style={{ fontWeight: 800, fontSize: 13, textTransform: "uppercase", margin: "0 0 3px" }}>{resto.name || "N/A"}</p>
        <p style={{ fontSize: 10.5, color: T.faint, margin: 0 }}>{resto.location || "Non défini"}</p>
      </td>
      <td style={{ padding: "18px 24px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>{resto.owner_email}</p>
      </td>
      <td style={{ padding: "18px 24px" }}>
        {isActive && (
          <span style={{ ...pill(T, "good") }}><CheckCircle2 size={11} /> Actif</span>
        )}
        {isPending && (
          <span style={{ ...pill(T, "warn") }}><AlertCircle size={11} /> En attente</span>
        )}
        {isSuspended && (
          <span style={{ ...pill(T, "bad") }}><Ban size={11} /> Suspendu</span>
        )}
      </td>
      <td style={{ padding: "18px 24px" }}>
        {isPending && (
          <p style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, margin: 0 }}>
            Inscrit : {formatDateTime(resto.created_at) || 'N/A'}
          </p>
        )}
        {isActive && (
          <>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, margin: "0 0 2px" }}>
              Créé : {formatDateTime(resto.created_at) || 'N/A'}
            </p>
            <p style={{ fontSize: 10.5, fontWeight: 600, color: T.faint, margin: 0 }}>
              Approuvé : {formatDateTime(resto.approved_at) || '—'}
            </p>
          </>
        )}
        {isSuspended && (
          <>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, margin: "0 0 2px" }}>
              Approuvé : {formatDateTime(resto.approved_at) || 'N/A'}
            </p>
            <p style={{ fontSize: 10.5, fontWeight: 600, color: T.faint, margin: 0 }}>
              Suspendu : {formatDateTime(resto.suspended_at) || '—'}
            </p>
          </>
        )}
      </td>
      <td style={{ padding: "18px 24px", textAlign: "right" }}>
        <p className="num" style={{ fontWeight: 800, fontSize: 13.5, color: T.accent, margin: 0 }}>
          {isPending ? '—' : `${(resto.total_sales || 0).toLocaleString()} F`}
        </p>
      </td>
      <td style={{ padding: "18px 24px", textAlign: "right" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {isActive && (
            <>
              <button
                onClick={() => handleImpersonate(resto.id)}
                title="Voir en tant que"
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: radiusSm, background: T.surface2, border: `1px solid ${T.line}`, color: T.ink, cursor: "pointer" }}
              >
                <Eye size={15} />
                <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase" }} className="dash-hide-sm">Aperçu</span>
              </button>
              <button onClick={() => toggleStatus(resto.id, true)} style={{ ...pill(T, "bad"), border: "none", cursor: "pointer", padding: "9px 16px", fontSize: 9.5 }}>
                Suspendre
              </button>
            </>
          )}
          {isPending && (
            <button onClick={() => toggleStatus(resto.id, false)} style={{ padding: "9px 16px", borderRadius: 999, background: T.warn, color: "#1a1200", border: "none", cursor: "pointer", fontWeight: 800, fontSize: 9.5, textTransform: "uppercase" }}>
              Activer
            </button>
          )}
          {isSuspended && (
            <button onClick={() => toggleStatus(resto.id, false)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 999, background: T.accent, color: T.accentInk, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 9.5, textTransform: "uppercase" }}>
              <RotateCcw size={12} /> Réactiver
            </button>
          )}
          <button
            onClick={() => handleDelete(resto)}
            title="Supprimer définitivement"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "9px 11px", borderRadius: radiusSm, background: T.badWash, border: `1px solid ${T.bad}33`, color: T.bad, cursor: "pointer" }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}
