"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Receipt, UtensilsCrossed, Users, Settings, LogOut,
  Wallet, Grid, Flame, TrendingUp, Menu as MenuIcon, X, Sun, Moon,
  Package, FileText, ShoppingBag, History, Calendar as CalendarIcon,
  Banknote, Smartphone, CreditCard, ShieldCheck, Loader2, BarChart, ArrowDownCircle,
} from "lucide-react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, CartesianGrid, Tooltip,
} from "recharts";
import { supabase } from '@/lib/supabase';
import { getDashTokens, card, pill, btnGhost, iconBtn, chipBtn, eyebrow, bodyFont, headFont, radius, radiusSm } from '@/lib/dashTheme';

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
  const T = getDashTokens(isDarkMode);
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

  const menuGroups = [
    {
      label: "Opérations",
      items: [
        { id: "overview", label: "Vue d'ensemble", icon: <TrendingUp size={18} />, roles: ["owner", "cashier"] },
        { id: "orders", label: "Commandes", icon: <ShoppingBag size={18} />, roles: ["owner", "cashier"] },
        { id: "menu", label: "Menu & Plats", icon: <UtensilsCrossed size={18} />, roles: ["owner", "cashier"] },
        { id: "tables", label: "Plan de Salle", icon: <Grid size={18} />, roles: ["owner", "cashier"] },
        { id: "cashier", label: "Caisse", icon: <Wallet size={18} />, roles: ["owner", "cashier"] },
      ],
    },
    {
      label: "Gestion",
      items: [
        { id: "expenses", label: "Dépenses", icon: <FileText size={18} />, roles: ["owner", "cashier"] },
        { id: "stock", label: "Stocks", icon: <Package size={18} />, roles: ["owner"] },
        { id: "reports", label: "Rapports", icon: <BarChart size={18} />, roles: ["owner"] },
        { id: "staff", label: "Staff", icon: <Users size={18} />, roles: ["owner"] },
        { id: "history", label: "Historique", icon: <History size={18} />, roles: ["owner"] },
      ],
    },
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

        const { data: realProfile } = await supabase.from('restaurants').select('*').eq('id', session.user.id).maybeSingle();
        if (!realProfile) {
          if (isMounted) router.replace('/auth/login');
          return;
        }

        // SÉCURITÉ : impersonate_resto_id n'est qu'un hint UI côté client — il
        // n'accorde rien par lui-même. Le SELECT ci-dessous n'aboutit que
        // grâce à la policy RLS "Master_Admin_Full_Access" (is_master_admin()),
        // vérifiée côté base à partir de realProfile.is_super_admin qui vient
        // lui-même d'une lecture RLS verrouillée sur auth.uid() = id. Un
        // utilisateur non-admin qui poserait cette clé en localStorage
        // n'obtiendrait donc jamais targetProfile (0 ligne renvoyée par RLS).
        // Ne jamais faire confiance à impersonateId sans repasser par une
        // requête filtrée par RLS comme ici.
        const impersonateId = localStorage.getItem('impersonate_resto_id');
        let profileToUse = realProfile;

        if (impersonateId && realProfile.is_super_admin) {
          const { data: targetProfile } = await supabase.from('restaurants').select('*').eq('id', impersonateId).maybeSingle();
          if (targetProfile) profileToUse = targetProfile;
        }

        if (isMounted) {
          setUserProfile(profileToUse);
          setRestaurantName(profileToUse.name);
          setIsActive(profileToUse.is_active);
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
    localStorage.removeItem('impersonate_resto_id');
    await supabase.auth.signOut();
    router.refresh();
    router.push('/');
  }

  if (authLoading || !mounted) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" color={T.accent} size={40} />
      </div>
    );
  }

  if (!isActive && !userProfile?.is_super_admin) {
    return <AccountInactiveScreen T={T} restaurantName={restaurantName} handleLogout={handleLogout} />;
  }

  const renderContent = () => {
    const commonProps = {
      isDarkMode,
      setActiveTab,
      selectedDate: selectedDateISO,
      setSelectedDate: setSelectedDateISO,
      userProfile
    };

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
      default: return <div style={{ padding: 60, opacity: .3, fontStyle: 'italic' }}>Module bientôt disponible...</div>;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', overflowX: 'hidden', background: T.bg, color: T.ink, fontFamily: bodyFont }}>

      {mounted && localStorage.getItem('impersonate_resto_id') && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: T.warn, color: T.accentInk, padding: '8px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, boxShadow: T.shadow }}>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Mode support actif — vue sur {restaurantName}
          </span>
          <button
            onClick={() => { localStorage.removeItem('impersonate_resto_id'); window.location.reload(); }}
            style={{ background: '#fff', color: T.accentDark, padding: '5px 12px', borderRadius: 999, fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}
          >
            Quitter l&apos;aperçu
          </button>
        </div>
      )}

      {/* SIDEBAR */}
      <aside style={{
        position: isSidebarOpen ? 'fixed' : undefined,
        inset: isSidebarOpen ? 0 : undefined,
        zIndex: 200,
        width: 252, flex: 'none', background: T.surface, borderRight: `1px solid ${T.line}`,
        display: isSidebarOpen ? 'flex' : undefined, flexDirection: 'column', padding: '20px 14px', gap: 4,
        height: '100vh', position: 'sticky', top: 0,
      }}
        className="dash-sidebar"
        data-open={isSidebarOpen ? "true" : "false"}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 10px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: T.accent, flex: 'none' }} />
            <span style={{ fontFamily: headFont, fontWeight: 800, fontSize: 18 }}>Comptoir</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg-hidden" style={{ padding: 6, opacity: .5, background: 'none', border: 'none', cursor: 'pointer', color: T.ink }}>
            <X size={22} />
          </button>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {menuGroups.map((group) => {
            const items = group.items.filter(item => item.roles.includes(userProfile?.role));
            if (items.length === 0) return null;
            return (
              <React.Fragment key={group.label}>
                <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.faint, padding: '14px 12px 6px' }}>{group.label}</div>
                {items.map((item) => (
                  <NavItem key={item.id} T={T} icon={item.icon} label={item.label} active={activeTab === item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} />
                ))}
              </React.Fragment>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 12, borderTop: `1px solid ${T.line}` }}>
          <NavItem T={T} icon={<Settings size={18} />} label="Paramètres" active={activeTab === "settings"} onClick={() => { setActiveTab("settings"); setIsSidebarOpen(false); }} />

          {userProfile?.is_super_admin && (
            <Link
              href="/admin/master"
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: radiusSm, fontWeight: 700, fontSize: 13.5, background: T.accentWash, color: T.accent, textDecoration: 'none' }}
            >
              <ShieldCheck size={18} /> God Mode
            </Link>
          )}

          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: radiusSm, fontWeight: 700, fontSize: 13.5, width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: T.bad }}>
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, width: '100%', maxHeight: '100vh', overflowY: 'auto' }}>
        <header style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16,
          padding: '18px 28px', borderBottom: `1px solid ${T.line}`, background: T.bg, position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => setIsSidebarOpen(true)} className="lg-hidden-flex" style={iconBtn(T)}>
              <MenuIcon size={20} />
            </button>
            <div>
              <h2 style={{ fontFamily: headFont, fontSize: 20, fontWeight: 800, margin: 0 }}>Bonjour, {restaurantName}</h2>
              <p style={{ color: T.faint, fontSize: 12, fontWeight: 600, margin: '2px 0 0' }}>{userProfile?.role === 'owner' ? 'Administrateur' : 'Caissier'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div onClick={() => dateInputRef.current?.showPicker()} style={{ ...chipBtn(T), position: 'relative' }}>
              <CalendarIcon size={16} color={T.accent} />
              <span style={{ fontWeight: 700, color: T.ink }}>{currentDateDisplay}</span>
              <input type="date" ref={dateInputRef} value={selectedDateISO} onChange={(e) => setSelectedDateISO(e.target.value)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
            </div>
            <button onClick={toggleTheme} style={iconBtn(T)}>
              {isDarkMode ? <Sun size={18} color="#facc15" /> : <Moon size={18} color={T.accentDark} />}
            </button>
          </div>
        </header>

        <div style={{ padding: '28px', maxWidth: 1400 }}>
          {renderContent()}
        </div>
      </main>

      <a
        href={`https://wa.me/2250757471552?text=${encodeURIComponent(
          `Bonjour Comptoir, je suis ${restaurantName}. J'ai besoin d'assistance sur ma console de gestion.`
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999, background: '#25D366', color: '#fff',
          width: 56, height: 56, borderRadius: '50%', boxShadow: T.shadow,
          display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
        }}
        aria-label="Contacter le support WhatsApp"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.067 2.877 1.215 3.076.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

      <style jsx global>{`
        @media (min-width: 1024px) {
          .dash-sidebar { position: sticky !important; inset: auto !important; }
          .lg-hidden { display: none !important; }
          .lg-hidden-flex { display: none !important; }
        }
        @media (max-width: 1023px) {
          .dash-sidebar[data-open="false"] { display: none !important; }
        }
      `}</style>
    </div>
  );
}


// --- VUE D'ENSEMBLE ---

function OverviewTabContent({ isDarkMode, selectedDate, userProfile }) {
  const T = getDashTokens(isDarkMode);
  const [period, setPeriod] = useState("day");
  const [realStats, setRealStats] = useState({
    dayTotal: 0,
    dayExpenses: 0,
    netProfit: 0,
    cuisineTotal: 0,
    barTotal: 0,
    byMethod: { "Espèces": 0, "Orange Money": 0, "Wave": 0, "MTN Money": 0, "Visa": 0 },
    chartData: [],
    popularItems: []
  });

  useEffect(() => {
    const fetchRealData = async () => {
      const sharedEmail = userProfile.owner_email;
      const date = new Date(selectedDate);
      let start, end;

      if (period === "day") {
        start = `${selectedDate}T00:00:00.000Z`;
        end = `${selectedDate}T23:59:59.999Z`;
      } else if (period === "week") {
        const first = date.getDate() - date.getDay();
        const last = first + 6;
        start = new Date(date.setDate(first)).toISOString().split('T')[0] + "T00:00:00.000Z";
        end = new Date(date.setDate(last)).toISOString().split('T')[0] + "T23:59:59.999Z";
      } else if (period === "month") {
        start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
        end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();
      } else if (period === "year") {
        start = new Date(date.getFullYear(), 0, 1).toISOString();
        end = new Date(date.getFullYear(), 11, 31, 23, 59, 59).toISOString();
      }

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

        let cuisine = 0;
        let bar = 0;

        transData.forEach(t => {
          if (t.items) {
            t.items.forEach(item => {
              const itemTotal = Number(item.price) * (item.quantity || 1);
              if (item.category === "Plats" || item.category === "Accompagnements") {
                cuisine += itemTotal;
              } else {
                bar += itemTotal;
              }
            });
          }
        });

        const methods = transData.reduce((acc, curr) => {
          const m = curr.payment_method || "Espèces";
          acc[m] = (acc[m] || 0) + Number(curr.amount);
          return acc;
        }, { "Espèces": 0, "Orange Money": 0, "Wave": 0, "MTN Money": 0, "Visa": 0 });

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

        let chartData = [];
        if (period === "day") {
          chartData = [...Array(24)].map((_, h) => ({
            label: `${h}h`,
            amount: transData.filter(t => new Date(t.created_at).getHours() === h).reduce((s, t) => s + Number(t.amount), 0)
          }));
        } else {
          const grouped = transData.reduce((acc, t) => {
            const d = new Date(t.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            acc[d] = (acc[d] || 0) + Number(t.amount);
            return acc;
          }, {});
          chartData = Object.entries(grouped).map(([label, amount]) => ({ label, amount }));
        }

        setRealStats({
          dayTotal: total,
          dayExpenses: totalExp,
          netProfit: total - totalExp,
          cuisineTotal: cuisine,
          barTotal: bar,
          byMethod: methods,
          chartData: chartData,
          popularItems: sortedItems
        });
      }
    };
    fetchRealData();
  }, [selectedDate, userProfile, period]);

  const periods = [
    { id: "day", label: "Jour" },
    { id: "week", label: "Semaine" },
    { id: "month", label: "Mois" },
    { id: "year", label: "Année" },
  ];

  const methodConfig = [
    { key: "Espèces", label: "Espèces", icon: <Banknote size={16} />, bg: T.goodWash, fg: T.good },
    { key: "Orange Money", label: "Orange Money", icon: <Smartphone size={16} />, bg: "oklch(0.7 0.16 55 / .15)", fg: "oklch(0.55 0.16 55)" },
    { key: "Wave", label: "Wave", icon: <CreditCard size={16} />, bg: T.accentWash, fg: T.accent },
    { key: "MTN Money", label: "MTN Money", icon: <Smartphone size={16} />, bg: T.warnWash, fg: T.warn },
    { key: "Visa", label: "Visa / MC", icon: <CreditCard size={16} />, bg: "oklch(0.55 0.1 290 / .15)", fg: "oklch(0.5 0.12 290)" },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 20, textAlign: 'left' }}>
      {userProfile?.role === "owner" && (
        <div style={{ display: 'inline-flex', padding: 3, background: T.surface2, borderRadius: 999, gap: 2, width: 'fit-content' }}>
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              style={{
                padding: '8px 18px', borderRadius: 999, border: 'none', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                background: period === p.id ? T.accent : 'none', color: period === p.id ? T.accentInk : T.muted,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div style={card(T, { padding: 32 })}>
        <p style={eyebrow(T, { marginBottom: 10 })}>Recettes ({periods.find(p => p.id === period)?.label.toLowerCase()})</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
          <h2 className="num" style={{ fontFamily: headFont, fontSize: 42, fontWeight: 800, margin: 0 }}>
            {realStats.dayTotal.toLocaleString()} <span style={{ fontSize: 15, color: T.faint, fontWeight: 600 }}>F CFA</span>
          </h2>
          <div style={{ display: 'flex', gap: 28 }}>
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.faint, margin: '0 0 4px' }}>Dépenses</p>
              <p className="num" style={{ fontSize: 17, fontWeight: 800, color: T.bad, margin: 0 }}>-{realStats.dayExpenses.toLocaleString()} F</p>
            </div>
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.faint, margin: '0 0 4px' }}>Bénéfice net</p>
              <p className="num" style={{ fontSize: 17, fontWeight: 800, color: realStats.netProfit >= 0 ? T.good : T.bad, margin: 0 }}>
                {realStats.netProfit.toLocaleString()} F
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 14, marginTop: 26, paddingTop: 22, borderTop: `1px solid ${T.line}` }}>
          {methodConfig.map((m) => (
            <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', background: m.bg, color: m.fg }}>{m.icon}</div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: T.faint, margin: 0 }}>{m.label}</p>
                <p className="num" style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>{(realStats.byMethod[m.key] || 0).toLocaleString()} F</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div style={card(T, { padding: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, color: "oklch(0.55 0.16 55)" }}>
              <UtensilsCrossed size={18} />
              <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cuisine</span>
            </div>
            <h3 className="num" style={{ fontFamily: headFont, fontSize: 26, fontWeight: 800, margin: 0 }}>{realStats.cuisineTotal.toLocaleString()} <span style={{ fontSize: 13, color: T.faint, fontWeight: 600 }}>F</span></h3>
          </div>
          <div style={{ width: 42, height: 42, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: "oklch(0.7 0.16 55 / .12)", color: "oklch(0.55 0.16 55)" }}><UtensilsCrossed size={20} /></div>
        </div>
        <div style={card(T, { padding: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, color: T.accent }}>
              <Flame size={18} />
              <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bar</span>
            </div>
            <h3 className="num" style={{ fontFamily: headFont, fontSize: 26, fontWeight: 800, margin: 0 }}>{realStats.barTotal.toLocaleString()} <span style={{ fontSize: 13, color: T.faint, fontWeight: 600 }}>F</span></h3>
          </div>
          <div style={{ width: 42, height: 42, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.accentWash, color: T.accent }}><Flame size={20} /></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }} className="dash-grid-collapse">
        <div style={card(T, { padding: 24 })}>
          <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <TrendingUp size={18} color={T.accent} /> Analyse des ventes
          </h3>
          <div style={{ height: 220, marginTop: 14 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={realStats.chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.accent} stopOpacity={0.25} /><stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.line} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: T.faint, fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: radiusSm, border: `1px solid ${T.line}`, backgroundColor: T.surface, color: T.ink }} labelStyle={{ color: T.ink }} />
                <Area type="monotone" dataKey="amount" stroke={T.accent} strokeWidth={3} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={card(T, { padding: 24 })}>
          <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <Flame size={18} color="oklch(0.55 0.16 55)" /> Top plats
          </h3>
          <div style={{ marginTop: 14 }}>
            {realStats.popularItems.map((item, i) => (
              <PopularItem key={i} T={T} name={item.name} count={`${item.count} commandes`} trend={i === 0 ? "Bestseller" : ""} />
            ))}
            {realStats.popularItems.length === 0 && <p style={{ opacity: .35, fontStyle: 'italic', fontSize: 13 }}>Aucune donnée.</p>}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 900px) { .dash-grid-collapse { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

function PopularItem({ T, name, count, trend }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${T.line}` }}>
      <div>
        <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{name}</h4>
        <p style={{ fontSize: 11, color: T.faint, fontWeight: 600, margin: '2px 0 0' }}>{count}</p>
      </div>
      {trend && <span style={pill(T, "warn")}>{trend}</span>}
    </div>
  );
}

function NavItem({ T, icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: radiusSm,
        fontSize: 13.5, fontWeight: active ? 700 : 600, width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
        background: active ? T.accentWash : 'none', color: active ? T.accent : T.muted,
      }}
    >
      <span style={{ display: 'flex', opacity: active ? 1 : .8 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function AccountInactiveScreen({ T, restaurantName, handleLogout }) {
  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.ink, fontFamily: bodyFont, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, background: T.badWash, color: T.bad, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}><ShieldCheck size={34} /></div>
      <h2 style={{ fontFamily: headFont, fontSize: 26, fontWeight: 800, margin: '0 0 12px' }}>Compte inactif</h2>
      <p style={{ color: T.muted, maxWidth: 420, marginBottom: 28, fontSize: 14, lineHeight: 1.6 }}>Désolé <span style={{ color: T.accent, fontWeight: 700 }}>{restaurantName}</span>, votre accès est suspendu. Contactez l&apos;administration.</p>
      <button onClick={handleLogout} style={{ padding: '13px 32px', background: T.accent, color: T.accentInk, borderRadius: 999, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>Déconnexion</button>
    </div>
  );
}
