"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Banknote, Smartphone, CreditCard,
  ArrowRight, TrendingUp,
  Loader2, Utensils, GlassWater, Flame, Beer,
  Lock, AlertTriangle, X,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { toUserMessage } from '@/lib/errors';
import { getDashTokens, card, btnSolid, inputStyle, pill, eyebrow, headFont, radius, radiusSm } from '@/lib/dashTheme';
import { getTransactionsForRange } from '@/lib/data/transactions';
import { getExpensesForRange } from '@/lib/data/expenses';
import { createDailyClosing } from '@/lib/data/closings';
import { getPeriodRange } from '@/lib/dateRange';
import { cachedStaffCount } from '@/lib/offline/pull';
import { useSyncedRefresh } from '@/hooks/useSyncedRefresh';

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export default function CashierTabContent({ isDarkMode, selectedDate, userProfile }) {
  const T = getDashTokens(isDarkMode);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("day"); // Nouvel état pour la période
  const [transactions, setTransactions] = useState([]);
  const [salesData, setSalesData] = useState({
    total: 0,
    byMethod: { "Espèces": 0, "Orange Money": 0, "Wave": 0, "MTN Money": 0, "Visa": 0 }
  });

  const [sectionData, setSectionData] = useState({
    repas: 0,
    cocktails: 0,
    jusNaturel: 0,
    barGlobal: 0
  });

  const [totalExpenses, setTotalExpenses] = useState(0);
  // Part réalisée hors-ligne (pas encore confirmée par le serveur).
  const [offlinePart, setOfflinePart] = useState({ sales: 0, expenses: 0 });
  const [closingData, setClosingData] = useState({ cashInHand: "", notes: "" });
  const [isClosing, setIsClosing] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [closingToast, setClosingToast] = useState(null);
  const closingToastTimeout = useRef(null);

  const showClosingToast = (toast, duration = 4000) => {
    setClosingToast(toast);
    clearTimeout(closingToastTimeout.current);
    closingToastTimeout.current = setTimeout(() => setClosingToast(null), duration);
  };

  useEffect(() => {
    if (userProfile) fetchDailyData();
  }, [selectedDate, userProfile, period]); // Ajout de period dans les dépendances

  useSyncedRefresh(() => fetchDailyData(), !!userProfile);

  const fetchDailyData = async () => {
    try {
      setLoading(true);
      const { start, end } = getPeriodRange(period, selectedDate);

      const [trans, exp] = await Promise.all([
        getTransactionsForRange(userProfile.owner_email, start, end),
        getExpensesForRange(userProfile.owner_email, start, end),
      ]);

      let repas = 0, cocktails = 0, jus = 0, bar = 0;

      trans?.forEach(t => {
        t.items?.forEach(item => {
          const cat = item.category;
          const price = Number(item.price) * (item.quantity || 1);

          if (cat === "Plats" || cat === "Accompagnements") {
            repas += price;
          } else if (cat === "Cocktails") {
            cocktails += price;
          } else if (cat === "Jus Naturel") {
            jus += price;
          } else if (["Bière", "Whisky", "Vin", "Jus Brasserie"].includes(cat)) {
            bar += price;
          }
        });
      });

      const totalSales = trans?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const methods = trans?.reduce((acc, curr) => {
        const m = curr.payment_method || "Espèces";
        acc[m] = (acc[m] || 0) + Number(curr.amount);
        return acc;
      }, { "Espèces": 0, "Orange Money": 0, "Wave": 0, "MTN Money": 0, "Visa": 0 });

      const totalExp = exp?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      // Part hors-ligne : encaissements / dépenses saisis sans réseau et pas
      // encore remontés (marqués _pending par le fold de l'outbox).
      const offlineSales = (trans || []).filter((t) => t._pending).reduce((s, t) => s + Number(t.amount), 0);
      const offlineExp = (exp || []).filter((e) => e._pending).reduce((s, e) => s + Number(e.amount), 0);

      // GRAPHIQUE : recettes vs dépenses, en buckets adaptés à la période —
      // par heure pour "jour", par jour pour "semaine"/"mois", par mois
      // pour "année" (sinon 365 points de jour illisibles sur la vue annuelle).
      let buckets = [];
      if (period === "day") {
        buckets = [...Array(24)].map((_, h) => ({
          label: `${h}h`,
          recettes: (trans || []).filter(t => new Date(t.created_at).getHours() === h).reduce((s, t) => s + Number(t.amount), 0),
          depenses: (exp || []).filter(e => new Date(e.created_at).getHours() === h).reduce((s, e) => s + Number(e.amount), 0),
        }));
      } else if (period === "year") {
        buckets = MONTH_LABELS.map((label, m) => ({
          label,
          recettes: (trans || []).filter(t => new Date(t.created_at).getMonth() === m).reduce((s, t) => s + Number(t.amount), 0),
          depenses: (exp || []).filter(e => new Date(e.created_at).getMonth() === m).reduce((s, e) => s + Number(e.amount), 0),
        }));
      } else {
        const dayKey = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        const recettesByDay = (trans || []).reduce((acc, t) => {
          const k = dayKey(t.created_at);
          acc[k] = (acc[k] || 0) + Number(t.amount);
          return acc;
        }, {});
        const depensesByDay = (exp || []).reduce((acc, e) => {
          const k = dayKey(e.created_at);
          acc[k] = (acc[k] || 0) + Number(e.amount);
          return acc;
        }, {});
        // trans/exp sont triés du plus récent au plus ancien -> on inverse
        // pour que le graphique se lise chronologiquement de gauche à droite.
        const days = [...new Set([...Object.keys(recettesByDay), ...Object.keys(depensesByDay)])].reverse();
        buckets = days.map((label) => ({ label, recettes: recettesByDay[label] || 0, depenses: depensesByDay[label] || 0 }));
      }

      setTransactions(trans || []);
      setSalesData({ total: totalSales, byMethod: methods });
      setSectionData({ repas, cocktails, jusNaturel: jus, barGlobal: bar });
      setTotalExpenses(totalExp);
      setOfflinePart({ sales: offlineSales, expenses: offlineExp });
      setChartData(buckets);
    } catch (err) {
      console.error("Erreur caisse:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const expectedBalance = salesData.total - totalExpenses;
  const difference = closingData.cashInHand ? Number(closingData.cashInHand) - expectedBalance : 0;

  const handleRegisterClosing = async () => {
    if (!closingData.cashInHand) {
      return showClosingToast({ type: "error", title: "Montant manquant", detail: "Saisissez le montant réel en caisse." }, 3000);
    }
    const realAmount = Number(closingData.cashInHand);
    if (!Number.isFinite(realAmount) || realAmount < 0) {
      return showClosingToast({ type: "error", title: "Montant invalide", detail: "Le montant réel doit être un nombre positif." }, 3000);
    }
    // Garde-fou multi-caisses : hors-ligne, si le restaurant a des comptes
    // caissier, une autre caisse a pu encaisser de son côté — le théorique
    // serait sous-évalué. On exige alors une reconnexion.
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    if (offline) {
      const staff = await cachedStaffCount(userProfile.owner_email);
      if (staff && staff > 0) {
        return showClosingToast({
          type: "error",
          title: "Reconnexion nécessaire",
          detail: "Des ventes d'autres caisses peuvent manquer. Reconnectez-vous pour clôturer.",
        }, 6000);
      }
    }

    setIsClosing(true);
    try {
      const { synced } = await createDailyClosing({
        restaurantId: userProfile.id,
        ownerEmail: userProfile.owner_email,
        date: selectedDate,
        theoreticalAmount: expectedBalance,
        realAmount,
        difference,
        notes: closingData.notes,
        closedBy: userProfile.name,
      });
      showClosingToast({
        type: "success",
        title: synced ? "Clôture enregistrée" : "Clôture en attente de synchro",
        detail: (synced ? "" : "Elle remontera au retour du réseau. ")
          + (difference === 0 ? "Aucun écart de caisse." : `Écart : ${difference > 0 ? "+" : ""}${difference.toLocaleString()} F`),
      });
      setClosingData({ cashInHand: "", notes: "" });
    } catch (err) {
      showClosingToast({ type: "error", title: "Clôture impossible", detail: toUserMessage(err, "Impossible d'enregistrer la clôture de caisse.") }, 5000);
    } finally { setIsClosing(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 256, opacity: .5 }}>
      <Loader2 className="animate-spin" color={T.accent} style={{ marginBottom: 8 }} />
      <p style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>Calcul du solde net...</p>
    </div>
  );

  const periods = [
    { id: "day", label: "Jour" },
    { id: "week", label: "Semaine" },
    { id: "month", label: "Mois" },
    { id: "year", label: "Année" },
  ];

  const methodColors = {
    "Espèces": { bg: T.goodWash, fg: T.good },
    "Orange Money": { bg: "oklch(0.7 0.16 55 / .15)", fg: "oklch(0.55 0.16 55)" },
    "Wave": { bg: T.accentWash, fg: T.accent },
    "MTN Money": { bg: T.warnWash, fg: T.warn },
    "Visa": { bg: "oklch(0.55 0.1 290 / .15)", fg: "oklch(0.5 0.12 290)" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 20, textAlign: "left" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 24, margin: 0 }}>Session de Caisse</h3>

        {userProfile?.role === "owner" && (
          <div style={{ display: "inline-flex", padding: 3, background: T.surface2, borderRadius: 999, gap: 2 }}>
            {periods.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                style={{
                  padding: "7px 16px", borderRadius: 999, border: "none", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                  background: period === p.id ? T.accent : "none", color: period === p.id ? T.accentInk : T.muted,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* --- GRAPHIQUE RECETTES VS DÉPENSES — navigable jour/semaine/mois/année --- */}
      <div style={card(T, { padding: 26 })}>
        <h4 style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, margin: "0 0 18px" }}>
          <TrendingUp size={18} color={T.accent} /> Évolution ({periods.find(p => p.id === period)?.label.toLowerCase()})
        </h4>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRecettes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.accent} stopOpacity={0.25} /><stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDepenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.bad} stopOpacity={0.2} /><stop offset="95%" stopColor={T.bad} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.line} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: T.faint, fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: radiusSm, border: `1px solid ${T.line}`, backgroundColor: T.surface, color: T.ink }} labelStyle={{ color: T.ink }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: T.muted }} />
              <Area type="monotone" dataKey="recettes" name="Recettes" stroke={T.accent} strokeWidth={2.5} fill="url(#colorRecettes)" />
              <Area type="monotone" dataKey="depenses" name="Dépenses" stroke={T.bad} strokeWidth={2.5} fill="url(#colorDepenses)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }} className="dash-grid-collapse">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* --- VENTILATION PAR CATÉGORIES --- */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="dash-grid-collapse-sm">
            <div style={card(T, { padding: 22 })}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ padding: 9, background: "oklch(0.7 0.16 55 / .12)", color: "oklch(0.55 0.16 55)", borderRadius: radiusSm }}><Utensils size={18} /></div>
                <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Section Repas</h4>
              </div>
              <p className="num" style={{ fontSize: 22, fontWeight: 800, color: "oklch(0.55 0.16 55)", margin: 0 }}>{sectionData.repas.toLocaleString()} F</p>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: T.faint, margin: "4px 0 0" }}>Plats & Accompagnements</p>
            </div>

            <div style={card(T, { padding: 22 })}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ padding: 9, background: T.accentWash, color: T.accent, borderRadius: radiusSm }}><GlassWater size={18} /></div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Section Boissons</h4>
                </div>
                <p className="num" style={{ fontSize: 20, fontWeight: 800, color: T.accent, margin: 0 }}>
                  {(sectionData.cocktails + sectionData.jusNaturel + sectionData.barGlobal).toLocaleString()} F
                </p>
              </div>
              <div style={{ height: 1, width: "100%", background: T.line, marginBottom: 14 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <MiniRow T={T} label="Cocktails" value={sectionData.cocktails} icon={<Flame size={12} color="#ec4899" />} />
                <MiniRow T={T} label="Jus Naturels" value={sectionData.jusNaturel} icon={<ArrowRight size={12} color={T.good} />} />
                <MiniRow T={T} label="Bar (Bière, Whisky, Vin...)" value={sectionData.barGlobal} icon={<Beer size={12} color={T.warn} />} />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="dash-grid-collapse-sm">
            <div style={card(T, { padding: 26 })}>
              <p style={eyebrow(T, { marginBottom: 8 })}>Total Recettes ({period})</p>
              <h2 className="num" style={{ fontFamily: headFont, fontSize: 30, fontWeight: 800, margin: 0 }}>{salesData.total.toLocaleString()} F</h2>
              {offlinePart.sales > 0 && (
                <p className="num" style={{ fontSize: 11, fontWeight: 700, color: T.warn, margin: "8px 0 0" }}>
                  dont {offlinePart.sales.toLocaleString()} F hors-ligne · confirmé {(salesData.total - offlinePart.sales).toLocaleString()} F
                </p>
              )}
            </div>
            <div style={card(T, { padding: 26 })}>
              <p style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: T.bad, margin: "0 0 8px" }}>Total Dépenses ({period})</p>
              <h2 className="num" style={{ fontFamily: headFont, fontSize: 30, fontWeight: 800, color: T.bad, margin: 0 }}>-{totalExpenses.toLocaleString()} F</h2>
              {offlinePart.expenses > 0 && (
                <p className="num" style={{ fontSize: 11, fontWeight: 700, color: T.warn, margin: "8px 0 0" }}>
                  dont {offlinePart.expenses.toLocaleString()} F hors-ligne
                </p>
              )}
            </div>
          </div>

          <div style={card(T, { padding: 26 })}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 16 }}>
              <MethodStat T={T} label="Espèces" value={salesData.byMethod["Espèces"]} icon={<Banknote size={16} />} colors={methodColors["Espèces"]} />
              <MethodStat T={T} label="Orange" value={salesData.byMethod["Orange Money"]} icon={<Smartphone size={16} />} colors={methodColors["Orange Money"]} />
              <MethodStat T={T} label="Wave" value={salesData.byMethod["Wave"]} icon={<CreditCard size={16} />} colors={methodColors["Wave"]} />
              <MethodStat T={T} label="MTN" value={salesData.byMethod["MTN Money"]} icon={<Smartphone size={16} />} colors={methodColors["MTN Money"]} />
              <MethodStat T={T} label="Visa" value={salesData.byMethod["Visa"]} icon={<CreditCard size={16} />} colors={methodColors["Visa"]} />
            </div>
          </div>

          <div style={card(T, { padding: 26 })}>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px" }}>Journal des flux</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" }}>
              {transactions.map((t, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: radiusSm, background: T.surface2 }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      {t.payment_method}
                      {t._pending && (
                        <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: t._failed ? T.bad : T.warn, background: t._failed ? T.badWash : T.warnWash, padding: "1px 6px", borderRadius: 999 }}>
                          {t._failed ? "échec synchro" : "hors-ligne"}
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: 10, color: T.faint, fontWeight: 600 }}>{new Date(t.created_at).toLocaleTimeString()}</span>
                  </div>
                  <span className="num" style={{ fontWeight: 800, fontSize: 13 }}>{Number(t.amount).toLocaleString()} F</span>
                </div>
              ))}
              {transactions.length === 0 && <p style={{ opacity: .4, fontStyle: "italic", padding: 14, fontSize: 13 }}>Aucun flux enregistré pour cette période.</p>}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={card(T, { padding: 28, background: T.accent, border: "none" })}>
            <p style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: T.accentInk, opacity: .75, margin: "0 0 8px" }}>Solde Attendu (Net)</p>
            <h2 className="num" style={{ fontFamily: headFont, fontSize: 30, fontWeight: 800, color: T.accentInk, margin: 0 }}>{expectedBalance.toLocaleString()} F</h2>
            {(offlinePart.sales > 0 || offlinePart.expenses > 0) && (
              <p style={{ fontSize: 10.5, fontWeight: 700, color: T.accentInk, opacity: .8, margin: "10px 0 0" }}>
                Inclut {(offlinePart.sales - offlinePart.expenses).toLocaleString()} F saisis hors-ligne, non encore confirmés.
              </p>
            )}
          </div>

          <div style={card(T, { padding: 24 })}>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 18px" }}>Vérification de Caisse</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: T.muted, margin: "0 0 6px" }}>Montant physique réel</p>
                <input
                  type="number"
                  value={closingData.cashInHand}
                  onChange={(e) => setClosingData({ ...closingData, cashInHand: e.target.value })}
                  style={{ ...inputStyle(T), padding: "14px 16px", fontSize: 18, fontWeight: 800 }}
                  placeholder="0"
                />
              </div>

              {closingData.cashInHand && (
                <div style={{ ...pill(T, difference === 0 ? "good" : "bad"), display: "block", padding: 16, borderRadius: radiusSm }}>
                  <p style={{ fontSize: 10, opacity: .7, margin: "0 0 4px", textTransform: "none", letterSpacing: 0 }}>Écart de caisse</p>
                  <p className="num" style={{ fontSize: 18, fontWeight: 800, margin: 0, textTransform: "none" }}>{difference.toLocaleString()} F</p>
                </div>
              )}

              <button onClick={handleRegisterClosing} disabled={isClosing} style={btnSolid(T, { width: "100%", padding: "14px 0", opacity: isClosing ? .6 : 1 })}>
                {isClosing ? "Traitement..." : "Valider la clôture"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TOAST : CLÔTURE DE CAISSE */}
      {closingToast && (
        <div
          role="status"
          aria-live="polite"
          className="dash-closing-toast"
          style={{
            position: "fixed", left: "50%", bottom: 28, zIndex: 1000,
            display: "flex", alignItems: "flex-start", gap: 14,
            width: "min(380px, calc(100vw - 32px))",
            padding: "16px 16px 16px 18px", borderRadius: radius,
            background: T.surface, border: `1px solid ${T.line}`, boxShadow: T.shadow,
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: radiusSm, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            background: closingToast.type === "success" ? T.goodWash : T.badWash,
            color: closingToast.type === "success" ? T.good : T.bad,
          }}>
            {closingToast.type === "success" ? <Lock size={19} /> : <AlertTriangle size={19} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 13.5, fontFamily: headFont }}>{closingToast.title}</p>
            <p className="num" style={{ margin: "2px 0 0", fontSize: 12, color: T.faint, fontWeight: 700 }}>{closingToast.detail}</p>
          </div>
          <button onClick={() => setClosingToast(null)} aria-label="Fermer" style={{ background: "none", border: "none", color: T.faint, cursor: "pointer", padding: 2, flexShrink: 0, display: "flex" }}>
            <X size={16} />
          </button>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 900px) {
          .dash-grid-collapse { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .dash-grid-collapse-sm { grid-template-columns: 1fr !important; }
        }
        @keyframes dash-toast-in {
          from { opacity: 0; transform: translate(-50%, 14px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .dash-closing-toast { animation: dash-toast-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @media (prefers-reduced-motion: reduce) {
          .dash-closing-toast { animation: none; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}

function MiniRow({ T, label, value, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: radiusSm, background: T.surface2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>{label}</span>
      </div>
      <span className="num" style={{ fontSize: 12, fontWeight: 800 }}>{value.toLocaleString()} F</span>
    </div>
  );
}

function MethodStat({ T, label, value, icon, colors }) {
  return (
    <div>
      <div style={{ width: 38, height: 38, borderRadius: radiusSm, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, background: colors.bg, color: colors.fg }}>{icon}</div>
      <p style={{ fontSize: 9.5, fontWeight: 700, color: T.faint, margin: "0 0 2px", textTransform: "uppercase" }}>{label}</p>
      <p className="num" style={{ fontSize: 12, fontWeight: 800, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value.toLocaleString()} F</p>
    </div>
  );
}
