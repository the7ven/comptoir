"use client";

import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  ChevronRight,
  Plus,
  Filter,
  MoreVertical,
  Flame,
  Utensils,
  Search,
  Trash2,
  AlertCircle,
  X,
  Check,
  Printer,
  Receipt,
  Edit3,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function OrdersTabContent({
  isDarkMode,
  setActiveTab,
  setCart,
  setPendingOrder,
  selectedDate,
  userProfile // Ajout de la prop indispensable
}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [selectedOrderForBill, setSelectedOrderForBill] = useState(null);

  useEffect(() => {
    if (userProfile) {
      fetchOrders();
      const subscription = supabase
        .channel("orders_live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          fetchOrders,
        )
        .subscribe();
      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [selectedDate, userProfile]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      const startOfDay = `${selectedDate}T00:00:00.000Z`;
      const endOfDay = `${selectedDate}T23:59:59.999Z`;

      // LOGIQUE DE PARTAGE : Filtrage par owner_email
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("owner_email", userProfile.owner_email) 
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Erreur:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditOrder = async (order) => {
    if (order.items_details) {
      setCart(order.items_details);
      const tableValue = order.table_number?.includes("Table")
        ? order.table_number.replace("Table ", "")
        : order.table_number;

      setPendingOrder({
        table_number: tableValue,
        order_type:
          order.table_number === "Emporter" ? "Emporter" : "Sur place",
      });

      // Suppression avec vérification d'email
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", order.id)
        .eq("owner_email", userProfile.owner_email); 

      if (!error) setActiveTab("menu");
    } else {
      alert("Détails manquants.");
    }
  };

  const handleUpdateStatus = async (order) => {
    if (order.status === "Servi") return;

    try {
      if (order.status === "Prêt") {
        // ENCAISSEMENT : Injection des identifiants partagés dans les transactions
        const { error: transError } = await supabase
          .from("transactions")
          .insert([
            {
              restaurant_id: userProfile.id, // Celui qui fait l'action
              owner_email: userProfile.owner_email, // Le proprio du compte
              table_number: order.table_number,
              amount: order.total_amount,
              payment_method: "Espèces",
              items: order.items_details || [],
              created_at: new Date().toISOString(),
            },
          ]);

        if (transError) throw transError;

        const { error: orderError } = await supabase
          .from("orders")
          .update({ status: "Servi" })
          .eq("id", order.id)
          .eq("owner_email", userProfile.owner_email);

        if (orderError) throw orderError;

        alert(`Commande ${order.table_number} encaissée avec succès !`);
      } else {
        await supabase
          .from("orders")
          .update({ status: "Prêt" })
          .eq("id", order.id)
          .eq("owner_email", userProfile.owner_email);
      }
      fetchOrders();
    } catch (err) {
      alert("Erreur : " + err.message);
    }
  };

  const handleDeleteOrder = async () => {
    await supabase
      .from("orders")
      .delete()
      .eq("id", orderToDelete.id)
      .eq("owner_email", userProfile.owner_email);
    setIsDeleteModalOpen(false);
    fetchOrders();
  };

  // ... (Reste du code JSX strictement identique à ton original)
  const statusColors = {
    "En cours": isDarkMode
      ? "text-orange-400 bg-orange-400/10 border-orange-400/20"
      : "text-orange-600 bg-orange-50 border-orange-100",
    Prêt: isDarkMode
      ? "text-green-400 bg-green-400/10 border-green-400/20"
      : "text-green-600 bg-green-50 border-green-100",
    Servi: isDarkMode
      ? "text-white/30 bg-white/5 border-white/5"
      : "text-gray-400 bg-gray-50 border-gray-100",
  };

  return (
    <div className="fade-in text-left pb-20">
      <div className="flex justify-between items-center mb-10 no-print">
        <div className="text-left">
          <h3 className="text-3xl font-black italic tracking-tighter text-left uppercase">
            Commandes Live
          </h3>
          <p className="opacity-50 text-[10px] font-black uppercase tracking-widest text-left">
            Suivi temps réel • Flux Cuisine
          </p>
        </div>
        <button
          onClick={() => setActiveTab("menu")}
          className="bg-[#00D9FF] text-black px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2 border-none cursor-pointer"
        >
          <Plus size={18} />
          <span>nouvelle commande</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10 no-print">
        <QuickStat
          isDarkMode={isDarkMode}
          label="Cuisine"
          value={orders.filter((o) => o.status === "En cours").length}
          icon={<Flame className="text-orange-500" />}
        />
        <QuickStat
          isDarkMode={isDarkMode}
          label="Prêts"
          value={orders.filter((o) => o.status === "Prêt").length}
          icon={<Utensils className="text-green-500" />}
        />
        <QuickStat
          isDarkMode={isDarkMode}
          label="Servis"
          value={orders.filter((o) => o.status === "Servi").length}
          icon={<CheckCircle2 className="text-[#00D9FF]" />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 no-print">
        {loading && orders.length === 0 ? (
          <div className="col-span-full text-center py-20 opacity-20 italic font-bold">
            Chargement des données...
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className={`p-6 rounded-[40px] border transition-all duration-500 flex flex-col justify-between h-full ${isDarkMode ? "bg-[#0a0a0a] border-white/5 hover:border-[#00D9FF]/30" : "bg-white border-gray-100 shadow-sm hover:shadow-xl"}`}
            >
              <div className="flex justify-between items-start mb-6">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${order.status === "En cours" ? "bg-[#00D9FF] text-black shadow-lg shadow-cyan-500/20" : isDarkMode ? "bg-white/5 text-white/40" : "bg-gray-100 text-gray-500"}`}
                >
                  {order.table_number?.replace("Table ", "T.")}
                </div>
                <div
                  className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusColors[order.status]}`}
                >
                  {order.status}
                </div>
              </div>

              <div className="flex-1 mb-6 text-left">
                <div className="flex items-center gap-2 mb-2 opacity-30 text-left">
                  <Clock size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-left">
                    {Math.floor(
                      (new Date() - new Date(order.created_at)) / 60000,
                    )}{" "}
                    MIN
                  </span>
                </div>
                <p
                  className={`text-base font-black leading-tight text-left ${isDarkMode ? "text-white" : "text-gray-800"}`}
                >
                  {order.items_summary}
                </p>
              </div>

              <div
                className={`pt-6 border-t ${isDarkMode ? "border-white/5" : "border-gray-100"} flex items-center justify-between`}
              >
                <div className="text-left">
                  <p className="text-[9px] uppercase font-black opacity-30 tracking-widest text-left">
                    Total
                  </p>
                  <p className="font-black text-[#00D9FF] text-lg text-left">
                    {order.total_amount?.toLocaleString()} F
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditOrder(order)}
                    className={`p-3 rounded-xl transition-all border-none cursor-pointer ${isDarkMode ? "bg-white/5 text-white/40 hover:text-[#00D9FF]" : "bg-gray-50 text-gray-400 hover:text-[#00D9FF] shadow-sm"}`}
                    title="Modifier"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(order)}
                    className={`p-3 rounded-xl transition-all border-none cursor-pointer ${isDarkMode ? "bg-white/5 text-white/40 hover:text-green-400" : "bg-gray-50 text-gray-400 hover:text-green-600 shadow-sm"}`}
                    title="Suivant"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => setSelectedOrderForBill(order)}
                    className={`p-3 rounded-xl transition-all border-none cursor-pointer ${isDarkMode ? "bg-white/5 text-white/40 hover:text-[#00D9FF]" : "bg-gray-50 text-gray-400 hover:text-black shadow-sm"}`}
                    title="Facture"
                  >
                    <Receipt size={18} />
                  </button>
                  <button
                    onClick={() => {
                      setOrderToDelete(order);
                      setIsDeleteModalOpen(true);
                    }}
                    className={`p-3 rounded-xl transition-all border-none cursor-pointer ${isDarkMode ? "bg-white/5 text-white/20 hover:text-red-500" : "bg-gray-50 text-gray-400 hover:text-red-500 shadow-sm"}`}
                    title="Supprimer"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL FACTURE */}
      {selectedOrderForBill && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 backdrop-blur-md bg-black/60 no-print">
          <div className="w-full max-w-sm fade-in">
            <div
              id="printable-bill"
              className="bg-white text-black p-6 rounded-sm shadow-2xl overflow-hidden printable-receipt font-mono text-[12px] leading-tight border-t-8 border-black"
            >
              <div className="text-center border-b border-black pb-4 mb-4">
                <h4 className="text-lg font-black uppercase tracking-tighter italic text-center">
                  RestoPay Luxe
                </h4>
                <p className="text-[9px] font-bold text-center">
                  ABIDJAN • COTE D'IVOIRE
                </p>
              </div>

              <div className="flex justify-between text-[10px] font-black mb-4 border-b border-black pb-2">
                <span>{selectedOrderForBill.table_number}</span>
                <span>
                  {new Date(selectedOrderForBill.created_at).toLocaleDateString(
                    "fr-FR",
                  )}
                </span>
              </div>

              <div className="space-y-2 mb-6 text-left">
                {selectedOrderForBill.items_details?.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-start leading-none"
                      >
                        <span className="w-3/5 text-left font-bold uppercase text-[11px]">{item.name}</span>
                        <span className="w-2/5 text-right font-black">
                          {item.price?.toLocaleString()}
                        </span>
                      </div>
                    ))}
              </div>

              <div className="border-t-4 border-black pt-3 flex justify-between items-center font-black">
                  <span className="text-[12px] uppercase italic">TOTAL NET</span>
                  <span className="text-xl">
                    {selectedOrderForBill.total_amount?.toLocaleString()} F
                  </span>
              </div>

              <div className="mt-8 text-center pt-4 border-t border-dashed border-black">
                <p className="text-[9px] font-black uppercase tracking-widest text-center">
                  Merci de votre visite !
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 h-14 bg-[#00D9FF] text-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg border-none cursor-pointer"
              >
                <Printer size={18} /> Imprimer
              </button>
              <button
                onClick={() => {
                  setOrderToDelete(selectedOrderForBill);
                  setIsDeleteModalOpen(true);
                }}
                className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg border-none cursor-pointer"
              >
                <Trash2 size={20} />
              </button>
              <button
                onClick={() => setSelectedOrderForBill(null)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-lg bg-transparent cursor-pointer ${isDarkMode ? "border-white/10 text-white" : "border-gray-200 text-black"}`}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression + Styles Print + QuickStat (Gardés identiques) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 backdrop-blur-md bg-black/40 no-print text-center">
          <div
            className={`w-full max-w-sm rounded-[40px] p-8 border shadow-2xl ${isDarkMode ? "bg-[#0f0f0f] border-white/10" : "bg-white border-gray-200"}`}
          >
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-center mb-2 tracking-tighter uppercase">
              Annuler Commande
            </h3>
            <p className="text-sm opacity-50 text-center mb-8 font-medium italic">
              Supprimer définitivement cette commande ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase bg-white/5 border-none text-white cursor-pointer"
              >
                Retour
              </button>
              <button
                onClick={handleDeleteOrder}
                className="flex-1 py-4 rounded-2xl font-black text-xs uppercase bg-red-500 text-white shadow-lg border-none cursor-pointer"
              >
                Confirmer
              </button>
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
            font-family: "Courier New", Courier, monospace !important;
          }
          .flex { display: flex !important; }
          .justify-between { justify-content: space-between !important; }
        }
      `}</style>
    </div>
  );
}

function QuickStat({ isDarkMode, label, value, icon }) {
  return (
    <div
      className={`p-6 rounded-[35px] border flex items-center gap-4 transition-all ${isDarkMode ? "bg-white/[0.02] border-white/5 hover:border-white/10" : "bg-white border-gray-100 shadow-sm"}`}
    >
      <div className={`p-3 rounded-2xl ${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}>
        {icon}
      </div>
      <div className="text-left">
        <p className="text-[9px] uppercase tracking-widest opacity-40 font-black text-left">
          {label}
        </p>
        <p className="text-2xl font-black italic tracking-tighter text-left">
          {value}
        </p>
      </div>
    </div>
  );
}