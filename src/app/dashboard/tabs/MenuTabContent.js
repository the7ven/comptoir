"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit3, Trash2, AlertCircle, X, ShoppingBag, 
  Minus, RotateCcw, Utensils, Beer, List, Search, Printer, Bluetooth, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
// import { printViaBluetooth } from '@/lib/bluetoothPrint'; // Décommente si ton driver est prêt

export default function MenuTabContent({ isDarkMode, cart, setCart, setActiveTab, pendingOrder, setPendingOrder, userProfile }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [orderType, setOrderType] = useState(pendingOrder?.order_type || "Sur place");
  const [tableNum, setTableNum] = useState(pendingOrder?.table_number || "");

  useEffect(() => { 
    if (userProfile) {
      fetchDishes(); 
    }
    if (pendingOrder) {
        setOrderType(pendingOrder.order_type || "Sur place");
        setTableNum(pendingOrder.table_number || "");
    }
  }, [pendingOrder, userProfile]);

 const fetchDishes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dishes')
        .select('*')
        // .ilike est insensible à la casse (Case Insensitive)
        .ilike('owner_email', userProfile.owner_email.trim()) 
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      console.log("3. Données reçues :", data);
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

  const finalizeOrder = async () => {
    if (orderType === "Sur place" && !tableNum) return alert("Précisez le numéro de table.");
    const total = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    
    try {
      const { error } = await supabase.from('orders').insert([{
        restaurant_id: userProfile.id, // ID de celui qui crée (proprio ou caissier)
        owner_email: userProfile.owner_email, // Indispensable pour la visibilité partagée
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
    } catch (error) { alert("Erreur commande: " + error.message); }
  };

  const handleSaveDish = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const dishData = {
        restaurant_id: userProfile.id,
        owner_email: userProfile.owner_email, // On tague le plat avec l'email proprio
        name: formData.get('name'),
        price: parseInt(formData.get('price')),
        category: formData.get('category'),
        image_url: formData.get('image'),
        status: 'Disponible'
      };

      if (editingItem?.id) {
        await supabase.from('dishes').update(dishData).eq('id', editingItem.id);
      } else {
        await supabase.from('dishes').insert([dishData]);
      }
      setIsModalOpen(false);
      fetchDishes();
    } catch (error) { alert("Erreur sauvegarde"); }
  };

  const confirmDeleteDish = async () => {
    try {
      await supabase.from('dishes').delete().eq('id', itemToDelete.id);
      setIsDeleteModalOpen(false);
      fetchDishes();
    } catch (error) { alert("Erreur suppression"); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 opacity-50">
      <Loader2 className="animate-spin text-[#00D9FF] mb-2" />
      <p className="text-[10px] font-black uppercase tracking-widest">Chargement du menu...</p>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 no-print min-h-screen text-left">
      
      {/* --- PANIER (Look Épuré) --- */}
      <div className={`w-full lg:w-96 flex flex-col rounded-[40px] shrink-0 lg:sticky lg:top-8 h-fit max-h-[calc(100vh-120px)] ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white shadow-2xl'}`}>
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag className="text-[#00D9FF]" size={22} />
            <h3 className="font-black italic tracking-tighter text-2xl uppercase">Panier</h3>
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="p-2 rounded-xl text-red-500/50 hover:text-red-500 transition-all"><RotateCcw size={18} /></button>
          )}
        </div>

        <div className="overflow-y-auto px-6 space-y-4 flex-1 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center opacity-10 italic text-xs">
              <Utensils size={40} className="mb-4" />
              <p className="uppercase font-black tracking-widest">Sélectionnez des plats</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className={`p-5 rounded-[25px] flex items-center justify-between ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="text-left flex-1 pr-2">
                  <p className="text-xs font-black uppercase leading-tight mb-1">{item.name}</p>
                  <p className="text-[10px] font-bold text-[#00D9FF]">{item.price.toLocaleString()} F</p>
                </div>
                <div className="flex items-center gap-3 bg-black/20 rounded-xl px-3 py-1.5">
                  <button onClick={() => updateQuantity(item.id, -1)} className="hover:text-red-500"><Minus size={14} /></button>
                  <span className="text-sm font-black w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="hover:text-[#00D9FF]"><Plus size={14} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-8 mt-4 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className={`p-4 rounded-2xl text-[10px] font-black uppercase outline-none border-none ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                <option value="Sur place">Sur place</option>
                <option value="Emporter">Emporter</option>
              </select>
              {orderType === "Sur place" && (
                <input type="text" placeholder="Table" value={tableNum} onChange={(e) => setTableNum(e.target.value)} className={`p-4 rounded-2xl text-[10px] font-black uppercase outline-none border-none ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`} />
              )}
            </div>
            
            <div className="flex justify-between items-center py-4 border-t border-white/5">
              <div className="text-left">
                <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.2em]">Total Commande</p>
                <p className="text-3xl font-black italic text-[#00D9FF]">{cart.reduce((a, b) => a + (b.price * b.quantity), 0).toLocaleString()} <span className="text-sm opacity-50">F</span></p>
              </div>
            </div>

            <button onClick={finalizeOrder} className="w-full py-5 bg-[#00D9FF] text-black rounded-[25px] font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-cyan-500/20">
              Valider l'envoi
            </button>
          </div>
        )}
      </div>

      {/* --- GRILLE MENU --- */}
      <div className="flex-1 w-full text-left">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-12 gap-8">
          <div className="text-left">
            <h3 className="text-4xl font-black italic tracking-tighter uppercase mb-6">Menu de la Maison</h3>
            <div className="flex flex-wrap gap-3">
              <CategoryButton label="Tous" active={activeCategory === "Tous"} onClick={() => setActiveCategory("Tous")} icon={<List size={14}/>} />
              <CategoryButton label="Cuisine" active={activeCategory === "Plats"} onClick={() => setActiveCategory("Plats")} icon={<Utensils size={14}/>} />
              <CategoryButton label="Bar" active={activeCategory === "Boissons"} onClick={() => setActiveCategory("Boissons")} icon={<Beer size={14}/>} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
            <div className={`flex items-center px-6 py-4 rounded-[25px] transition-all ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white shadow-lg'}`}>
              <Search size={20} className="opacity-20 mr-4" />
              <input type="text" placeholder="Rechercher un plat..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-sm font-bold w-full sm:w-48" />
            </div>
            {/* Seul l'owner peut ajouter des plats si tu veux, ou tout le monde */}
            <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-[#00D9FF] text-black px-8 py-4 rounded-[25px] font-black text-xs uppercase flex items-center justify-center gap-3 shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all">
              <Plus size={18} strokeWidth={3} /> Nouveau Plat
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8 pb-24">
          {filteredItems.map((item) => (
            <div key={item.id} className={`group relative rounded-[45px] overflow-hidden transition-all ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white shadow-xl'}`}>
              <div className="h-56 relative overflow-hidden">
                <img src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500'} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center gap-4 backdrop-blur-[2px]">
                  <button onClick={() => addToCart(item)} className="w-16 h-16 bg-[#00D9FF] text-black rounded-[25px] flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"><Plus size={32} strokeWidth={3} /></button>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-3 rounded-2xl bg-white/10 text-white hover:bg-white hover:text-black transition-all"><Edit3 size={18} /></button>
                    <button onClick={() => { setItemToDelete(item); setIsDeleteModalOpen(true); }} className="p-3 rounded-2xl bg-white/10 text-white hover:bg-red-500 transition-all"><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
              <div className="p-8 text-left">
                <h4 className="text-xl font-black uppercase tracking-tighter mb-1">{item.name}</h4>
                <div className="flex justify-between items-center">
                   <p className="text-[#00D9FF] font-black text-lg italic">{item.price?.toLocaleString()} F</p>
                   <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-20">{item.category}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- MODALES (Design Cohérent) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <form onSubmit={handleSaveDish} className={`w-full max-w-lg rounded-[50px] p-12 relative ${isDarkMode ? 'bg-[#0a0a0a] text-white' : 'bg-white text-gray-900 shadow-2xl'}`}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 opacity-30 hover:opacity-100"><X /></button>
            <h3 className="text-3xl font-black mb-10 italic uppercase tracking-tighter">{editingItem?.id ? "Mise à jour" : "Nouveau Plat"}</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                 <p className="text-[10px] font-black uppercase opacity-40 ml-4 tracking-widest">Nom du délice</p>
                 <input name="name" required defaultValue={editingItem?.name} className={`w-full px-8 py-5 rounded-[25px] outline-none border-none ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`} placeholder="Poulet Braisé..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase opacity-40 ml-4 tracking-widest">Prix (FCFA)</p>
                  <input name="price" type="number" required defaultValue={editingItem?.price} className={`w-full px-8 py-5 rounded-[25px] outline-none border-none ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`} placeholder="5000" />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase opacity-40 ml-4 tracking-widest">Catégorie</p>
                  <select name="category" defaultValue={editingItem?.category || "Plats"} className={`w-full px-8 py-5 rounded-[25px] outline-none border-none ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                    <option value="Plats">Cuisine</option>
                    <option value="Boissons">Bar</option>
                    <option value="Accompagnements">Extras</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase opacity-40 ml-4 tracking-widest">Lien de l'image</p>
                <input name="image" type="text" defaultValue={editingItem?.image_url} className={`w-full px-8 py-5 rounded-[25px] outline-none border-none ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`} placeholder="https://..." />
              </div>
              <div className="flex gap-4 pt-8">
                <button type="submit" className="flex-1 py-5 rounded-[25px] font-black bg-[#00D9FF] text-black uppercase tracking-widest shadow-xl shadow-cyan-500/20 hover:scale-105 transition-all">Confirmer</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`w-full max-w-sm rounded-[50px] p-12 text-center ${isDarkMode ? 'bg-[#0a0a0a] text-white' : 'bg-white'}`}>
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8">
               <AlertCircle size={40} />
            </div>
            <h3 className="text-2xl font-black mb-4 uppercase tracking-tighter italic">Suppression ?</h3>
            <p className="text-sm opacity-40 mb-10 font-medium">Cette action est irréversible pour ce produit.</p>
            <div className="flex gap-4">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-5 rounded-[25px] font-bold bg-white/5 hover:bg-white/10 transition-all uppercase text-[10px] tracking-widest">Annuler</button>
              <button onClick={confirmDeleteDish} className="flex-1 py-5 rounded-[25px] font-black bg-red-500 text-white uppercase text-[10px] tracking-widest shadow-xl shadow-red-500/20 hover:scale-105 transition-all">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryButton({ label, active, onClick, icon }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 px-8 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] transition-all border-none cursor-pointer ${active ? "bg-[#00D9FF] text-black shadow-lg shadow-cyan-500/30 scale-105" : "bg-white/5 text-white/30 hover:text-white hover:bg-white/10"}`}>
      {icon} {label}
    </button>
  );
}