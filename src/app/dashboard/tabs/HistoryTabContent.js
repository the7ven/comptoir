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

export default function HistoryTabContent({ isDarkMode, selectedDate, userProfile, setActiveTab, setSelectedDate }) {
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
    <div className="flex flex-col items-center justify-center py-40 opacity-30 text-center">
      <Loader2 className="animate-spin mb-4 text-[#00D9FF]" size={40} />
      <p className="font-black uppercase tracking-widest text-[10px]">Calcul des statistiques historiques...</p>
    </div>
  );

  return (
    <div className="fade-in text-left pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h3 className="text-3xl font-black italic tracking-tighter uppercase text-left">Archives & Flux</h3>
          <p className="opacity-50 text-[10px] font-black uppercase tracking-widest text-[#00D9FF] text-left">Analyse réelle • {timeFilter}</p>
        </div>

        {userProfile?.role === 'owner' && (
            <div className={`flex p-1 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-100 border-gray-200'}`}>
            {['jour', 'semaine', 'mois', 'année'].map((f) => (
                <button 
                key={f} 
                onClick={() => setTimeFilter(f)} 
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all border-none cursor-pointer ${timeFilter === f ? 'bg-[#00D9FF] text-black shadow-lg' : 'opacity-40 bg-transparent'}`}
                >
                {f}
                </button>
            ))}
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
        <div className={`xl:col-span-2 p-8 rounded-[45px] border ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h4 className="text-[10px] font-black flex items-center gap-2 mb-8 uppercase opacity-60 text-left"><TrendingUp size={18} className="text-[#00D9FF]" /> Volume financier ({timeFilter})</h4>
            <div className="h-64 w-full text-left">
             <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D9FF" stopOpacity={0.2}/><stop offset="95%" stopColor="#00D9FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 10}} />
                <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#111' : '#fff', borderRadius: '20px', border: 'none' }} />
                <Area type="monotone" dataKey="rawTotal" stroke="#00D9FF" strokeWidth={4} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
            </div>
        </div>
        <div className={`p-8 rounded-[45px] border ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h4 className="text-[10px] font-black flex items-center gap-2 mb-8 uppercase opacity-60 text-left"><Grid size={18} className="text-purple-500" /> Intensité de vente (%)</h4>
            <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 9}} />
                <Bar dataKey="occupancy" radius={[6, 6, 6, 6]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.occupancy > 70 ? '#A259FF' : '#00D9FF'} fillOpacity={0.5} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
        </div>
      </div>

      <div className={`rounded-[40px] border overflow-hidden ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
          <h4 className="font-black italic text-lg uppercase tracking-tighter">Écritures archivées</h4>
          <button className="p-3 rounded-2xl bg-[#00D9FF]/10 text-[#00D9FF] hover:bg-[#00D9FF] hover:text-black transition-all border-none cursor-pointer"><Download size={18}/></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'}>
                <th className="px-8 py-5 text-[10px] uppercase tracking-widest font-black opacity-40">Période</th>
                <th className="px-8 py-5 text-[10px] uppercase tracking-widest font-black opacity-40">Total encaissé</th>
                <th className="px-8 py-5 text-[10px] uppercase tracking-widest font-black opacity-40 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {displayedHistory.length === 0 ? (
                <tr><td colSpan="3" className="px-8 py-10 text-center opacity-20 italic">Aucune archive disponible</td></tr>
              ) : (
                displayedHistory.map((item, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => handleRowClick(item)}
                    className="group hover:bg-[#00D9FF]/5 transition-all cursor-pointer"
                  >
                    <td className="px-8 py-6 font-bold text-sm uppercase tracking-tight flex items-center gap-3">
                        {item.date}
                        <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#00D9FF]" />
                    </td>
                    <td className="px-8 py-6 font-black text-[#00D9FF] text-lg italic">{item.total}</td>
                    <td className="px-8 py-6 text-right">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[9px] font-black uppercase italic border border-green-500/20 group-hover:bg-[#00D9FF] group-hover:text-black group-hover:border-none transition-all">
                        Détails
                      </div>
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