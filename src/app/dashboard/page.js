"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Receipt, UtensilsCrossed, Users, Settings, LogOut,
  Wallet, Plus, Grid, Flame, TrendingUp, Clock, CheckCircle2,
  Menu as MenuIcon, X, ChevronDown, Sun, Moon, Package, FileText,
  ShoppingBag, History, ArrowRight, Calendar as CalendarIcon, Settings2,
  Banknote, Smartphone, CreditCard, ShieldCheck, Loader2, BarChart, ArrowDownCircle
} from "lucide-react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { supabase } from '@/lib/supabase';

// --- IMPORTS DES ONGLETS ---
import MenuTabContent from './tabs/MenuTabContent';
import OrdersTabContent from './tabs/OrdersTabContent'; 
import TablesTabContent from './tabs/TablesTabContent'; 
import CashierTabContent from './tabs/CashierTabContent';
import StockTabContent from './tabs/StockTabContent';
import HistoryTabContent from './tabs/HistoryTabContent';
import ReportsTabContent from './tabs/ReportsTabContent';
import ExpensesTabContent from './tabs/ExpensesTabContent';
import StaffTabContent from './tabs/StaffTabContent';
import SettingsTabContent from './tabs/SettingsTabContent';

export default function AdminDashboard() {
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [authLoading, setAuthLoading] = useState(true); 
  const [userProfile, setUserProfile] = useState(null); 
  const [restaurantName, setRestaurantName] = useState("Chargement...");
  const [isActive, setIsActive] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDateISO, setSelectedDateISO] = useState(new Date().toISOString().split('T')[0]);
  const [currentDateDisplay, setCurrentDateDisplay] = useState("");
  const dateInputRef = useRef(null);
  const [cart, setCart] = useState([]);
  const [pendingOrder, setPendingOrder] = useState(null);

