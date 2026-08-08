"use client";

import React, { useState, useEffect } from 'react';
import {
  UserPlus, ShieldCheck, CheckCircle2, X, Loader2, Mail
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toUserMessage } from '@/lib/errors';
import { getDashTokens, card, btnSolid, inputStyle, headFont, radius, pill } from '@/lib/dashTheme';

export default function StaffTabContent({ isDarkMode, userProfile }) {
  const T = getDashTokens(isDarkMode);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_email', userProfile.owner_email)
        .eq('role', 'cashier')
        .order('name', { ascending: true });

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Erreur:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCashier = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // La création se fait via une route API serveur (service_role) plutôt
      // que supabase.auth.signUp() côté client : signUp() ferait basculer la
      // session du navigateur vers le nouveau compte caissier et déconnecterait
      // le owner en plein milieu de l'opération.
      const res = await fetch('/api/staff/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erreur');

      alert("Compte caissier créé !");
      setShowAddModal(false);
      setFormData({ name: '', email: '', password: '', phone: '' });
      fetchStaff();
    } catch (error) {
      alert(toUserMessage(error, "Impossible de créer ce compte caissier."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ height: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <Loader2 className="animate-spin" color={T.accent} size={36} style={{ marginBottom: 14 }} />
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: T.muted }}>Chargement de l'équipe...</p>
    </div>
  );

  return (
    <div style={{ textAlign: "left", paddingBottom: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 26 }}>
        <div>
          <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 22, margin: 0 }}>Gestion du Personnel</h3>
          <p style={{ fontSize: 11, fontWeight: 700, color: T.accent, margin: "4px 0 0" }}>
            {userProfile.name} • {staff.length} Membre{staff.length > 1 ? "s" : ""}
          </p>
        </div>

        <button onClick={() => setShowAddModal(true)} style={{ ...btnSolid(T, { padding: "13px 24px" }), display: "flex", alignItems: "center", gap: 10 }}>
          <UserPlus size={17} /> Nouveau Caissier
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {staff.map((member) => (
          <div key={member.id} style={card(T, { padding: 26 })}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <div style={{ width: 52, height: 52, borderRadius: radius, background: T.accentWash, color: T.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 20, border: `1px solid ${T.accent}33` }}>
                {member.name[0]}
              </div>
              <div>
                <h4 style={{ fontWeight: 800, fontSize: 15, margin: "0 0 4px" }}>{member.name}</h4>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.faint }}>
                  <ShieldCheck size={12} color={T.accent} />
                  <p style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Caissier certifié</p>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.muted, marginBottom: 18 }}>
              <Mail size={14} />
              <span style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.owner_email}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: `1px solid ${T.line}` }}>
              <div>
                <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: T.faint, display: "block", marginBottom: 4 }}>Statut</span>
                <span style={{ ...pill(T, "good"), display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <CheckCircle2 size={12} /> En service
                </span>
              </div>
              <button style={{ padding: "9px 14px", borderRadius: radius, background: T.surface2, color: T.muted, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", border: "none", cursor: "pointer" }}>
                Détails
              </button>
            </div>
          </div>
        ))}

        {staff.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: "60px 0", textAlign: "center", opacity: .4, fontStyle: "italic", fontSize: 13 }}>
            Aucun membre d'équipe enregistré.
          </div>
        )}
      </div>

      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)", background: "rgba(0,0,0,.6)" }}>
          <div style={{ ...card(T, { borderRadius: radius }), width: "100%", maxWidth: 400, padding: 32, boxShadow: T.shadow }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 19, margin: 0 }}>Nouvel Accès</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", color: T.faint, cursor: "pointer", display: "flex" }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateCashier} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input
                type="text"
                placeholder="Nom complet"
                style={inputStyle(T)}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email professionnel"
                style={inputStyle(T)}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Mot de passe"
                style={inputStyle(T)}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <button type="submit" disabled={isSubmitting} style={{ ...btnSolid(T, { width: "100%", padding: "14px 0", marginTop: 6 }), display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : "Générer les accès"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
