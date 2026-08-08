"use client";

import React, { useState, useEffect } from 'react';
import { Package, Plus, AlertTriangle, ArrowRight, Trash2, Edit } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function StockTabContent({ isDarkMode }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('restaurant_id', user.id) // ISOLATION SÉCURISÉE
        .order('name', { ascending: true });

      if (error) throw error;
      setInventory(data || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const quantity = parseInt(formData.get('quantity'), 10);
      const minThreshold = parseInt(formData.get('threshold'), 10);
      if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(minThreshold) || minThreshold < 0) {
        alert("La quantité et le seuil doivent être des nombres positifs.");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('inventory').insert([{
        restaurant_id: user.id,
        name: formData.get('name'),
        quantity,
        min_threshold: minThreshold,
        unit: formData.get('unit')
      }]);

      if (error) throw error;
      setIsModalOpen(false);
      fetchStock();
    } catch (err) {
      console.error(err);
      alert("Impossible d'enregistrer cet article de stock.");
    }
  };

  return (
    <div className="fade-in text-left pb-10">
      <div className="flex justify-between items-center mb-10">
        <h3 className="text-3xl font-black italic tracking-tighter uppercase">Inventaire & Stocks</h3>
        <button onClick={() => setIsModalOpen(true)} className="bg-[#00D9FF] text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">
          Ajouter un article
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {inventory.map((item) => (
          <div key={item.id} className={`p-8 rounded-[40px] border relative overflow-hidden ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
            {item.quantity <= item.min_threshold && (
              <div className="absolute top-0 right-0 p-4"><AlertTriangle className="text-orange-500 animate-bounce" size={20}/></div>
            )}
            <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">{item.unit}</p>
            <h4 className="text-xl font-black italic tracking-tighter mb-4">{item.name}</h4>
            <div className="flex items-end gap-2">
              <span className={`text-3xl font-black ${item.quantity <= item.min_threshold ? 'text-orange-500' : 'text-[#00D9FF]'}`}>{item.quantity}</span>
              <span className="text-[10px] font-bold opacity-30 mb-2 uppercase">En stock</span>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
          <form onSubmit={handleAddStock} className={`w-full max-w-sm p-10 rounded-[45px] border ${isDarkMode ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-gray-100 shadow-2xl'}`}>
            <h3 className="text-xl font-black mb-8 italic uppercase tracking-tighter">Nouvel Article</h3>
            <div className="space-y-6">
              <input name="name" required placeholder="Nom (ex: Huile de palme)" className={`w-full px-6 py-4 rounded-2xl border outline-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`} />
              <div className="grid grid-cols-2 gap-4">
                <input name="quantity" type="number" required placeholder="Qté initiale" className={`w-full px-6 py-4 rounded-2xl border outline-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`} />
                <input name="threshold" type="number" required placeholder="Seuil alerte" className={`w-full px-6 py-4 rounded-2xl border outline-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`} />
              </div>
              <input name="unit" required placeholder="Unité (Litre, Kg, Carton)" className={`w-full px-6 py-4 rounded-2xl border outline-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`} />
              <button type="submit" className="w-full py-5 bg-[#00D9FF] text-black rounded-2xl font-black uppercase text-[10px] tracking-widest mt-4">Confirmer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}