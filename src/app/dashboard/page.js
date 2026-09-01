"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Receipt, UtensilsCrossed, Users, Settings, LogOut,
  Wallet, Grid, Flame, TrendingUp, Menu as MenuIcon, X, Sun, Moon,
  Package, FileText, ShoppingBag, History, Calendar as CalendarIcon,
  Banknote, Smartphone, CreditCard, ShieldCheck, Loader2, BarChart, ArrowDownCircle,
  AlertTriangle, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, Lock,
  Mail, MessageCircle, ArrowLeft,
} from "lucide-react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, CartesianGrid, Tooltip,
} from "recharts";
import { supabase } from '@/lib/supabase';
import { getDashTokens, card, pill, btnGhost, iconBtn, chipBtn, eyebrow, bodyFont, headFont, radius, radiusSm } from '@/lib/dashTheme';
import BrandMark from '@/components/BrandMark';
import { getRestaurantTables, getTableStatus } from '@/lib/data/tables';
import { getActiveOrders } from '@/lib/data/orders';
import { getTransactionsForRange } from '@/lib/data/transactions';
import { getExpensesForRange } from '@/lib/data/expenses';
import { getInventory, getLowStockItems } from '@/lib/data/inventory';
import { getRestaurantProfile } from '@/lib/data/restaurants';
import { isDailyClosingDone } from '@/lib/data/closings';
import { getPeriodRange } from '@/lib/dateRange';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

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

        const realProfile = await getRestaurantProfile(session.user.id);
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
          const targetProfile = await getRestaurantProfile(impersonateId);
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
    return (
      <AccountInactiveScreen
        T={T}
        restaurantName={restaurantName}
        handleLogout={handleLogout}
        pending={!userProfile?.approved_at}
      />
    );
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
            <BrandMark size={30} color={T.accent} />
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
          borderBottom: `1px solid ${T.line}`, background: T.bg, position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16,
            padding: '18px 28px', maxWidth: 1400, margin: '0 auto',
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
              <button
                onClick={() => { setActiveTab("menu"); setIsSidebarOpen(false); }}
                style={{ ...chipBtn(T), border: 'none', cursor: 'pointer', background: T.accentWash, color: T.accent }}
              >
                <UtensilsCrossed size={16} />
                <span style={{ fontWeight: 700 }}>Menu</span>
              </button>
              <div onClick={() => dateInputRef.current?.showPicker()} style={{ ...chipBtn(T), position: 'relative' }}>
                <CalendarIcon size={16} color={T.accent} />
                <span style={{ fontWeight: 700, color: T.ink }}>{currentDateDisplay}</span>
                <input type="date" ref={dateInputRef} value={selectedDateISO} onChange={(e) => setSelectedDateISO(e.target.value)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
              </div>
              <button onClick={toggleTheme} style={iconBtn(T)}>
                {isDarkMode ? <Sun size={18} color="#facc15" /> : <Moon size={18} color={T.accentDark} />}
              </button>
            </div>
          </div>
        </header>

        <div style={{ padding: '28px', maxWidth: 1400, margin: '0 auto' }}>
          {renderContent()}
        </div>
      </main>

      <a
        href={`https://wa.me/237698710659?text=${encodeURIComponent(
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

// Calcule la plage de dates de la période équivalente immédiatement
// précédente (hier / semaine dernière / mois dernier / année dernière),
// pour la comparaison de tendance. Construit toujours sa propre Date à
// partir de la chaîne d'origine plutôt que de réutiliser une Date déjà
// mutée ailleurs par setDate().
const getPreviousRange = (period, selectedDate) => {
  const date = new Date(selectedDate);
  if (period === "day") {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    const iso = prev.toISOString().split('T')[0];
    return { start: `${iso}T00:00:00.000Z`, end: `${iso}T23:59:59.999Z` };
  }
  if (period === "week") {
    const first = date.getDate() - date.getDay();
    const prevStart = new Date(date);
    prevStart.setDate(first - 7);
    const prevEnd = new Date(date);
    prevEnd.setDate(first - 1);
    return {
      start: prevStart.toISOString().split('T')[0] + "T00:00:00.000Z",
      end: prevEnd.toISOString().split('T')[0] + "T23:59:59.999Z",
    };
  }
  if (period === "month") {
    const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    return {
      start: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1).toISOString(),
      end: new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0, 23, 59, 59).toISOString(),
    };
  }
  // year
  return {
    start: new Date(date.getFullYear() - 1, 0, 1).toISOString(),
    end: new Date(date.getFullYear() - 1, 11, 31, 23, 59, 59).toISOString(),
  };
};

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
    popularItems: [],
    avgTicket: 0,
    expensesByCategory: [],
    recentTransactions: [],
    peakHour: null,
    trendPct: null,
  });

  // Snapshot "en direct" (plan de salle / commandes actives / stock) —
  // indépendant de la période choisie, ce sont des états présents, pas
  // des données historiques : chargés une fois, puis tenus à jour par les
  // mêmes canaux temps réel que Tables/Commandes.
  const [liveStats, setLiveStats] = useState({
    tablesLibre: 0, tablesOccupee: 0, tablesAddition: 0,
    ordersEnCours: 0, ordersPret: 0, unpaidValue: 0,
    lowStockItems: [],
  });
  const [closingDone, setClosingDone] = useState(null); // null = en cours de vérification

  useEffect(() => {
    const fetchRealData = async () => {
      const sharedEmail = userProfile.owner_email;
      const { start, end } = getPeriodRange(period, selectedDate);
      const { start: prevStart, end: prevEnd } = getPreviousRange(period, selectedDate);

      let transData, expData, prevTransData;
      try {
        [transData, expData, prevTransData] = await Promise.all([
          getTransactionsForRange(sharedEmail, start, end),
          getExpensesForRange(sharedEmail, start, end),
          getTransactionsForRange(sharedEmail, prevStart, prevEnd),
        ]);
      } catch (err) {
        console.error("Erreur chargement des statistiques:", err.message);
        return;
      }

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
        let peakHour = null;
        if (period === "day") {
          chartData = [...Array(24)].map((_, h) => ({
            label: `${h}h`,
            amount: transData.filter(t => new Date(t.created_at).getHours() === h).reduce((s, t) => s + Number(t.amount), 0)
          }));
          const peak = chartData.reduce((best, cur) => (cur.amount > (best?.amount || 0) ? cur : best), null);
          if (peak && peak.amount > 0) peakHour = peak.label;
        } else {
          const grouped = transData.reduce((acc, t) => {
            const d = new Date(t.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            acc[d] = (acc[d] || 0) + Number(t.amount);
            return acc;
          }, {});
          chartData = Object.entries(grouped).map(([label, amount]) => ({ label, amount }));
        }

        const expensesByCategory = Object.entries(
          (expData || []).reduce((acc, e) => {
            const cat = e.category || "Autre";
            acc[cat] = (acc[cat] || 0) + Number(e.amount);
            return acc;
          }, {})
        )
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount);

        const prevTotal = prevTransData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
        const trendPct = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;

        setRealStats({
          dayTotal: total,
          dayExpenses: totalExp,
          netProfit: total - totalExp,
          cuisineTotal: cuisine,
          barTotal: bar,
          byMethod: methods,
          chartData: chartData,
          popularItems: sortedItems,
          avgTicket: transData.length > 0 ? total / transData.length : 0,
          expensesByCategory,
          recentTransactions: transData.slice(0, 5),
          peakHour,
          trendPct,
        });
      }
    };
    fetchRealData();
  }, [selectedDate, userProfile, period]);

  // Snapshot en direct : plan de salle, commandes actives, stock critique.
  // Ne dépend pas de la période/date affichée — c'est l'état "maintenant".
  const fetchLiveSnapshot = async () => {
    if (!userProfile) return;
    const sharedEmail = userProfile.owner_email;

    let tables, orders, inventory;
    try {
      [tables, orders, inventory] = await Promise.all([
        getRestaurantTables(sharedEmail),
        getActiveOrders(sharedEmail),
        getInventory(userProfile.id),
      ]);
    } catch (err) {
      // Hors-ligne : commandes actives / stock indisponibles (Phases 3 & 7).
      console.warn("Snapshot live indisponible", err?.message);
      return;
    }

    let tablesOccupee = 0, tablesAddition = 0;
    tables.forEach((table) => {
      const status = getTableStatus(table.table_name, orders);
      if (status === "Addition") tablesAddition += 1;
      else if (status === "Occupée") tablesOccupee += 1;
    });

    setLiveStats({
      tablesLibre: Math.max(0, tables.length - tablesOccupee - tablesAddition),
      tablesOccupee,
      tablesAddition,
      ordersEnCours: orders.filter((o) => o.status === "En cours").length,
      ordersPret: orders.filter((o) => o.status === "Prêt").length,
      unpaidValue: orders.reduce((acc, o) => acc + (o.total_amount || 0), 0),
      lowStockItems: getLowStockItems(inventory),
    });
  };

  useEffect(() => {
    if (userProfile) fetchLiveSnapshot();
  }, [userProfile]);

  useRealtimeRefresh(
    "overview_live_snapshot",
    ["orders", "restaurant_tables", "inventory"],
    () => fetchLiveSnapshot(),
    !!userProfile,
  );

  // Statut de clôture de caisse — seulement pertinent en vue "jour", pour
  // la date affichée.
  useEffect(() => {
    if (!userProfile || period !== "day") { setClosingDone(null); return; }
    const checkClosing = async () => {
      try {
        setClosingDone(await isDailyClosingDone(userProfile.owner_email, selectedDate));
      } catch (err) {
        console.error("Erreur vérification clôture:", err.message);
      }
    };
    checkClosing();
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <h2 className="num" style={{ fontFamily: headFont, fontSize: 42, fontWeight: 800, margin: 0 }}>
              {realStats.dayTotal.toLocaleString()} <span style={{ fontSize: 15, color: T.faint, fontWeight: 600 }}>F CFA</span>
            </h2>
            {realStats.trendPct !== null && (
              <span className="num" style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800,
                background: realStats.trendPct >= 0 ? T.goodWash : T.badWash, color: realStats.trendPct >= 0 ? T.good : T.bad,
              }}>
                {realStats.trendPct >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {Math.abs(realStats.trendPct).toFixed(0)}%
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.faint, margin: '0 0 4px' }}>Panier moyen</p>
              <p className="num" style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>{Math.round(realStats.avgTicket).toLocaleString()} F</p>
            </div>
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

      {/* SNAPSHOT EN DIRECT — plan de salle, commandes actives, stock, caisse */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div style={card(T, { padding: 20 })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color: T.muted }}>
            <Grid size={16} />
            <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Plan de salle</span>
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            <MiniStat T={T} label="Libres" value={liveStats.tablesLibre} color={T.good} />
            <MiniStat T={T} label="Occupées" value={liveStats.tablesOccupee} color={T.accent} />
            <MiniStat T={T} label="Addition" value={liveStats.tablesAddition} color={T.warn} />
          </div>
        </div>

        <div style={card(T, { padding: 20 })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color: T.muted }}>
            <ShoppingBag size={16} />
            <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Commandes actives</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: 18 }}>
              <MiniStat T={T} label="En cours" value={liveStats.ordersEnCours} color="oklch(0.6 0.16 55)" />
              <MiniStat T={T} label="Prêtes" value={liveStats.ordersPret} color={T.warn} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 9.5, fontWeight: 700, color: T.faint, margin: 0 }}>non encaissé</p>
              <p className="num" style={{ fontSize: 13, fontWeight: 800, color: T.accent, margin: 0 }}>{liveStats.unpaidValue.toLocaleString()} F</p>
            </div>
          </div>
        </div>

        <div style={card(T, { padding: 20, ...(liveStats.lowStockItems.length > 0 ? { border: `1px solid ${T.warn}55`, background: T.warnWash } : {}) })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: liveStats.lowStockItems.length > 0 ? T.warn : T.muted }}>
            {liveStats.lowStockItems.length > 0 ? <AlertTriangle size={16} /> : <Package size={16} />}
            <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stock</span>
          </div>
          {liveStats.lowStockItems.length === 0 ? (
            <p style={{ fontSize: 12.5, fontWeight: 700, color: T.good, margin: 0 }}>Tous les niveaux sont bons</p>
          ) : (
            <>
              <p className="num" style={{ fontSize: 17, fontWeight: 800, color: T.warn, margin: '0 0 6px' }}>{liveStats.lowStockItems.length} article{liveStats.lowStockItems.length > 1 ? 's' : ''} critique{liveStats.lowStockItems.length > 1 ? 's' : ''}</p>
              <p style={{ fontSize: 11.5, color: T.muted, margin: 0, lineHeight: 1.4 }}>
                {liveStats.lowStockItems.slice(0, 3).map(i => i.name).join(', ')}{liveStats.lowStockItems.length > 3 ? '…' : ''}
              </p>
            </>
          )}
        </div>

        {period === "day" && closingDone !== null && (
          <div style={card(T, { padding: 20 })}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: T.muted }}>
              <Lock size={16} />
              <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Caisse du jour</span>
            </div>
            <span style={{ ...pill(T, closingDone ? "good" : "warn"), display: 'inline-flex' }}>
              {closingDone ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
              {closingDone ? "Clôturée" : "Non clôturée"}
            </span>
          </div>
        )}
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
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <TrendingUp size={18} color={T.accent} /> Analyse des ventes
            </h3>
            {realStats.peakHour && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: T.surface2, color: T.muted, fontSize: 11, fontWeight: 700 }}>
                <Clock size={12} /> Pic à {realStats.peakHour}
              </span>
            )}
          </div>
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

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }} className="dash-grid-collapse">
        <div style={card(T, { padding: 24 })}>
          <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px' }}>
            <Receipt size={18} color={T.accent} /> Activité récente
          </h3>
          {realStats.recentTransactions.length === 0 ? (
            <p style={{ opacity: .35, fontStyle: 'italic', fontSize: 13, margin: 0 }}>Aucune vente sur cette période.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {realStats.recentTransactions.map((t, i) => (
                <div key={t.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i > 0 ? `1px solid ${T.line}` : 'none' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.good, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, flex: 1 }}>{t.table_number || 'Vente'}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: T.faint }}>{t.payment_method || 'Espèces'}</span>
                  <span className="num" style={{ fontSize: 12.5, fontWeight: 800, color: T.accent }}>{Number(t.amount).toLocaleString()} F</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: T.faint, minWidth: 40, textAlign: 'right' }}>
                    {new Date(t.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={card(T, { padding: 24 })}>
          <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px' }}>
            <ArrowDownCircle size={18} color={T.bad} /> Dépenses par catégorie
          </h3>
          {realStats.expensesByCategory.length === 0 ? (
            <p style={{ opacity: .35, fontStyle: 'italic', fontSize: 13, margin: 0 }}>Aucune dépense sur cette période.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {realStats.expensesByCategory.map((e) => {
                const pct = realStats.dayExpenses > 0 ? (e.amount / realStats.dayExpenses) * 100 : 0;
                return (
                  <div key={e.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>{e.category}</span>
                      <span className="num" style={{ fontSize: 12, fontWeight: 800 }}>{e.amount.toLocaleString()} F</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: T.surface2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: T.bad, borderRadius: 999 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 900px) { .dash-grid-collapse { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

function MiniStat({ T, label, value, color }) {
  return (
    <div>
      <p className="num" style={{ fontSize: 19, fontWeight: 800, color, margin: 0 }}>{value}</p>
      <p style={{ fontSize: 9.5, fontWeight: 700, color: T.faint, textTransform: 'uppercase', margin: '2px 0 0' }}>{label}</p>
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

function AccountInactiveScreen({ T, restaurantName, handleLogout, pending }) {
  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.ink, fontFamily: bodyFont, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, background: pending ? T.warnWash : T.badWash, color: pending ? T.warn : T.bad, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        {pending ? <Clock size={34} /> : <ShieldCheck size={34} />}
      </div>
      <h2 style={{ fontFamily: headFont, fontSize: 26, fontWeight: 800, margin: '0 0 12px' }}>
        {pending ? 'Compte en attente de validation' : 'Compte suspendu'}
      </h2>
      <p style={{ color: T.muted, maxWidth: 420, marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
        {pending ? (
          <>Bienvenue <span style={{ color: T.accent, fontWeight: 700 }}>{restaurantName}</span> ! Votre compte a bien été créé et attend la validation de l&apos;administration. Vous recevrez l&apos;accès dès qu&apos;il sera activé.</>
        ) : (
          <>Désolé <span style={{ color: T.accent, fontWeight: 700 }}>{restaurantName}</span>, votre accès est suspendu. Contactez-nous pour régulariser la situation et retrouver votre accès.</>
        )}
      </p>

      {/* Contact support */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
        <a
          href="https://wa.me/237698710659"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', background: '#25D366', color: '#fff', borderRadius: 999, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
        >
          <MessageCircle size={16} /> WhatsApp : +237 6 98 71 06 59
        </a>
        <a
          href="mailto:supportcomptoir@gmail.com"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', background: T.surface, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 999, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
        >
          <Mail size={16} /> supportcomptoir@gmail.com
        </a>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        <button onClick={handleLogout} style={{ padding: '13px 32px', background: T.accent, color: T.accentInk, borderRadius: 999, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>Déconnexion</button>
        <Link
          href="/"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', background: 'none', color: T.muted, border: `1px solid ${T.line}`, borderRadius: 999, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
        >
          <ArrowLeft size={16} /> Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
