"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ShieldCheck, Store, TrendingUp,
  Loader2, CheckCircle2, AlertCircle, Search,
  Sun, Moon, Eye, Ban, RotateCcw, ChevronsUpDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from "@/context/ThemeContext";

export default function MasterAdminPage() {
  const { isDarkMode, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [restaurants, setRestaurants] = useState([]);
  const [systemHealth, setSystemHealth] = useState({ status: 'checking', latency: 0 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', dir: 'desc' });

  const router = useRouter();
  const portfolioRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    checkAdminAndFetchData();

    const checkHealth = async () => {
      const start = performance.now();
      try {
        const { error } = await supabase.from('restaurants').select('id', { count: 'estimated', head: true }).limit(1);
        const end = performance.now();
        if (error) throw error;
        setSystemHealth({ status: 'online', latency: Math.round(end - start) });
      } catch (err) {
        setSystemHealth({ status: 'offline', latency: 0 });
      }
    };

    const healthInterval = setInterval(checkHealth, 30000);
    checkHealth();

    const channel = supabase.channel('master_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(healthInterval);
    };
  }, []);

  const checkAdminAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/auth/login');

      const { data: profile } = await supabase
        .from('restaurants')
        .select('is_super_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.is_super_admin) {
        return router.replace('/dashboard');
      }

      await fetchData();
      setAuthLoading(false);
    } catch (err) {
      router.replace('/dashboard');
    }
  };

  const fetchData = async () => {
    const { data: restos, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return;

    const { data: transData } = await supabase.from('transactions').select('amount, restaurant_id');

    const salesByResto = transData?.reduce((acc, curr) => {
      const id = curr.restaurant_id;
      acc[id] = (acc[id] || 0) + (Number(curr.amount) || 0);
      return acc;
    }, {}) || {};

    const restosWithSales = restos.map(r => ({
      ...r,
      total_sales: salesByResto[r.id] || 0
    }));

    setRestaurants(restosWithSales);
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

      const { error } = await supabase.from('restaurants').update(payload).eq('id', restoId);
      if (!error) fetchData();
    } catch (err) { alert("Erreur technique"); }
  };

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
    <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-[#050505]' : 'bg-gray-50'}`}>
      <Loader2 className="animate-spin text-[#00D9FF]" size={40} />
    </div>
  );

  return (
    <div className={`min-h-screen font-[family-name:var(--font-lexend)] p-4 lg:p-8 pb-20 transition-colors duration-500 ${isDarkMode ? 'bg-[#050505] text-white' : 'bg-[#F9FAFB] text-gray-900'}`}>

      {/* HEADER */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="text-left">
          <div className="flex items-center gap-3 text-[#00D9FF] mb-2 font-black uppercase tracking-widest text-[10px]">
            <ShieldCheck size={20} /> Master Control System
          </div>
          <h1 className={`text-4xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Gestion du SaaS</h1>

          <div className={`mt-4 inline-flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all ${
            systemHealth.status === 'online'
              ? (isDarkMode ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-green-50 border-green-200 text-green-600')
              : 'bg-red-500/10 border-red-500/20 text-red-500 animate-pulse'
          }`}>
            <div className={`w-2 h-2 rounded-full ${systemHealth.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {systemHealth.status === 'online' ? `Système OK (${systemHealth.latency}ms)` : 'Panne détectée'}
            </span>
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'opacity-30' : 'opacity-50 text-gray-400'}`} size={18} />
                <input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-12 pr-6 py-4 border rounded-2xl text-xs outline-none focus:border-[#00D9FF] transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900 shadow-sm'}`}
                />
            </div>
            <button onClick={toggleTheme} className={`p-4 border rounded-2xl ${isDarkMode ? "bg-white/5 border-white/10 text-yellow-400" : "bg-white border-gray-200 text-indigo-600 shadow-sm"}`}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link href="/dashboard" className={`flex items-center gap-2 px-6 py-4 border rounded-2xl text-xs font-bold transition-all ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm'}`}>
                Dashboard
            </Link>
        </div>
      </div>

      {/* BANDEAU D'ATTENTION — renvoie directement vers le tableau filtré */}
      {alertsCount > 0 && (
        <div className={`max-w-7xl mx-auto mb-8 flex flex-wrap items-center gap-3 p-5 rounded-[30px] border border-dashed ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-white'}`}>
          <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'text-gray-400'}`}>
            Nécessite votre attention :
          </span>
          {pendingRestos.length > 0 && (
            <button onClick={() => goToPortfolio('pending')} className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest hover:bg-orange-500/20 transition-all cursor-pointer">
              <AlertCircle size={12} /> {pendingRestos.length} en attente
            </button>
          )}
          {suspendedRestos.length > 0 && (
            <button onClick={() => goToPortfolio('suspended')} className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all cursor-pointer">
              <Ban size={12} /> {suspendedRestos.length} suspendu{suspendedRestos.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* STATS RAPIDES — uniquement des chiffres réels */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard isDarkMode={isDarkMode} label="Total Restos" value={restaurants.length} icon={<Store size={18}/>} />
        <StatCard isDarkMode={isDarkMode} label="CA (comptes actifs)" value={`${activeCA.toLocaleString()} F`} icon={<TrendingUp size={18}/>} color="text-[#00D9FF]" />
        <StatCard isDarkMode={isDarkMode} label="Alertes ouvertes" value={alertsCount} icon={<AlertCircle size={18}/>} highlight={alertsCount > 0} />
      </div>

      {/* ACTIVITÉ RÉCENTE — fusion de created_at / approved_at / suspended_at */}
      {activityFeed.length > 0 && (
        <div className={`max-w-7xl mx-auto mb-8 border p-8 rounded-[40px] ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
          <h3 className={`text-sm font-black uppercase tracking-widest mb-5 text-left ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Activité récente</h3>
          <div>
            {activityFeed.map((evt, i) => (
              <div key={i} className={`flex items-center gap-3 py-3 text-left ${i > 0 ? (isDarkMode ? 'border-t border-white/5' : 'border-t border-gray-100') : ''}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${evt.type === 'new' ? 'bg-orange-500' : evt.type === 'approved' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`text-xs font-black uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{evt.name}</span>
                <span className={`text-xs ${isDarkMode ? 'opacity-40' : 'text-gray-400'}`}>
                  {evt.type === 'new' ? '— inscription reçue' : evt.type === 'approved' ? '— approuvé' : '— suspendu'}
                </span>
                <span className={`ml-auto text-[10px] font-bold uppercase tracking-widest shrink-0 ${isDarkMode ? 'opacity-30' : 'text-gray-400'}`}>{timeAgo(evt.when)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PORTEFEUILLE — un seul tableau, filtré par statut au lieu de trois blocs distincts */}
      <div ref={portfolioRef} className={`max-w-7xl mx-auto border rounded-[45px] overflow-hidden scroll-mt-8 ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="p-8 border-b border-white/5 flex flex-wrap justify-between items-center gap-4 bg-white/[0.01]">
          <h3 className={`text-xl font-black italic uppercase tracking-tighter text-left ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Portefeuille</h3>
          <div className={`flex flex-wrap p-1 rounded-2xl ${isDarkMode ? "bg-white/5" : "bg-gray-100"}`}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setStatusFilter(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-none cursor-pointer
                  ${statusFilter === t.key ? "bg-[#00D9FF] text-black shadow-lg" : "text-gray-500 hover:text-white bg-transparent"}`}
              >
                {t.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] tabular-nums ${statusFilter === t.key ? 'bg-black/10' : isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>{t.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'}>
                <SortableTh label="Restaurant" sortKey="name" sortConfig={sortConfig} onSort={toggleSort} isDarkMode={isDarkMode} />
                <th className={`px-8 py-5 text-[10px] uppercase font-black ${isDarkMode ? 'opacity-40' : 'text-gray-400'}`}>Propriétaire</th>
                <th className={`px-8 py-5 text-[10px] uppercase font-black ${isDarkMode ? 'opacity-40' : 'text-gray-400'}`}>Statut</th>
                <SortableTh label="Dates" sortKey="created_at" sortConfig={sortConfig} onSort={toggleSort} isDarkMode={isDarkMode} />
                <SortableTh label="CA" sortKey="ca" sortConfig={sortConfig} onSort={toggleSort} isDarkMode={isDarkMode} align="text-right" />
                <th className={`px-8 py-5 text-[10px] uppercase font-black text-right ${isDarkMode ? 'opacity-40' : 'text-gray-400'}`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/[0.02]' : 'divide-gray-100'}`}>
              {sortedPortfolio.map((resto) => (
                <PortfolioRow
                  key={resto.id}
                  resto={resto}
                  isDarkMode={isDarkMode}
                  formatDateTime={formatDateTime}
                  toggleStatus={toggleStatus}
                  handleImpersonate={handleImpersonate}
                />
              ))}
              {sortedPortfolio.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center opacity-30 italic text-sm">
                    Aucun restaurant ne correspond à ce filtre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ isDarkMode, label, value, color, icon, highlight = false }) {
  const valueColor = color ? color : (isDarkMode ? 'text-white' : 'text-gray-900');
  return (
    <div className={`p-6 border rounded-[35px] text-left transition-all ${highlight ? 'border-orange-500/50 bg-orange-500/5' : isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
      <div className={`flex items-center gap-2 mb-2 ${isDarkMode ? 'opacity-30' : 'text-gray-400'}`}>
        {icon}
        <p className="text-[9px] uppercase font-black tracking-widest">{label}</p>
      </div>
      <p className={`text-2xl font-black italic tracking-tighter tabular-nums ${valueColor}`}>{value}</p>
    </div>
  );
}

function SortableTh({ label, sortKey, sortConfig, onSort, isDarkMode, align = '' }) {
  const active = sortConfig.key === sortKey;
  return (
    <th className={`px-8 py-5 text-[10px] uppercase font-black ${align} ${isDarkMode ? 'opacity-40' : 'text-gray-400'}`}>
      <button
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0 uppercase text-[10px] font-black tracking-widest text-inherit"
      >
        {label}
        <ChevronsUpDown size={11} className={active ? 'opacity-100 text-[#00D9FF]' : 'opacity-40'} />
      </button>
    </th>
  );
}

function PortfolioRow({ resto, isDarkMode, formatDateTime, toggleStatus, handleImpersonate }) {
  const isPending = !resto.is_active && !resto.approved_at;
  const isSuspended = !resto.is_active && resto.approved_at;
  const isActive = resto.is_active;

  return (
    <tr className={`group transition-colors ${isDarkMode ? 'hover:bg-white/[0.01]' : 'hover:bg-gray-50'}`}>
      <td className="px-8 py-6 text-left">
        <p className={`font-black text-sm uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{resto.name || "N/A"}</p>
        <p className={`text-[10px] ${isDarkMode ? 'opacity-40' : 'text-gray-500'}`}>{resto.location || "Non défini"}</p>
      </td>
      <td className="px-8 py-6 text-left">
        <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{resto.owner_email}</p>
      </td>
      <td className="px-8 py-6 text-left">
        {isActive && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[9px] font-black uppercase tracking-widest">
            <CheckCircle2 size={10} /> Actif
          </span>
        )}
        {isPending && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[9px] font-black uppercase tracking-widest">
            <AlertCircle size={10} /> En attente
          </span>
        )}
        {isSuspended && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest">
            <Ban size={10} /> Suspendu
          </span>
        )}
      </td>
      <td className="px-8 py-6 text-left">
        {isPending && (
          <p className={`text-[10px] font-bold ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
            Inscrit : {formatDateTime(resto.created_at) || 'N/A'}
          </p>
        )}
        {isActive && (
          <>
            <p className={`text-[10px] font-bold ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
              Créé : {formatDateTime(resto.created_at) || 'N/A'}
            </p>
            <p className={`text-[10px] font-bold ${isDarkMode ? 'opacity-40' : 'text-gray-400'}`}>
              Approuvé : {formatDateTime(resto.approved_at) || '—'}
            </p>
          </>
        )}
        {isSuspended && (
          <>
            <p className={`text-[10px] font-bold ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
              Approuvé : {formatDateTime(resto.approved_at) || 'N/A'}
            </p>
            <p className={`text-[10px] font-bold ${isDarkMode ? 'opacity-40' : 'text-gray-400'}`}>
              Suspendu : {formatDateTime(resto.suspended_at) || '—'}
            </p>
          </>
        )}
      </td>
      <td className="px-8 py-6 text-right">
        <p className="font-black text-sm text-[#00D9FF] tabular-nums">
          {isPending ? '—' : `${(resto.total_sales || 0).toLocaleString()} F`}
        </p>
      </td>
      <td className="px-8 py-6 text-right">
        <div className="flex justify-end gap-3">
          {isActive && (
            <>
              <button
                onClick={() => handleImpersonate(resto.id)}
                className={`p-3 rounded-xl border flex items-center gap-2 transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'}`}
                title="Voir en tant que"
              >
                <Eye size={16} />
                <span className="text-[9px] font-black uppercase hidden sm:block">Aperçu</span>
              </button>
              <button onClick={() => toggleStatus(resto.id, true)} className="text-red-500 bg-red-500/10 border border-red-500/20 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                Suspendre
              </button>
            </>
          )}
          {isPending && (
            <button onClick={() => toggleStatus(resto.id, false)} className="bg-orange-500 text-black px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
              Activer
            </button>
          )}
          {isSuspended && (
            <button onClick={() => toggleStatus(resto.id, false)} className="bg-[#00D9FF] text-black px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
              <RotateCcw size={12} /> Réactiver
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
