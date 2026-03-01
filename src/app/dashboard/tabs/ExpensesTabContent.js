"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Trash2, AlertCircle, 
  FileText, Calendar as CalendarIcon, Wallet, 
  ArrowDownCircle, Loader2, X 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ExpensesTabContent({ isDarkMode, selectedDate, userProfile }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [period, setPeriod] = useState("day"); // Nouvel état pour la période

  useEffect(() => {
    if (userProfile) {
      fetchExpenses();
    }
  }, [selectedDate, userProfile, period]); // Ajout de period dans les dépendances

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const date = new Date(selectedDate);
      let start, end;

      // LOGIQUE DE CALCUL DES PÉRIODES
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
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('owner_email', userProfile.owner_email)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
      setTotalExpenses(data?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0);
    } catch (err) {
      console.error("Erreur chargement dépenses:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      if (!userProfile) throw new Error("Profil utilisateur non chargé");

      const { error } = await supabase.from('expenses').insert([{
        restaurant_id: userProfile.id,
        owner_email: userProfile.owner_email,
        label: formData.get('label'), 
        amount: Number(formData.get('amount')),
        category: formData.get('category'),
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;
      
      setIsModalOpen(false);
      fetchExpenses();
    } catch (err) {
      console.error("Détails de l'erreur :", err);
      alert("Erreur : " + (err.message || "Problème d'enregistrement"));
    }
  };

  const deleteExpense = async (id) => {
    if (confirm("Supprimer cette dépense ?")) {
      try {
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', id)
          .eq('owner_email', userProfile.owner_email);

        if (error) throw error;
        fetchExpenses();
      } catch (err) {
        alert("Erreur lors de la suppression");
      }
    }
  };

  return (
    <div className="fade-in text-left pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h3 className="text-3xl font-black italic tracking-tighter uppercase">Gestion des Dépenses</h3>
          <p className="opacity-50 text-[10px] font-black uppercase tracking-widest italic text-[#00D9FF]">
            Total {period} : {totalExpenses.toLocaleString()} F
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
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

          <button onClick={() => setIsModalOpen(true)} className="bg-red-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-3 border-none cursor-pointer hover:bg-red-600 transition-all active:scale-95">
            <Plus size={18} /> Enregistrer un achat
          </button>
        </div>
      </div>

      <div className={`rounded-[40px] border overflow-hidden ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-xl'}`}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={isDarkMode ? "bg-white/[0.02]" : "bg-gray-50"}>
              <th className="px-8 py-5 text-[10px] uppercase font-black opacity-30">Désignation</th>
              <th className="px-8 py-5 text-[10px] uppercase font-black opacity-30">Catégorie</th>
              <th className="px-8 py-5 text-[10px] uppercase font-black opacity-30 text-right">Montant</th>
              <th className="px-8 py-5 text-[10px] uppercase font-black opacity-30 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {loading ? (
               <tr><td colSpan="4" className="px-8 py-20 text-center"><Loader2 className="animate-spin mx-auto opacity-20 text-[#00D9FF]" /></td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan="4" className="px-8 py-20 text-center opacity-20 italic">Aucune dépense pour cette période</td></tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} className="group hover:bg-white/[0.01] transition-all">
                  <td className="px-8 py-6">
                    <p className="font-bold text-sm mb-1">{exp.label}</p>
                    <p className="text-[8px] opacity-30 font-black uppercase tracking-tighter">{new Date(exp.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="px-8 py-6 opacity-40 text-[10px] font-black uppercase tracking-widest">{exp.category}</td>
                  <td className="px-8 py-6 text-right font-black text-red-500">{exp.amount.toLocaleString()} F</td>
                  <td className="px-8 py-6 text-right">
                    <button onClick={() => deleteExpense(exp.id)} className="p-2 text-red-500 md:opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer hover:scale-110"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
          <form onSubmit={handleAddExpense} className={`w-full max-w-sm p-10 rounded-[45px] border ${isDarkMode ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-gray-100 shadow-2xl'}`}>
            <h3 className={`text-xl font-black mb-8 italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-black'}`}>Nouvelle Dépense</h3>
            <div className="space-y-6">
              <input name="label" required placeholder="Désignation (ex: Sac de riz)" className={`w-full px-6 py-4 rounded-2xl border outline-none font-bold ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-red-500' : 'bg-gray-50 border-gray-100'}`} />
              <input name="amount" type="number" required placeholder="Montant (F)" className={`w-full px-6 py-4 rounded-2xl border outline-none font-bold ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-red-500' : 'bg-gray-50 border-gray-100'}`} />
              <select name="category" className={`w-full px-6 py-4 rounded-2xl border outline-none font-black text-[10px] uppercase tracking-widest ${isDarkMode ? 'bg-[#151515] border-white/10 text-white' : 'bg-gray-50 border-gray-100'}`}>
                <option>Approvisionnement</option>
                <option>Loyer & Factures</option>
                <option>Salaire</option>
                <option>Marketing</option>
                <option>Entretien</option>
                <option>Autre</option>
              </select>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className={`flex-1 font-black text-[10px] uppercase tracking-widest border-none bg-transparent cursor-pointer ${isDarkMode ? 'text-white/40' : 'text-gray-400'}`}>Annuler</button>
                <button type="submit" className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-600 transition-colors border-none cursor-pointer shadow-lg shadow-red-500/20">Enregistrer</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}