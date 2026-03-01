"use client";

import React, { useState, useEffect } from 'react';
import { 
  Wallet, Banknote, Smartphone, CreditCard, 
  ArrowRight, CheckCircle2, AlertTriangle, 
  History, Printer, Loader2, Save, Receipt, 
  ArrowDownCircle, Utensils, GlassWater, Flame, Beer
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function CashierTabContent({ isDarkMode, selectedDate, userProfile }) {
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
  const [closingData, setClosingData] = useState({ cashInHand: "", notes: "" });
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (userProfile) fetchDailyData();
  }, [selectedDate, userProfile, period]); // Ajout de period dans les dépendances

  const fetchDailyData = async () => {
    try {
      setLoading(true);
      const date = new Date(selectedDate);
      let start, end;

      // LOGIQUE DE CALCUL DES PÉRIODES (Même que Overview)
      if (period === "day") {
        start = `${selectedDate}T00:00:00.000Z`;
        end = `${selectedDate}T23:59:59.999Z`;
      } else if (period === "week") {
        const first = date.getDate() - date.getDay(); 
        const last = first + 6;
        start = new Date(date.setDate(first)).toISOString().split('T')[0] + "T00:00:00.000Z";
        end = new Date(date.setDate(last)).toISOString().split('T')[0] + "T23:59:59.999Z";
      } else if (period === "month") {
        start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
        end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();
      } else if (period === "year") {
        start = new Date(date.getFullYear(), 0, 1).toISOString();
        end = new Date(date.getFullYear(), 11, 31, 23, 59, 59).toISOString();
      }

      const { data: trans, error: transErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('owner_email', userProfile.owner_email)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

      const { data: exp, error: expErr } = await supabase
        .from('expenses')
        .select('amount')
        .eq('owner_email', userProfile.owner_email)
        .gte('created_at', start)
        .lte('created_at', end);

      if (transErr || expErr) throw transErr || expErr;

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

      setTransactions(trans || []);
      setSalesData({ total: totalSales, byMethod: methods });
      setSectionData({ repas, cocktails, jusNaturel: jus, barGlobal: bar });
      setTotalExpenses(totalExp);
    } catch (err) {
      console.error("Erreur caisse:", err.message);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-3xl font-black italic tracking-tighter uppercase">Session de Caisse</h3>
        
        {/* SÉLECTEUR DE PÉRIODE : UNIQUEMENT POUR OWNER */}
        {userProfile?.role === "owner" && (
          <div className={`flex p-1 rounded-2xl ${isDarkMode ? "bg-white/5" : "bg-gray-100"}`}>
            {[
              { id: "day", label: "Jour" },
              { id: "week", label: "Semaine" },
              { id: "month", label: "Mois" },
              { id: "year", label: "Année" }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-none cursor-pointer
                  ${period === p.id 
                    ? "bg-[#00D9FF] text-black shadow-lg" 
                    : "text-gray-500 hover:text-white bg-transparent"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          
          {/* --- VENTILATION PAR CATÉGORIES --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-6 rounded-[35px] border ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white shadow-lg'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl"><Utensils size={20}/></div>
                <h4 className="text-sm font-black uppercase italic">Section Repas</h4>
              </div>
              <p className="text-2xl font-black text-orange-500">{sectionData.repas.toLocaleString()} F</p>
              <p className="text-[9px] uppercase font-bold opacity-30 mt-1">Plats & Accompagnements</p>
            </div>

           {/* SECTION BOISSONS */}
<div className={`p-6 rounded-[35px] border ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white shadow-lg'}`}>
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-[#00D9FF]/10 text-[#00D9FF] rounded-xl"><GlassWater size={20}/></div>
      <h4 className="text-sm font-black uppercase italic">Section Boissons</h4>
    </div>
    {/* Affichage du Total Global Bar */}
    <div className="text-right">
      <p className="text-2xl font-black text-[#00D9FF]">
        {(sectionData.cocktails + sectionData.jusNaturel + sectionData.barGlobal).toLocaleString()} F
      </p>
    </div>
  </div>

  {/* Barre de séparation discrète */}
  <div className="h-[1px] w-full bg-white/5 mb-4"></div>

  <div className="space-y-3">
    <MiniRow label="Cocktails" value={sectionData.cocktails} icon={<Flame size={12} className="text-pink-500"/>} isDarkMode={isDarkMode} />
    <MiniRow label="Jus Naturels" value={sectionData.jusNaturel} icon={<ArrowRight size={12} className="text-green-500"/>} isDarkMode={isDarkMode} />
    <MiniRow label="Bar (Bière, Whisky, Vin...)" value={sectionData.barGlobal} icon={<Beer size={12} className="text-yellow-500"/>} isDarkMode={isDarkMode} />
  </div>
</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-8 rounded-[40px] ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white shadow-xl'}`}>
              <p className="text-[#00D9FF] text-[10px] font-black uppercase tracking-widest mb-2">Total Recettes ({period})</p>
              <h2 className="text-4xl font-black">{salesData.total.toLocaleString()} F</h2>
            </div>
            <div className={`p-8 rounded-[40px] ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white shadow-xl'}`}>
              <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mb-2">Total Dépenses ({period})</p>
              <h2 className="text-4xl font-black text-red-500">-{totalExpenses.toLocaleString()} F</h2>
            </div>
          </div>

          <div className={`p-8 rounded-[40px] ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white shadow-xl'}`}>
             <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <MethodStat label="Espèces" value={salesData.byMethod["Espèces"]} icon={<Banknote size={16}/>} color="green" />
                <MethodStat label="Orange" value={salesData.byMethod["Orange Money"]} icon={<Smartphone size={16}/>} color="orange" />
                <MethodStat label="Wave" value={salesData.byMethod["Wave"]} icon={<CreditCard size={16}/>} color="blue" />
                <MethodStat label="MTN" value={salesData.byMethod["MTN Money"]} icon={<Smartphone size={16}/>} color="yellow" />
                <MethodStat label="Visa" value={salesData.byMethod["Visa"]} icon={<CreditCard size={16}/>} color="indigo" />
             </div>
          </div>

          <div className={`p-8 rounded-[40px] ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white shadow-xl'}`}>
            <h4 className="font-black uppercase italic text-sm mb-6">Journal des flux</h4>
            <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar text-left">
              {transactions.map((t, i) => (
                <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-white/5 text-left">
                  <div className="text-left">
                    <span className="text-xs font-black uppercase block">{t.payment_method}</span>
                    <span className="text-[8px] opacity-30 uppercase font-bold">{new Date(t.created_at).toLocaleTimeString()}</span>
                  </div>
                  <span className="font-black text-sm">{t.amount.toLocaleString()} F</span>
                </div>
              ))}
              {transactions.length === 0 && <p className="opacity-20 italic p-4">Aucun flux enregistré pour cette période.</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`p-10 rounded-[40px] ${isDarkMode ? 'bg-[#00D9FF] text-black' : 'bg-black text-white'}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Solde Attendu (Net)</p>
            <h2 className="text-4xl font-black italic">{expectedBalance.toLocaleString()} F</h2>
          </div>

          <div className={`p-8 rounded-[40px] ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white shadow-xl'}`}>
            <h4 className="font-black uppercase italic text-sm mb-6">Vérification de Caisse</h4>
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase opacity-40 ml-2">Montant physique réel</p>
                <input 
                  type="number" 
                  value={closingData.cashInHand}
                  onChange={(e) => setClosingData({...closingData, cashInHand: e.target.value})}
                  className={`w-full px-6 py-5 rounded-[25px] outline-none border-none font-black text-xl ${isDarkMode ? 'bg-white/5 text-white' : 'bg-gray-100'}`}
                  placeholder="0"
                />
              </div>

              {closingData.cashInHand && (
                <div className={`p-5 rounded-2xl ${difference === 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  <p className="text-[9px] font-black uppercase opacity-50">Écart de caisse</p>
                  <p className="text-xl font-black">{difference.toLocaleString()} F</p>
                </div>
              )}

              <button 
                onClick={handleRegisterClosing}
                disabled={isClosing}
                className="w-full py-5 bg-[#00D9FF] text-black rounded-[25px] font-black text-xs uppercase shadow-xl border-none cursor-pointer hover:brightness-110 active:scale-95 transition-all"
              >
                {isClosing ? "Traitement..." : "Valider la clôture"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniRow({ label, value, icon, isDarkMode }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-black uppercase opacity-60 tracking-tight">{label}</span>
      </div>
      <span className="text-xs font-black">{value.toLocaleString()} F</span>
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