"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Banknote, Smartphone, CreditCard, Clock, 
  Download, Loader2, Calendar as CalendarIcon, 
  BarChart3, Printer
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { supabase } from '@/lib/supabase';

export default function CashierTabContent({ isDarkMode, selectedDate }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, count: 0, expenses: 0 });
  const [timeRange, setTimeRange] = useState('day'); 

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('cashier_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedDate, timeRange]);

  const fetchData = async () => {
    if (!selectedDate) return;
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let start, end;
      const date = new Date(selectedDate);

      if (timeRange === 'day') {
        start = `${selectedDate}T00:00:00.000Z`;
        end = `${selectedDate}T23:59:59.999Z`;
      } else if (timeRange === 'week') {
        const first = date.getDate() - date.getDay();
        const last = first + 6;
        start = new Date(date.setDate(first)).toISOString().split('T')[0] + "T00:00:00.000Z";
        end = new Date(date.setDate(last)).toISOString().split('T')[0] + "T23:59:59.999Z";
      } else {
        start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
        end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0] + "T23:59:59.999Z";
      }

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('restaurant_id', session.user.id)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

      const { data: expData } = await supabase
        .from('expenses')
        .select('amount')
        .eq('restaurant_id', session.user.id)
        .gte('created_at', start)
        .lte('created_at', end);

      if (txError) throw txError;

      const totalSales = txData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const totalExpenses = expData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      setTransactions(txData || []);
      setStats({ total: totalSales, count: txData?.length || 0, expenses: totalExpenses });
    } catch (error) {
      console.error('Erreur:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIQUE D'IMPRESSION DU RAPPORT ---
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    const rangeText = timeRange === 'day' ? 'JOURNALIER' : timeRange === 'week' ? 'HEBDOMADAIRE' : 'MENSUEL';
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Rapport RestoPay - ${selectedDate}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
            .stat-card { border: 1px solid #eee; padding: 20px; text-align: center; border-radius: 10px; }
            .stat-val { font-size: 20px; font-weight: bold; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 12px; border-bottom: 2px solid #eee; font-size: 12px; text-transform: uppercase; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; opacity: 0.5; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin:0">RAPPORT DE CAISSE ${rangeText}</h1>
            <p>Période du : ${selectedDate} | Généré par RestoPay</p>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div style="font-size:10px; text-transform:uppercase">Ventes Totales</div>
              <div class="stat-val" style="color:#00d9ff">${stats.total.toLocaleString()} F</div>
            </div>
            <div class="stat-card">
              <div style="font-size:10px; text-transform:uppercase">Dépenses</div>
              <div class="stat-val" style="color:#ef4444">-${stats.expenses.toLocaleString()} F</div>
            </div>
            <div class="stat-card">
              <div style="font-size:10px; text-transform:uppercase">Profit Net</div>
              <div class="stat-val" style="color:#22c55e">${(stats.total - stats.expenses).toLocaleString()} F</div>
            </div>
          </div>

          <h3>DÉTAILS DES TRANSACTIONS (${stats.count})</h3>
          <table>
            <thead>
              <tr>
                <th>Date / Heure</th>
                <th>Source</th>
                <th>Méthode</th>
                <th style="text-align:right">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(tx => `
                <tr>
                  <td>${new Date(tx.created_at).toLocaleString('fr-FR')}</td>
                  <td>${tx.table_number || 'Comptoir'}</td>
                  <td>${tx.payment_method}</td>
                  <td style="text-align:right; font-weight:bold">${tx.amount.toLocaleString()} F</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>RestoPay Africa - Logiciel de Gestion certifié</p>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- PRÉPARATION DES DONNÉES DU GRAPHIQUE ---
  const chartData = useMemo(() => {
    const dataMap = {};
    transactions.forEach(tx => {
      const dateKey = new Date(tx.created_at).toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: timeRange === 'month' ? 'short' : undefined 
      });
      dataMap[dateKey] = (dataMap[dateKey] || 0) + Number(tx.amount);
    });

    const formatted = Object.keys(dataMap).map(key => ({ name: key, total: dataMap[key] })).reverse();
    const avg = formatted.reduce((acc, curr) => acc + curr.total, 0) / (formatted.length || 1);

    return formatted.map(item => {
      let color = "#fbbf24"; 
      if (item.total < avg * 0.8) color = "#ef4444"; 
      if (item.total > avg * 1.2) color = "#00D9FF"; 
      return { ...item, fill: color };
    });
  }, [transactions, timeRange]);

  return (
    <div className="fade-in space-y-8 pb-20 text-left">
      
      {/* SÉLECTEUR DE PÉRIODE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className={`inline-flex p-1.5 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
          {['day', 'week', 'month'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                timeRange === range ? 'bg-[#00D9FF] text-black shadow-lg' : 'opacity-40 hover:opacity-100'
              }`}
            >
              {range === 'day' ? 'Jour' : range === 'week' ? 'Semaine' : 'Mois'}
            </button>
          ))}
        </div>
        
        <div className="flex gap-3">
            <button 
              onClick={handlePrintReport}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-200 shadow-sm hover:bg-gray-50'}`}
            >
                <Printer size={16} /> Imprimer Rapport
            </button>
        </div>
      </div>

      {/* GRAPHIQUE ANALYTIQUE */}
      {timeRange !== 'day' && chartData.length > 0 && (
        <div className={`p-8 rounded-[45px] border ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest opacity-30 flex items-center gap-2">
              <BarChart3 size={16} /> Analyse de Rentabilité
            </h3>
            <div className="flex gap-4 text-[8px] font-black uppercase tracking-widest opacity-50">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"/> Faible</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400"/> Moyen</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-cyan-500"/> Élite</span>
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDarkMode ? '#666' : '#999', fontSize: 10}} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* STATS BOXES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatBox label="Ventes" value={stats.total} color="text-[#00D9FF]" isDarkMode={isDarkMode} />
        <StatBox label="Dépenses" value={stats.expenses} color="text-red-500" prefix="-" isDarkMode={isDarkMode} />
        <StatBox label="Profit Net" value={stats.total - stats.expenses} color={(stats.total - stats.expenses) >= 0 ? 'text-green-500' : 'text-red-500'} isDarkMode={isDarkMode} />
      </div>

      {/* TABLEAU JOURNAL DE CAISSE */}
      <div className={`rounded-[45px] border overflow-hidden ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-xl'}`}>
        <div className="p-8 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-xl font-black italic uppercase tracking-tighter">Journal des Flux</h3>
          <button className="p-3 rounded-2xl bg-white/5 hover:bg-[#00D9FF] hover:text-black transition-all">
            <Download size={18} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'}>
                <th className="px-8 py-5 text-[10px] font-black uppercase opacity-30">Date / Heure</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase opacity-30">Source</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase opacity-30 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {loading ? (
                <tr><td colSpan="3" className="py-20 text-center"><Loader2 className="animate-spin mx-auto opacity-20" /></td></tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-8 py-6">
                      <p className="font-bold text-xs">{new Date(tx.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p>
                      <p className="text-[10px] opacity-40">{new Date(tx.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-8 py-6 font-black uppercase text-xs">{tx.table_number || "Comptoir"}</td>
                    <td className="px-8 py-6 text-right font-black text-[#00D9FF]">
                      {tx.amount.toLocaleString()} F
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

function StatBox({ label, value, color, prefix = "", isDarkMode }) {
  return (
    <div className={`p-8 rounded-[40px] border ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">{label}</p>
      <h2 className={`text-2xl font-black italic ${color}`}>{prefix}{value.toLocaleString()} F</h2>
    </div>
  );
}