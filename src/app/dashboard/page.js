"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Receipt, UtensilsCrossed, Users, Settings, LogOut,
  Wallet, Plus, Grid, Flame, TrendingUp, Clock, CheckCircle2,
  Menu as MenuIcon, X, ChevronDown, Sun, Moon, Package, FileText,
  ShoppingBag, History, ArrowRight, Calendar as CalendarIcon, Settings2,
  Banknote, Smartphone, CreditCard, ShieldCheck, Loader2, BarChart, ArrowDownCircle, UserPlus
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

  const menuConfig = [
    { id: "overview", label: "Vue d'ensemble", icon: <TrendingUp size={20} />, roles: ["owner", "cashier"] },
    { id: "orders", label: "Commandes", icon: <ShoppingBag size={20} />, roles: ["owner", "cashier"] },
    { id: "menu", label: "Menu & Plats", icon: <UtensilsCrossed size={20} />, roles: ["owner", "cashier"] },
    { id: "tables", label: "Plan de Salle", icon: <Grid size={20} />, roles: ["owner", "cashier"] },
    { id: "cashier", label: "Caisse", icon: <Wallet size={20} />, roles: ["owner", "cashier"] },
    { id: "expenses", label: "Dépenses", icon: <FileText size={20} />, roles: ["owner", "cashier"] },
    { id: "stock", label: "Stocks", icon: <Package size={20} />, roles: ["owner"] },
    { id: "reports", label: "Rapports", icon: <BarChart size={20} />, roles: ["owner"] },
    { id: "staff", label: "Staff", icon: <Users size={20} />, roles: ["owner"] },
    { id: "history", label: "Historique", icon: <History size={20} />, roles: ["owner"] },
    { id: "settings", label: "Paramètres", icon: <Settings size={20} />, roles: ["owner"] },
  ];

  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (isMounted) router.replace('/auth/login');
          return;
        }
        const { data: profile, error } = await supabase.from('restaurants').select('*').eq('id', session.user.id).maybeSingle();
        if (error) throw error;
        if (isMounted) {
          if (!profile) { router.replace('/auth/login'); return; }
          setUserProfile(profile);
          setRestaurantName(profile.name);
          setIsActive(profile.is_active);
          setAuthLoading(false);
          setMounted(true);
        }
      } catch (err) { if (isMounted) router.replace('/auth/login'); }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    setCurrentDateDisplay(new Date(selectedDateISO).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }));
  }, [selectedDateISO]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/');
  }

  if (authLoading || !mounted) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-[#00D9FF] mb-4" size={40} />
      </div>
    );
  }

  if (!isActive && !userProfile?.is_super_admin) {
    return <AccountInactiveScreen restaurantName={restaurantName} handleLogout={handleLogout} />;
  }

  const renderContent = () => {
    const commonProps = { isDarkMode, setActiveTab, selectedDate: selectedDateISO, userProfile };
    
    switch (activeTab) {
      case "overview": return <OverviewTabContent {...commonProps} />;
      case "orders": return <OrdersTabContent {...commonProps} setCart={setCart} setPendingOrder={setPendingOrder} />;
      case "menu": return <MenuTabContent {...commonProps} cart={cart} setCart={setCart} pendingOrder={pendingOrder} setPendingOrder={setPendingOrder} />;
      case "tables": return <TablesTabContent {...commonProps} setPendingOrder={setPendingOrder} />;
      case "cashier": return <CashierTabContent {...commonProps} />;
      case "stock": return <StockTabContent {...commonProps} />;
      case "history": return <HistoryTabContent {...commonProps} />;
      case "reports": return <ReportsTabContent {...commonProps} />;
      case "expenses": return <ExpensesTabContent {...commonProps} />;
      case "staff": return <StaffTabContent {...commonProps} />;
      case "settings": return <SettingsTabContent {...commonProps} setGlobalRestoName={setRestaurantName} />;
      default: return <div className="p-20 opacity-20 italic">Module bientôt disponible...</div>;
    }
  };

  return (
    <div className={`min-h-screen flex overflow-x-hidden ${isDarkMode ? "bg-[#050505] text-white" : "bg-[#F9FAFB] text-[#1F2937]"}`}>
      
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-[200] w-72 transition-all lg:static lg:h-screen flex flex-col p-6 ${isDarkMode ? "bg-[#0a0a0a]" : "bg-white shadow-2xl"} ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3 text-xl font-extrabold tracking-tighter text-[#00D9FF]">
            <LayoutDashboard size={28} /> <span>RestoPay</span>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
          {menuConfig.filter(item => item.roles.includes(userProfile?.role)).map((item) => (
            <NavItem key={item.id} isDarkMode={isDarkMode} icon={item.icon} label={item.label} active={activeTab === item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} />
          ))}
        </nav>

        {/* --- BOUTON SUPER ADMIN --- */}
        {userProfile?.is_super_admin && (
          <Link 
            href="/admin/master" 
            className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest mb-2 transition-all no-underline
              ${isDarkMode ? "bg-white/5 text-[#00D9FF] hover:bg-[#00D9FF] hover:text-black" : "bg-gray-100 text-[#00D9FF] hover:bg-cyan-50"}`}
          >
            <ShieldCheck size={20} /> God Mode
          </Link>
        )}

        <button onClick={handleLogout} className={`mt-2 flex items-center gap-3 px-4 py-3 rounded-xl font-bold w-full text-left bg-transparent border-none cursor-pointer transition-all ${isDarkMode ? "text-red-400 hover:bg-red-400/10" : "text-red-600 hover:bg-red-50"}`}>
          <LogOut size={20} /> Déconnexion
        </button>
      </aside>

      <main className="flex-1 p-4 lg:p-8 w-full max-h-screen overflow-y-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6 text-left">
          <div className="text-left">
            <h2 className={`text-xl lg:text-3xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>Bonjour, {restaurantName}</h2>
            <p className="text-[#888] text-xs font-medium uppercase italic tracking-widest">{userProfile?.role === 'owner' ? 'Administrateur' : 'Caissier'}</p>
          </div>
          <div className="flex items-center gap-2">
            <div onClick={() => dateInputRef.current?.showPicker()} className={`flex items-center gap-3 px-5 py-3 rounded-2xl cursor-pointer ${isDarkMode ? "bg-white/5 text-white" : "bg-white text-gray-700 shadow-md"}`}>
              <CalendarIcon size={18} className="text-[#00D9FF]" />
              <span className="text-sm font-bold">{currentDateDisplay}</span>
              <input type="date" ref={dateInputRef} value={selectedDateISO} onChange={(e) => setSelectedDateISO(e.target.value)} className="absolute invisible w-0 h-0" />
            </div>
            <button onClick={toggleTheme} className="p-3 rounded-full bg-white/5 border-none cursor-pointer">
              {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
            </button>
          </div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
}

// --- VUE D'ENSEMBLE ---

function OverviewTabContent({ isDarkMode, setActiveTab, selectedDate, userProfile }) {
  const [realStats, setRealStats] = useState({ 
    dayTotal: 0, 
    dayExpenses: 0, 
    netProfit: 0, 
    byMethod: { "Espèces": 0, "Orange Money": 0, "Wave": 0, "MTN Money": 0, "Carte Bancaire": 0 }, 
    chartData: [], 
    popularItems: [] 
  });
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    const fetchRealData = async () => {
      const sharedEmail = userProfile.owner_email;
      const start = `${selectedDate}T00:00:00.000Z`;
      const end = `${selectedDate}T23:59:59.999Z`;

      const { data: transData } = await supabase.from('transactions')
        .select('*')
        .eq('owner_email', sharedEmail)
        .gte('created_at', start).lte('created_at', end)
        .order('created_at', { ascending: false });

      const { data: expData } = await supabase.from('expenses')
        .select('amount')
        .eq('owner_email', sharedEmail)
        .gte('created_at', start).lte('created_at', end);

      if (transData) {
        const total = transData.reduce((acc, curr) => acc + Number(curr.amount), 0);
        const totalExp = expData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0; 
        
        const methods = transData.reduce((acc, curr) => {
          const m = curr.payment_method || "Espèces";
          acc[m] = (acc[m] || 0) + Number(curr.amount);
          return acc;
        }, { "Espèces": 0, "Orange Money": 0, "Wave": 0, "MTN Money": 0, "Carte Bancaire": 0 });

        const itemCounts = {};
        transData.forEach(t => { 
          if (t.items) t.items.forEach(item => { 
            itemCounts[item.name] = (itemCounts[item.name] || 0) + 1; 
          }); 
        });
        const sortedItems = Object.entries(itemCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
        
        const hourlySales = [...Array(24)].map((_, h) => ({ 
            hour: `${h}h`, 
            amount: transData.filter(t => new Date(t.created_at).getHours() === h).reduce((s, t) => s + Number(t.amount), 0) 
        }));

        setRealStats({ 
          dayTotal: total, 
          dayExpenses: totalExp, 
          netProfit: total - totalExp, 
          byMethod: methods, 
          chartData: hourlySales, 
          popularItems: sortedItems 
        });
        setRecentOrders(transData.slice(0, 5));
      }
    };
    fetchRealData();
  }, [selectedDate, userProfile]);

  return (
    <div className="fade-in space-y-8 pb-10">
      <div className={`p-10 rounded-[40px] relative overflow-hidden ${isDarkMode ? "bg-[#0a0a0a]" : "bg-white shadow-2xl"}`}>
        <div className="relative z-10">
          <p className="text-[#00D9FF] text-xs font-black uppercase tracking-[0.3em] mb-4 text-left">Ventes du jour</p>
          <div className="flex justify-between items-end">
            <h2 className="text-5xl lg:text-7xl font-black text-left">{realStats.dayTotal.toLocaleString()} <span className="text-2xl opacity-30 italic">F</span></h2>
            <div className="flex gap-8 text-right hidden md:flex">
                <div className="text-right">
                  <p className="text-[10px] uppercase opacity-40 font-black mb-1">Total Dépenses</p>
                  <p className="text-2xl font-black text-red-500">-{realStats.dayExpenses.toLocaleString()} F</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase opacity-40 font-black mb-1">Bénéfice Net</p>
                  <p className={`text-2xl font-black ${realStats.netProfit >= 0 ? 'text-[#00D9FF]' : 'text-red-500'}`}>{realStats.netProfit.toLocaleString()} F</p>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-10 pt-8 border-t border-white/5">
            <PaymentMiniStat label="Espèces" value={realStats.byMethod["Espèces"]} icon={<Banknote size={16}/>} color="green" />
            <PaymentMiniStat label="Orange" value={realStats.byMethod["Orange Money"]} icon={<Smartphone size={16}/>} color="orange" />
            <PaymentMiniStat label="Wave" value={realStats.byMethod["Wave"]} icon={<CreditCard size={16}/>} color="blue" />
            <PaymentMiniStat label="MTN" value={realStats.byMethod["MTN Money"]} icon={<Smartphone size={16}/>} color="yellow" />
            <PaymentMiniStat label="Visa/MC" value={realStats.byMethod["Carte Bancaire"]} icon={<CreditCard size={16}/>} color="indigo" />
            <PaymentMiniStat label="Dépenses" value={realStats.dayExpenses} icon={<ArrowDownCircle size={16}/>} color="red" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className={`xl:col-span-2 p-8 rounded-[40px] ${isDarkMode ? "bg-[#0a0a0a]" : "bg-white shadow-xl"}`}>
          <h3 className="text-xl font-bold mb-8 italic flex items-center gap-3">
            <TrendingUp size={20} className="text-[#00D9FF]" /> Performance Horaire
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={realStats.chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D9FF" stopOpacity={0.3} /><stop offset="95%" stopColor="#00D9FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: "#555", fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', backgroundColor: '#000', color: '#fff' }} />
                <Area type="monotone" dataKey="amount" stroke="#00D9FF" strokeWidth={4} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`p-8 rounded-[40px] ${isDarkMode ? "bg-[#0a0a0a]" : "bg-white shadow-xl"}`}>
          <h3 className="text-xl font-bold mb-8 italic flex items-center gap-3 uppercase tracking-tighter">
            <Flame size={20} className="text-orange-500" /> Top Plats
          </h3>
          <div className="space-y-6">
            {realStats.popularItems.map((item, i) => (
              <PopularItem key={i} name={item.name} count={`${item.count} commandes`} trend={i === 0 ? "Bestseller" : ""} />
            ))}
            {realStats.popularItems.length === 0 && <p className="opacity-20 italic">Aucune donnée de plat.</p>}
          </div>
        </div>
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
        <p className="text-sm font-black text-left">{value?.toLocaleString() || 0} F</p>
      </div>
    </div>
  );
}

function PopularItem({ name, count, trend }) {
  return (
    <div className="flex justify-between items-center text-left">
      <div className="text-left">
        <h4 className="font-black text-sm uppercase tracking-tight">{name}</h4>
        <p className="text-[10px] opacity-40 uppercase">{count}</p>
      </div>
      {trend && <span className="text-[9px] font-black text-orange-500 uppercase italic bg-orange-500/10 px-2 py-0.5 rounded-md">{trend}</span>}
    </div>
  );
}

function NavItem({ icon, label, active, onClick, isDarkMode }) {
  return (
    <button 
      onClick={onClick} 
      className={`
        w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-sm border-none cursor-pointer group
        ${active 
          ? "bg-[#00D9FF] text-black shadow-lg shadow-cyan-500/20" 
          : isDarkMode 
            ? "text-gray-500 hover:bg-white/5 hover:text-white" 
            : "text-gray-500 hover:bg-gray-100 hover:text-[#00D9FF]"
        }
      `}
    >
      <span className={active ? "text-black" : "text-[#00D9FF]"}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function AccountInactiveScreen({ restaurantName, handleLogout }) {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-8">
        <ShieldCheck size={40} />
      </div>
      <h2 className="text-3xl font-black text-white mb-4 uppercase italic">Compte Inactif</h2>
      <p className="text-white/40 max-w-md mb-10 font-medium">
        Désolé <span className="text-[#00D9FF]">{restaurantName}</span>, votre accès à RestoPay est suspendu. Veuillez contacter l'administration pour régulariser votre abonnement.
      </p>
      <button onClick={handleLogout} className="px-10 py-4 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all cursor-pointer border-none">
        Déconnexion
      </button>
    </div>
  );
}