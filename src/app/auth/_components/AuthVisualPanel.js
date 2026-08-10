"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { headFont } from "@/lib/theme";

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
        background: "linear-gradient(155deg, oklch(0.55 0.19 255) 0%, oklch(0.40 0.17 260) 55%, oklch(0.28 0.15 292) 100%)",
      }}
    >
      <div style={{ position: "absolute", width: 360, height: 360, borderRadius: "50%", background: "oklch(0.72 0.15 210 / .35)", filter: "blur(80px)", top: -110, right: -100 }} />
      <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "oklch(0.55 0.2 300 / .32)", filter: "blur(90px)", bottom: -80, left: -70 }} />

      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1, textDecoration: "none" }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "#fff" }} />
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
