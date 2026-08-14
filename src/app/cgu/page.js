"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";
import { getTheme, bodyFont, headFont } from "@/lib/theme";
import { useTheme } from "@/context/ThemeContext";
import BrandMark from "@/components/BrandMark";

// ---------------------------------------------------------------------------
// Page "Conditions Générales d'Utilisation".
// Contenu juridique pas encore rédigé : page placeholder en attendant, gardée
// volontairement simple pour être facile à remplacer plus tard.
// ---------------------------------------------------------------------------

export default function CguPage() {
  const { isDarkMode } = useTheme();
  const C = getTheme(isDarkMode);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: bodyFont }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 48 }}>
          <Link href="/" className="landing-link" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: C.muted, "--hover-color": C.accent }}>
            <ArrowLeft size={15} /> Retour à l&apos;accueil
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BrandMark size={24} color={C.accent} />
            <span style={{ fontFamily: headFont, fontWeight: 800, fontSize: 17 }}>Comptoir</span>
          </div>
        </div>

        <h1 style={{ fontFamily: headFont, fontWeight: 800, fontSize: "clamp(28px, 4vw, 36px)", letterSpacing: "-0.02em", margin: "0 0 40px" }}>
          Conditions Générales d&apos;Utilisation
        </h1>

        <div
          style={{
            border: `1px solid ${C.line}`,
            background: C.surface,
            borderRadius: 16,
            padding: "48px 32px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: C.wash,
              color: C.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <Construction size={26} />
          </div>
          <p style={{ fontFamily: headFont, fontWeight: 700, fontSize: 18, margin: "0 0 8px" }}>
            En cours de développement
          </p>
          <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.6 }}>
            Cette page sera bientôt disponible. Pour toute question en attendant,
            contactez-nous à{" "}
            <a href="mailto:supportcomptoir@gmail.com" className="landing-link" style={{ color: C.accent, fontWeight: 600, "--hover-color": C.ink }}>
              supportcomptoir@gmail.com
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}
