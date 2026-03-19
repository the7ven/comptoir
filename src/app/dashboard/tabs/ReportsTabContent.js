"use client";

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, PieChart, ArrowDownCircle, ArrowUpCircle, 
  Banknote, Smartphone, Utensils, GlassWater, Loader2, TrendingUp, Calendar, FileText
} from 'lucide-react';
import { 
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend 
} from 'recharts';
import { supabase } from '@/lib/supabase';

export default function ReportsTabContent({ isDarkMode, selectedDate, userProfile }) {
  const [period, setPeriod] = useState('journalier');
  const [loading, setLoading] = useState(true);
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

      const colors = { 'Espèces': '#22c55e', 'Orange Money': '#ff6b00', 'Wave': '#00d9ff', 'MTN Money': '#ffcc00', 'Visa': '#a259ff' };

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
        paymentDistribution: Object.entries(methods).map(([name, value]) => ({ name, value, color: colors[name] || '#8884d8' })),
        monthlyBreakdown: Object.entries(monthlyMap).map(([month, vals]) => ({ month, ...vals }))
      });

    } catch (err) { console.error("Erreur rapports:", err.message); } 
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="h-96 flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-[#00D9FF] mb-4" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-center text-current">Génération du rapport...</p>
    </div>
  );

  return (
    <div className="fade-in text-left pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="text-left">
          <h3 className="text-3xl font-black italic tracking-tighter uppercase">Rapports Financiers</h3>
          <p className="opacity-50 text-sm font-light uppercase tracking-widest text-left">Bilan {period}</p>
        </div>
        
        {userProfile?.role === 'owner' && (
          <div className="flex gap-2">
            <div className={`flex p-1 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
              {['journalier', 'hebdomadaire', 'mensuel', 'annuel'].map((p) => (
                <button 
                  key={p} 
                  onClick={() => setPeriod(p)} 
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border-none cursor-pointer ${period === p ? 'bg-[#00D9FF] text-black shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:text-current bg-transparent'}`}
                >
                  {p.slice(0, 4)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <ReportSummaryCard isDarkMode={isDarkMode} label="Recettes" value={`${data.recettes.toLocaleString()} F`} icon={<ArrowUpCircle className="text-green-500" />} />
        <ReportSummaryCard isDarkMode={isDarkMode} label="Achats" value={`${data.achats.toLocaleString()} F`} icon={<ArrowDownCircle className="text-red-500" />} />
        <ReportSummaryCard isDarkMode={isDarkMode} label="Cash" value={`${data.cash.toLocaleString()} F`} icon={<Banknote className="text-yellow-500" />} />
        <ReportSummaryCard isDarkMode={isDarkMode} label="Virtuel" value={`${data.virtuel.toLocaleString()} F`} icon={<Smartphone className="text-[#00D9FF]" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div className={`p-8 rounded-[40px] border flex items-center justify-between ${isDarkMode ? 'bg-orange-500/5 border-orange-500/10' : 'bg-orange-50 border-orange-100'}`}>
          <div className="text-left">
            <div className="flex items-center gap-2 mb-2 text-orange-500">
               <Utensils size={20} />
               <span className="text-[10px] font-black uppercase tracking-widest">Recette Cuisine</span>
            </div>
            <h2 className="text-3xl font-black italic">{data.cuisineRecette.toLocaleString()} F</h2>
          </div>
          <TrendingUp className="opacity-20 text-orange-500" size={40} />
        </div>

        <div className={`p-8 rounded-[40px] border flex items-center justify-between ${isDarkMode ? 'bg-blue-500/5 border-blue-500/10' : 'bg-blue-50 border-blue-100'}`}>
          <div className="text-left">
            <div className="flex items-center gap-2 mb-2 text-blue-500">
               <GlassWater size={20} />
               <span className="text-[10px] font-black uppercase tracking-widest">Recette Bar</span>
            </div>
            <h2 className="text-3xl font-black italic">{data.barRecette.toLocaleString()} F</h2>
          </div>
          <TrendingUp className="opacity-20 text-blue-500" size={40} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">
        <div className={`p-8 rounded-[45px] border ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
          <h4 className="text-lg font-black flex items-center gap-2 mb-8 italic uppercase tracking-tighter text-left text-current">
            <PieChart size={20} className="text-[#00D9FF]" /> Règlement
          </h4>
          <div className="h-64 flex flex-col md:flex-row items-center">
            <div className="w-full md:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={data.paymentDistribution} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {data.paymentDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: isDarkMode ? '#111' : '#fff' }} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-3">
              {data.paymentDistribution.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center px-4 py-2 rounded-xl bg-white/5">
                  <div className="flex items-center gap-2 text-left">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: p.color}}></div>
                    <span className="text-[10px] font-black uppercase opacity-60">{p.name}</span>
                  </div>
                  <span className="text-xs font-black">{p.value.toLocaleString()} F</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`p-8 rounded-[45px] border ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
          <h4 className="text-lg font-black flex items-center gap-2 mb-8 italic uppercase tracking-tighter text-left text-current">
            <BarChart3 size={20} className="text-purple-500" /> Comparatif {period}
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.comparison}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 10}} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: isDarkMode ? '#111' : '#fff', borderRadius: '12px', border: 'none' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '20px' }} />
                <Bar dataKey="recettes" fill="#00D9FF" radius={[10, 10, 10, 10]} name="Recettes" barSize={40} />
                <Bar dataKey="achats" fill="#ff4d4d" radius={[10, 10, 10, 10]} name="Achats" barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- SECTION : RÉCAPITULATIF PAR MOIS --- */}
      <div className={`p-8 rounded-[45px] border ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
        <h4 className="text-lg font-black flex items-center gap-2 mb-8 italic uppercase tracking-tighter text-left text-current">
          <Calendar size={20} className="text-[#00D9FF]" /> Récapitulatif Mensuel
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 opacity-40 text-[10px] uppercase font-black tracking-widest">
                <th className="py-4 px-2">Mois</th>
                <th className="py-4 px-2">Cuisine</th>
                <th className="py-4 px-2">Bar</th>
                <th className="py-4 px-2 text-red-500">Dépenses</th>
                <th className="py-4 px-2 text-[#00D9FF]">Total Ventes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.monthlyBreakdown.length > 0 ? (
                data.monthlyBreakdown.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-2 text-[11px] font-black uppercase italic">{row.month}</td>
                    <td className="py-4 px-2 text-xs font-medium">{row.cuisine.toLocaleString()} F</td>
                    <td className="py-4 px-2 text-xs font-medium">{row.bar.toLocaleString()} F</td>
                    <td className="py-4 px-2 text-xs font-black text-red-500 italic">-{row.depenses.toLocaleString()} F</td>
                    <td className="py-4 px-2 text-sm font-black text-[#00D9FF] italic">{row.total.toLocaleString()} F</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-10 text-center opacity-20 italic text-xs">Aucune donnée disponible pour cette période</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReportSummaryCard({ isDarkMode, label, value, icon }) {
  return (
    <div className={`p-6 rounded-[35px] border text-left ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>{icon}</div>
      </div>
      <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-black mb-1 text-left">{label}</p>
      <p className="text-xl font-black italic tracking-tighter text-left">{value}</p>
    </div>
  );
}


