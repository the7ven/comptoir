"use client";

import React, { useState, useEffect } from 'react';
import { 
  Wallet, Banknote, Smartphone, CreditCard, 
  Search, Filter, ArrowUpRight, ArrowDownRight,
  Clock, Calendar as CalendarIcon, ChevronRight,
  Receipt, Printer, Download, Trash2, AlertCircle, ArrowDownCircle, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function CashierTabContent({ isDarkMode, selectedDate }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ daily: 0, count: 0, expenses: 0 }); // Ajout de expenses ici

  useEffect(() => {
    fetchTransactions();
    
    // Temps réel pour la caisse et les dépenses
    const channel = supabase.channel('cashier_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchTransactions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchTransactions)
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [selectedDate]);

  const fetchTransactions = async () => {
  if (!selectedDate) return;

  try {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const start = `${selectedDate}T00:00:00.000Z`;
    const end = `${selectedDate}T23:59:59.999Z`;

    // 1. Récupérer Transactions
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('restaurant_id', session.user.id)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false });

    // 2. Récupérer Dépenses
    const { data: expData, error: expError } = await supabase
      .from('expenses')
      .select('amount')
      .eq('restaurant_id', session.user.id)
      .gte('created_at', start)
      .lte('created_at', end);

    if (txError) throw txError;

    setTransactions(txData || []);
    const totalSales = txData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
    const totalExpenses = expData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

    setStats({ 
      daily: totalSales, 
      count: txData?.length || 0,
      expenses: totalExpenses
    });
  } catch (error) {
    console.error('Erreur Caisse:', error.message);
  } finally {
    setLoading(false);
  }
};

  const getMethodIcon = (method) => {
    switch (method) {
      case 'Orange Money': return <Smartphone className="text-orange-500" size={14} />;
      case 'Wave': return <CreditCard className="text-blue-500" size={14} />;
      case 'Visa/MC': return <CreditCard className="text-indigo-500" size={14} />;
      case 'Espèces': return <Banknote className="text-green-500" size={14} />;
      default: return <Banknote className="text-green-500" size={14} />;
    }
  };

  return (
    <div className="fade-in text-left">
      {/* --- BANNIÈRE STATS --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 text-left">
        <div className={`p-8 rounded-[40px] border ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Ventes (Brut)</p>
          <h2 className="text-2xl font-black italic text-[#00D9FF]">{stats.daily.toLocaleString()} F</h2>
        </div>
        
        <div className={`p-8 rounded-[40px] border ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1 text-red-500">Dépenses</p>
          <h2 className="text-2xl font-black italic text-red-500">-{stats.expenses.toLocaleString()} F</h2>
        </div>

        <div className={`p-8 rounded-[40px] border ${isDarkMode ? 'bg-[#00D9FF]/5 border-[#00D9FF]/20' : 'bg-cyan-50 border-cyan-100 shadow-sm'}`}>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Recette Net</p>
          <h2 className={`text-2xl font-black italic ${(stats.daily - stats.expenses) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {(stats.daily - stats.expenses).toLocaleString()} F
          </h2>
        </div>

        <div className={`p-8 rounded-[40px] border ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Transactions</p>
          <h2 className="text-2xl font-black italic">{stats.count}</h2>
        </div>
      </div>

      {/* --- LISTE DES TRANSACTIONS --- */}
      <div className={`rounded-[45px] border overflow-hidden ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-xl'}`}>
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
          <h3 className="text-xl font-black italic uppercase tracking-tighter">Journal de Caisse</h3>
          <div className="flex gap-2 text-left">
             <button className="p-3 rounded-2xl bg-white/5 opacity-50 hover:opacity-100 transition-all"><Download size={18}/></button>
          </div>
        </div>

        <div className="overflow-x-auto text-left">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-8 py-5 text-[10px] font-black uppercase opacity-30 text-left">Heure</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase opacity-30 text-left">Source</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase opacity-30 text-left">Méthode</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase opacity-30 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02] text-left">
              {loading ? (
                <tr><td colSpan="4" className="px-8 py-20 text-center"><Loader2 className="animate-spin mx-auto opacity-20" /></td></tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-8 py-20 text-center opacity-20 italic">Aucun encaissement pour cette date</td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="group hover:bg-white/[0.01] transition-colors">
                    <td className="px-8 py-6 text-left">
                      <div className="flex items-center gap-3 text-left">
                        <div className="p-2 rounded-xl bg-white/5 text-white/40"><Clock size={14} /></div>
                        <span className="text-xs font-bold text-left">
                          {new Date(tx.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-left">
                      <span className="text-xs font-black uppercase tracking-tight text-left">{tx.table_number || "Comptoir"}</span>
                    </td>
                    <td className="px-8 py-6 text-left">
                      <div className="flex items-center gap-2 text-left">
                        {getMethodIcon(tx.payment_method)}
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60 text-left">{tx.payment_method}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-sm font-black text-[#00D9FF]">{tx.amount.toLocaleString()} F</span>
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