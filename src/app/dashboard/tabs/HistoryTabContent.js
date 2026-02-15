"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, Download, Grid, ArrowRight, Star, Trophy, Award, Medal, ChevronDown, ChevronUp, Loader2, Calendar,
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';
import { supabase } from '@/lib/supabase';

export default function HistoryTabContent({ isDarkMode, selectedDate }) {
  const [showAllDays, setShowAllDays] = useState(false);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('mois'); 
  const currentMonth = useMemo(() => new Date(selectedDate).getMonth(), [selectedDate]);
  const currentYear = useMemo(() => new Date(selectedDate).getFullYear(), [selectedDate]);

  useEffect(() => {
    fetchHistory();
  }, [selectedDate, timeFilter]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      
      // --- 1. RÉCUPÉRATION DE L'ID DU RESTAURANT ---
      const { data: { user } } = await supabase.auth.getUser();

      const date = new Date(selectedDate);
      let startDate, endDate;

      // --- LOGIQUE DE FILTRAGE TEMPOREL ---
      if (timeFilter === 'jour') {
        startDate = new Date(date.setHours(0,0,0,0)).toISOString();
        endDate = new Date(date.setHours(23,59,59,999)).toISOString();
      } else if (timeFilter === 'semaine') {
        const first = date.getDate() - date.getDay();
        startDate = new Date(date.setDate(first)).toISOString();
        endDate = new Date(date.setDate(first + 6)).toISOString();
      } else {
        startDate = new Date(currentYear, currentMonth, 1).toISOString();
        endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
      }

      // --- 2. REQUÊTE SÉCURISÉE AVEC ISOLATION ---
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('restaurant_id', user.id) 
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Groupage des données
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
          total: total.toLocaleString() + " F",
          rawTotal: total,
          occupancy: Math.min(Math.round((hourTrans.length / 10) * 100), 100),
          label: `${i}h`
        };
      });
    }
    
    const uniqueDays = [...new Set(data.map(t => t.created_at.split('T')[0]))];
    return uniqueDays.map(dateStr => {
      const dayTrans = data.filter(t => t.created_at.startsWith(dateStr));
      const total = dayTrans.reduce((acc, curr) => acc + Number(curr.amount), 0);
      return {
        date: new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        total: total.toLocaleString() + " F",
        rawTotal: total,
        occupancy: Math.min(Math.round((dayTrans.length / 30) * 100), 100),
        label: dateStr.split('-')[2]
      };
    });
  };

  // --- DEFINITIONS DES DONNEES POUR LE RENDU ---
  const chartData = useMemo(() => [...monthlyData].reverse(), [monthlyData]);
  const displayedHistory = showAllDays ? monthlyData : monthlyData.slice(0, 5);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 opacity-30">
      <Loader2 className="animate-spin mb-4 text-[#00D9FF]" size={40} />
      <p className="font-black uppercase tracking-widest text-[10px]">Calcul des statistiques...</p>
    </div>
  );

  return (
    <div className="fade-in text-left pb-20">
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h3 className="text-3xl font-black italic tracking-tighter uppercase">Archives & Flux</h3>
          <p className="opacity-50 text-[10px] font-black uppercase tracking-widest">Analyse réelle • {timeFilter}</p>
        </div>

        {/* SÉLECTEUR DE PÉRIODE */}
        <div className={`flex p-1 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-100 border-gray-200'}`}>
          {['jour', 'semaine', 'mois'].map((f) => (
            <button key={f} onClick={() => setTimeFilter(f)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${timeFilter === f ? 'bg-[#00D9FF] text-black shadow-lg' : 'opacity-40'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* --- GRAPHIQUES --- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
        <div className={`xl:col-span-2 p-8 rounded-[45px] border ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h4 className="text-[10px] font-black flex items-center gap-2 mb-8 uppercase opacity-60"><TrendingUp size={18} className="text-[#00D9FF]" /> Volume financier</h4>
            <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D9FF" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#00D9FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 10}} />
                <YAxis hide />
                <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#111' : '#fff', borderRadius: '12px', border: 'none' }} />
                <Area type="monotone" dataKey="rawTotal" stroke="#00D9FF" strokeWidth={4} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
            </div>
        </div>
        <div className={`p-8 rounded-[45px] border ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h4 className="text-[10px] font-black flex items-center gap-2 mb-8 uppercase opacity-60"><Grid size={18} className="text-purple-500" /> Fréquentation (%)</h4>
            <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 9}} />
                <YAxis hide />
                <Bar dataKey="occupancy" radius={[4, 4, 4, 4]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.occupancy > 70 ? '#A259FF' : '#00D9FF'} fillOpacity={0.5} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* --- TABLEAU DES RÉSULTATS --- */}
      <div className={`rounded-[40px] border overflow-hidden ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
          <h4 className="font-black italic text-lg uppercase tracking-tighter">Détail des écritures</h4>
          <button className="p-3 rounded-2xl bg-[#00D9FF]/10 text-[#00D9FF] hover:bg-[#00D9FF] hover:text-black transition-all"><Download size={18}/></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'}>
                <th className="px-8 py-5 text-[10px] uppercase tracking-widest font-black opacity-40">Période</th>
                <th className="px-8 py-5 text-[10px] uppercase tracking-widest font-black opacity-40">Encaissement</th>
                <th className="px-8 py-5 text-[10px] uppercase tracking-widest font-black opacity-40 text-right">Flux</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {displayedHistory.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-8 py-10 text-center opacity-20 italic">Aucune donnée trouvée</td>
                </tr>
              ) : (
                displayedHistory.map((day, idx) => (
                  <tr key={idx} className="group hover:bg-white/[0.01] transition-colors">
                    <td className="px-8 py-6 font-bold text-sm">{day.date}</td>
                    <td className="px-8 py-6 font-black text-[#00D9FF]">{day.total}</td>
                    <td className="px-8 py-6 text-right">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[9px] font-black uppercase">stable</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}