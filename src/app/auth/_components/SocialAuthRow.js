"use client";

import { Phone } from "lucide-react";
import { THEME as C, bodyFont } from "@/lib/theme";

// Logo Google officiel (multicolore), lucide-react n'en fournit pas.
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.9 1.1 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16 4 9 8.4 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.6 34.6 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9 39.6 16 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.9l6.6 5.6C40.7 36.7 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

// Rangée "ou continuer avec" — connexion Google / téléphone. Les deux
// canaux ne sont PAS encore branchés côté Supabase (aucun provider OAuth
// ni fournisseur SMS configuré) : ils s'affichent volontairement pour
// préparer le terrain visuel, mais préviennent l'utilisateur plutôt que
// de rester silencieusement sans effet. À remplacer par les vrais appels
// (signInWithOAuth / signInWithOtp) une fois les deux branchés.
export default function SocialAuthRow() {
  const notify = () => alert("Bientôt disponible — la connexion via ce canal arrive prochainement.");

  const btnStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "12px 0",
    borderRadius: 10,
    border: `1px solid ${C.line}`,
    background: C.white,
    fontFamily: bodyFont,
    fontWeight: 700,
    fontSize: 13.5,
    color: C.ink,
    cursor: "pointer",
  };

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "0 0 20px" }}>
        <div style={{ flex: 1, height: 1, background: C.line }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: C.faint, whiteSpace: "nowrap" }}>ou continuer avec</span>
        <div style={{ flex: 1, height: 1, background: C.line }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <button type="button" onClick={notify} style={btnStyle}>
          <GoogleIcon /> Google
        </button>
        <button type="button" onClick={notify} style={btnStyle}>
          <Phone size={17} /> Téléphone
        </button>
      </div>
    </div>
  );
}
