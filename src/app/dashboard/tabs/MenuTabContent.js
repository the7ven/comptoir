"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  X,
  ShoppingBag,
  Minus,
  RotateCcw,
  Utensils,
  Beer,
  List,
  Search,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toUserMessage } from "@/lib/errors";
import { getDashTokens, card, btnSolid, inputStyle, headFont, radius, radiusSm } from "@/lib/dashTheme";

export default function MenuTabContent({
  isDarkMode,
  cart,
  setCart,
  setActiveTab,
  pendingOrder,
  setPendingOrder,
  userProfile,
}) {
  const T = getDashTokens(isDarkMode);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [orderType, setOrderType] = useState(
    pendingOrder?.order_type || "Sur place",
  );
  const [tableNum, setTableNum] = useState(pendingOrder?.table_number || "");

  // Un caissier peut vendre depuis le menu, mais seul le owner peut créer/
  // modifier/supprimer des plats et fixer les prix. Ceci ne remplace pas
  // une policy RLS côté serveur (indispensable), mais évite déjà d'exposer
  // ces actions dans l'UI d'un compte caissier.
  const isOwner = userProfile?.role === "owner";

  useEffect(() => {
    if (userProfile) fetchDishes();
    if (pendingOrder) {
      setOrderType(pendingOrder.order_type || "Sur place");
      setTableNum(pendingOrder.table_number || "");
    }
  }, [pendingOrder, userProfile]);

  const fetchDishes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("dishes")
        .select("*")
        .ilike("owner_email", userProfile.owner_email.trim())
        .order("name", { ascending: true });
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Erreur:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    if (activeCategory === "Tous") return matchesSearch;

    // Filtre spécial pour regrouper toutes les boissons sous le bouton "Bar"
    if (activeCategory === "Boissons") {
      const categoriesBoissons = [
        "Cocktails",
        "Jus Naturel",
        "Bière",
        "Whisky",
        "Vin",
        "Jus Brasserie",
      ];
      return matchesSearch && categoriesBoissons.includes(item.category);
    }

    return matchesSearch && item.category === activeCategory;
  });

  const addToCart = (dish) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === dish.id);
      if (existing) {
        return prev.map((item) =>
          item.id === dish.id
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item,
        );
      }
      return [...prev, { ...dish, quantity: 1 }];
    });
  };

  const updateQuantity = (dishId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === dishId) {
            const newQty = (item.quantity || 1) + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : item;
          }
          return item;
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const handleDeleteDish = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase
        .from("dishes")
        .delete()
        .eq("id", itemToDelete.id)
        .eq("owner_email", userProfile.owner_email);
      if (error) throw error;
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      fetchDishes();
    } catch (error) {
      alert(toUserMessage(error, "Impossible de supprimer cet article."));
    }
  };

  const finalizeOrder = async () => {
    if (orderType === "Sur place" && !tableNum)
      return alert("Précisez la table.");
    const total = cart.reduce(
      (acc, curr) => acc + curr.price * curr.quantity,
      0,
    );
    try {
      const { error } = await supabase.from("orders").insert([
        {
          restaurant_id: userProfile.id,
          owner_email: userProfile.owner_email,
          table_number:
            orderType === "Emporter" ? "Emporter" : `Table ${tableNum}`,
          items_summary: cart
            .map((item) => `${item.quantity}x ${item.name}`)
            .join(", "),
          items_details: cart,
          total_amount: total,
          status: "En cours",
        },
      ]);
      if (error) throw error;
      setCart([]);
      setPendingOrder(null);
      setActiveTab("orders");
    } catch (error) {
      alert(toUserMessage(error, "Impossible d'envoyer la commande en cuisine."));
    }
  };

  if (loading)
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 256, opacity: .5 }}>
        <Loader2 className="animate-spin" color={T.accent} style={{ marginBottom: 8 }} />
        <p style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>Chargement...</p>
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: 24, textAlign: "left" }} className="dash-row-lg">
      {/* --- GRILLE MENU --- */}
      <section style={{ flex: "1 1 420px", textAlign: "left", minWidth: 0 }}>
        <header style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 20, marginBottom: 24 }}>
          <div>
            <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 22, margin: "0 0 14px" }}>La Carte</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <CategoryButton T={T} label="Tous" active={activeCategory === "Tous"} onClick={() => setActiveCategory("Tous")} icon={<List size={13} />} />
              <CategoryButton T={T} label="Cuisine" active={activeCategory === "Plats"} onClick={() => setActiveCategory("Plats")} icon={<Utensils size={13} />} />
              <CategoryButton T={T} label="Bar" active={activeCategory === "Boissons"} onClick={() => setActiveCategory("Boissons")} icon={<Beer size={13} />} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, width: "100%" }} className="dash-toolbar-actions">
            <div style={{ ...card(T, { borderRadius: radiusSm }), display: "flex", alignItems: "center", padding: "10px 14px", flex: 1 }}>
              <Search size={16} color={T.faint} style={{ marginRight: 8 }} />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: "none", border: "none", outline: "none", fontSize: 13, fontWeight: 600, width: "100%", color: T.ink, fontFamily: "inherit" }}
              />
            </div>
            {isOwner && (
              <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} style={btnSolid(T, { padding: "10px 20px", whiteSpace: "nowrap" })}>
                <Plus size={16} strokeWidth={3} /> Nouveau
              </button>
            )}
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16, paddingBottom: 20 }}>
          {filteredItems.map((item) => (
            <div key={item.id} style={{ ...card(T), overflow: "hidden", position: "relative" }} className="dash-dish-card">
              <div style={{ height: 120, position: "relative", overflow: "hidden" }}>
                <img
                  src={item.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=300"}
                  alt={item.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div className="dash-dish-overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.55)", opacity: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, transition: "opacity .2s" }}>
                  <button onClick={() => addToCart(item)} style={{ width: 38, height: 38, background: T.accent, color: T.accentInk, borderRadius: radiusSm, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
                    <Plus size={18} strokeWidth={3} />
                  </button>
                  {isOwner && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} style={{ padding: 8, borderRadius: 8, background: "rgba(255,255,255,.15)", color: "#fff", border: "none", cursor: "pointer", display: "flex" }}>
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => { setItemToDelete(item); setIsDeleteModalOpen(true); }} style={{ padding: 8, borderRadius: 8, background: "rgba(255,255,255,.15)", color: "#fff", border: "none", cursor: "pointer", display: "flex" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ padding: 14 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</h4>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p className="num" style={{ color: T.accent, fontWeight: 800, fontSize: 14, margin: 0 }}>{item.price?.toLocaleString()} F</p>
                  <p style={{ fontSize: 9, fontWeight: 700, color: T.faint, margin: 0, textTransform: "uppercase" }}>{item.category}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- PANIER --- */}
      <aside style={{ ...card(T), width: 260, flexShrink: 0, display: "flex", flexDirection: "column", height: "fit-content", maxHeight: "calc(100vh - 140px)", position: "sticky", top: 20 }} className="dash-cart-aside">
        <div style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <ShoppingBag color={T.accent} size={16} />
            <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 13.5, margin: 0 }}>Panier</h3>
          </div>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} style={{ padding: 6, color: T.bad, background: "none", border: "none", cursor: "pointer", opacity: .6 }}>
              <RotateCcw size={14} />
            </button>
          )}
        </div>

        <div style={{ overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          {cart.length === 0 ? (
            <div style={{ padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: .3 }}>
              <Utensils size={22} style={{ marginBottom: 6, color: T.faint }} />
              <p style={{ fontSize: 10, fontWeight: 700, color: T.faint }}>Vide</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} style={{ padding: 10, borderRadius: radiusSm, background: T.surface2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, margin: 0, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</p>
                  <p className="num" style={{ fontSize: 10.5, fontWeight: 700, color: T.accent, margin: "2px 0 0" }}>{item.price.toLocaleString()} F</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: T.surfaceHover, borderRadius: 8, padding: "3px 6px", flexShrink: 0 }}>
                  <button onClick={() => updateQuantity(item.id, -1)} style={{ border: "none", background: "none", color: T.muted, cursor: "pointer", display: "flex" }}>
                    <Minus size={11} />
                  </button>
                  <span className="num" style={{ fontSize: 11, fontWeight: 800, width: 14, textAlign: "center" }}>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} style={{ border: "none", background: "none", color: T.accent, cursor: "pointer", display: "flex" }}>
                    <Plus size={11} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div style={{ padding: 16, borderTop: `1px solid ${T.line}`, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                style={{ ...inputStyle(T), padding: "8px 10px", fontSize: 11, cursor: "pointer" }}
              >
                <option value="Sur place">Sur place</option>
                <option value="Emporter">Emporter</option>
              </select>
              {orderType === "Sur place" && (
                <input
                  type="text"
                  placeholder="Table"
                  value={tableNum}
                  onChange={(e) => setTableNum(e.target.value)}
                  style={{ ...inputStyle(T), padding: "8px 10px", fontSize: 11 }}
                />
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: T.faint, margin: 0 }}>Total</p>
              <p className="num" style={{ fontSize: 17, fontWeight: 800, color: T.accent, margin: 0 }}>
                {cart.reduce((a, b) => a + b.price * b.quantity, 0).toLocaleString()} F
              </p>
            </div>
            <button onClick={finalizeOrder} style={btnSolid(T, { width: "100%", padding: "11px 0", fontSize: 12 })}>
              Envoyer en cuisine
            </button>
          </div>
        )}
      </aside>

      {/* --- MODALE COMPACTE --- */}
      {isOwner && isModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)" }}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const rawPrice = parseInt(formData.get("price"), 10);
              if (!Number.isFinite(rawPrice) || rawPrice < 0) {
                alert("Le prix doit être un nombre positif.");
                return;
              }
              const dishData = {
                restaurant_id: userProfile.id,
                owner_email: userProfile.owner_email,
                name: formData.get("name"),
                price: rawPrice,
                category: formData.get("category"),
                image_url: formData.get("image"),
                status: "Disponible",
              };
              if (editingItem?.id)
                await supabase.from("dishes").update(dishData).eq("id", editingItem.id);
              else await supabase.from("dishes").insert([dishData]);
              setIsModalOpen(false);
              fetchDishes();
            }}
            style={{ ...card(T, { borderRadius: radius }), width: "100%", maxWidth: 420, padding: 32, position: "relative", boxShadow: T.shadow }}
          >
            <button type="button" onClick={() => setIsModalOpen(false)} style={{ position: "absolute", top: 20, right: 20, opacity: .5, border: "none", background: "none", cursor: "pointer", color: T.ink, display: "flex" }}>
              <X size={20} />
            </button>
            <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 19, margin: "0 0 20px" }}>{editingItem?.id ? "Modifier" : "Ajouter"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: T.muted, margin: "0 0 6px" }}>Nom du plat / boisson</p>
                <input name="name" required defaultValue={editingItem?.name} style={inputStyle(T)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: T.muted, margin: "0 0 6px" }}>Prix (F)</p>
                  <input name="price" type="number" required defaultValue={editingItem?.price} style={inputStyle(T)} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: T.muted, margin: "0 0 6px" }}>Catégorie</p>
                  <select name="category" defaultValue={editingItem?.category || "Plats"} style={{ ...inputStyle(T), cursor: "pointer" }}>
                    <optgroup label="Cuisine">
                      <option value="Plats">Plat / Accompagnement</option>
                    </optgroup>
                    <optgroup label="Bar (Boissons)">
                      <option value="Cocktails">Cocktail</option>
                      <option value="Jus Naturel">Jus Naturel</option>
                      <option value="Bière">Bière</option>
                      <option value="Whisky">Whisky</option>
                      <option value="Vin">Vin</option>
                      <option value="Jus Brasserie">Jus Brasserie (Soda)</option>
                    </optgroup>
                  </select>
                </div>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: T.muted, margin: "0 0 6px" }}>URL Image</p>
                <input name="image" type="text" defaultValue={editingItem?.image_url} style={inputStyle(T)} />
              </div>
              <button type="submit" style={btnSolid(T, { width: "100%", padding: "13px 0", marginTop: 6 })}>
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- MODALE SUPPRESSION --- */}
      {isOwner && isDeleteModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)", textAlign: "center" }}>
          <div style={{ ...card(T, { borderRadius: radius }), width: "100%", maxWidth: 380, padding: 30, boxShadow: T.shadow }}>
            <Trash2 size={30} color={T.bad} style={{ margin: "0 auto 16px" }} />
            <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 18, margin: "0 0 8px" }}>Supprimer cet article ?</h3>
            <p style={{ fontSize: 12.5, color: T.faint, margin: "0 0 22px" }}>
              « {itemToDelete?.name} » sera retiré définitivement de la carte.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setIsDeleteModalOpen(false); setItemToDelete(null); }} style={{ flex: 1, padding: "13px 0", borderRadius: radiusSm, fontWeight: 700, fontSize: 11.5, textTransform: "uppercase", background: T.surface2, border: `1px solid ${T.line}`, color: T.ink, cursor: "pointer" }}>Annuler</button>
              <button onClick={handleDeleteDish} style={{ flex: 1, padding: "13px 0", borderRadius: radiusSm, fontWeight: 800, fontSize: 11.5, textTransform: "uppercase", background: T.bad, border: "none", color: "#fff", cursor: "pointer" }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .dash-dish-card:hover .dash-dish-overlay { opacity: 1; }
        /* Le panier reste à droite du menu par défaut (dash-row-lg est en
           row dès le départ). En dessous de 560px, il n'y a plus la place
           pour deux colonnes : le panier repasse en pleine largeur et
           redevient un bloc sticky en haut de la page plutôt qu'à droite. */
        @media (max-width: 559px) {
          .dash-cart-aside { width: 100% !important; position: static !important; max-height: none !important; }
        }
      `}</style>
    </div>
  );
}

function CategoryButton({ T, label, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 999,
        fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer",
        background: active ? T.accent : T.surface2,
        color: active ? T.accentInk : T.muted,
      }}
    >
      {icon}
      {label}
    </button>
  );
}
