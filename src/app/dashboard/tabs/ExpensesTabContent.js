"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Trash2, AlertCircle, 
  FileText, Calendar as CalendarIcon, Wallet, 
  ArrowDownCircle, Loader2, X 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ExpensesTabContent({ isDarkMode, selectedDate }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);

  useEffect(() => {
    fetchExpenses();
  }, [selectedDate]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const start = `${selectedDate}T00:00:00.000Z`;
      const end = `${selectedDate}T23:59:59.999Z`;

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('restaurant_id', session.user.id)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
      setTotalExpenses(data?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée");

      // MISE À JOUR : On utilise 'label' au lieu de 'description'
      const { error } = await supabase.from('expenses').insert([{
        restaurant_id: session.user.id,
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
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('expenses').delete().eq('id', id).eq('restaurant_id', session.user.id);
      fetchExpenses();
    }
  };

  return (
    <div className="fade-in text-left pb-10">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h3 className="text-3xl font-black italic tracking-tighter uppercase">Gestion des Dépenses</h3>
          <p className="opacity-50 text-[10px] font-black uppercase tracking-widest italic">Total jour : {totalExpenses.toLocaleString()} F</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-red-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-3">
          <Plus size={18} /> Enregistrer un achat
        </button>
      </div>

      <div className={`rounded-[40px] border overflow-hidden ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-xl'}`}>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/[0.02]">
              <th className="px-8 py-5 text-[10px] uppercase font-black opacity-30">Désignation</th>
              <th className="px-8 py-5 text-[10px] uppercase font-black opacity-30">Catégorie</th>
              <th className="px-8 py-5 text-[10px] uppercase font-black opacity-30 text-right">Montant</th>
              <th className="px-8 py-5 text-[10px] uppercase font-black opacity-30 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {loading ? (
               <tr><td colSpan="4" className="px-8 py-20 text-center"><Loader2 className="animate-spin mx-auto opacity-20" /></td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan="4" className="px-8 py-20 text-center opacity-20 italic">Aucune dépense enregistrée</td></tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} className="group hover:bg-white/[0.01]">
                  {/* MISE À JOUR : On affiche exp.label */}
                  <td className="px-8 py-6 font-bold text-sm">{exp.label}</td>
                  <td className="px-8 py-6 opacity-40 text-xs font-black uppercase">{exp.category}</td>
                  <td className="px-8 py-6 text-right font-black text-red-400">{exp.amount.toLocaleString()} F</td>
                  <td className="px-8 py-6 text-right">
                    <button onClick={() => deleteExpense(exp.id)} className="p-2 text-red-500 md:opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
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
            <h3 className="text-xl font-black mb-8 italic uppercase tracking-tighter text-white">Nouvelle Dépense</h3>
            <div className="space-y-6">
              {/* Le name="label" ici doit correspondre au formData.get('label') plus haut */}
              <input name="label" required placeholder="Désignation (ex: Sac de riz)" className={`w-full px-6 py-4 rounded-2xl border outline-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-100'}`} />
              <input name="amount" type="number" required placeholder="Montant (F)" className={`w-full px-6 py-4 rounded-2xl border outline-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-100'}`} />
              <select name="category" className={`w-full px-6 py-4 rounded-2xl border outline-none ${isDarkMode ? 'bg-[#151515] border-white/10 text-white' : 'bg-gray-50 border-gray-100'}`}>
                <option>Approvisionnement</option>
                <option>Loyer & Factures</option>
                <option>Salaire</option>
                <option>Autre</option>
              </select>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className={`flex-1 font-bold ${isDarkMode ? 'text-white/40' : 'text-gray-400'}`}>Annuler</button>
                <button type="submit" className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-red-600 transition-colors">Enregistrer</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
