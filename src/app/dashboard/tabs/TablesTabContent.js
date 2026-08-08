"use client";

import React, { useState, useEffect } from "react";
import {
  Grid,
  Users,
  Printer,
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { printViaBluetooth } from "@/lib/bluetoothPrint";
import { toUserMessage } from "@/lib/errors";
import { getDashTokens, card, btnSolid, inputStyle, headFont, radius, radiusSm } from "@/lib/dashTheme";

export default function TablesTabContent({
  isDarkMode,
  setActiveTab,
  setPendingOrder,
  userProfile,
}) {
  const T = getDashTokens(isDarkMode);
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
        .channel("tables_sync_realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          fetchData,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "restaurant_tables" },
          fetchData,
        )
        .subscribe();
      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [userProfile]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // LOGIQUE: On utilise owner_email pour le partage des tables et commandes

      const sharedEmail = userProfile.owner_email;

      const { data: tablesData, error: tableError } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("owner_email", sharedEmail);

      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("owner_email", sharedEmail)
        .neq("status", "Servi");

      if (tableError) throw tableError;

      const sortedTables = (tablesData || []).sort((a, b) =>
        a.table_name.localeCompare(b.table_name, undefined, { numeric: true }),
      );

      setTables(sortedTables);
      setActiveOrders(ordersData || []);
    } catch (error) {
      console.error("Erreur Supabase:", error.message);
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
        "Sur place",
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
      const { error: transError } = await supabase.from("transactions").insert([
        {
          restaurant_id: userProfile.id,
          owner_email: userProfile.owner_email,
          table_number: order.table_number,
          amount: order.total_amount,
          payment_method: method,
          items: order.items_details || [],
          created_at: new Date().toISOString(),
        },
      ]);
      if (transError) throw transError;

      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "Servi" })
        .eq("id", order.id);
      if (orderError) throw orderError;

      setShowPaymentSelector(false);
      setSelectedOrderForBill(null);
      fetchData();
    } catch (err) {
      alert(toUserMessage(err, "Impossible de finaliser l'addition de cette table."));
    }
  };

  const handleAddTable = async (e) => {
    e.preventDefault();
    let rawName = e.target.tableName.value.trim();
    const capacity = parseInt(e.target.capacity.value, 10);

    // Sécurité : Empêcher de valider un champ vide
    if (!rawName) return;
    if (!Number.isFinite(capacity) || capacity <= 0) {
      alert("La capacité doit être un nombre positif.");
      return;
    }

    let tableName = rawName.toUpperCase();
    // Vérifie si c'est un chiffre ET que ce n'est pas une chaîne vide
    if (!isNaN(rawName) && rawName !== "") {
      tableName = `TABLE ${rawName.padStart(2, "0")}`;
    }

    // VÉRIFICATION DE DOUBLON
    const isDuplicate = tables.some(
      (t) => t.table_name.toUpperCase() === tableName
    );

    if (isDuplicate) {
      alert(`La ${tableName} existe déjà.`);
      return;
    }

    const { error } = await supabase.from("restaurant_tables").insert([
      {
        restaurant_id: userProfile.id,
        owner_email: userProfile.owner_email,
        table_name: tableName,
        capacity: capacity,
        status: "Libre",
      },
    ]);

    if (error) {
      alert(toUserMessage(error, "Impossible d'enregistrer cette table."));
    } else {
      setIsAddTableModalOpen(false);
      fetchData();
    }
  };

  const deleteTable = async (id) => {
    if (confirm("Voulez-vous supprimer cette table du plan ?")) {
      const { error } = await supabase
        .from("restaurant_tables")
        .delete()
        .eq("id", id);
      if (!error) fetchData();
    }
  };

  const handleTableClick = (tableName) => {
    const orders = activeOrders.filter((o) => o.table_number === tableName);
    if (orders.length > 1) {
      setMultiOrderTable({ name: tableName, orders });
    } else if (orders.length === 1) {
      setSelectedOrderForBill(orders[0]);
    } else {
      // LOGIQUE AJOUTÉE : Cliquer sur une table libre ouvre une nouvelle commande
      if (confirm(`La ${tableName} est libre. Créer une nouvelle commande ?`)) {
        setPendingOrder({
          table_number: tableName,
          items: [],
          total: 0,
          order_type: "Sur place",
        });
        setActiveTab("menu");
      }
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderToDelete.id);
    if (!error) {
      setIsDeleteModalOpen(false);
      setOrderToDelete(null);
      setSelectedOrderForBill(null);
      fetchData();
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Occupée":
        return { border: T.accent, background: T.accentWash, color: T.accent };
      case "Addition":
        return { border: T.warn, background: T.warnWash, color: T.warn, animation: "dash-pulse 1.6s ease-in-out infinite" };
      default:
        return { border: T.good, background: T.goodWash, color: T.good };
    }
  };

  if (loading)
    return (
      <div style={{ display: "flex", height: 256, alignItems: "center", justifyContent: "center", fontStyle: "italic", opacity: .5 }}>
        Chargement du plan de salle Comptoir...
      </div>
    );

  return (
    <div style={{ textAlign: "left" }}>
      {/* HEADER */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <div>
          <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 24, margin: 0 }}>Plan de Salle</h3>
          <p style={{ fontSize: 11, fontWeight: 700, color: T.faint, margin: "4px 0 0" }}>{tables.length} tables en gestion</p>
        </div>
        <button onClick={() => setIsAddTableModalOpen(true)} style={btnSolid(T, { padding: "12px 22px" })}>
          <Plus size={18} /> Nouvelle Table
        </button>
      </div>

      {/* GRILLE DES TABLES */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16 }}>
        {tables.map((table) => {
          const tableOrders = activeOrders.filter((o) => o.table_number === table.table_name);
          const currentStatus =
            tableOrders.length > 0
              ? tableOrders.some((o) => o.status === "Prêt") ? "Addition" : "Occupée"
              : "Libre";
          const st = getStatusStyle(currentStatus);

          return (
            <div
              key={table.id}
              onClick={() => handleTableClick(table.table_name)}
              className="dash-table-card"
              style={{
                position: "relative", padding: 22, borderRadius: radius, border: `1.5px solid ${st.border}`,
                background: st.background, color: st.color, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", animation: st.animation,
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); deleteTable(table.id); }}
                className="dash-table-delete"
                style={{ position: "absolute", top: 10, right: 10, opacity: 0, padding: 6, color: T.bad, border: "none", background: "none", cursor: "pointer", transition: "opacity .15s" }}
              >
                <Trash2 size={15} />
              </button>
              <div style={{ width: 46, height: 46, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: currentStatus === "Libre" ? `1.5px dashed ${st.color}` : `1.5px solid ${st.color}`, opacity: .85 }}>
                <Grid size={20} />
              </div>
              <div style={{ textAlign: "center" }}>
                <h4 style={{ fontFamily: headFont, fontSize: 16, fontWeight: 800, margin: 0 }}>{table.table_name}</h4>
                <p style={{ fontSize: 10, fontWeight: 700, opacity: .75, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, margin: "2px 0 0" }}>
                  <Users size={10} /> {table.capacity} p.
                </p>
              </div>
              {tableOrders.length > 0 && (
                <div style={{ marginTop: 4, paddingTop: 8, borderTop: `1px solid ${st.color}33`, width: "100%", textAlign: "center" }}>
                  <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", margin: 0, opacity: .8 }}>{tableOrders.length} clients</p>
                  <p className="num" style={{ fontSize: 12, fontWeight: 800, margin: "2px 0 0" }}>
                    {tableOrders.reduce((acc, o) => acc + (o.total_amount || 0), 0).toLocaleString()} F
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODALE : AJOUTER UNE TABLE */}
      {isAddTableModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)", background: "rgba(0,0,0,.6)" }}>
          <div style={{ ...card(T, { borderRadius: radius }), position: "relative", width: "100%", maxWidth: 380, padding: 32, boxShadow: T.shadow }}>
            <button onClick={() => setIsAddTableModalOpen(false)} style={{ position: "absolute", top: 20, right: 20, padding: 6, opacity: .5, color: T.ink, border: "none", background: "none", cursor: "pointer", display: "flex" }}>
              <X size={20} />
            </button>
            <form onSubmit={handleAddTable}>
              <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 19, margin: "0 0 24px" }}>Créer une table</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>Numéro de table</label>
                  <input name="tableName" required type="text" inputMode="numeric" placeholder="Tapez juste le numéro (ex: 7)" style={{ ...inputStyle(T), marginTop: 8, padding: "13px 16px" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>Capacité</label>
                  <input name="capacity" type="number" required defaultValue="4" style={{ ...inputStyle(T), marginTop: 8, padding: "13px 16px" }} />
                </div>
                <button type="submit" style={btnSolid(T, { width: "100%", padding: "14px 0", marginTop: 6 })}>Valider</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE : SÉLECTEUR DE FACTURE */}
      {multiOrderTable && (
        <div style={{ position: "fixed", inset: 0, zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)", background: "rgba(0,0,0,.6)" }}>
          <div style={{ ...card(T, { borderRadius: radius }), position: "relative", width: "100%", maxWidth: 420, padding: 28, boxShadow: T.shadow }}>
            <button onClick={() => setMultiOrderTable(null)} style={{ position: "absolute", top: 20, right: 20, opacity: .5, color: T.ink, border: "none", background: "none", cursor: "pointer", display: "flex" }}>
              <X size={20} />
            </button>
            <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 18, margin: "0 0 18px" }}>Factures : {multiOrderTable.name}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {multiOrderTable.orders.map((order, idx) => (
                <div
                  key={order.id}
                  onClick={() => { setSelectedOrderForBill(order); setMultiOrderTable(null); }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: radiusSm, background: T.surface2, cursor: "pointer" }}
                >
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>Groupe {idx + 1}</p>
                    <p style={{ fontSize: 10.5, color: T.faint, fontWeight: 600, margin: "2px 0 0" }}>{order.items_summary?.substring(0, 30)}...</p>
                  </div>
                  <p className="num" style={{ fontWeight: 800, color: T.accent, fontSize: 13, margin: 0 }}>{order.total_amount?.toLocaleString()} F</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODALE FACTURE THERMIQUE — reste volontairement blanc/noir/mono : c'est
          un aperçu fidèle du ticket papier imprimé, pas une surface de l'app. */}
      {selectedOrderForBill && (
        <div style={{ position: "fixed", inset: 0, zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)", background: "rgba(0,0,0,.6)", textAlign: "left" }}>
          <div style={{ width: "100%", maxWidth: 380 }}>
            <div style={{ background: "#fff", color: "#000", padding: 24, borderRadius: 4, boxShadow: "0 20px 50px -10px rgba(0,0,0,.5)", fontFamily: "monospace", fontSize: 11, lineHeight: 1.4, borderTop: "8px solid #000" }}>
              <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 17, fontWeight: 800, textTransform: "uppercase", margin: 0, fontStyle: "italic" }}>{userProfile?.restaurant_name || "Comptoir Luxe"}</h4>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", margin: "4px 0 0" }}>{userProfile?.location || "Abidjan, CI"}</p>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 800, marginBottom: 16, borderBottom: "1px solid #000", paddingBottom: 8 }}>
                <span>{selectedOrderForBill.table_number}</span>
                <span>
                  {new Date(selectedOrderForBill.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(0,0,0,.1)", paddingBottom: 4, fontSize: 9, fontWeight: 800 }}>
                  <span style={{ width: "50%" }}>ARTICLE</span>
                  <span style={{ width: "17%", textAlign: "center" }}>QTÉ</span>
                  <span style={{ width: "33%", textAlign: "right" }}>TOTAL</span>
                </div>
                {selectedOrderForBill.items_details?.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", lineHeight: 1.3 }}>
                    <div style={{ width: "50%" }}>
                      <p style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 10, margin: 0 }}>{item.name}</p>
                      <p style={{ fontSize: 8, opacity: .6, margin: 0 }}>{item.price?.toLocaleString()} F / un.</p>
                    </div>
                    <span style={{ width: "17%", textAlign: "center", fontWeight: 800 }}>x{item.quantity || 1}</span>
                    <span style={{ width: "33%", textAlign: "right", fontWeight: 800, fontSize: 11 }}>
                      {((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: "4px solid #000", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 800 }}>
                <span style={{ fontSize: 12, textTransform: "uppercase", fontStyle: "italic" }}>TOTAL NET</span>
                <span style={{ fontSize: 19 }}>{selectedOrderForBill.total_amount?.toLocaleString()} F</span>
              </div>

              <div style={{ marginTop: 20, textAlign: "center", borderTop: "1px dashed #000", paddingTop: 14 }}>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", fontStyle: "italic", margin: 0 }}>Merci de votre visite !</p>
                <p style={{ fontSize: 7, opacity: .4, marginTop: 4 }}>Logiciel Comptoir • {new Date().getFullYear()}</p>
              </div>
            </div>

            {!showPaymentSelector ? (
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={() => setShowPaymentSelector(true)} style={{ width: "100%", height: 52, background: T.good, color: "#fff", borderRadius: radiusSm, fontWeight: 800, fontSize: 12, textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", cursor: "pointer" }}>
                  <CheckCircle2 size={18} /> Encaisser le client
                </button>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={handleBluetoothPrint} disabled={isPrinting} style={{ flex: 1, height: 52, borderRadius: radiusSm, fontWeight: 800, fontSize: 11, textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", cursor: "pointer", background: isPrinting ? T.warn : T.accent, color: isPrinting ? "#fff" : T.accentInk }}>
                    <Printer size={18} /> {isPrinting ? "Impression..." : "Imprimer"}
                  </button>
                  <button onClick={() => setSelectedOrderForBill(null)} style={{ width: 52, height: 52, borderRadius: radiusSm, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${T.line}`, background: T.surface, color: T.ink, cursor: "pointer" }}>
                    <X size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ ...card(T, { borderRadius: radius }), marginTop: 20, padding: 24, boxShadow: T.shadow }}>
                <h4 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", textAlign: "center", marginBottom: 20, letterSpacing: "0.08em", color: T.muted }}>
                  Choisir le mode de règlement
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {["Espèces", "Orange Money", "MTN Money", "Wave", "Visa"].map((m) => (
                    <button
                      key={m}
                      onClick={() => handleFinalizeTable(m)}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 14, borderRadius: radiusSm, background: T.surface2, color: T.ink, border: `1px solid ${T.line}`, cursor: "pointer" }}
                    >
                      <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", textAlign: "center" }}>{m}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowPaymentSelector(false)} style={{ width: "100%", marginTop: 18, fontSize: 10.5, color: T.faint, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.06em", border: "none", background: "none", cursor: "pointer" }}>Annuler</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION */}
      {isDeleteModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)", background: "rgba(0,0,0,.4)", textAlign: "center" }}>
          <div style={{ ...card(T, { borderRadius: radius }), width: "100%", maxWidth: 380, padding: 30, boxShadow: T.shadow }}>
            <AlertCircle size={30} color={T.bad} style={{ margin: "0 auto 18px" }} />
            <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 18, margin: "0 0 24px" }}>Supprimer la commande ?</h3>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setIsDeleteModalOpen(false)} style={{ flex: 1, padding: "13px 0", borderRadius: radiusSm, fontWeight: 700, fontSize: 12, textTransform: "uppercase", background: T.surface2, border: `1px solid ${T.line}`, color: T.ink, cursor: "pointer" }}>Retour</button>
              <button onClick={handleDeleteOrder} style={{ flex: 1, padding: "13px 0", borderRadius: radiusSm, fontWeight: 800, fontSize: 12, textTransform: "uppercase", background: T.bad, border: "none", color: "#fff", cursor: "pointer" }}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .dash-table-card:hover { transform: scale(1.03); }
        .dash-table-card:hover .dash-table-delete { opacity: 1; }
        .dash-table-card { transition: transform .2s; }
        @keyframes dash-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .6; } }
      `}</style>
    </div>
  );
}
