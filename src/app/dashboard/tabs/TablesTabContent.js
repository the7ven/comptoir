"use client";

import React, { useState, useEffect } from 'react';
import { 
  Grid, Users, Printer, X, 
  Plus, Receipt, CreditCard, CheckCircle2, MoreHorizontal, Clock, AlertCircle, Trash2, Smartphone, Banknote
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function TablesTabContent({ isDarkMode, setActiveTab, setPendingOrder }) {
  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ÉTATS POUR LA FACTURATION ET LA SUPPRESSION (CORRIGÉ)
  const [selectedOrderForBill, setSelectedOrderForBill] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  
  // ÉTATS POUR GESTION DYNAMIQUE
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [multiOrderTable, setMultiOrderTable] = useState(null);

  // NOUVEL ÉTAT POUR LE CHOIX DU PAIEMENT
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);

  useEffect(() => {
    fetchData();
    const subscription = supabase
      .channel('tables_sync_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      // Filtrage par restaurant_id
      const { data: tablesData, error: tableError } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('restaurant_id', user.id);

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', user.id)
        .neq('status', 'Servi');
      
      if (tableError) throw tableError;
      
      const sortedTables = (tablesData || []).sort((a, b) => 
        a.table_name.localeCompare(b.table_name, undefined, {numeric: true})
      );
      
      setTables(sortedTables);
      setActiveOrders(ordersData || []);
    } catch (error) {
      console.error('Erreur Supabase:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // FONCTION DE CLÔTURE FINALE
  const handleFinalizeTable = async (method) => {
    const order = selectedOrderForBill;
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Enregistrement transaction avec restaurant_id
      const { error: transError } = await supabase.from('transactions').insert([{
        restaurant_id: user.id,
        table_number: order.table_number,
        amount: order.total_amount,
        payment_method: method,
        items: order.items_details || [],
        created_at: new Date().toISOString()
      }]);
      if (transError) throw transError;

      // 2. Libération table
      const { error: orderError } = await supabase.from('orders').update({ status: 'Servi' }).eq('id', order.id);
      if (orderError) throw orderError;

      setShowPaymentSelector(false);
      setSelectedOrderForBill(null);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleAddTable = async (e) => {
    e.preventDefault();
    const tableName = e.target.tableName.value;
    const capacity = parseInt(e.target.capacity.value);
    
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('restaurant_tables')
      .insert([{ 
        restaurant_id: user.id,
        table_name: tableName, 
        capacity: capacity, 
        status: 'Libre' 
      }]);

    if (error) {
      alert("Erreur lors de la création : " + error.message);
    } else {
      setIsAddTableModalOpen(false);
      fetchData();
    }
  };

  const deleteTable = async (id) => {
    if(confirm("Voulez-vous supprimer cette table du plan ?")) {
      const { error } = await supabase.from('restaurant_tables').delete().eq('id', id);
      if (!error) fetchData();
    }
  };

  const handleTableClick = (tableName) => {
    const orders = activeOrders.filter(o => o.table_number === tableName);
    if (orders.length > 1) {
      setMultiOrderTable({ name: tableName, orders });
    } else if (orders.length === 1) {
      setSelectedOrderForBill(orders[0]);
    } else {
      if(confirm(`La ${tableName} est libre. Créer une nouvelle commande ?`)) {
        setPendingOrder({ table_number: tableName, items: [], total: 0 });
        setActiveTab("menu");
      }
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    const { error } = await supabase.from('orders').delete().eq('id', orderToDelete.id);
    if (!error) {
      setIsDeleteModalOpen(false);
      setOrderToDelete(null);
      setSelectedOrderForBill(null);
      fetchData();
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Occupée": return isDarkMode ? "border-[#00D9FF]/40 bg-[#00D9FF]/5 text-[#00D9FF]" : "border-cyan-200 bg-cyan-50 text-cyan-600";
      case "Addition": return isDarkMode ? "border-orange-500/40 bg-orange-500/5 text-orange-400 animate-pulse" : "border-orange-200 bg-orange-50 text-orange-600 animate-pulse";
      default: return isDarkMode ? "border-white/5 bg-white/[0.02] text-white/30" : "border-gray-200 bg-white text-gray-400 shadow-sm";
    }
  };

  return (
    <div className="fade-in text-left">
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 no-print">
        <div className="text-left">
          <h3 className="text-3xl font-black italic tracking-tighter uppercase text-left">Plan de Salle</h3>
          <p className="opacity-50 text-[10px] font-black uppercase tracking-widest text-left text-left">Gestion dynamique • {tables.length} Tables</p>
        </div>
        
        <button 
          onClick={() => setIsAddTableModalOpen(true)}
          className="flex items-center gap-2 bg-[#00D9FF] text-black px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all"
        >
          <Plus size={18} /> Nouvelle Table
        </button>
      </div>

      {/* --- GRILLE DES TABLES --- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 no-print">
        {tables.map((table) => {
          const tableOrders = activeOrders.filter(o => o.table_number === table.table_name);
          const currentStatus = tableOrders.length > 0 
            ? (tableOrders.some(o => o.status === "Prêt") ? "Addition" : "Occupée") 
            : "Libre";
          
          return (
            <div 
              key={table.id} 
              onClick={() => handleTableClick(table.table_name)}
              className={`group relative p-8 rounded-[40px] border transition-all duration-500 flex flex-col items-center justify-center gap-4 cursor-pointer ${getStatusStyle(currentStatus)} hover:scale-[1.03]`}
            >
              <button 
                onClick={(e) => { e.stopPropagation(); deleteTable(table.id); }}
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:scale-125 transition-all"
              >
                <Trash2 size={16} />
              </button>

              <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${currentStatus === 'Libre' ? 'border-dashed border-current/20' : 'border-current'}`}>
                <Grid size={24} />
              </div>
              
              <div className="text-center">
                <h4 className="text-lg font-black tracking-tight">{table.table_name}</h4>
                <p className="text-[10px] uppercase font-bold opacity-50 flex items-center justify-center gap-1">
                  <Users size={10} /> {table.capacity} p.
                </p>
              </div>

              {tableOrders.length > 0 && (
                <div className="mt-2 pt-2 border-t border-current/10 w-full text-center">
                  <p className="text-[9px] font-black uppercase tracking-tighter">{tableOrders.length} factures</p>
                  <p className="text-xs font-black">{tableOrders.reduce((acc, o) => acc + (o.total_amount || 0), 0).toLocaleString()} F</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* --- MODALE : AJOUTER UNE TABLE --- */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
          <div className={`relative w-full max-w-sm p-10 rounded-[45px] border shadow-2xl ${isDarkMode ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-gray-200'}`}>
            <button 
              onClick={() => setIsAddTableModalOpen(false)}
              className="absolute top-6 right-6 p-2 opacity-50 hover:opacity-100 transition-all text-white"
            >
              <X size={24} />
            </button>

            <form onSubmit={handleAddTable} className="text-left">
              <h3 className="text-xl font-black mb-8 italic uppercase tracking-tighter">Créer une table</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase opacity-40 ml-4 tracking-widest text-left">Identifiant (Nom)</label>
                  <input name="tableName" required placeholder="ex: Table 07B" className={`w-full mt-2 px-6 py-4 rounded-2xl border outline-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase opacity-40 ml-4 tracking-widest text-left text-left">Capacité</label>
                  <input name="capacity" type="number" required defaultValue="4" className={`w-full mt-2 px-6 py-4 rounded-2xl border outline-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`} />
                </div>
                <button type="submit" className="w-full py-5 bg-[#00D9FF] text-black font-black rounded-2xl shadow-lg uppercase text-[10px] tracking-widest mt-4">
                  Valider la création
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODALE : SÉLECTEUR DE FACTURE (Multi-clients) --- */}
      {multiOrderTable && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
          <div className={`relative w-full max-w-md p-8 rounded-[40px] border shadow-2xl ${isDarkMode ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-gray-200'}`}>
            <button onClick={() => setMultiOrderTable(null)} className="absolute top-6 right-6 opacity-50 hover:opacity-100 text-white"><X size={24}/></button>
            <h3 className="text-xl font-black mb-6 italic text-left uppercase text-left">Factures : {multiOrderTable.name}</h3>
            <div className="space-y-3">
              {multiOrderTable.orders.map((order, idx) => (
                <div 
                  key={order.id}
                  onClick={() => { setSelectedOrderForBill(order); setMultiOrderTable(null); }}
                  className={`flex items-center justify-between p-5 rounded-3xl border cursor-pointer transition-all ${isDarkMode ? 'bg-white/5 border-white/5 hover:border-[#00D9FF]' : 'bg-gray-50 border-gray-100 hover:border-cyan-500'}`}
                >
                  <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-widest text-left">Groupe {idx + 1}</p>
                    <p className="text-[9px] opacity-40 font-bold text-left">{order.items_summary?.substring(0, 30)}...</p>
                  </div>
                  <p className="font-black text-[#00D9FF] text-sm">{order.total_amount?.toLocaleString()} F</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- MODALE FACTURE THERMIQUE --- */}
      {selectedOrderForBill && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 backdrop-blur-md bg-black/60 no-print text-left">
          <div className="w-full max-w-sm fade-in">
            <div id="printable-bill" className="bg-white text-black p-6 rounded-sm shadow-2xl overflow-hidden printable-receipt font-mono text-[12px] leading-tight border-t-8 border-black">
              <div className="text-center border-b border-black pb-4 mb-4">
                <h4 className="text-lg font-black uppercase tracking-tighter italic text-center">RestoPay Luxe</h4>
                <p className="text-[9px] font-bold text-center">ABIDJAN • COTE D'IVOIRE</p>
              </div>
              
              <div className="flex justify-between text-[10px] font-black mb-4 border-b border-black pb-2 text-center">
                <span>{selectedOrderForBill.table_number}</span>
                <span>{new Date(selectedOrderForBill.created_at).toLocaleDateString('fr-FR')}</span>
              </div>

              <div className="flex justify-between text-[10px] font-black uppercase border-b border-black pb-1 mb-3">
                <span className="w-3/5 text-left">Désignation</span>
                <span className="w-2/5 text-right">Prix (F)</span>
              </div>

              <div className="space-y-2 mb-6 text-left">
                {selectedOrderForBill.items_details ? (
                  selectedOrderForBill.items_details.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start leading-none">
                      <span className="w-3/5 text-left font-bold uppercase text-[11px]">{item.name}</span>
                      <span className="w-2/5 text-right font-black">{item.price?.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  selectedOrderForBill.items_summary?.split(',').map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start italic">
                      <span className="w-3/5 text-left">{item.trim()}</span>
                      <span className="w-2/5 text-right">---</span> 
                    </div>
                  ))
                )}
              </div>

              <div className="border-t-2 border-black pt-3 space-y-1">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-[10px] uppercase">Sous-Total</span>
                  <span>{selectedOrderForBill.total_amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2 mt-2 border-t-4 border-black font-black">
                  <span className="text-[12px] uppercase italic">TOTAL NET</span>
                  <span className="text-xl">
                    {selectedOrderForBill.total_amount?.toLocaleString()} F
                  </span>
                </div>
              </div>

              <div className="mt-8 text-center pt-4 border-t border-dashed border-black">
                <p className="text-[9px] font-black uppercase tracking-widest text-center">Merci de votre visite !</p>
              </div>
            </div>

            {/* LOGIQUE DE CLÔTURE ET ACTIONS */}
            {!showPaymentSelector ? (
              <div className="mt-6 flex flex-col gap-3">
                <button 
                  onClick={() => setShowPaymentSelector(true)} 
                  className="w-full h-14 bg-green-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                >
                  <CheckCircle2 size={18} /> Clôturer & Encaisser
                </button>
                <div className="flex gap-3">
                  <button onClick={() => window.print()} className="flex-1 h-14 bg-[#00D9FF] text-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg">
                    <Printer size={18} /> Imprimer
                  </button>
                  <button 
                    onClick={() => { setOrderToDelete(selectedOrderForBill); setIsDeleteModalOpen(true); }}
                    className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button onClick={() => setSelectedOrderForBill(null)} className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${isDarkMode ? 'border-white/10 text-white' : 'border-gray-200 text-black'} shadow-lg`}>
                    <X size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-6 bg-[#0a0a0a] border border-white/10 rounded-[35px] fade-in shadow-2xl">
                <h4 className="text-white text-[10px] font-black uppercase mb-6 text-center tracking-widest opacity-60">Mode de Paiement</h4>
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => handleFinalizeTable("Espèces")} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 text-white hover:bg-green-500 transition-all border border-white/5">
                    <Banknote size={20} /><span className="text-[8px] font-black uppercase">Espèces</span>
                  </button>
                  <button onClick={() => handleFinalizeTable("Orange Money")} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 text-white hover:bg-orange-500 transition-all border border-white/5">
                    <Smartphone size={20} /><span className="text-[8px] font-black uppercase">Orange</span>
                  </button>
                  <button onClick={() => handleFinalizeTable("MTN Money")} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 text-white hover:bg-yellow-500 transition-all border border-white/5">
                    <Smartphone size={20} /><span className="text-[8px] font-black uppercase">MTN</span>
                  </button>
                  <button onClick={() => handleFinalizeTable("Wave")} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 text-white hover:bg-blue-500 transition-all border border-white/5">
                    <CreditCard size={20} /><span className="text-[8px] font-black uppercase">Wave</span>
                  </button>
                  <button onClick={() => handleFinalizeTable("Visa")} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 text-white hover:bg-red-500 transition-all border border-white/5">
                    <CreditCard size={20} /><span className="text-[8px] font-black uppercase">Visa</span>
                  </button>
                </div>
                <button onClick={() => setShowPaymentSelector(false)} className="w-full mt-6 text-[9px] text-white/30 uppercase font-black tracking-widest hover:text-white transition-all">Annuler</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION (LOGIQUE CORRIGÉE) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[900] flex items-center justify-center p-4 backdrop-blur-md bg-black/40 no-print text-center">
          <div className={`w-full max-w-sm rounded-[40px] p-8 border shadow-2xl ${isDarkMode ? 'bg-[#0f0f0f] border-white/10' : 'bg-white border-gray-200'}`}>
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-center mb-2 tracking-tighter uppercase">Annuler Commande</h3>
            <p className="text-sm opacity-50 text-center mb-8 font-medium italic">Supprimer définitivement cette commande ?</p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase bg-white/5">Retour</button>
              <button onClick={handleDeleteOrder} className="flex-1 py-4 rounded-2xl font-black text-xs uppercase bg-red-500 text-white shadow-lg">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; background: none !important; }
          .printable-receipt, .printable-receipt * {
            visibility: visible !important;
            display: block !important;
            color: black !important;
          }
          .printable-receipt {
            position: fixed !important;
            left: 0 !important; top: 0 !important;
            width: 80mm !important;
            background: white !important;
            padding: 20px !important;
            font-family: 'Courier New', Courier, monospace !important;
          }
          .flex { display: flex !important; }
          .justify-between { justify-content: space-between !important; }
        }
      `}</style>
    </div>
  );
}