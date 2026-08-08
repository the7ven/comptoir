"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, Download, Grid, ArrowRight, Loader2,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { getDashTokens, card, headFont, radius, radiusSm } from '@/lib/dashTheme';

export default function HistoryTabContent({ isDarkMode, selectedDate, userProfile, setActiveTab, setSelectedDate }) {
  const T = getDashTokens(isDarkMode);
  const [showAllDays, setShowAllDays] = useState(false);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('jour');
  const currentMonth = useMemo(() => new Date(selectedDate).getMonth(), [selectedDate]);
  const currentYear = useMemo(() => new Date(selectedDate).getFullYear(), [selectedDate]);

  useEffect(() => {
    if (userProfile) fetchHistory();
  }, [selectedDate, timeFilter, userProfile]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const sharedEmail = userProfile.owner_email;
      const date = new Date(selectedDate);
      let startDate, endDate;

      if (timeFilter === 'jour') {
        startDate = `${selectedDate}T00:00:00.000Z`;
        endDate = `${selectedDate}T23:59:59.999Z`;
      } else if (timeFilter === 'semaine') {
        const first = date.getDate() - date.getDay();
        startDate = new Date(date.setDate(first)).toISOString().split('T')[0] + "T00:00:00.000Z";
        endDate = new Date(date.setDate(first + 6)).toISOString().split('T')[0] + "T23:59:59.999Z";
      } else if (timeFilter === 'mois') {
        startDate = new Date(currentYear, currentMonth, 1).toISOString();
        endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
      } else if (timeFilter === 'année') {
        startDate = new Date(currentYear, 0, 1).toISOString();
        endDate = new Date(currentYear, 11, 31, 23, 59, 59).toISOString();
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('owner_email', sharedEmail)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedData = processTransactions(data, timeFilter);
      setMonthlyData(processedData);
    } catch (err) {
      console.error("Erreur historique:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const processTransactions = (data, filter) => {
    if (filter === 'jour') {
      return Array.from({ length: 24 }, (_, i) => {
        const hourTrans = data.filter(t => new Date(t.created_at).getHours() === i);
        const total = hourTrans.reduce((acc, curr) => acc + Number(curr.amount), 0);
        return {
          date: `${i}h00`,
          rawDate: selectedDate, // On garde la date du jour sélectionné
          total: total.toLocaleString() + " F",
          rawTotal: total,
          occupancy: Math.min(Math.round((hourTrans.length / 10) * 100), 100),
          label: `${i}h`
        };
      });
    }

    const uniquePeriods = [...new Set(data.map(t => {
      const d = new Date(t.created_at);
      return filter === 'année' ? `${d.getFullYear()}-${d.getMonth() + 1}` : t.created_at.split('T')[0];
    }))];

    return uniquePeriods.map(periodStr => {
      const periodTrans = data.filter(t => {
        if (filter === 'année') {
          const d = new Date(t.created_at);
          return `${d.getFullYear()}-${d.getMonth() + 1}` === periodStr;
        }
        return t.created_at.startsWith(periodStr);
      });
      const total = periodTrans.reduce((acc, curr) => acc + Number(curr.amount), 0);

      // On crée une date brute exploitable pour setSelectedDate

      let rawDate;
      if (filter === 'année') {
        const [y, m] = periodStr.split('-');
        rawDate = `${y}-${m.padStart(2, '0')}-01`;
      } else {
        rawDate = periodStr;
      }

      return {
        date: filter === 'année'
          ? new Date(periodStr.split('-')[0], periodStr.split('-')[1] - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
          : new Date(periodStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        rawDate: rawDate,
        total: total.toLocaleString() + " F",
        rawTotal: total,
        occupancy: Math.min(Math.round((periodTrans.length / 30) * 100), 100),
        label: filter === 'année' ? periodStr.split('-')[1] : periodStr.split('-')[2]
      };
    });
  };

  const chartData = useMemo(() => [...monthlyData].reverse(), [monthlyData]);
  const displayedHistory = showAllDays ? monthlyData : monthlyData.slice(0, 8);

  const handleRowClick = (item) => {
    if (item.rawDate) {
      setSelectedDate(item.rawDate);
      setActiveTab("reports");
    }
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0", opacity: .4, textAlign: "center" }}>
      <Loader2 className="animate-spin" color={T.accent} size={36} style={{ marginBottom: 14 }} />
      <p style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: T.muted }}>Calcul des statistiques historiques...</p>
    </div>
  );

  const filters = ['jour', 'semaine', 'mois', 'année'];

  return (
    <div style={{ textAlign: "left", paddingBottom: 30 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 26 }}>
        <div>
          <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 22, margin: 0 }}>Archives & Flux</h3>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: T.accent, textTransform: "uppercase", margin: "4px 0 0" }}>Analyse réelle • {timeFilter}</p>
        </div>

        {userProfile?.role === 'owner' && (
          <div style={{ display: "inline-flex", padding: 3, background: T.surface2, borderRadius: 999, gap: 2 }}>
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                style={{
                  padding: "8px 18px", borderRadius: 999, border: "none", fontSize: 11.5, fontWeight: 700, cursor: "pointer", textTransform: "capitalize",
                  background: timeFilter === f ? T.accent : "none", color: timeFilter === f ? T.accentInk : T.muted,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18, marginBottom: 24 }} className="dash-grid-collapse">
        <div style={card(T, { padding: 26 })}>
          <h4 style={{ fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 8, margin: "0 0 20px", textTransform: "uppercase", color: T.muted }}>
            <TrendingUp size={17} color={T.accent} /> Volume financier ({timeFilter})
          </h4>
          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.accent} stopOpacity={0.22} /><stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.line} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: T.faint, fontSize: 10.5 }} />
                <Tooltip contentStyle={{ backgroundColor: T.surface, borderRadius: radiusSm, border: `1px solid ${T.line}`, color: T.ink }} labelStyle={{ color: T.ink }} />
                <Area type="monotone" dataKey="rawTotal" stroke={T.accent} strokeWidth={3} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={card(T, { padding: 26 })}>
          <h4 style={{ fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 8, margin: "0 0 20px", textTransform: "uppercase", color: T.muted }}>
            <Grid size={17} color={T.accent} /> Intensité de vente (%)
          </h4>
          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: T.faint, fontSize: 9.5 }} />
                <Bar dataKey="occupancy" radius={[6, 6, 6, 6]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={T.accent} fillOpacity={0.25 + (entry.occupancy / 100) * 0.6} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ ...card(T), overflow: "hidden" }}>
        <div style={{ padding: "22px 26px", borderBottom: `1px solid ${T.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h4 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 16, margin: 0 }}>Écritures archivées</h4>
          <button style={{ padding: 10, borderRadius: radiusSm, background: T.accentWash, color: T.accent, border: "none", cursor: "pointer", display: "flex" }}><Download size={17} /></button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: T.surface2 }}>
                <th style={{ padding: "14px 26px", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", color: T.faint }}>Période</th>
                <th style={{ padding: "14px 26px", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", color: T.faint }}>Total encaissé</th>
                <th style={{ padding: "14px 26px", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", color: T.faint, textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedHistory.length === 0 ? (
                <tr><td colSpan="3" style={{ padding: "40px 26px", textAlign: "center", opacity: .4, fontStyle: "italic" }}>Aucune archive disponible</td></tr>
              ) : (
                displayedHistory.map((item, idx) => (
                  <tr
                    key={idx}
                    onClick={() => handleRowClick(item)}
                    className="dash-history-row"
                    style={{ borderTop: `1px solid ${T.line}`, cursor: "pointer" }}
                  >
                    <td style={{ padding: "16px 26px", fontWeight: 700, fontSize: 13, textTransform: "capitalize" }}>{item.date}</td>
                    <td className="num" style={{ padding: "16px 26px", fontWeight: 800, color: T.accent, fontSize: 15 }}>{item.total}</td>
                    <td style={{ padding: "16px 26px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, background: T.goodWash, color: T.good, fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>
                        Détails <ArrowRight size={12} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx global>{`
        .dash-history-row:hover { background: ${T.surface2}; }
        @media (max-width: 900px) { .dash-grid-collapse { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