useEffect(() => {
  let isMounted = true;
  
  const checkAuth = async () => {
    const timeout = setTimeout(() => {
      if (isMounted && authLoading) {
        console.error("⏱ Timeout : La session met trop de temps à répondre.");
        setAuthLoading(false);
      }
    }, 5000);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        if (isMounted) router.replace('/auth/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) throw error;

      if (isMounted) {
        if (!profile) {
          console.warn("Profil introuvable");
          router.replace('/auth/login');
          return;
        }
        setUserProfile(profile);
        setRestaurantName(profile.name);
        setIsActive(profile.is_active);
        setAuthLoading(false);
        setMounted(true);
      }
    } catch (err) {
      console.error("Erreur Auth:", err.message);
      if (isMounted) router.replace('/auth/login');
    } finally {
      clearTimeout(timeout);
    }
  };

  checkAuth();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' && isMounted) router.replace('/auth/login');
  });

  return () => {
    isMounted = false;
    subscription.unsubscribe();
  };
}, [router]);
 

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/');
  }

  if (authLoading || !mounted) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-[#00D9FF] mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 italic">Lancement du Dashboard...</p>
      </div>
    );
  }

  if (!isActive && !userProfile?.is_super_admin) {
    return <AccountInactiveScreen restaurantName={restaurantName} handleLogout={handleLogout} />;
  }

  const renderContent = () => {
    const commonProps = { isDarkMode, setActiveTab, selectedDate: selectedDateISO };
    switch (activeTab) {
      case "overview": return <OverviewTabContent {...commonProps} />;
      case "orders": return <OrdersTabContent {...commonProps} setCart={setCart} setPendingOrder={setPendingOrder} />;
      case "menu": return <MenuTabContent isDarkMode={isDarkMode} cart={cart} setCart={setCart} pendingOrder={pendingOrder} setPendingOrder={setPendingOrder} setActiveTab={setActiveTab}/>;
      case "tables": return <TablesTabContent isDarkMode={isDarkMode} setActiveTab={setActiveTab} setPendingOrder={setPendingOrder} />;
      case "cashier": return <CashierTabContent isDarkMode={isDarkMode} setActiveTab={setActiveTab} selectedDate={selectedDateISO}/>;
      case "stock": return <StockTabContent isDarkMode={isDarkMode} selectedDate={selectedDateISO}/>;
      case "history": return <HistoryTabContent isDarkMode={isDarkMode} selectedDate={selectedDateISO} />;
      case "reports": return <ReportsTabContent isDarkMode={isDarkMode} selectedDate={selectedDateISO}/>;
      case "expenses": return <ExpensesTabContent {...commonProps} selectedDate={selectedDateISO}/>;
      case "staff": return <StaffTabContent isDarkMode={isDarkMode} />;
      case "settings": return <SettingsTabContent isDarkMode={isDarkMode} setGlobalRestoName={setRestaurantName} />;
      default: return <div className="p-20 opacity-20 italic">Module bientôt disponible...</div>;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 font-[family-name:var(--font-lexend)] flex overflow-x-hidden ${isDarkMode ? "bg-[#050505] text-white" : "bg-[#F9FAFB] text-[#1F2937]"}`}>
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-[200] w-72 border-r transition-all duration-300 lg:translate-x-0 lg:static lg:h-screen flex flex-col p-6 ${isDarkMode ? "bg-[#0a0a0a] border-white/5" : "bg-white border-gray-200 shadow-xl"} ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3 text-xl font-extrabold tracking-tighter text-[#00D9FF]">
            <LayoutDashboard size={28} /> <span>RestoPay Admin</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 opacity-50">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar text-left">
          <NavItem isDarkMode={isDarkMode} icon={<TrendingUp size={20} />} label="Vue d'ensemble" active={activeTab === "overview"} onClick={() => { setActiveTab("overview"); setIsSidebarOpen(false); }} />
          <NavItem isDarkMode={isDarkMode} icon={<ShoppingBag size={20} />} label="Commandes" active={activeTab === "orders"} onClick={() => { setActiveTab("orders"); setIsSidebarOpen(false); }} />
          <NavItem isDarkMode={isDarkMode} icon={<UtensilsCrossed size={20} />} label="Menu & Plats" active={activeTab === "menu"} onClick={() => { setActiveTab("menu"); setIsSidebarOpen(false); }} />
          <NavItem isDarkMode={isDarkMode} icon={<Grid size={20} />} label="Plan de Salle" active={activeTab === "tables"} onClick={() => { setActiveTab("tables"); setIsSidebarOpen(false); }} />
          <NavItem isDarkMode={isDarkMode} icon={<Wallet size={20} />} label="Caisse" active={activeTab === "cashier"} onClick={() => { setActiveTab("cashier"); setIsSidebarOpen(false); }} />
          <NavItem isDarkMode={isDarkMode} icon={<Package size={20} />} label="Stocks" active={activeTab === "stock"} onClick={() => { setActiveTab("stock"); setIsSidebarOpen(false); }} />
          <NavItem isDarkMode={isDarkMode} icon={<BarChart size={20} />} label="Rapports" active={activeTab === "reports"} onClick={() => { setActiveTab("reports"); setIsSidebarOpen(false); }} />
          <NavItem isDarkMode={isDarkMode} icon={<Users size={20} />} label="Staff" active={activeTab === "staff"} onClick={() => { setActiveTab("staff"); setIsSidebarOpen(false); }} />
          <NavItem isDarkMode={isDarkMode} icon={<History size={20} />} label="Historique" active={activeTab === "history"} onClick={() => { setActiveTab("history"); setIsSidebarOpen(false); }} />
          <NavItem isDarkMode={isDarkMode} icon={<FileText size={20} />} label="Dépenses" active={activeTab === "expenses"} onClick={() => { setActiveTab("expenses"); setIsSidebarOpen(false); }} />
          <NavItem isDarkMode={isDarkMode} icon={<Settings size={20} />} label="Paramètres" active={activeTab === "settings"} onClick={() => { setActiveTab("settings"); setIsSidebarOpen(false); }} />
        </nav>

        {userProfile?.is_super_admin && (
          <Link href="/admin/master" className="mt-4 flex items-center gap-3 px-4 py-3 bg-[#00D9FF]/10 text-[#00D9FF] rounded-xl font-black border border-[#00D9FF]/20 no-underline group transition-all hover:bg-[#00D9FF]/20">
            <ShieldCheck size={20} />
            <span className="text-xs uppercase tracking-widest">Master Control</span>
          </Link>
        )}

        <button onClick={handleLogout} className="mt-2 flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-xl font-bold w-full text-left bg-transparent border-none cursor-pointer">
          <LogOut size={20} /> Déconnexion
        </button>
      </aside>

      <main className="flex-1 p-4 lg:p-8 w-full max-h-screen overflow-y-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6 text-left">
          <div className="flex items-center gap-4 text-left">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 rounded-xl bg-[#00D9FF]/10 text-[#00D9FF]">
              <MenuIcon size={24} />
            </button>
            <div className="text-left">
              <h2 className={`text-xl lg:text-3xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>Bonjour, {restaurantName}</h2>
              <p className="text-[#888] text-xs lg:text-base font-medium uppercase italic text-left">Manager @ RestoPay Cloud</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" ref={dateInputRef} value={selectedDateISO} onChange={(e) => {
              setSelectedDateISO(e.target.value);
              setCurrentDateDisplay(new Date(e.target.value).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }));
            }} className="absolute invisible w-0 h-0" />
            <div onClick={() => dateInputRef.current?.showPicker()} className={`flex items-center gap-3 px-4 py-2.5 border rounded-2xl cursor-pointer ${isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-700 shadow-sm"}`}>
              <CalendarIcon size={18} className="text-[#00D9FF]" />
              <span className="text-sm font-bold">{currentDateDisplay}</span>
              <ChevronDown size={14} className="opacity-50" />
            </div>
            <button onClick={toggleTheme} className={`p-2 lg:p-3 border rounded-full ${isDarkMode ? "bg-white/5 border-white/10 text-yellow-400" : "bg-white border-gray-200 text-indigo-600"}`}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
}

