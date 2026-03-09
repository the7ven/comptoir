"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  AlertCircle,
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

export default function MenuTabContent({
  isDarkMode,
  cart,
  setCart,
  setActiveTab,
  pendingOrder,
  setPendingOrder,
  userProfile,
}) {
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
      alert("Erreur: " + error.message);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-64 opacity-50">
        <Loader2 className="animate-spin text-[#00D9FF] mb-2" />
        <p className="text-[10px] font-black uppercase tracking-widest">
          Chargement...
        </p>
      </div>
    );

  return (
    <div className="flex flex-col lg:flex-row gap-6 no-print min-h-screen text-left">
      {/* --- PANIER --- */}
      <aside
        className={`w-full lg:w-80 flex flex-col rounded-3xl shrink-0 lg:sticky lg:top-8 h-fit max-h-[calc(100vh-40px)] ${isDarkMode ? "bg-[#0a0a0a]" : "bg-white shadow-xl border border-gray-100"}`}
      >
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <ShoppingBag className="text-[#00D9FF]" size={18} />
            <h3 className="font-black italic text-lg uppercase tracking-tight">
              Panier
            </h3>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="p-2 text-red-500/50 hover:text-red-500 transition-all border-none bg-transparent cursor-pointer"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>

        <div className="overflow-y-auto p-4 space-y-3 flex-1 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center opacity-10 italic text-[10px]">
              <Utensils size={30} className="mb-2" />
              <p className="uppercase font-black tracking-widest">Vide</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-2xl flex items-center justify-between ${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}
              >
                <div className="text-left flex-1">
                  <p className="text-[11px] font-black uppercase leading-tight">
                    {item.name}
                  </p>
                  <p className="text-[10px] font-bold text-[#00D9FF]">
                    {item.price.toLocaleString()} F
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-black/20 rounded-lg px-2 py-1">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="hover:text-red-500 border-none bg-transparent text-white cursor-pointer"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-xs font-black w-4 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="hover:text-[#00D9FF] border-none bg-transparent text-white cursor-pointer"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-white/5 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                className={`p-3 rounded-xl text-[10px] font-black uppercase outline-none border-none cursor-pointer ${isDarkMode ? "bg-white/10 text-white" : "bg-gray-100 text-gray-700"}`}
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
                  className={`p-3 rounded-xl text-[10px] font-black uppercase outline-none border-none ${isDarkMode ? "bg-white/10 text-white" : "bg-gray-100"}`}
                />
              )}
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black opacity-30 uppercase">
                Total
              </p>
              <p className="text-xl font-black text-[#00D9FF]">
                {cart
                  .reduce((a, b) => a + b.price * b.quantity, 0)
                  .toLocaleString()}{" "}
                F
              </p>
            </div>
            <button
              onClick={finalizeOrder}
              className="w-full py-4 bg-[#00D9FF] text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg border-none cursor-pointer"
            >
              Envoyer en cuisine
            </button>
          </div>
        )}
      </aside>

      {/* --- GRILLE MENU --- */}
      <section className="flex-1 text-left">
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
          <div className="text-left">
            <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-4">
              La Carte
            </h3>
            <div className="flex flex-wrap gap-2">
              <CategoryButton
                label="Tous"
                active={activeCategory === "Tous"}
                onClick={() => setActiveCategory("Tous")}
                icon={<List size={12} />}
              />
              <CategoryButton
                label="Cuisine"
                active={activeCategory === "Plats"}
                onClick={() => setActiveCategory("Plats")}
                icon={<Utensils size={12} />}
              />
              <CategoryButton
                label="Bar"
                active={activeCategory === "Boissons"}
                onClick={() => setActiveCategory("Boissons")}
                icon={<Beer size={12} />}
              />
            </div>
          </div>

          <div className="flex gap-3 w-full xl:w-auto">
            <div
              className={`flex items-center px-4 py-3 rounded-2xl flex-1 xl:w-64 ${isDarkMode ? "bg-[#0a0a0a]" : "bg-white shadow-sm border border-gray-100"}`}
            >
              <Search size={16} className="opacity-20 mr-2" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs font-bold w-full"
              />
            </div>
            <button
              onClick={() => {
                setEditingItem(null);
                setIsModalOpen(true);
              }}
              className="bg-[#00D9FF] text-black px-5 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 shadow-md hover:scale-105 transition-all border-none cursor-pointer"
            >
              <Plus size={16} strokeWidth={3} /> Nouveau
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 pb-20">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`group relative rounded-2xl overflow-hidden transition-all border ${isDarkMode ? "bg-[#0a0a0a] border-white/5" : "bg-white border-gray-100 shadow-sm"}`}
            >
              <div className="h-32 relative overflow-hidden">
                <img
                  src={
                    item.image_url ||
                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=300"
                  }
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-2 backdrop-blur-[1px]">
                  <button
                    onClick={() => addToCart(item)}
                    className="w-10 h-10 bg-[#00D9FF] text-black rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform border-none cursor-pointer"
                  >
                    <Plus size={20} strokeWidth={3} />
                  </button>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setIsModalOpen(true);
                      }}
                      className="p-2 rounded-lg bg-white/10 text-white hover:bg-white hover:text-black transition-all border-none cursor-pointer"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setItemToDelete(item);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 rounded-lg bg-white/10 text-white hover:bg-red-500 transition-all border-none cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-4 text-left">
                <h4 className="text-[12px] font-black uppercase tracking-tight mb-1 truncate">
                  {item.name}
                </h4>
                <div className="flex justify-between items-center">
                  <p className="text-[#00D9FF] font-black text-sm italic">
                    {item.price?.toLocaleString()} F
                  </p>
                  <p className="text-[8px] font-black uppercase opacity-20">
                    {item.category}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- MODALE COMPACTE --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const dishData = {
                restaurant_id: userProfile.id,
                owner_email: userProfile.owner_email,
                name: formData.get("name"),
                price: parseInt(formData.get("price")),
                category: formData.get("category"),
                image_url: formData.get("image"),
                status: "Disponible",
              };
              if (editingItem?.id)
                await supabase
                  .from("dishes")
                  .update(dishData)
                  .eq("id", editingItem.id);
              else await supabase.from("dishes").insert([dishData]);
              setIsModalOpen(false);
              fetchDishes();
            }}
            className={`w-full max-w-md rounded-3xl p-8 relative ${isDarkMode ? "bg-[#0a0a0a] border border-white/10 text-white" : "bg-white shadow-2xl"}`}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 opacity-30 hover:opacity-100 border-none bg-transparent cursor-pointer text-current"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-black mb-6 italic uppercase">
              {editingItem?.id ? "Modifier" : "Ajouter"}
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase opacity-40 ml-2">
                  Nom du plat / boisson
                </p>
                <input
                  name="name"
                  required
                  defaultValue={editingItem?.name}
                  className={`w-full px-4 py-3 rounded-xl outline-none border-none ${isDarkMode ? "bg-white/5 text-white" : "bg-gray-100"}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase opacity-40 ml-2">
                    Prix (F)
                  </p>
                  <input
                    name="price"
                    type="number"
                    required
                    defaultValue={editingItem?.price}
                    className={`w-full px-4 py-3 rounded-xl outline-none border-none ${isDarkMode ? "bg-white/5 text-white" : "bg-gray-100"}`}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase opacity-40 ml-2">
                    Catégorie
                  </p>
                  <select
                    name="category"
                    defaultValue={editingItem?.category || "Plats"}
                    className={`w-full px-4 py-3 rounded-xl outline-none border-none cursor-pointer ${
                      isDarkMode
                        ? "bg-white/10 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <optgroup
                      label="Cuisine"
                      className={
                        isDarkMode
                          ? "bg-[#0a0a0a] text-white"
                          : "bg-white text-gray-900"
                      }
                    >
                      <option
                        value="Plats"
                        className={
                          isDarkMode
                            ? "bg-[#0a0a0a] text-white"
                            : "bg-white text-gray-900"
                        }
                      >
                        Plat / Accompagnement
                      </option>
                    </optgroup>
                    <optgroup
                      label="Bar (Boissons)"
                      className={
                        isDarkMode
                          ? "bg-[#0a0a0a] text-white"
                          : "bg-white text-gray-900"
                      }
                    >
                      <option
                        value="Cocktails"
                        className={
                          isDarkMode
                            ? "bg-[#0a0a0a] text-white"
                            : "bg-white text-gray-900"
                        }
                      >
                        Cocktail
                      </option>
                      <option
                        value="Jus Naturel"
                        className={
                          isDarkMode
                            ? "bg-[#0a0a0a] text-white"
                            : "bg-white text-gray-900"
                        }
                      >
                        Jus Naturel
                      </option>
                      <option
                        value="Bière"
                        className={
                          isDarkMode
                            ? "bg-[#0a0a0a] text-white"
                            : "bg-white text-gray-900"
                        }
                      >
                        Bière
                      </option>
                      <option
                        value="Whisky"
                        className={
                          isDarkMode
                            ? "bg-[#0a0a0a] text-white"
                            : "bg-white text-gray-900"
                        }
                      >
                        Whisky
                      </option>
                      <option
                        value="Vin"
                        className={
                          isDarkMode
                            ? "bg-[#0a0a0a] text-white"
                            : "bg-white text-gray-900"
                        }
                      >
                        Vin
                      </option>
                      <option
                        value="Jus Brasserie"
                        className={
                          isDarkMode
                            ? "bg-[#0a0a0a] text-white"
                            : "bg-white text-gray-900"
                        }
                      >
                        Jus Brasserie (Soda)
                      </option>
                    </optgroup>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase opacity-40 ml-2">
                  URL Image
                </p>
                <input
                  name="image"
                  type="text"
                  defaultValue={editingItem?.image_url}
                  className={`w-full px-4 py-3 rounded-xl outline-none border-none ${isDarkMode ? "bg-white/5 text-white" : "bg-gray-100"}`}
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 rounded-xl font-black bg-[#00D9FF] text-black uppercase text-[10px] tracking-widest mt-4 border-none cursor-pointer"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function CategoryButton({ label, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all border-none cursor-pointer ${active ? "bg-[#00D9FF] text-black shadow-md" : "bg-white/5 text-white/40 hover:text-white"}`}
    >
      {icon} {label}
    </button>
  );
}
