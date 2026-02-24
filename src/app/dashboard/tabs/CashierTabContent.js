"use client";

import React, { useState, useEffect } from 'react';
import { 
  Wallet, Banknote, Smartphone, CreditCard, 
  ArrowRight, CheckCircle2, AlertTriangle, 
  History, Printer, Loader2, Save, Receipt, ArrowDownCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function CashierTabContent({ isDarkMode, selectedDate, userProfile }) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [salesData, setSalesData] = useState({
    total: 0,
    byMethod: { "Espèces": 0, "Orange Money": 0, "Wave": 0, "MTN Money": 0, "Carte Bancaire": 0 }
  });
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [closingData, setClosingData] = useState({ cashInHand: "", notes: "" });
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (userProfile) fetchDailyData();
  }, [selectedDate, userProfile]);

  const fetchDailyData = async () => {
    try {
      setLoading(true);
      const start = `${selectedDate}T00:00:00.000Z`;
      const end = `${selectedDate}T23:59:59.999Z`;

      // 1. Récupérer les Transactions
      const { data: trans, error: transErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('owner_email', userProfile.owner_email)
        .gte('created_at', start)
        .lte('created_at', end);

      // 2. Récupérer les Dépenses
      const { data: exp, error: expErr } = await supabase
        .from('expenses')
        .select('amount')
        .eq('owner_email', userProfile.owner_email)
        .gte('created_at', start)
        .lte('created_at', end);

      if (transErr || expErr) throw transErr || expErr;

      const totalSales = trans?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const methods = trans?.reduce((acc, curr) => {
        const m = curr.payment_method || "Espèces";
        acc[m] = (acc[m] || 0) + Number(curr.amount);
        return acc;
      }, { "Espèces": 0, "Orange Money": 0, "Wave": 0, "MTN Money": 0, "Carte Bancaire": 0 });

      const totalExp = exp?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      setTransactions(trans || []);
      setSalesData({ total: totalSales, byMethod: methods });
      setTotalExpenses(totalExp);
    } catch (err) {
      console.error("Erreur caisse:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Le montant que le caissier DOIT avoir en main (Ventes - Dépenses)
  const expectedBalance = salesData.total - totalExpenses;
  const difference = closingData.cashInHand ? Number(closingData.cashInHand) - expectedBalance : 0;

  const handleRegisterClosing = async () => {
    if (!closingData.cashInHand) return alert("Saisissez le montant réel.");
    setIsClosing(true);
    try {
      const { error } = await supabase.from('daily_closings').insert([{
        restaurant_id: userProfile.id,
        owner_email: userProfile.owner_email,
        date: selectedDate,
        theoretical_amount: expectedBalance,
        real_amount: Number(closingData.cashInHand),
        difference: difference,
        notes: closingData.notes,
        closed_by: userProfile.name
      }]);
      if (error) throw error;
      alert("Clôture réussie !");
      setClosingData({ cashInHand: "", notes: "" });
    } catch (err) { alert(err.message); } finally { setIsClosing(false); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 opacity-50">
      <Loader2 className="animate-spin text-[#00D9FF] mb-2" />
      <p className="text-[10px] font-black uppercase tracking-widest">Calcul du solde net...</p>
    </div>
  );

  return (
    <div className="fade-in space-y-8 pb-10 text-left">
      <div className="flex justify-between items-center">
        <h3 className="text-3xl font-black italic tracking-tighter uppercase">Session de Caisse</h3>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          {/* --- RÉCAPITULATIF FINANCIER --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-8 rounded-[40px] ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white shadow-xl'}`}>
              <p className="text-[#00D9FF] text-[10px] font-black uppercase tracking-widest mb-2">Total Recettes</p>
              <h2 className="text-4xl font-black">{salesData.total.toLocaleString()} F</h2>
            </div>
            <div className={`p-8 rounded-[40px] ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white shadow-xl'}`}>
              <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mb-2">Total Dépenses</p>
              <h2 className="text-4xl font-black text-red-500">-{totalExpenses.toLocaleString()} F</h2>
            </div>
          </div>

          {/* Méthodes de paiement */}
          <div className={`p-8 rounded-[40px] ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white shadow-xl'}`}>
             <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <MethodStat label="Espèces" value={salesData.byMethod["Espèces"]} icon={<Banknote size={16}/>} color="green" />
                <MethodStat label="Orange" value={salesData.byMethod["Orange Money"]} icon={<Smartphone size={16}/>} color="orange" />
                <MethodStat label="Wave" value={salesData.byMethod["Wave"]} icon={<CreditCard size={16}/>} color="blue" />
                <MethodStat label="MTN" value={salesData.byMethod["MTN Money"]} icon={<Smartphone size={16}/>} color="yellow" />
                <MethodStat label="Visa" value={salesData.byMethod["Carte Bancaire"]} icon={<CreditCard size={16}/>} color="indigo" />
             </div>
          </div>

          {/* Journal des flux */}
          <div className={`p-8 rounded-[40px] ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white shadow-xl'}`}>
            <h4 className="font-black uppercase italic text-sm mb-6">Journal des flux</h4>
            <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar">
              {transactions.map((t, i) => (
                <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-white/5">
                  <span className="text-xs font-bold uppercase">{t.payment_method}</span>
                  <span className="font-black text-sm">{t.amount.toLocaleString()} F</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- SECTION CLÔTURE --- */}
        <div className="space-y-6">
          <div className={`p-10 rounded-[40px] ${isDarkMode ? 'bg-[#00D9FF] text-black' : 'bg-black text-white'}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Solde Attendu (Net)</p>
            <h2 className="text-4xl font-black italic">{expectedBalance.toLocaleString()} F</h2>
          </div>

          <div className={`p-8 rounded-[40px] ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white shadow-xl'}`}>
            <h4 className="font-black uppercase italic text-sm mb-6">Vérification</h4>
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase opacity-40 ml-2">Montant physique en caisse</p>
                <input 
                  type="number" 
                  value={closingData.cashInHand}
                  onChange={(e) => setClosingData({...closingData, cashInHand: e.target.value})}
                  className={`w-full px-6 py-5 rounded-[25px] outline-none border-none font-black text-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}
                  placeholder="0"
                />
              </div>

              {closingData.cashInHand && (
                <div className={`p-5 rounded-2xl ${difference === 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  <p className="text-[9px] font-black uppercase opacity-50">Écart</p>
                  <p className="text-xl font-black">{difference.toLocaleString()} F</p>
                </div>
              )}

              <button 
                onClick={handleRegisterClosing}
                disabled={isClosing}
                className="w-full py-5 bg-[#00D9FF] text-black rounded-[25px] font-black text-xs uppercase shadow-xl"
              >
                Valider la clôture
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MethodStat({ label, value, icon, color }) {
  const colors = { green: "text-green-500 bg-green-500/10", orange: "text-orange-500 bg-orange-500/10", blue: "text-blue-500 bg-blue-500/10", yellow: "text-yellow-500 bg-yellow-500/10", indigo: "text-indigo-500 bg-indigo-500/10" };
  return (
    <div className="text-left">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${colors[color]}`}>{icon}</div>
      <p className="text-[8px] font-black uppercase opacity-40 leading-none mb-1">{label}</p>
      <p className="text-[11px] font-black truncate">{value.toLocaleString()} F</p>
    </div>
  );
}