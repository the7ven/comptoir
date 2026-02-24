"use client";

import React, { useState, useEffect } from 'react';
import { 
  Grid, Users, Printer, X, Bluetooth,
  Plus, Receipt, CreditCard, CheckCircle2, MoreHorizontal, Clock, AlertCircle, Trash2, Smartphone, Banknote
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
// IMPORT DU DRIVER BLUETOOTH
import { printViaBluetooth } from '@/lib/bluetoothPrint';

export default function TablesTabContent({ isDarkMode, setActiveTab, setPendingOrder, userProfile }) {
  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false); 
  
  const [selectedOrderForBill, setSelectedOrderForBill] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [multiOrderTable, setMultiOrderTable] = useState(null);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);

  useEffect(() => {
    if (userProfile) {
      fetchData();
      const subscription = supabase
        .channel('tables_sync_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, fetchData)
        .subscribe();
      return () => { supabase.removeChannel(subscription); };
    }
  }, [userProfile]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // LOGIQUE SaaS : On utilise owner_email pour le partage des tables et commandes
      const sharedEmail = userProfile.owner_email;

      const { data: tablesData, error: tableError } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('owner_email', sharedEmail);

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('owner_email', sharedEmail)
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

  const handleBluetoothPrint = async () => {
    if (!selectedOrderForBill) return;
    setIsPrinting(true);
    try {
      const cartToPrint = selectedOrderForBill.items_details || [];
      await printViaBluetooth(
        cartToPrint, 
        selectedOrderForBill.table_number, 
        "Sur place"
      );
    } catch (error) {
      alert("Erreur Bluetooth : Vérifiez la connexion de l'imprimante.");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleFinalizeTable = async (method) => {
    const order = selectedOrderForBill;
    try {
      const { error: transError } = await supabase.from('transactions').insert([{
        restaurant_id: userProfile.id,
        owner_email: userProfile.owner_email, // Indispensable pour tes stats proprio
        table_number: order.table_number,
        amount: order.total_amount,
        payment_method: method,
        items: order.items_details || [],
        created_at: new Date().toISOString()
      }]);
      if (transError) throw transError;

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
    
    const { error } = await supabase
      .from('restaurant_tables')
      .insert([{ 
        restaurant_id: userProfile.id,
        owner_email: userProfile.owner_email,
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
      // LOGIQUE AJOUTÉE : Cliquer sur une table libre ouvre une nouvelle commande
      if(confirm(`La ${tableName} est libre. Créer une nouvelle commande ?`)) {
        setPendingOrder({ table_number: tableName, items: [], total: 0, order_type: "Sur place" });
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

  if (loading) return (
    <div className="flex h-64 items-center justify-center italic opacity-50">
      Chargement du plan de salle RestoPay...
    </div>
  );

  return (
    <div className="fade-in text-left">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="text-left">
          <h3 className="text-3xl font-black italic tracking-tighter uppercase text-left">Plan de Salle</h3>
          <p className="opacity-50 text-[10px] font-black uppercase tracking-widest text-left">{tables.length} Tables en gestion</p>
        </div>
        <button onClick={() => setIsAddTableModalOpen(true)} className="flex items-center gap-2 bg-[#00D9FF] text-black px-6 py-4 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all">
          <Plus size={18} /> Nouvelle Table
        </button>
      </div>

      {/* GRILLE DES TABLES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {tables.map((table) => {
          const tableOrders = activeOrders.filter(o => o.table_number === table.table_name);
          const currentStatus = tableOrders.length > 0 
            ? (tableOrders.some(o => o.status === "Prêt") ? "Addition" : "Occupée") 
            : "Libre";
          
          return (
            <div key={table.id} onClick={() => handleTableClick(table.table_name)} className={`group relative p-8 rounded-[40px] border transition-all duration-500 flex flex-col items-center justify-center gap-4 cursor-pointer ${getStatusStyle(currentStatus)} hover:scale-[1.03]`}>
              <button onClick={(e) => { e.stopPropagation(); deleteTable(table.id); }} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-red-500 transition-all border-none bg-transparent cursor-pointer"><Trash2 size={16} /></button>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${currentStatus === 'Libre' ? 'border-dashed border-current/20' : 'border-current'}`}><Grid size={24} /></div>
              <div className="text-center">
                <h4 className="text-lg font-black tracking-tight">{table.table_name}</h4>
                <p className="text-[10px] uppercase font-bold opacity-50 flex items-center justify-center gap-1"><Users size={10} /> {table.capacity} p.</p>
              </div>
              {tableOrders.length > 0 && (
                <div className="mt-2 pt-2 border-t border-current/10 w-full text-center">
                  <p className="text-[9px] font-black uppercase tracking-tighter">{tableOrders.length} clients</p>
                  <p className="text-xs font-black">{tableOrders.reduce((acc, o) => acc + (o.total_amount || 0), 0).toLocaleString()} F</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODALE : AJOUTER UNE TABLE */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
          <div className={`relative w-full max-w-sm p-10 rounded-[45px] border shadow-2xl ${isDarkMode ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-gray-200'}`}>
            <button onClick={() => setIsAddTableModalOpen(false)} className="absolute top-6 right-6 p-2 opacity-50 hover:opacity-100 text-white border-none bg-transparent cursor-pointer"><X size={24} /></button>
            <form onSubmit={handleAddTable}>
              <h3 className="text-xl font-black mb-8 italic uppercase text-white">Créer une table</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase opacity-40 ml-4">Nom / Identifiant</label>
                  <input name="tableName" required placeholder="ex: T-05" className={`w-full mt-2 px-6 py-4 rounded-2xl border outline-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50'}`} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase opacity-40 ml-4">Capacité</label>
                  <input name="capacity" type="number" required defaultValue="4" className={`w-full mt-2 px-6 py-4 rounded-2xl border outline-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50'}`} />
                </div>
                <button type="submit" className="w-full py-5 bg-[#00D9FF] text-black font-black rounded-2xl uppercase text-[10px] tracking-widest mt-4 border-none cursor-pointer">Valider</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE : SÉLECTEUR DE FACTURE */}
      {multiOrderTable && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
          <div className={`relative w-full max-w-md p-8 rounded-[40px] border shadow-2xl ${isDarkMode ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-gray-200'}`}>
            <button onClick={() => setMultiOrderTable(null)} className="absolute top-6 right-6 opacity-50 hover:opacity-100 text-white border-none bg-transparent cursor-pointer"><X size={24}/></button>
            <h3 className="text-xl font-black mb-6 italic uppercase">Factures : {multiOrderTable.name}</h3>
            <div className="space-y-3">
              {multiOrderTable.orders.map((order, idx) => (
                <div key={order.id} onClick={() => { setSelectedOrderForBill(order); setMultiOrderTable(null); }} className={`flex items-center justify-between p-5 rounded-3xl border cursor-pointer transition-all ${isDarkMode ? 'bg-white/5 border-white/5 hover:border-[#00D9FF]' : 'bg-gray-50 hover:border-cyan-500'}`}>
                  <div className="text-left"><p className="text-xs font-black uppercase">Groupe {idx + 1}</p><p className="text-[9px] opacity-40 font-bold">{order.items_summary?.substring(0, 30)}...</p></div>
                  <p className="font-black text-[#00D9FF] text-sm">{order.total_amount?.toLocaleString()} F</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODALE FACTURE THERMIQUE */}
      {selectedOrderForBill && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 backdrop-blur-md bg-black/60 text-left">
          <div className="w-full max-w-sm">
            <div className="bg-white text-black p-6 rounded-sm shadow-2xl font-mono text-[12px] leading-tight border-t-8 border-black">
              <div className="text-center border-b border-black pb-4 mb-4">
                <h4 className="text-lg font-black uppercase tracking-tighter italic">RestoPay Luxe</h4>
                <p className="text-[9px] font-bold">ABIDJAN • COTE D'IVOIRE</p>
              </div>
              <div className="flex justify-between text-[10px] font-black mb-4 border-b border-black pb-2">
                <span>{selectedOrderForBill.table_number}</span>
                <span>{new Date(selectedOrderForBill.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="space-y-2 mb-6">
                {selectedOrderForBill.items_details?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start leading-none">
                    <span className="w-3/5 font-bold uppercase text-[11px]">{item.name}</span>
                    <span className="w-2/5 text-right font-black">{item.price?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t-4 border-black pt-3 flex justify-between items-center font-black">
                <span className="text-[12px] uppercase italic">TOTAL NET</span>
                <span className="text-xl">{selectedOrderForBill.total_amount?.toLocaleString()} F</span>
              </div>
            </div>

            {!showPaymentSelector ? (
              <div className="mt-6 flex flex-col gap-3">
                <button onClick={() => setShowPaymentSelector(true)} className="w-full h-14 bg-green-500 text-white rounded-2xl font-black text-[11px] uppercase flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg border-none cursor-pointer"><CheckCircle2 size={18} /> Encaisser</button>
                <div className="flex gap-3">
                  <button 
                    onClick={handleBluetoothPrint} 
                    disabled={isPrinting}
                    className={`flex-1 h-14 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg transition-all border-none cursor-pointer ${isPrinting ? 'bg-orange-500 text-white animate-pulse' : 'bg-[#00D9FF] text-black'}`}
                  >
                    {isPrinting ? <Bluetooth size={18} /> : <Printer size={18} />} {isPrinting ? 'Impression...' : 'Imprimer'}
                  </button>
                  <button onClick={() => { setOrderToDelete(selectedOrderForBill); setIsDeleteModalOpen(true); }} className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg border-none cursor-pointer"><Trash2 size={20} /></button>
                  <button onClick={() => setSelectedOrderForBill(null)} className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-lg bg-transparent cursor-pointer ${isDarkMode ? 'border-white/10 text-white' : 'border-gray-200 text-black'}`}><X size={20} /></button>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-6 bg-[#0a0a0a] border border-white/10 rounded-[35px] shadow-2xl">
                <h4 className="text-white text-[10px] font-black uppercase mb-6 text-center tracking-widest opacity-60">Paiement</h4>
                <div className="grid grid-cols-3 gap-3">
                  {["Espèces", "Orange Money", "MTN Money", "Wave", "Visa"].map((m) => (
                    <button key={m} onClick={() => handleFinalizeTable(m)} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 text-white hover:bg-[#00D9FF] hover:text-black transition-all border border-white/5 cursor-pointer">
                      {m === "Espèces" ? <Banknote size={18}/> : m === "Visa" ? <CreditCard size={18}/> : <Smartphone size={18}/>}
                      <span className="text-[7px] font-black uppercase">{m}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowPaymentSelector(false)} className="w-full mt-6 text-[9px] text-white/30 uppercase font-black tracking-widest hover:text-white transition-all border-none bg-transparent cursor-pointer">Annuler</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[900] flex items-center justify-center p-4 backdrop-blur-md bg-black/40 text-center">
          <div className={`w-full max-w-sm rounded-[40px] p-8 border shadow-2xl ${isDarkMode ? 'bg-[#0f0f0f] border-white/10 text-white' : 'bg-white border-gray-200'}`}>
            <AlertCircle size={32} className="text-red-500 mx-auto mb-6" />
            <h3 className="text-xl font-black mb-8 uppercase">Supprimer la commande ?</h3>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase bg-white/5 border-none text-white cursor-pointer">Retour</button>
              <button onClick={handleDeleteOrder} className="flex-1 py-4 rounded-2xl font-black text-xs uppercase bg-red-500 text-white border-none cursor-pointer">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}