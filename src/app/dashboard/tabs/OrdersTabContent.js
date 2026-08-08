"use client";

import React, { useState, useEffect } from "react";
import {
  Clock, CheckCircle2, Plus, Flame, Utensils,
  Trash2, AlertCircle, X, Check, Printer, Receipt, Edit3, Beer,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { printViaBluetooth } from '@/lib/bluetoothPrint';
import { toUserMessage } from '@/lib/errors';
import { getDashTokens, card, btnSolid, headFont, radius, radiusSm } from '@/lib/dashTheme';

export default function OrdersTabContent({
  isDarkMode, setActiveTab, setCart, setPendingOrder, selectedDate, userProfile
}) {
  const T = getDashTokens(isDarkMode);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [selectedOrderForBill, setSelectedOrderForBill] = useState(null);
  const [previewOrder, setPreviewOrder] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);

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

  // --- LOGIQUE IMPRESSION BLUETOOTH ---
  // printViaBluetooth(cart, tableNum, orderType) attend un tableau d'articles
  // {name, price, quantity} — exactement la forme de kitchenItems/barItems,
  // pas l'objet {title, items:[{name, qty}], footer} construit précédemment.
  const sendToPrinter = async (items, target, table) => {
    if (items.length === 0) return alert("Rien à imprimer pour cette section.");
    setIsPrinting(true);
    try {
      await printViaBluetooth(items, table, target);
      alert("Impression lancée !");
    } catch (error) { alert("Erreur Bluetooth."); }
    finally { setIsPrinting(false); }
  };

  const handleUpdateStatus = async (order) => {
    try {
      const nextStatus = order.status === "En cours" ? "Prêt" : "Servi";
      await supabase.from("orders").update({ status: nextStatus }).eq("id", order.id);
      fetchOrders();
    } catch (err) { alert(toUserMessage(err, "Impossible de mettre à jour le statut de la commande.")); }
  };

  const handleFinalizeOrder = async (method) => {
    const order = selectedOrderForBill;
    try {
      await supabase.from("transactions").insert([{
        restaurant_id: userProfile.id,
        owner_email: userProfile.owner_email,
        table_number: order.table_number,
        amount: order.total_amount,
        payment_method: method,
        items: order.items_details || [],
      }]);
      await supabase.from("orders").update({ status: "Servi" }).eq("id", order.id);
      setSelectedOrderForBill(null);
      setShowPaymentSelector(false);
      fetchOrders();
    } catch (err) { alert(toUserMessage(err, "Impossible de finaliser cette commande.")); }
  };

  const handleDeleteOrder = async () => {
    await supabase.from("orders").delete().eq("id", orderToDelete.id);
    setIsDeleteModalOpen(false);
    fetchOrders();
  };

  // Filtrage pour les aperçus Cuisine/Bar
  const kitchenItems = previewOrder?.items_details.filter(i => ["Plats", "Accompagnements"].includes(i.category)) || [];
  const barItems = previewOrder?.items_details.filter(i => !["Plats", "Accompagnements"].includes(i.category)) || [];

  return (
    <div style={{ textAlign: "left", paddingBottom: 40 }}>
      {/* HEADER & QUICK STATS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 22, margin: 0 }}>Commandes</h3>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: T.faint, margin: "4px 0 0" }}>Flux temps réel</p>
        </div>
        <button onClick={() => setActiveTab("menu")} style={btnSolid(T, { padding: "11px 20px" })}>
          <Plus size={16} strokeWidth={3} /> Nouveau
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <QuickStat T={T} label="En attente" value={orders.filter((o) => o.status === "En cours").length} icon={<Flame size={18} color="oklch(0.6 0.16 55)" />} />
        <QuickStat T={T} label="Prêts" value={orders.filter((o) => o.status === "Prêt").length} icon={<Utensils size={18} color={T.good} />} />
        <QuickStat T={T} label="Finalisés" value={orders.filter((o) => o.status === "Servi").length} icon={<CheckCircle2 size={18} color={T.accent} />} />
      </div>

      {/* LISTE DES COMMANDES */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 }}>
        {orders.map((order) => (
          <div key={order.id} style={{ ...card(T, { padding: 18 }), display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: radiusSm, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11,
                background: order.status === "En cours" ? T.accent : T.surface2, color: order.status === "En cours" ? T.accentInk : T.faint,
              }}>
                {order.table_number?.replace("Table ", "T.")}
              </div>
              <button onClick={() => setPreviewOrder(order)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999, background: "oklch(0.7 0.16 55 / .12)", color: "oklch(0.55 0.16 55)", border: "none", cursor: "pointer" }}>
                <Printer size={13} /> <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase" }}>Tickets</span>
              </button>
            </div>

            <div style={{ flex: 1, marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, margin: "0 0 8px" }}>{order.items_summary}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: .5 }}>
                <Clock size={10} />
                <span style={{ fontSize: 10, fontWeight: 700 }}>{new Date(order.created_at).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            <div style={{ paddingTop: 14, borderTop: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p className="num" style={{ fontWeight: 800, color: T.accent, fontSize: 14, margin: 0 }}>{order.total_amount?.toLocaleString()} F</p>
              <div style={{ display: "flex", gap: 4 }}>
                <ActionBtn T={T} onClick={() => { setCart(order.items_details); setPendingOrder(order); setActiveTab("menu"); }} icon={<Edit3 size={13} />} />
                <ActionBtn T={T} onClick={() => handleUpdateStatus(order)} icon={<Check size={13} />} />
                <ActionBtn T={T} onClick={() => setSelectedOrderForBill(order)} icon={<Receipt size={13} />} />
                <ActionBtn T={T} onClick={() => { setOrderToDelete(order); setIsDeleteModalOpen(true); }} icon={<Trash2 size={13} />} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- MODALE FACTURE CLIENT (DÉTAILLÉE) — reste blanc/noir/mono, aperçu papier --- */}
      {selectedOrderForBill && (
        <div style={{ position: "fixed", inset: 0, zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)", background: "rgba(0,0,0,.6)", textAlign: "left" }}>
          <div style={{ width: "100%", maxWidth: 380 }}>
            <div style={{ background: "#fff", color: "#000", padding: 24, borderRadius: 4, boxShadow: "0 20px 50px -10px rgba(0,0,0,.5)", fontFamily: "monospace", fontSize: 11, lineHeight: 1.4, borderTop: "8px solid #000" }}>
              <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 17, fontWeight: 800, textTransform: "uppercase", fontStyle: "italic", margin: 0 }}>FACTURE CLIENT</h4>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", margin: "4px 0 0" }}>Table: {selectedOrderForBill.table_number}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(0,0,0,.1)", paddingBottom: 4, fontSize: 9, fontWeight: 800 }}>
                  <span style={{ width: "50%" }}>ARTICLE</span>
                  <span style={{ width: "17%", textAlign: "center" }}>QTÉ</span>
                  <span style={{ width: "33%", textAlign: "right" }}>TOTAL</span>
                </div>
                {selectedOrderForBill.items_details?.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ width: "50%" }}>
                      <p style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 10, margin: 0 }}>{item.name}</p>
                      <p style={{ fontSize: 8, opacity: .6, margin: 0 }}>{item.price?.toLocaleString()} F</p>
                    </div>
                    <span style={{ width: "17%", textAlign: "center", fontWeight: 800 }}>x{item.quantity}</span>
                    <span style={{ width: "33%", textAlign: "right", fontWeight: 800 }}>{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "4px solid #000", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 800 }}>
                <span style={{ fontSize: 12, textTransform: "uppercase", fontStyle: "italic" }}>TOTAL NET</span>
                <span style={{ fontSize: 19 }}>{selectedOrderForBill.total_amount?.toLocaleString()} F</span>
              </div>
            </div>

            {!showPaymentSelector ? (
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={() => setShowPaymentSelector(true)} style={{ width: "100%", height: 52, background: T.good, color: "#fff", borderRadius: radiusSm, fontWeight: 800, fontSize: 12, textTransform: "uppercase", border: "none", cursor: "pointer" }}>Confirmer le règlement</button>
                <button onClick={() => setSelectedOrderForBill(null)} style={{ width: "100%", height: 52, background: T.surface2, color: T.ink, borderRadius: radiusSm, fontWeight: 800, fontSize: 11, textTransform: "uppercase", border: `1px solid ${T.line}`, cursor: "pointer" }}>Fermer</button>
              </div>
            ) : (
              <div style={{ ...card(T, { borderRadius: radius }), marginTop: 20, padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, boxShadow: T.shadow }}>
                {["Espèces", "Orange Money", "Wave", "Visa"].map(m => (
                  <button key={m} onClick={() => handleFinalizeOrder(m)} style={{ padding: 14, borderRadius: radiusSm, background: T.surface2, color: T.ink, fontWeight: 800, textTransform: "uppercase", fontSize: 10.5, border: `1px solid ${T.line}`, cursor: "pointer" }}>{m}</button>
                ))}
                <button onClick={() => setShowPaymentSelector(false)} style={{ gridColumn: "1 / -1", padding: "10px 0", fontSize: 10.5, color: T.faint, textTransform: "uppercase", fontWeight: 800, border: "none", background: "none", cursor: "pointer" }}>Annuler</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- DOUBLE APERÇU DISPATCH (CUISINE & BAR) --- */}
      {previewOrder && (
        <div style={{ position: "fixed", inset: 0, zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,.85)", backdropFilter: "blur(4px)", overflowY: "auto" }} onClick={() => setPreviewOrder(null)}>
          <div style={{ width: "100%", maxWidth: 880, display: "flex", flexWrap: "wrap", gap: 20, padding: 16, position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewOrder(null)} style={{ position: "absolute", top: -44, right: 16, color: "rgba(255,255,255,.6)", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Fermer</span>
              <X size={22} />
            </button>

            {/* TICKET CUISINE */}
            <div style={{ flex: 1, minWidth: 260, background: "#fff", color: "#000", padding: 22, borderRadius: 12, boxShadow: "0 20px 50px -10px rgba(0,0,0,.5)", fontFamily: "monospace", borderTop: "8px solid #ea580c" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottom: "1px solid #000", paddingBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 12, textTransform: "uppercase" }}>BON CUISINE</span>
                <Utensils size={17} color="#ea580c" />
              </div>
              <div style={{ marginBottom: 14, textAlign: "center", padding: "8px 0", borderBottom: "2px solid #000" }}>
                <p style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{previewOrder.table_number}</p>
                <p style={{ fontSize: 10, fontWeight: 700, opacity: .6, textTransform: "uppercase", margin: 0 }}>Heure: {new Date().toLocaleTimeString()}</p>
              </div>
              <div style={{ minHeight: 140, display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                {kitchenItems.length > 0 ? kitchenItems.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800, borderBottom: "1px solid #f3f4f6", padding: "4px 0" }}>
                    <span>{item.quantity} x {item.name.toUpperCase()}</span>
                  </div>
                )) : <p style={{ textAlign: "center", opacity: .3, fontStyle: "italic", fontSize: 10, padding: "36px 0" }}>Aucun plat</p>}
              </div>
              <button onClick={() => sendToPrinter(kitchenItems, "KITCHEN", previewOrder.table_number)} disabled={isPrinting || kitchenItems.length === 0} style={{ width: "100%", padding: "13px 0", borderRadius: 10, fontWeight: 800, fontSize: 10.5, textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", cursor: kitchenItems.length > 0 ? "pointer" : "default", background: kitchenItems.length > 0 ? "#ea580c" : "#f3f4f6", color: kitchenItems.length > 0 ? "#fff" : "#9ca3af" }}>
                <Printer size={15} /> Imprimer Cuisine
              </button>
            </div>

            {/* TICKET BAR */}
            <div style={{ flex: 1, minWidth: 260, background: "#fff", color: "#000", padding: 22, borderRadius: 12, boxShadow: "0 20px 50px -10px rgba(0,0,0,.5)", fontFamily: "monospace", borderTop: "8px solid #2563eb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottom: "1px solid #000", paddingBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 12, textTransform: "uppercase" }}>BON BAR</span>
                <Beer size={17} color="#2563eb" />
              </div>
              <div style={{ marginBottom: 14, textAlign: "center", padding: "8px 0", borderBottom: "2px solid #000" }}>
                <p style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{previewOrder.table_number}</p>
                <p style={{ fontSize: 10, fontWeight: 700, opacity: .6, textTransform: "uppercase", margin: 0 }}>Heure: {new Date().toLocaleTimeString()}</p>
              </div>
              <div style={{ minHeight: 140, display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                {barItems.length > 0 ? barItems.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800, borderBottom: "1px solid #f3f4f6", padding: "4px 0" }}>
                    <span>{item.quantity} x {item.name.toUpperCase()}</span>
                  </div>
                )) : <p style={{ textAlign: "center", opacity: .3, fontStyle: "italic", fontSize: 10, padding: "36px 0" }}>Aucune boisson</p>}
              </div>
              <button onClick={() => sendToPrinter(barItems, "BAR", previewOrder.table_number)} disabled={isPrinting || barItems.length === 0} style={{ width: "100%", padding: "13px 0", borderRadius: 10, fontWeight: 800, fontSize: 10.5, textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", cursor: barItems.length > 0 ? "pointer" : "default", background: barItems.length > 0 ? "#2563eb" : "#f3f4f6", color: barItems.length > 0 ? "#fff" : "#9ca3af" }}>
                <Printer size={15} /> Imprimer Bar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE SUPPRESSION */}
      {isDeleteModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,.5)", backdropFilter: "blur(4px)", textAlign: "center" }}>
          <div style={{ ...card(T, { borderRadius: radius }), width: "100%", maxWidth: 380, padding: 30, boxShadow: T.shadow }}>
            <AlertCircle size={32} color={T.bad} style={{ margin: "0 auto 16px" }} />
            <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 18, margin: "0 0 22px" }}>Annuler ?</h3>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setIsDeleteModalOpen(false)} style={{ flex: 1, padding: "13px 0", borderRadius: radiusSm, fontWeight: 700, fontSize: 11.5, textTransform: "uppercase", background: T.surface2, border: `1px solid ${T.line}`, color: T.ink, cursor: "pointer" }}>Retour</button>
              <button onClick={handleDeleteOrder} style={{ flex: 1, padding: "13px 0", borderRadius: radiusSm, fontWeight: 800, fontSize: 11.5, textTransform: "uppercase", background: T.bad, border: "none", color: "#fff", cursor: "pointer" }}>Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickStat({ T, label, value, icon }) {
  return (
    <div style={{ ...card(T, { padding: 16 }), display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ padding: 9, borderRadius: 10, background: T.surface2 }}>{icon}</div>
      <div>
        <p style={{ fontSize: 9.5, fontWeight: 700, color: T.faint, textTransform: "uppercase", margin: 0 }}>{label}</p>
        <p className="num" style={{ fontSize: 18, fontWeight: 800, margin: "2px 0 0" }}>{value}</p>
      </div>
    </div>
  );
}

function ActionBtn({ T, onClick, icon }) {
  return (
    <button onClick={onClick} style={{ padding: 8, borderRadius: 8, background: T.surface2, color: T.faint, border: "none", cursor: "pointer", display: "flex" }}>
      {icon}
    </button>
  );
}
