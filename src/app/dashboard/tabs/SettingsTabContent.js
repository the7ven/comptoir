"use client";

import React, { useState, useEffect } from "react";
import {
  Store, Database, Camera, MapPin,
  Loader2, CheckCircle, Shield
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from 'next/navigation';
import { getDashTokens, card, btnSolid, inputStyle, headFont, radius, radiusSm } from '@/lib/dashTheme';
import { getRestaurantProfile, updateRestaurantProfile } from '@/lib/data/restaurants';

export default function SettingsTabContent({ isDarkMode, userProfile }) {
  const T = getDashTokens(isDarkMode);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [settings, setSettings] = useState({
    name: "",
    location: "",
    logo_url: "",
    currency: "FCFA",
    tva: "18%",
  });

  useEffect(() => {
    if (userProfile) fetchSettings();
  }, [userProfile]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await getRestaurantProfile(userProfile.id);

      if (data) {
        setSettings(prev => ({
          ...prev,
          name: data.name || "",
          location: data.location || "",
          logo_url: data.logo_url || "",
        }));
      }
    } catch (err) {
      console.error("Erreur chargement paramètres:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!userProfile) return;

      await updateRestaurantProfile(userProfile.id, {
        name: settings.name,
        location: settings.location,
      });

      setSaveSuccess(true);
      router.refresh();

      setTimeout(() => {
        setSaveSuccess(false);
        fetchSettings();
      }, 1500);

    } catch (err) {
      console.error("Erreur système:", err);
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];

      if (!file || !userProfile) return;

      // Organisation du stockage par ID restaurant pour éviter les conflits
      const fileExt = file.name.split('.').pop();
      const filePath = `${userProfile.id}/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      await updateRestaurantProfile(userProfile.id, { logo_url: publicUrl });

      setSettings(prev => ({ ...prev, logo_url: publicUrl }));
      alert("Logo mis à jour !");
    } catch (error) {
      console.error('Erreur upload:', error.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: 380, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin" color={T.accent} size={36} style={{ marginBottom: 14 }} />
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: T.muted }}>Synchronisation des paramètres...</p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "left", paddingBottom: 30 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 26 }}>
        <div>
          <h3 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 22, margin: 0 }}>Paramètres Système</h3>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.faint, margin: "4px 0 0" }}>Configuration globale de votre établissement</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: "flex", alignItems: "center", gap: 10, padding: "13px 26px", borderRadius: 999, border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: 12.5, textTransform: "uppercase", letterSpacing: "0.04em",
            background: saveSuccess ? T.good : T.accent, color: T.accentInk,
          }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : saveSuccess ? <CheckCircle size={16} /> : null}
          {saveSuccess ? "Enregistré !" : "Enregistrer"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }} className="dash-grid-collapse">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={card(T, { padding: 28 })}>
            <h4 style={{ fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 10, margin: "0 0 22px" }}>
              <Store size={19} color={T.accent} /> Profil de l'établissement
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="dash-grid-collapse-sm">
              <div>
                <label style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: T.faint, display: "block", marginBottom: 8 }}>Nom du restaurant</label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  style={inputStyle(T)}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: T.faint, display: "block", marginBottom: 8 }}>Localisation</label>
                <div style={{ position: "relative" }}>
                  <MapPin size={16} color={T.faint} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }} />
                  <input
                    type="text"
                    value={settings.location}
                    onChange={(e) => setSettings({ ...settings, location: e.target.value })}
                    placeholder="Douala, Cameroun"
                    style={inputStyle(T, { paddingLeft: 42 })}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 18, padding: 18, borderRadius: radius, border: `1px dashed ${T.line}` }}>
              <div style={{ width: 70, height: 70, borderRadius: radius, background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", color: T.accent, overflow: "hidden", border: `1px solid ${T.line}`, flexShrink: 0 }}>
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Camera size={26} />
                )}
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 3px" }}>Logo de l'établissement</p>
                <p style={{ fontSize: 11.5, color: T.faint, fontWeight: 500, margin: "0 0 8px" }}>Format PNG ou JPG. Max 2MB.</p>
                <label style={{ color: T.accent, fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer" }}>
                  {uploading ? "Chargement..." : "Modifier l'image"}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} style={{ display: "none" }} />
                </label>
              </div>
            </div>
          </div>

          <div style={card(T, { padding: 28 })}>
            <h4 style={{ fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 10, margin: "0 0 22px" }}>
              <Database size={19} color={T.accent} /> Configuration locale
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="dash-grid-collapse-sm">
              <SettingToggle T={T} label="Devise de la caisse" value={settings.currency} />
              <SettingToggle T={T} label="Taux TVA" value={settings.tva} />
            </div>
          </div>
        </div>

        <div style={card(T, { padding: 26, background: T.accentWash, border: `1px solid ${T.accent}33` })}>
          <Shield size={30} color={T.accent} style={{ marginBottom: 14 }} />
          <h4 style={{ fontWeight: 800, fontSize: 13.5, textTransform: "uppercase", margin: "0 0 8px" }}>Protection des données</h4>
          <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.6, fontWeight: 500, margin: 0 }}>
            Toutes vos modifications sont chiffrées et isolées. Seul votre établissement a accès à ces configurations via votre jeton sécurisé.
          </p>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 900px) { .dash-grid-collapse { grid-template-columns: 1fr !important; } }
        @media (max-width: 640px) { .dash-grid-collapse-sm { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

function SettingToggle({ T, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 18, borderRadius: radiusSm, background: T.surface2 }}>
      <div>
        <p style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: T.faint, margin: "0 0 4px" }}>{label}</p>
        <p className="num" style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>{value}</p>
      </div>
      <div style={{ width: 38, height: 20, borderRadius: 999, background: `${T.accent}33`, position: "relative", cursor: "pointer" }}>
        <div style={{ position: "absolute", right: 3, top: 3, width: 14, height: 14, borderRadius: "50%", background: T.accent, boxShadow: T.shadow }} />
      </div>
    </div>
  );
}
