"use client";

import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, Loader2,
} from 'lucide-react';
import { toUserMessage } from '@/lib/errors';
import { getDashTokens, card, inputStyle, headFont, radius, radiusSm } from '@/lib/dashTheme';
import { getExpensesForRange, createExpense, deleteExpense as deleteExpenseRow } from '@/lib/data/expenses';
import { getPeriodRange } from '@/lib/dateRange';

export default function ExpensesTabContent({ isDarkMode, selectedDate, userProfile }) {
  const T = getDashTokens(isDarkMode);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [period, setPeriod] = useState("day"); // Nouvel état pour la période

  useEffect(() => {
    if (userProfile) {
      fetchExpenses();
    }
  }, [selectedDate, userProfile, period]); // Ajout de period dans les dépendances

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { start, end } = getPeriodRange(period, selectedDate);
      const data = await getExpensesForRange(userProfile.owner_email, start, end);
      setExpenses(data);
      setTotalExpenses(data.reduce((acc, curr) => acc + Number(curr.amount), 0));
    } catch (err) {
      console.error("Erreur chargement dépenses:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      if (!userProfile) throw new Error("Profil utilisateur non chargé");

      const amount = Number(formData.get('amount'));
      if (!Number.isFinite(amount) || amount < 0) {
        alert("Le montant doit être un nombre positif.");
        return;
      }

      await createExpense({
        restaurantId: userProfile.id,
        ownerEmail: userProfile.owner_email,
        label: formData.get('label'),
        amount,
        category: formData.get('category'),
      });

      setIsModalOpen(false);
      fetchExpenses();
    } catch (err) {
      console.error("Détails de l'erreur :", err);
      alert(toUserMessage(err, "Impossible d'enregistrer cette dépense."));
    }
  };

  const deleteExpense = async (id) => {
    if (confirm("Supprimer cette dépense ?")) {
      try {
        await deleteExpenseRow(id, userProfile.owner_email);
        fetchExpenses();
      } catch (err) {
        alert("Erreur lors de la suppression");
      }
    }
  };

  const periods = [
    { id: "day", label: "Jour" },
    { id: "week", label: "Semaine" },
    { id: "month", label: "Mois" },
    { id: "year", label: "Année" },
  ];

  return (
    <div style={{ textAlign: "left", paddingBottom: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 26 }}>
        <div>
          <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 22, margin: 0 }}>Gestion des Dépenses</h3>
          <p className="num" style={{ fontSize: 11, fontWeight: 700, color: T.bad, margin: "4px 0 0" }}>
            Total {period} : {totalExpenses.toLocaleString()} F
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          {userProfile?.role === "owner" && (
            <div style={{ display: "inline-flex", padding: 3, background: T.surface2, borderRadius: 999, gap: 2 }}>
              {periods.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  style={{
                    padding: "7px 16px", borderRadius: 999, border: "none", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                    background: period === p.id ? T.bad : "none", color: period === p.id ? "#fff" : T.muted,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          <button onClick={() => setIsModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 10, background: T.bad, color: "#fff", padding: "13px 24px", borderRadius: 999, fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>
            <Plus size={18} /> Enregistrer un achat
          </button>
        </div>
      </div>

      <div style={{ ...card(T), overflow: "hidden", overflowX: "auto" }}>
        <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: T.surface2 }}>
              <th style={{ padding: "16px 22px", fontSize: 10.5, textTransform: "uppercase", fontWeight: 800, color: T.faint }}>Désignation</th>
              <th style={{ padding: "16px 22px", fontSize: 10.5, textTransform: "uppercase", fontWeight: 800, color: T.faint }}>Catégorie</th>
              <th style={{ padding: "16px 22px", fontSize: 10.5, textTransform: "uppercase", fontWeight: 800, color: T.faint, textAlign: "right" }}>Montant</th>
              <th style={{ padding: "16px 22px", fontSize: 10.5, textTransform: "uppercase", fontWeight: 800, color: T.faint, textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ padding: "70px 22px", textAlign: "center" }}><Loader2 className="animate-spin" color={T.accent} style={{ margin: "0 auto", opacity: .5 }} /></td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: "70px 22px", textAlign: "center", opacity: .4, fontStyle: "italic" }}>Aucune dépense pour cette période</td></tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} className="dash-row-hover" style={{ borderTop: `1px solid ${T.line}` }}>
                  <td style={{ padding: "16px 22px" }}>
                    <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 3px" }}>{exp.label}</p>
                    <p style={{ fontSize: 9.5, color: T.faint, fontWeight: 700, textTransform: "uppercase" }}>{new Date(exp.created_at).toLocaleDateString()}</p>
                  </td>
                  <td style={{ padding: "16px 22px", fontSize: 10.5, fontWeight: 700, color: T.faint, textTransform: "uppercase" }}>{exp.category}</td>
                  <td className="num" style={{ padding: "16px 22px", textAlign: "right", fontWeight: 800, color: T.bad }}>{exp.amount.toLocaleString()} F</td>
                  <td style={{ padding: "16px 22px", textAlign: "right" }}>
                    <button onClick={() => deleteExpense(exp.id)} style={{ padding: 8, color: T.bad, border: "none", background: "none", cursor: "pointer", display: "inline-flex" }}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)", background: "rgba(0,0,0,.6)" }}>
          <form onSubmit={handleAddExpense} style={{ ...card(T, { borderRadius: radius }), width: "100%", maxWidth: 380, padding: 32, boxShadow: T.shadow }}>
            <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 19, margin: "0 0 22px" }}>Nouvelle Dépense</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input name="label" required placeholder="Désignation (ex: Sac de riz)" style={inputStyle(T)} />
              <input name="amount" type="number" required placeholder="Montant (F)" style={inputStyle(T)} />
              <select name="category" style={{ ...inputStyle(T), cursor: "pointer" }}>
                <option>Approvisionnement</option>
                <option>Loyer & Factures</option>
                <option>Salaire</option>
                <option>Marketing</option>
                <option>Entretien</option>
                <option>Autre</option>
              </select>
              <div style={{ display: "flex", gap: 14, paddingTop: 8 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, fontWeight: 700, fontSize: 12, textTransform: "uppercase", border: "none", background: "none", cursor: "pointer", color: T.faint }}>Annuler</button>
                <button type="submit" style={{ flex: 1, padding: "13px 0", background: T.bad, color: "#fff", borderRadius: radiusSm, fontWeight: 700, fontSize: 12, textTransform: "uppercase", border: "none", cursor: "pointer" }}>Enregistrer</button>
              </div>
            </div>
          </form>
        </div>
      )}

      <style jsx global>{`
        .dash-row-hover:hover { background: ${T.surface2}; }
      `}</style>
    </div>
  );
}
