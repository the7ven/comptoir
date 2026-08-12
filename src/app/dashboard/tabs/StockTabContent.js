"use client";

import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getDashTokens, card, btnSolid, inputStyle, headFont, radius } from '@/lib/dashTheme';
import { getInventory, createInventoryItem } from '@/lib/data/inventory';

export default function StockTabContent({ isDarkMode, userProfile }) {
  const T = getDashTokens(isDarkMode);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (userProfile) fetchStock();
  }, [userProfile]);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const data = await getInventory(userProfile.id);
      setInventory(data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const quantity = parseInt(formData.get('quantity'), 10);
      const minThreshold = parseInt(formData.get('threshold'), 10);
      if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(minThreshold) || minThreshold < 0) {
        alert("La quantité et le seuil doivent être des nombres positifs.");
        return;
      }

      await createInventoryItem({
        restaurantId: userProfile.id,
        name: formData.get('name'),
        quantity,
        minThreshold,
        unit: formData.get('unit'),
      });

      setIsModalOpen(false);
      fetchStock();
    } catch (err) {
      console.error(err);
      alert("Impossible d'enregistrer cet article de stock.");
    }
  };

  return (
    <div style={{ textAlign: "left", paddingBottom: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 26 }}>
        <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 22, margin: 0 }}>Inventaire & Stocks</h3>
        <button onClick={() => setIsModalOpen(true)} style={btnSolid(T, { padding: "13px 24px" })}>
          Ajouter un article
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        {inventory.map((item) => {
          const low = item.quantity <= item.min_threshold;
          return (
            <div key={item.id} style={{ ...card(T, { padding: 22 }), position: "relative" }}>
              {low && (
                <div style={{ position: "absolute", top: 14, right: 14 }}><AlertTriangle color={T.warn} size={18} /></div>
              )}
              <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: T.faint, margin: "0 0 4px" }}>{item.unit}</p>
              <h4 style={{ fontFamily: headFont, fontSize: 17, fontWeight: 800, margin: "0 0 14px" }}>{item.name}</h4>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <span className="num" style={{ fontSize: 28, fontWeight: 800, color: low ? T.warn : T.accent }}>{item.quantity}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: T.faint, marginBottom: 4, textTransform: "uppercase" }}>En stock</span>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)", background: "rgba(0,0,0,.6)" }}>
          <form onSubmit={handleAddStock} style={{ ...card(T, { borderRadius: radius }), width: "100%", maxWidth: 380, padding: 32, boxShadow: T.shadow }}>
            <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 19, margin: "0 0 22px" }}>Nouvel Article</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input name="name" required placeholder="Nom (ex: Huile de palme)" style={inputStyle(T)} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input name="quantity" type="number" required placeholder="Qté initiale" style={inputStyle(T)} />
                <input name="threshold" type="number" required placeholder="Seuil alerte" style={inputStyle(T)} />
              </div>
              <input name="unit" required placeholder="Unité (Litre, Kg, Carton)" style={inputStyle(T)} />
              <button type="submit" style={btnSolid(T, { width: "100%", padding: "14px 0", marginTop: 6 })}>Confirmer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
