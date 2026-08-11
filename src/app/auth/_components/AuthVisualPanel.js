"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { headFont } from "@/lib/theme";
import BrandMark from "@/components/BrandMark";

const BG_PHOTO = "https://rljfqvmjrhsairduykww.supabase.co/storage/v1/object/public/logos/simon-kadula--gkndM1GvSA-unsplash.jpg";

// Panneau visuel partagé par connexion/inscription — colonne de gauche sur
// desktop (masquée en dessous de 880px via .auth-visual dans les pages
// appelantes, le formulaire reste seul et centré sur mobile).
export default function AuthVisualPanel({ eyebrow, title, points }) {
  return (
    <div
      className="auth-visual"
      style={{
        position: "relative",
        overflow: "hidden",
        minHeight: "100%",
        padding: 48,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        // Photo d'ambiance en fond ; en cas d'échec de chargement, le
        // dégradé bleu signature Comptoir sert de repli (background-color).
        backgroundColor: "oklch(0.40 0.17 260)",
        backgroundImage: `url(${BG_PHOTO})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Voile bleu Comptoir sur la photo, pour garder le texte lisible
          quelle que soit la luminosité de l'image et rester sur la marque. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(165deg, oklch(0.30 0.14 260 / .82) 0%, oklch(0.24 0.12 265 / .78) 45%, oklch(0.16 0.10 270 / .92) 100%)",
        }}
      />

      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1, textDecoration: "none" }}>
        <BrandMark size={30} color="#fff" barColor="oklch(0.52 0.19 255)" />
        <span style={{ fontFamily: headFont, fontWeight: 800, fontSize: 19, color: "#fff", letterSpacing: "-0.02em" }}>Comptoir</span>
      </Link>

      <div style={{ position: "relative", zIndex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "oklch(0.9 0.03 255)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>
          {eyebrow}
        </p>
        <h2 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 30, lineHeight: 1.22, color: "#fff", letterSpacing: "-0.01em", margin: "0 0 28px", maxWidth: 360 }}>
          {title}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {points.map((p) => (
            <div key={p} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Check size={12} color="#fff" strokeWidth={3} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "oklch(0.94 0.02 255)" }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
