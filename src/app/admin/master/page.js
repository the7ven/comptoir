"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ShieldCheck, Store, TrendingUp,
  Loader2, CheckCircle2, AlertCircle, Search,
  PieChart, DollarSign, Sun, Moon, Eye, Ban, RotateCcw
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, CartesianGrid, 
  Tooltip
} from 'recharts';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from "@/context/ThemeContext";

export default function MasterAdminPage() {
  const { isDarkMode, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({ totalRestos: 0, totalSales: 0, saasRevenue: 0 });
  const [restaurants, setRestaurants] = useState([]);
  const [systemHealth, setSystemHealth] = useState({ status: 'checking', latency: 0 });

  const router = useRouter();

  const [saasData] = useState([
    { name: 'Jan', total: 0 }, { name: 'Fév', total: 0 }, { name: 'Mar', total: 0 }
  ]);
  
  const [paymentMethods] = useState([
    { name: 'Orange', value: 400, color: '#ff6b00' },
    { name: 'Wave', value: 300, color: '#00d9ff' },
    { name: 'MTN', value: 200, color: '#ffcc00' },
    { name: 'Visa/MC', value: 150, color: '#1a1f71' }, 
    { name: 'Espèces', value: 50, color: '#22c55e' }   
  ]);

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

    const totalCA = transData?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;

    const restosWithSales = restos.map(r => ({
      ...r,
      total_sales: salesByResto[r.id] || 0
    }));

    setRestaurants(restosWithSales);
    setStats(prev => ({
      ...prev,
      totalRestos: restos?.length || 0,
      totalSales: totalCA
    }));
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

  // --- LOGIQUE IMPERSONNATE ---
  const handleImpersonate = (restoId) => {
    // On stocke l'ID du restaurant cible
    localStorage.setItem('impersonate_resto_id', restoId);
    // On redirige vers le dashboard
    router.push('/dashboard');
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

  if (!mounted) return null;
  if (authLoading) return (
    <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-[#050505]' : 'bg-gray-50'}`}>
      <Loader2 className="animate-spin text-[#00D9FF]" size={40} />
    </div>
  );

  return (
    <div className={`min-h-screen font-[family-name:var(--font-lexend)] p-4 lg:p-8 pb-20 transition-colors duration-500 ${isDarkMode ? 'bg-[#050505] text-white' : 'bg-[#F9FAFB] text-gray-900'}`}>
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
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

      {/* --- SECTION ANALYTIQUE --- */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className={`lg:col-span-2 border p-8 rounded-[45px] ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex justify-between items-center mb-8 text-left">
                <h3 className={`text-lg font-black italic uppercase tracking-tighter flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    <TrendingUp size={20} className="text-[#00D9FF]" /> Revenus SaaS
                </h3>
            </div>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={saasData}>
                        <defs>
                            <linearGradient id="colorSaas" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={isDarkMode ? 0.05 : 0.1} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDarkMode ? '#666' : '#888', fontSize: 10}} />
                        <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#111' : '#fff', borderRadius: '15px', border: 'none', color: isDarkMode ? '#fff' : '#000' }} />
                        <Area type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={4} fill="url(#colorSaas)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className={`border p-8 rounded-[45px] flex flex-col justify-between ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h3 className={`text-lg font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3 text-left ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                <PieChart size={20} className="text-purple-500" /> Répartition des Flux
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[300px] no-scrollbar">
                {paymentMethods.map(m => (
                    <div key={m.name} className={`flex items-center justify-between p-3 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50 border border-gray-100'}`}>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/60' : 'text-gray-500'}`}>{m.name}</span>
                        </div>
                        <span className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{m.value} tx</span>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* STATS RAPIDES */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <StatCard isDarkMode={isDarkMode} label="Total Restos" value={stats.totalRestos} icon={<Store size={18}/>} />
        <StatCard isDarkMode={isDarkMode} label="CA Clients" value={`${stats.totalSales.toLocaleString()} F`} icon={<TrendingUp size={18}/>} color="text-[#00D9FF]" />
        <StatCard isDarkMode={isDarkMode} label="Abonnements" value="0 F" icon={<DollarSign size={18}/>} color="text-green-500" />
        <StatCard isDarkMode={isDarkMode} label="Alertes" value={pendingRestos.length} icon={<AlertCircle size={18}/>} highlight={pendingRestos.length > 0} />
      </div>

      {/* ALERTES ATTENTE */}
      {pendingRestos.length > 0 && (
        <div className="max-w-7xl mx-auto mb-10">
          <h3 className="flex items-center gap-3 text-orange-500 font-black italic uppercase tracking-tighter mb-6 ml-4 text-left">
            <AlertCircle size={22} /> Inscriptions à valider
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRestos.map(resto => (
              <div key={resto.id} className={`border p-6 rounded-[35px] flex justify-between items-center transition-all ${isDarkMode ? 'bg-orange-500/5 border-orange-500/20' : 'bg-orange-50 border-orange-200'}`}>
                <div className="text-left">
                  <p className={`font-black uppercase text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{resto.name}</p>
                  <p className={`text-[10px] font-bold ${isDarkMode ? 'opacity-50' : 'text-gray-500'}`}>{resto.owner_email}</p>
                  <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${isDarkMode ? 'opacity-30' : 'text-gray-400'}`}>
                    Inscrit le {formatDateTime(resto.created_at) || 'N/A'}
                  </p>
                </div>
                <button onClick={() => toggleStatus(resto.id, false)} className="bg-orange-500 text-black px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                  Activer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPTES SUSPENDUS — distincts des inscriptions en attente : ceux-ci
          ont déjà été actifs un jour (approved_at rempli) avant d'être suspendus. */}
      {suspendedRestos.length > 0 && (
        <div className="max-w-7xl mx-auto mb-10">
          <h3 className={`flex items-center gap-3 font-black italic uppercase tracking-tighter mb-6 ml-4 text-left ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
            <Ban size={22} /> Comptes suspendus
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suspendedRestos.map(resto => (
              <div key={resto.id} className={`border p-6 rounded-[35px] flex justify-between items-center transition-all ${isDarkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                <div className="text-left">
                  <p className={`font-black uppercase text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{resto.name}</p>
                  <p className={`text-[10px] font-bold ${isDarkMode ? 'opacity-50' : 'text-gray-500'}`}>{resto.owner_email}</p>
                  <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${isDarkMode ? 'opacity-30' : 'text-gray-400'}`}>
                    Approuvé le {formatDateTime(resto.approved_at) || 'N/A'} • Suspendu le {formatDateTime(resto.suspended_at) || 'N/A'}
                  </p>
                </div>
                <button onClick={() => toggleStatus(resto.id, false)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all ${isDarkMode ? 'bg-white/10 text-white' : 'bg-white text-gray-900 border border-gray-200'}`}>
                  <RotateCcw size={14} /> Réactiver
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABLEAU PRINCIPAL */}
      <div className={`max-w-7xl mx-auto border rounded-[45px] overflow-hidden ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
          <h3 className={`text-xl font-black italic uppercase tracking-tighter text-left ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Portefeuille Clients</h3>
          <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className={`text-[9px] font-bold uppercase tracking-widest ${isDarkMode ? 'opacity-30' : 'text-gray-400'}`}>Mise à jour Live</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'}>
                <th className={`px-8 py-5 text-[10px] uppercase font-black ${isDarkMode ? 'opacity-40' : 'text-gray-400'}`}>Restaurant</th>
                <th className={`px-8 py-5 text-[10px] uppercase font-black ${isDarkMode ? 'opacity-40' : 'text-gray-400'}`}>Propriétaire</th>
                <th className={`px-8 py-5 text-[10px] uppercase font-black ${isDarkMode ? 'opacity-40' : 'text-gray-400'}`}>Dates</th>
                <th className={`px-8 py-5 text-[10px] uppercase font-black text-center ${isDarkMode ? 'opacity-40' : 'text-gray-400'}`}>CA (Client)</th>
                <th className={`px-8 py-5 text-[10px] uppercase font-black text-right ${isDarkMode ? 'opacity-40' : 'text-gray-400'}`}>Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/[0.02]' : 'divide-gray-100'}`}>
              {activeRestos.map((resto) => (
                <tr key={resto.id} className={`group transition-colors ${isDarkMode ? 'hover:bg-white/[0.01]' : 'hover:bg-gray-50'}`}>
                  <td className="px-8 py-6 text-left">
                    <p className={`font-black text-sm uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{resto.name || "N/A"}</p>
                    <p className={`text-[10px] ${isDarkMode ? 'opacity-40' : 'text-gray-500'}`}>{resto.location || "Non défini"}</p>
                  </td>
                  <td className="px-8 py-6 text-left">
                    <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{resto.owner_email}</p>
                    <span className="text-[9px] font-black text-green-500 uppercase flex items-center gap-1"><CheckCircle2 size={10} /> Actif</span>
                  </td>
                  <td className="px-8 py-6 text-left">
                    <p className={`text-[10px] font-bold ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
                      Créé : {formatDateTime(resto.created_at) || 'N/A'}
                    </p>
                    <p className={`text-[10px] font-bold ${isDarkMode ? 'opacity-40' : 'text-gray-400'}`}>
                      Approuvé : {formatDateTime(resto.approved_at) || '—'}
                    </p>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <p className="font-black text-sm text-[#00D9FF]">{resto.total_sales.toLocaleString()} F</p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-3">
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
                    </div>
                  </td>
                </tr>
              ))}
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
      <p className={`text-2xl font-black italic tracking-tighter ${valueColor}`}>{value}</p>
    </div>
  );
}