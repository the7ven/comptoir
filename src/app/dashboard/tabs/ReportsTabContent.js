"use client";

import React, { useState, useEffect } from 'react';
import {
  BarChart3, PieChart, ArrowDownCircle, ArrowUpCircle,
  Banknote, Smartphone, Utensils, GlassWater, Loader2, TrendingUp, Calendar, Download,
} from 'lucide-react';
import {
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, Tooltip, Legend
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { getDashTokens, card, headFont, radiusSm } from '@/lib/dashTheme';

// Number.prototype.toLocaleString('fr-FR') sépare les milliers avec un espace
// insécable fin (U+202F) — absent de la police par défaut de jsPDF (Helvetica,
// encodage WinAnsi), ce qui l'affichait comme une barre oblique dans le PDF.
// On formate donc nous-mêmes avec un espace ASCII classique, universellement
// supporté.
const formatFcfa = (n) => Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export default function ReportsTabContent({ isDarkMode, selectedDate, userProfile }) {
  const T = getDashTokens(isDarkMode);
  const [period, setPeriod] = useState('journalier');
  const [loading, setLoading] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [data, setData] = useState({
    recettes: 0,
    achats: 0,
    cash: 0,
    virtuel: 0,
    cuisineRecette: 0,
    barRecette: 0,
    comparison: [],
    paymentDistribution: [],
    monthlyBreakdown: []
  });

  useEffect(() => {
    if (selectedDate) {
      if (selectedDate.endsWith('-01')) {
        setPeriod('mensuel');
      } else {
        setPeriod('journalier');
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    if (userProfile) {
      fetchReportData();
    }
  }, [period, selectedDate, userProfile]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const sharedEmail = userProfile.owner_email;
      let startStr, endStr;

      const calendarDate = new Date(selectedDate);

      if (period === 'journalier') {
        startStr = `${selectedDate}T00:00:00.000Z`;
        endStr = `${selectedDate}T23:59:59.999Z`;
      } else if (period === 'hebdomadaire') {
        const weekStart = new Date(calendarDate);
        weekStart.setDate(weekStart.getDate() - 7);
        startStr = weekStart.toISOString();
        endStr = `${selectedDate}T23:59:59.999Z`;
      } else if (period === 'mensuel') {
        startStr = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).toISOString();
        endStr = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
      } else if (period === 'annuel') {
        startStr = new Date(calendarDate.getFullYear(), 0, 1).toISOString();
        endStr = new Date(calendarDate.getFullYear(), 11, 31, 23, 59, 59).toISOString();
      }

      const [transRes, expRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('owner_email', sharedEmail).gte('created_at', startStr).lte('created_at', endStr),
        supabase.from('expenses').select('*').eq('owner_email', sharedEmail).gte('created_at', startStr).lte('created_at', endStr)
      ]);

      if (transRes.error) throw transRes.error;
      const transactions = transRes.data || [];
      const expenses = expRes.data || [];

      let cuisine = 0;
      let bar = 0;

      transactions.forEach(t => {
        t.items?.forEach(item => {
          const cat = item.category;
          const price = Number(item.price) * (item.quantity || 1);
          if (cat === "Plats" || cat === "Accompagnements") {
            cuisine += price;
          } else {
            bar += price;
          }
        });
      });

      const totalRecettes = transactions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      const totalAchats = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      const cashOnly = transactions.filter(t => !t.payment_method || t.payment_method === 'Espèces').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

      const methods = transactions.reduce((acc, curr) => {
        const m = curr.payment_method || 'Espèces';
        acc[m] = (acc[m] || 0) + (Number(curr.amount) || 0);
        return acc;
      }, {});

      // Couleurs catégorielles fixes par moyen de paiement (identité, pas magnitude).
      const colors = { 'Espèces': 'oklch(0.65 0.16 155)', 'Orange Money': 'oklch(0.68 0.16 55)', 'Wave': T.accent, 'MTN Money': 'oklch(0.8 0.16 95)', 'Visa': 'oklch(0.6 0.12 300)' };

      // Logique pour le récap hebdo , mensuelle et annuelle
      const monthlyMap = {};
      transactions.forEach(t => {
        const monthKey = new Date(t.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { cuisine: 0, bar: 0, depenses: 0, total: 0 };

        t.items?.forEach(item => {
          const price = Number(item.price) * (item.quantity || 1);
          if (item.category === "Plats" || item.category === "Accompagnements") monthlyMap[monthKey].cuisine += price;
          else monthlyMap[monthKey].bar += price;
        });
        monthlyMap[monthKey].total += Number(t.amount) || 0;
      });

      expenses.forEach(e => {
        const monthKey = new Date(e.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { cuisine: 0, bar: 0, depenses: 0, total: 0 };
        monthlyMap[monthKey].depenses += Number(e.amount) || 0;
      });

      setData({
        recettes: totalRecettes,
        achats: totalAchats,
        cash: cashOnly,
        virtuel: Math.max(0, totalRecettes - cashOnly),
        cuisineRecette: cuisine,
        barRecette: bar,
        comparison: [
          { name: 'Ventes', recettes: totalRecettes, achats: 0 },
          { name: 'Dépenses', recettes: 0, achats: totalAchats }
        ],
        paymentDistribution: Object.entries(methods).map(([name, value]) => ({ name, value, color: colors[name] || T.faint })),
        monthlyBreakdown: Object.entries(monthlyMap).map(([month, vals]) => ({ month, ...vals }))
      });

    } catch (err) { console.error("Erreur rapports:", err.message); }
    finally { setLoading(false); }
  };

  // Chargement paresseux de jsPDF au clic seulement : évite d'alourdir le
  // bundle initial pour une fonctionnalité utilisée occasionnellement.
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 14;
      const accentRgb = [37, 99, 235];
      let y = 20;

      doc.setFont(undefined, 'bold');
      doc.setFontSize(18);
      doc.setTextColor(20, 20, 30);
      doc.text('Comptoir', marginX, y);

      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 110, 130);
      doc.text('Rapport financier', marginX, y + 6);

      doc.setFontSize(9);
      doc.text(userProfile?.name || '', pageWidth - marginX, y, { align: 'right' });
      doc.text(`Période : ${period}`, pageWidth - marginX, y + 5, { align: 'right' });
      doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, pageWidth - marginX, y + 10, { align: 'right' });

      y += 18;
      doc.setDrawColor(220, 224, 232);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [['Indicateur', 'Montant (F CFA)']],
        body: [
          ['Recettes', formatFcfa(data.recettes)],
          ['Achats', formatFcfa(data.achats)],
          ['Cash', formatFcfa(data.cash)],
          ['Virtuel', formatFcfa(data.virtuel)],
          ['Recette Cuisine', formatFcfa(data.cuisineRecette)],
          ['Recette Bar', formatFcfa(data.barRecette)],
        ],
        theme: 'grid',
        headStyles: { fillColor: accentRgb },
        styles: { fontSize: 10 },
        margin: { left: marginX, right: marginX },
      });

      y = doc.lastAutoTable.finalY + 12;

      if (data.paymentDistribution.length > 0) {
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.setTextColor(20, 20, 30);
        doc.text('Répartition par moyen de paiement', marginX, y);

        autoTable(doc, {
          startY: y + 4,
          head: [['Moyen', 'Montant (F CFA)']],
          body: data.paymentDistribution.map((p) => [p.name, formatFcfa(p.value)]),
          theme: 'striped',
          headStyles: { fillColor: accentRgb },
          styles: { fontSize: 10 },
          margin: { left: marginX, right: marginX },
        });

        y = doc.lastAutoTable.finalY + 12;
      }

      if (data.monthlyBreakdown.length > 0) {
        // Nouvelle page si le récap mensuel ne tiendrait pas sous le reste.
        if (y > doc.internal.pageSize.getHeight() - 60) {
          doc.addPage();
          y = 20;
        }
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.setTextColor(20, 20, 30);
        doc.text('Récapitulatif mensuel', marginX, y);

        autoTable(doc, {
          startY: y + 4,
          head: [['Mois', 'Cuisine', 'Bar', 'Dépenses', 'Total Ventes']],
          body: data.monthlyBreakdown.map((row) => [
            row.month,
            formatFcfa(row.cuisine),
            formatFcfa(row.bar),
            `-${formatFcfa(row.depenses)}`,
            formatFcfa(row.total),
          ]),
          theme: 'grid',
          headStyles: { fillColor: accentRgb },
          styles: { fontSize: 9 },
          margin: { left: marginX, right: marginX },
        });
      }

      doc.save(`rapport-comptoir-${period}-${selectedDate}.pdf`);
    } catch (err) {
      console.error('Erreur export PDF:', err.message);
      alert("Impossible de générer le PDF pour le moment.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (loading) return (
    <div style={{ height: 380, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <Loader2 className="animate-spin" color={T.accent} size={36} style={{ marginBottom: 14 }} />
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: T.muted }}>Génération du rapport...</p>
    </div>
  );

  const periods = ['journalier', 'hebdomadaire', 'mensuel', 'annuel'];

  return (
    <div style={{ textAlign: "left", paddingBottom: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 26 }}>
        <div>
          <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 22, margin: 0 }}>Rapports Financiers</h3>
          <p style={{ fontSize: 11, fontWeight: 600, color: T.faint, textTransform: "capitalize", margin: "4px 0 0" }}>Bilan {period}</p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          {userProfile?.role === 'owner' && (
            <div style={{ display: "inline-flex", padding: 3, background: T.surface2, borderRadius: 999, gap: 2 }}>
              {periods.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    padding: "7px 16px", borderRadius: 999, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "capitalize",
                    background: period === p ? T.accent : "none", color: period === p ? T.accentInk : T.muted,
                  }}
                >
                  {p.slice(0, 4)}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 999,
              border: `1px solid ${T.line}`, background: T.surface, color: T.ink, fontSize: 11.5, fontWeight: 700,
              cursor: isExportingPdf ? "default" : "pointer", opacity: isExportingPdf ? .6 : 1,
            }}
          >
            {isExportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            PDF
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
        <ReportSummaryCard T={T} label="Recettes" value={`${data.recettes.toLocaleString()} F`} icon={<ArrowUpCircle color={T.good} />} />
        <ReportSummaryCard T={T} label="Achats" value={`${data.achats.toLocaleString()} F`} icon={<ArrowDownCircle color={T.bad} />} />
        <ReportSummaryCard T={T} label="Cash" value={`${data.cash.toLocaleString()} F`} icon={<Banknote color={T.warn} />} />
        <ReportSummaryCard T={T} label="Virtuel" value={`${data.virtuel.toLocaleString()} F`} icon={<Smartphone color={T.accent} />} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }} className="dash-grid-collapse-sm">
        <div style={{ ...card(T, { padding: 24, background: "oklch(0.7 0.16 55 / .1)", border: "1px solid oklch(0.7 0.16 55 / .2)" }), display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "oklch(0.55 0.16 55)" }}>
              <Utensils size={18} />
              <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase" }}>Recette Cuisine</span>
            </div>
            <h2 className="num" style={{ fontFamily: headFont, fontSize: 24, fontWeight: 800, margin: 0 }}>{data.cuisineRecette.toLocaleString()} F</h2>
          </div>
          <TrendingUp color="oklch(0.55 0.16 55)" style={{ opacity: .3 }} size={36} />
        </div>

        <div style={{ ...card(T, { padding: 24, background: T.accentWash, border: `1px solid ${T.accent}33` }), display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: T.accent }}>
              <GlassWater size={18} />
              <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase" }}>Recette Bar</span>
            </div>
            <h2 className="num" style={{ fontFamily: headFont, fontSize: 24, fontWeight: 800, margin: 0 }}>{data.barRecette.toLocaleString()} F</h2>
          </div>
          <TrendingUp color={T.accent} style={{ opacity: .3 }} size={36} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }} className="dash-grid-collapse-sm">
        <div style={card(T, { padding: 26 })}>
          <h4 style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, margin: "0 0 18px" }}>
            <PieChart size={18} color={T.accent} /> Règlement
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
            <div style={{ width: 160, height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={data.paymentDistribution} innerRadius={52} outerRadius={72} paddingAngle={4} dataKey="value">
                    {data.paymentDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: radiusSm, border: `1px solid ${T.line}`, backgroundColor: T.surface, color: T.ink }} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, minWidth: 140, display: "flex", flexDirection: "column", gap: 6 }}>
              {data.paymentDistribution.map((p, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: radiusSm, background: T.surface2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>{p.name}</span>
                  </div>
                  <span className="num" style={{ fontSize: 12, fontWeight: 800 }}>{p.value.toLocaleString()} F</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={card(T, { padding: 26 })}>
          <h4 style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, margin: "0 0 18px" }}>
            <BarChart3 size={18} color={T.accent} /> Comparatif {period}
          </h4>
          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.comparison}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: T.faint, fontSize: 10.5 }} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: T.surface, borderRadius: radiusSm, border: `1px solid ${T.line}`, color: T.ink }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', paddingTop: 16, color: T.muted }} />
                <Bar dataKey="recettes" fill={T.accent} radius={[8, 8, 8, 8]} name="Recettes" barSize={36} />
                <Bar dataKey="achats" fill={T.bad} radius={[8, 8, 8, 8]} name="Achats" barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- SECTION : RÉCAPITULATIF PAR MOIS --- */}
      <div style={card(T, { padding: 26 })}>
        <h4 style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, margin: "0 0 18px" }}>
          <Calendar size={18} color={T.accent} /> Récapitulatif Mensuel
        </h4>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.line}` }}>
                <th style={{ padding: "10px 8px", fontSize: 10.5, textTransform: "uppercase", fontWeight: 800, color: T.faint }}>Mois</th>
                <th style={{ padding: "10px 8px", fontSize: 10.5, textTransform: "uppercase", fontWeight: 800, color: T.faint }}>Cuisine</th>
                <th style={{ padding: "10px 8px", fontSize: 10.5, textTransform: "uppercase", fontWeight: 800, color: T.faint }}>Bar</th>
                <th style={{ padding: "10px 8px", fontSize: 10.5, textTransform: "uppercase", fontWeight: 800, color: T.bad }}>Dépenses</th>
                <th style={{ padding: "10px 8px", fontSize: 10.5, textTransform: "uppercase", fontWeight: 800, color: T.accent }}>Total Ventes</th>
              </tr>
            </thead>
            <tbody>
              {data.monthlyBreakdown.length > 0 ? (
                data.monthlyBreakdown.map((row, idx) => (
                  <tr key={idx} className="dash-month-row" style={{ borderBottom: `1px solid ${T.line}` }}>
                    <td style={{ padding: "12px 8px", fontSize: 12, fontWeight: 700, textTransform: "capitalize" }}>{row.month}</td>
                    <td className="num" style={{ padding: "12px 8px", fontSize: 12, fontWeight: 600, color: T.muted }}>{row.cuisine.toLocaleString()} F</td>
                    <td className="num" style={{ padding: "12px 8px", fontSize: 12, fontWeight: 600, color: T.muted }}>{row.bar.toLocaleString()} F</td>
                    <td className="num" style={{ padding: "12px 8px", fontSize: 12, fontWeight: 800, color: T.bad }}>-{row.depenses.toLocaleString()} F</td>
                    <td className="num" style={{ padding: "12px 8px", fontSize: 13, fontWeight: 800, color: T.accent }}>{row.total.toLocaleString()} F</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ padding: "36px 8px", textAlign: "center", opacity: .4, fontStyle: "italic", fontSize: 12 }}>Aucune donnée disponible pour cette période</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx global>{`
        .dash-month-row:hover { background: ${T.surface2}; }
        @media (max-width: 640px) { .dash-grid-collapse-sm { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

function ReportSummaryCard({ T, label, value, icon }) {
  return (
    <div style={card(T, { padding: 20 })}>
      <div style={{ width: 40, height: 40, borderRadius: radiusSm, background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>{icon}</div>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: T.faint, textTransform: "uppercase", margin: "0 0 4px" }}>{label}</p>
      <p className="num" style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>{value}</p>
    </div>
  );
}
