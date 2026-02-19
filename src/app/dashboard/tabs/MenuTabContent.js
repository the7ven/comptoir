"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit3, Trash2, AlertCircle, X, ShoppingBag, 
  Minus, RotateCcw, Utensils, Beer, List, Search, Printer, Bluetooth
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { printViaBluetooth } from '@/lib/bluetoothPrint'; // Ton driver Bluetooth

export default function MenuTabContent({ isDarkMode, cart, setCart, setActiveTab, pendingOrder, setPendingOrder }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPrinting, setIsPrinting] = useState(false); // État pour l'animation d'impression
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [orderType, setOrderType] = useState(pendingOrder?.order_type || "Sur place");
  const [tableNum, setTableNum] = useState(pendingOrder?.table_number || "");

  useEffect(() => { 
    fetchDishes(); 
    if (pendingOrder) {
        setOrderType(pendingOrder.order_type || "Sur place");
        setTableNum(pendingOrder.table_number || "");
    }
  }, [pendingOrder]);

  const fetchDishes = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from('dishes')
        .select('*')
        .eq('restaurant_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setItems(data || []);
    } catch (error) { 
      console.error('Erreur:', error.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeCategory === "Tous") return matchesSearch;
    if (activeCategory === "Plats") {
      return matchesSearch && (item.category === "Plats" || item.category === "Accompagnements");
    }
    return matchesSearch && item.category === activeCategory;
  });

  const addToCart = (dish) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === dish.id);
      if (existing) {
        return prev.map(item => 
          item.id === dish.id ? { ...item, quantity: (item.quantity || 1) + 1 } : item
        );
      }
      return [...prev, { ...dish, quantity: 1 }];
    });
  };

  const updateQuantity = (dishId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === dishId) {
        const newQty = (item.quantity || 1) + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const clearCart = () => {
    if (cart.length > 0 && confirm("Voulez-vous vider tout le panier ?")) {
      setCart([]);
    }
  };

  // --- LOGIQUE D'IMPRESSION BLUETOOTH DIRECTE ---
  const handlePrint = async () => {
    if (cart.length === 0) return;
    setIsPrinting(true);
    try {
      // Appelle la fonction utilitaire dans lib/bluetoothPrint.js
      await printViaBluetooth(cart, tableNum, orderType);
    } catch (error) {
      alert("Erreur Bluetooth : Vérifiez la connexion avec l'imprimante.");
    } finally {
      setIsPrinting(false);
    }
  };

  const finalizeOrder = async () => {
    if (orderType === "Sur place" && !tableNum) return alert("Précisez le numéro de table.");
    const total = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.from('orders').insert([{
        restaurant_id: session.user.id,
        table_number: orderType === "Emporter" ? "Emporter" : `Table ${tableNum}`,
        items_summary: cart.map(item => `${item.quantity}x ${item.name}`).join(", "),
        items_details: cart,
        total_amount: total,
        status: "En cours"
      }]);
      if (error) throw error;
      setCart([]);
      setPendingOrder(null); 
      setActiveTab("orders");
    } catch (error) { alert("Erreur: " + error.message); }
  };

  const handleSaveDish = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const dishData = {
        restaurant_id: session.user.id,
        name: formData.get('name'),
        price: parseInt(formData.get('price')),
        category: formData.get('category'),
        image_url: formData.get('image'),
        status: 'Disponible'
      };
      if (editingItem?.id) {
        await supabase.from('dishes').update(dishData).eq('id', editingItem.id).eq('restaurant_id', session.user.id);
      } else {
        await supabase.from('dishes').insert([dishData]);
      }
      setIsModalOpen(false);
      fetchDishes();
    } catch (error) { alert("Erreur sauvegarde"); }
  };

  const confirmDeleteDish = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('dishes').delete().eq('id', itemToDelete.id).eq('restaurant_id', session.user.id);
      setIsDeleteModalOpen(false);
      fetchDishes();
    } catch (error) { alert("Erreur suppression"); }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 no-print min-h-screen">
      
      {/* --- PANIER --- */}
      <div className={`w-full lg:w-96 flex flex-col rounded-[35px] lg:rounded-[45px] border transition-all shrink-0 lg:sticky lg:top-8 h-fit max-h-[calc(100vh-100px)] ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-xl'}`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag className="text-[#00D9FF]" size={20} />
            <h3 className="font-black italic tracking-tighter text-xl uppercase">Panier</h3>
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-all"><RotateCcw size={18} /></button>
          )}
        </div>

        <div className="overflow-y-auto p-4 space-y-3 flex-1 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center opacity-20 italic text-sm text-left">
              <Plus size={40} className="mb-2" />
              <p>Panier vide</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className={`p-4 rounded-2xl flex items-center justify-between ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="text-left flex-1 pr-2">
                  <p className="text-[10px] font-black uppercase leading-none mb-1">{item.name}</p>
                  <p className="text-[10px] font-bold text-[#00D9FF]">{item.price.toLocaleString()} F</p>
                </div>
                <div className="flex items-center gap-2 bg-black/10 dark:bg-white/5 rounded-xl px-2 py-1">
                  <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-red-500"><Minus size={12} /></button>
                  <span className="text-xs font-black">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-[#00D9FF]"><Plus size={12} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-white/5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className={`p-3 rounded-xl text-[10px] font-black uppercase outline-none ${isDarkMode ? 'bg-[#1a1a1a] border-white/10' : 'bg-gray-50'}`}>
                <option value="Sur place">Sur place</option>
                <option value="Emporter">Emporter</option>
              </select>
              {orderType === "Sur place" && (
                <input type="text" placeholder="Table" value={tableNum} onChange={(e) => setTableNum(e.target.value)} className={`p-3 rounded-xl text-[10px] font-black uppercase outline-none ${isDarkMode ? 'bg-[#1a1a1a] border-white/10' : 'bg-gray-50'}`} />
              )}
            </div>
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="text-left">
                <p className="text-[9px] font-black opacity-40 uppercase tracking-widest">Total</p>
                <p className="text-xl font-black italic text-[#00D9FF]">{cart.reduce((a, b) => a + (b.price * b.quantity), 0).toLocaleString()} F</p>
              </div>
              <button 
                onClick={handlePrint} 
                disabled={isPrinting}
                className={`p-3 rounded-xl transition-all ${isPrinting ? 'bg-orange-500 text-white animate-pulse' : 'bg-white/5 text-white/50 hover:text-[#00D9FF]'}`}
              >
                {isPrinting ? <Bluetooth size={20}/> : <Printer size={20}/>}
              </button>
            </div>
            <button onClick={finalizeOrder} className="w-full py-4 bg-[#00D9FF] text-black rounded-2xl font-black text-[10px] uppercase active:scale-95 transition-all">Valider la commande</button>
          </div>
        )}
      </div>

      {/* --- GRILLE MENU --- */}
      <div className="flex-1 w-full text-left">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 gap-6">
          <div className="text-left w-full xl:w-auto">
            <h3 className="text-3xl font-black italic tracking-tighter uppercase">Menu Restaurant</h3>
            <div className="flex flex-wrap gap-3 mt-6">
              <CategoryButton label="Tous" active={activeCategory === "Tous"} onClick={() => setActiveCategory("Tous")} icon={<List size={14}/>} />
              <CategoryButton label="Cuisine" active={activeCategory === "Plats"} onClick={() => setActiveCategory("Plats")} icon={<Utensils size={14}/>} />
              <CategoryButton label="Bar" active={activeCategory === "Boissons"} onClick={() => setActiveCategory("Boissons")} icon={<Beer size={14}/>} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
            <div className={`flex items-center px-4 py-3 rounded-2xl border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 focus-within:border-[#00D9FF]' : 'bg-white border-gray-200 shadow-sm'}`}>
              <Search size={18} className="opacity-30 mr-3" />
              <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-xs font-bold w-full sm:w-40" />
            </div>
            <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-[#00D9FF] text-black px-8 py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-3">
              <Plus size={18} /> Ajouter
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-6 pb-20">
          {filteredItems.map((item) => (
            <div key={item.id} className={`group relative rounded-[35px] overflow-hidden border transition-all ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100'}`}>
              <div className="h-44 relative overflow-hidden">
                <img src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500'} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                  <button onClick={() => addToCart(item)} className="w-12 h-12 bg-[#00D9FF] text-black rounded-2xl flex items-center justify-center"><Plus size={24} strokeWidth={3} /></button>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-[#00D9FF] hover:text-black transition-all"><Edit3 size={16} /></button>
                    <button onClick={() => { setItemToDelete(item); setIsDeleteModalOpen(true); }} className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-red-500 transition-all"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
              <div className="p-6 text-left">
                <h4 className="text-lg font-black uppercase">{item.name}</h4>
                <p className="text-[#00D9FF] font-black text-sm">{item.price?.toLocaleString()} F</p>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-30 italic">{item.category}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- MODALES RESTÉES ACCESSIBLES À TOUS --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 backdrop-blur-xl bg-black/60">
          <form onSubmit={handleSaveDish} className={`w-full max-w-lg rounded-[45px] p-10 border shadow-2xl ${isDarkMode ? 'bg-[#0a0a0a] border-white/10 text-white' : 'bg-white border-gray-100 text-gray-900'}`}>
            <h3 className="text-2xl font-black mb-8 italic uppercase">{editingItem?.id ? "Modifier" : "Nouveau Produit"}</h3>
            <div className="space-y-6">
              <input name="name" required defaultValue={editingItem?.name} className={`w-full px-6 py-4 rounded-2xl border outline-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50'}`} placeholder="Nom du produit" />
              <div className="grid grid-cols-2 gap-4">
                <input name="price" type="number" required defaultValue={editingItem?.price} className={`w-full px-6 py-4 rounded-2xl border outline-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50'}`} placeholder="Prix (F)" />
                <select name="category" defaultValue={editingItem?.category || "Plats"} className={`w-full px-6 py-4 rounded-2xl border outline-none ${isDarkMode ? 'bg-[#151515] border-white/10' : 'bg-gray-50'}`}>
                  <option value="Plats">Plat / Accompagnement</option>
                  <option value="Boissons">Boisson</option>
                  <option value="Accompagnements">Accompagnement (Optionnel)</option>
                </select>
              </div>
              <input name="image" type="text" defaultValue={editingItem?.image_url} className={`w-full px-6 py-4 rounded-2xl border outline-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50'}`} placeholder="URL Image" />
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold opacity-50">Annuler</button>
                <button type="submit" className="flex-1 py-4 rounded-2xl font-black bg-[#00D9FF] text-black uppercase">Enregistrer</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 backdrop-blur-md bg-black/40">
          <div className={`w-full max-w-sm rounded-[40px] p-8 border ${isDarkMode ? 'bg-[#0f0f0f] border-white/10 text-white' : 'bg-white border-gray-200'}`}>
            <AlertCircle size={32} className="text-red-500 mx-auto mb-6" />
            <h3 className="text-xl font-black text-center mb-8 uppercase tracking-tighter">Supprimer ?</h3>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold bg-white/5">Non</button>
              <button onClick={confirmDeleteDish} className="flex-1 py-4 rounded-2xl font-black bg-red-500 text-white uppercase">Oui</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryButton({ label, active, onClick, icon }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${active ? "bg-[#00D9FF] text-black shadow-lg shadow-cyan-500/30" : "bg-white/5 border border-white/5 text-white/40 hover:text-white"}`}>
      {icon} {label}
    </button>
  );
}