// --- SOUS-COMPOSANTS ---

function OverviewTabContent({ isDarkMode, setActiveTab, selectedDate }) {
  const [timeRange, setTimeRange] = useState("day"); 
  const [realStats, setRealStats] = useState({ 
    dayTotal: 0, 
    dayExpenses: 0, 
    netProfit: 0, 
    byMethod: { "Espèces": 0, "Orange Money": 0, "Wave": 0, "MTN Money": 0,"Carte Bancaire": 0}, 
    chartData: [], 
    popularItems: [] 
  });
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    const fetchRealData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let start, end;
      const now = new Date(selectedDate);

      if (timeRange === "day") {
        start = `${selectedDate}T00:00:00.000Z`;
        end = `${selectedDate}T23:59:59.999Z`;
      } else if (timeRange === "week") {
        const first = now.getDate() - now.getDay(); 
        const firstDay = new Date(new Date(selectedDate).setDate(first)).toISOString().split('T')[0];
        start = `${firstDay}T00:00:00.000Z`;
        end = `${selectedDate}T23:59:59.999Z`;
      } else {
        const firstDay = `${selectedDate.substring(0, 7)}-01`;
        start = `${firstDay}T00:00:00.000Z`;
        end = `${selectedDate}T23:59:59.999Z`;
      }
      
      const { data: transData } = await supabase.from('transactions').select('*').eq('restaurant_id', session.user.id).gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false });
      const { data: expData } = await supabase.from('expenses').select('amount').eq('restaurant_id', session.user.id).gte('created_at', start).lte('created_at', end);

      if (transData) {
        const total = transData.reduce((acc, curr) => acc + Number(curr.amount), 0);
        const totalExp = expData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0; 
        
        const methods = transData.reduce((acc, curr) => {
          const m = curr.payment_method || "Espèces";
          acc[m] = (acc[m] || 0) + Number(curr.amount);
          return acc;
        }, { "Espèces": 0, "Orange Money": 0, "Wave": 0 });

        const itemCounts = {};
        transData.forEach(t => { if (t.items) t.items.forEach(item => { itemCounts[item.name] = (itemCounts[item.name] || 0) + 1; }); });
        const sortedItems = Object.entries(itemCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 3);
        
        const hourlySales = [...Array(24)].map((_, h) => ({ day: `${h}h`, sales: transData.filter(t => new Date(t.created_at).getHours() === h).reduce((s, t) => s + Number(t.amount), 0) }));

        setRealStats({ 
          dayTotal: total, 
          dayExpenses: totalExp, 
          netProfit: total - totalExp, 
          byMethod: methods, 
          chartData: hourlySales, 
          popularItems: sortedItems 
        });
        setRecentOrders(transData.slice(0, 4));
      }
    };
    fetchRealData();
  }, [selectedDate, timeRange]);

  return (
    <div className="fade-in text-left">
      <div className="flex gap-2 mb-6">
        {["day", "week", "month"].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              timeRange === range 
                ? "bg-[#00D9FF] text-black shadow-lg shadow-cyan-500/20" 
                : isDarkMode ? "bg-white/5 text-white/40 hover:bg-white/10" : "bg-gray-100 text-gray-500"
            }`}
          >
            {range === "day" ? "Jour" : range === "week" ? "Semaine" : "Mois"}
          </button>
        ))}
      </div>

      <div onClick={() => setActiveTab("cashier")} className={`mb-8 p-8 rounded-[32px] border cursor-pointer relative overflow-hidden group ${isDarkMode ? "bg-[#0a0a0a] border-[#00D9FF]/20" : "bg-white border-cyan-100 shadow-xl"}`}>
        <Wallet size={120} className="absolute top-0 right-0 p-8 opacity-5 text-[#00D9FF]" />
        <div className="relative z-10 text-left">
          <div className="flex justify-between items-start mb-2 text-left">
            <div className="text-left">
              <p className="text-[#00D9FF] text-xs font-black uppercase tracking-[0.2em] mb-2 text-left">Chiffre d'Affaires</p>
              <h2 className="text-4xl lg:text-6xl font-black text-left">{realStats.dayTotal.toLocaleString()} <span className="text-xl opacity-50 font-bold">F</span></h2>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase opacity-40 mb-1">Bénéfice Net</p>
              <p className={`text-xl font-black ${realStats.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {realStats.netProfit.toLocaleString()} F
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-8 pt-6 border-t border-white/5">
            <PaymentMiniStat label="Espèces" value={realStats.byMethod["Espèces"]} icon={<Banknote size={16}/>} color="green" />
            <PaymentMiniStat label="Orange Money" value={realStats.byMethod["Orange Money"]} icon={<Smartphone size={16}/>} color="orange" />
            <PaymentMiniStat label="Wave" value={realStats.byMethod["Wave"]} icon={<CreditCard size={16}/>} color="blue" />
            <PaymentMiniStat label="MTN" value={realStats.byMethod["MTN Money"]} icon={<Smartphone size={16}/>} color="yellow" />
            <PaymentMiniStat label="Visa/MC" value={realStats.byMethod["Carte Bancaire"]} icon={<CreditCard size={16}/>} color="indigo" />
            <PaymentMiniStat label="Dépenses" value={realStats.dayExpenses} icon={<ArrowDownCircle size={16}/>} color="red" />
          </div>
        </div>
      </div>

      <div className={`mb-8 p-8 rounded-[32px] border ${isDarkMode ? "bg-[#0a0a0a] border-white/5" : "bg-white border-gray-100 shadow-sm"}`}>
        <h3 className="text-xl font-bold mb-8 uppercase tracking-tighter italic text-left">Volume horaire <TrendingUp size={20} className="inline ml-2 text-[#00D9FF]" /></h3>
        <div className="h-64 lg:h-80 w-full text-left">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={realStats.chartData}>
              <defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00D9FF" stopOpacity={0.3} /><stop offset="95%" stopColor="#00D9FF" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#888", fontSize: 10 }} />
              <YAxis hide />
              <Tooltip formatter={(v) => [`${v.toLocaleString()} F`, 'Ventes']} contentStyle={{ borderRadius: '15px', border: 'none', backgroundColor: isDarkMode ? '#111' : '#fff' }} />
              <Area type="monotone" dataKey="sales" stroke="#00D9FF" strokeWidth={4} fill="url(#colorSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 text-left">
        <div className={`xl:col-span-2 border rounded-[32px] p-8 ${isDarkMode ? "bg-[#0a0a0a] border-white/5" : "bg-white border-gray-100 shadow-sm"}`}>
          <h3 className="text-xl font-bold mb-6 uppercase tracking-tighter italic text-left">Historique express</h3>
          <div className="space-y-4">
            {recentOrders.length === 0 ? <p className="opacity-20 italic">Aucune transaction.</p> : 
              recentOrders.map((order, i) => (
                <OrderRow key={i} isDarkMode={isDarkMode} table={order.table_number || "Cpt"} dishes={order.payment_method} total={`${order.amount.toLocaleString()} F`} status="Validé" />
              ))
            }
          </div>
        </div>
        <div className={`border rounded-[32px] p-8 ${isDarkMode ? "bg-[#0a0a0a] border-white/5" : "bg-white border-gray-100 shadow-sm"}`}>
          <h3 className="text-xl font-bold mb-6 uppercase tracking-tighter italic text-left">Top Plats <Flame size={18} className="text-orange-500" /></h3>
          <div className="space-y-6 text-left">
            {realStats.popularItems.map((item, i) => (
              <PopularItem key={i} name={item.name} count={`${item.count} fois`} trend={i === 0 ? "Bestseller" : ""} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountInactiveScreen({ restaurantName, handleLogout }) {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8 p-10 rounded-[50px] border border-white/5 bg-[#0a0a0a] shadow-2xl">
        <Clock size={60} className="text-[#00D9FF] mx-auto animate-pulse" />
        <h2 className="text-3xl font-black italic text-white uppercase text-center">Activation en cours</h2>
        <p className="text-white/40 text-sm">Bienvenue, <span className="text-[#00D9FF]">{restaurantName}</span>. Votre console de gestion sera accessible dès validation de votre compte.</p>
        <button onClick={() => window.location.reload()} className="w-full py-4 rounded-2xl bg-white text-black font-black uppercase text-xs">Vérifier le statut</button>
        <button onClick={handleLogout} className="w-full py-4 text-red-500 font-bold uppercase text-xs bg-transparent border-none cursor-pointer">Se déconnecter</button>
      </div>
    </div>
  );
}

function PaymentMiniStat({ label, value, icon, color }) {
  const colors = { 
    green: "bg-green-500/10 text-green-500", 
    orange: "bg-orange-500/10 text-orange-500", 
    blue: "bg-blue-500/10 text-blue-500",
    yellow: "bg-yellow-500/10 text-yellow-600", 
    indigo: "bg-indigo-500/10 text-indigo-500", 
    red: "bg-red-500/10 text-red-500"
  };
  return (
    <div className="flex items-center gap-3 text-left">
      <div className={`p-2.5 rounded-xl ${colors[color]}`}>{icon}</div>
      <div className="text-left">
        <p className="text-[9px] uppercase font-black opacity-40 tracking-widest text-left">{label}</p>
        <p className="text-sm font-black text-left">{value?.toLocaleString()} F</p>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, isDarkMode }) {
  return (
    <button 
      onClick={onClick} 
      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm border-none cursor-pointer group
        ${active 
          ? "bg-[#00D9FF] text-black shadow-[0_0_20px_rgba(0,217,255,0.4)]" 
          : isDarkMode 
            ? "bg-transparent text-gray-100 hover:bg-white/10 hover:text-white" 
            : "bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900" 
        }`}
    >
      <span className={`transition-colors ${active ? "text-black" : "text-[#00D9FF] group-hover:scale-110"}`}>
        {icon}
      </span>
      <span className="tracking-tight">{label}</span>
    </button>
  );
}

function OrderRow({ table, dishes, total, status, isDarkMode }) {
  return (
    <div className={`flex items-center justify-between p-4 border rounded-2xl ${isDarkMode ? "bg-white/[0.02] border-white/5" : "bg-gray-50 border-gray-100 shadow-sm"}`}>
      <div className="flex items-center gap-4 text-left">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold bg-[#00D9FF]/10 text-[#00D9FF]">{table}</div>
        <div className="text-left"><h4 className="font-bold text-sm uppercase">{dishes}</h4><p className="text-[10px] opacity-40">{total}</p></div>
      </div>
      <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase bg-[#00D9FF]/10 text-[#00D9FF]">{status}</span>
    </div>
  );
}

function PopularItem({ name, count, trend }) {
  return (
    <div className="flex justify-between items-center text-left">
      <div className="text-left"><h4 className="font-bold text-sm uppercase">{name}</h4><p className="text-xs opacity-50">{count}</p></div>
      <span className="text-[10px] font-black text-green-500 uppercase italic">{trend}</span>
    </div>
  );
}