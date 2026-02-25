"use client";

import React, { useState, useEffect } from "react";
import {
  ShoppingBag, Clock, CheckCircle2, Plus, Flame, Utensils,
  Search, Trash2, AlertCircle, X, Check, Printer, Receipt, Edit3, Loader2, Send, Beer
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { printViaBluetooth } from '@/lib/bluetoothPrint'; 

export default function OrdersTabContent({
  isDarkMode, setActiveTab, setCart, setPendingOrder, selectedDate, userProfile
}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [selectedOrderForBill, setSelectedOrderForBill] = useState(null);
  const [previewOrder, setPreviewOrder] = useState(null); 
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (userProfile) {
      fetchOrders();
      const subscription = supabase
        .channel("orders_live")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchOrders)
        .subscribe();
      return () => { supabase.removeChannel(subscription); };
    }
  }, [selectedDate, userProfile]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const startOfDay = `${selectedDate}T00:00:00.000Z`;
      const endOfDay = `${selectedDate}T23:59:59.999Z`;

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("owner_email", userProfile.owner_email) 
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) { console.error("Erreur:", error.message); } 
    finally { setLoading(false); }
  };

  // --- LOGIQUE ENVOI DISPATCHÉ ---
  const sendToPrinter = async (items, target, table) => {
    if (items.length === 0) return alert("Rien à imprimer ici.");
    setIsPrinting(true);
    try {
      const ticketData = {
        title: target === "KITCHEN" ? "BON CUISINE" : "BON BAR",
        table: table, // Numéro de table inclus ici
        date: new Date().toLocaleTimeString("fr-FR"),
        items: items.map(item => ({
          name: item.name.toUpperCase(),
          qty: item.quantity
        })),
        footer: target === "KITCHEN" ? "*** SECTION CUISINE ***" : "*** SECTION BAR ***"
      };

      await printViaBluetooth(ticketData); 
      alert("Impression lancée !");
    } catch (error) {
      alert("Erreur Bluetooth.");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleUpdateStatus = async (order) => {
    try {
      const nextStatus = order.status === "En cours" ? "Prêt" : "Servi";
      if (order.status === "Prêt") {
        await supabase.from("transactions").insert([{
          restaurant_id: userProfile.id,
          owner_email: userProfile.owner_email,
          table_number: order.table_number,
          amount: order.total_amount,
          payment_method: "Espèces",
          items: order.items_details || [],
        }]);
      }
      await supabase.from("orders").update({ status: nextStatus }).eq("id", order.id);
      fetchOrders();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteOrder = async () => {
    await supabase.from("orders").delete().eq("id", orderToDelete.id);
    setIsDeleteModalOpen(false);
    fetchOrders();
  };

  // Filtrage pour les aperçus
  const kitchenItems = previewOrder?.items_details.filter(i => ["Plats", "Accompagnements"].includes(i.category)) || [];
  const barItems = previewOrder?.items_details.filter(i => !["Plats", "Accompagnements"].includes(i.category)) || [];

  return (
    <div className="fade-in text-left pb-20">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 no-print">
        <div className="text-left">
          <h3 className="text-2xl font-black italic tracking-tighter uppercase">Commandes</h3>
          <p className="opacity-40 text-[9px] font-black uppercase tracking-widest">Multi-Dispatch Bluetooth</p>
        </div>
        <button onClick={() => setActiveTab("menu")} className="bg-[#00D9FF] text-black px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all border-none cursor-pointer flex items-center gap-2">
          <Plus size={16} strokeWidth={3} /> Nouveau
        </button>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 no-print">
        <QuickStat isDarkMode={isDarkMode} label="En attente" value={orders.filter((o) => o.status === "En cours").length} icon={<Flame size={18} className="text-orange-500" />} />
        <QuickStat isDarkMode={isDarkMode} label="Prêts" value={orders.filter((o) => o.status === "Prêt").length} icon={<Utensils size={18} className="text-green-500" />} />
        <QuickStat isDarkMode={isDarkMode} label="Finalisés" value={orders.filter((o) => o.status === "Servi").length} icon={<CheckCircle2 size={18} className="text-[#00D9FF]" />} />
      </div>

      {/* LISTE DES COMMANDES */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 no-print">
        {orders.map((order) => (
          <div key={order.id} className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${isDarkMode ? "bg-[#0a0a0a] border-white/5" : "bg-white border-gray-100 shadow-sm"}`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${order.status === "En cours" ? "bg-[#00D9FF] text-black" : "bg-white/5 text-white/20"}`}>
                {order.table_number?.replace("Table ", "T.")}
              </div>
              <button onClick={() => setPreviewOrder(order)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all border-none cursor-pointer">
                <Printer size={14} />
                <span className="text-[8px] font-black uppercase tracking-tighter">Imprimer</span>
              </button>
            </div>

            <div className="flex-1 mb-4 text-left">
              <p className={`text-sm font-black leading-tight mb-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}>{order.items_summary}</p>
              <div className="flex items-center gap-2 opacity-30">
                <Clock size={10} />
                <span className="text-[9px] font-bold uppercase">{new Date(order.created_at).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            <div className={`pt-4 border-t ${isDarkMode ? "border-white/5" : "border-gray-100"} flex items-center justify-between`}>
              <p className="font-black text-[#00D9FF] text-base">{order.total_amount?.toLocaleString()} F</p>
              <div className="flex gap-1">
                <ActionBtn onClick={() => { setCart(order.items_details); setPendingOrder(order); setActiveTab("menu"); }} icon={<Edit3 size={14}/>} isDarkMode={isDarkMode} />
                <ActionBtn onClick={() => handleUpdateStatus(order)} icon={<Check size={14}/>} isDarkMode={isDarkMode} />
                <ActionBtn onClick={() => setSelectedOrderForBill(order)} icon={<Receipt size={14}/>} isDarkMode={isDarkMode} />
                <ActionBtn onClick={() => { setOrderToDelete(order); setIsDeleteModalOpen(true); }} icon={<Trash2 size={14}/>} isDarkMode={isDarkMode} />
              </div>
            </div>
          </div>
        ))}
      </div>

    {/* --- DOUBLE APERÇU (CUISINE & BAR) --- */}
{previewOrder && (
  <div 
    className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
    onClick={() => setPreviewOrder(null)} // Ferme si on clique sur le fond sombre
  >
    <div 
      className="w-full max-w-4xl flex flex-col md:flex-row gap-6 p-4 relative"
      onClick={(e) => e.stopPropagation()} // Empêche la fermeture si on clique sur les tickets
    >
      
      {/* BOUTON FERMER (CROIX) - Toujours visible en haut à droite */}
      <button 
        onClick={() => setPreviewOrder(null)} 
        className="absolute -top-10 right-4 md:-right-6 text-white/50 hover:text-white transition-all border-none bg-transparent cursor-pointer flex items-center gap-2"
      >
        <span className="text-[10px] font-black uppercase tracking-widest">Fermer</span>
        <X size={24} />
      </button>

      {/* TICKET CUISINE */}
      <div className="flex-1 bg-white text-black p-6 rounded-xl shadow-2xl font-mono border-t-8 border-orange-600">
        <div className="flex justify-between items-center mb-4 border-b border-black pb-2">
          <span className="font-black text-[12px] uppercase">BON CUISINE</span>
          <Utensils size={18} className="text-orange-600" />
        </div>
        <div className="mb-4 text-center py-2 border-b-2 border-black">
          <p className="text-2xl font-black">{previewOrder.table_number}</p>
          <p className="text-[10px] font-bold opacity-60 uppercase">Heure: {new Date().toLocaleTimeString()}</p>
        </div>
        <div className="min-h-[150px] space-y-2 mb-6">
          {kitchenItems.length > 0 ? kitchenItems.map((item, idx) => (
            <div key={idx} className="flex justify-between text-[14px] font-black border-b border-gray-100 py-1 text-left">
              <span>{item.quantity} x {item.name.toUpperCase()}</span>
            </div>
          )) : <p className="text-center opacity-20 italic text-[10px] py-10">Aucun plat</p>}
        </div>
        <button 
          onClick={() => sendToPrinter(kitchenItems, "KITCHEN", previewOrder.table_number)}
          disabled={isPrinting || kitchenItems.length === 0}
          className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border-none cursor-pointer shadow-lg transition-all ${kitchenItems.length > 0 ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-100 text-gray-400 opacity-50'}`}
        >
          <Printer size={16} /> Imprimer Cuisine
        </button>
      </div>

      {/* TICKET BAR */}
      <div className="flex-1 bg-white text-black p-6 rounded-xl shadow-2xl font-mono border-t-8 border-blue-600">
        <div className="flex justify-between items-center mb-4 border-b border-black pb-2">
          <span className="font-black text-[12px] uppercase">BON BAR</span>
          <Beer size={18} className="text-blue-600" />
        </div>
        <div className="mb-4 text-center py-2 border-b-2 border-black">
          <p className="text-2xl font-black">{previewOrder.table_number}</p>
          <p className="text-[10px] font-bold opacity-60 uppercase">Heure: {new Date().toLocaleTimeString()}</p>
        </div>
        <div className="min-h-[150px] space-y-2 mb-6">
          {barItems.length > 0 ? barItems.map((item, idx) => (
            <div key={idx} className="flex justify-between text-[14px] font-black border-b border-gray-100 py-1 text-left">
              <span>{item.quantity} x {item.name.toUpperCase()}</span>
            </div>
          )) : <p className="text-center opacity-20 italic text-[10px] py-10">Aucune boisson</p>}
        </div>
        <button 
          onClick={() => sendToPrinter(barItems, "BAR", previewOrder.table_number)}
          disabled={isPrinting || barItems.length === 0}
          className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border-none cursor-pointer shadow-lg transition-all ${barItems.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 opacity-50'}`}
        >
          <Printer size={16} /> Imprimer Bar
        </button>
      </div>

    </div>
  </div>
)} 

      {/* MODALE SUPPRESSION */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md text-center">
          <div className={`w-full max-w-sm rounded-[32px] p-10 ${isDarkMode ? "bg-[#0a0a0a] border border-white/5" : "bg-white shadow-2xl"}`}>
            <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-black uppercase italic mb-2">Annuler ?</h3>
            <p className="text-xs opacity-40 mb-8 font-medium">Supprimer cette commande ?</p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-4 rounded-xl font-bold bg-white/5 border-none text-current cursor-pointer uppercase text-[10px]">Retour</button>
              <button onClick={handleDeleteOrder} className="flex-1 py-4 rounded-xl font-black bg-red-500 text-white border-none cursor-pointer uppercase text-[10px]">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickStat({ isDarkMode, label, value, icon }) {
  return (
    <div className={`p-4 rounded-2xl border flex items-center gap-3 ${isDarkMode ? "bg-white/[0.02] border-white/5" : "bg-white border-gray-100 shadow-sm"}`}>
      <div className={`p-2 rounded-lg ${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}>{icon}</div>
      <div className="text-left">
        <p className="text-[8px] uppercase tracking-widest opacity-40 font-black">{label}</p>
        <p className="text-lg font-black italic">{value}</p>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, icon, isDarkMode }) {
  return (
    <button onClick={onClick} className={`p-2 rounded-lg transition-all border-none cursor-pointer ${isDarkMode ? "bg-white/5 text-white/30 hover:text-[#00D9FF]" : "bg-gray-50 text-gray-400 hover:text-[#00D9FF]"}`}>
      {icon}
    </button>
  );
}