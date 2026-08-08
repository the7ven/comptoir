// Jetons de design + constructeurs de style pour le dashboard (post-connexion).
// Même famille que src/lib/theme.js (landing/auth) mais avec un mode sombre
// réel, car le dashboard est un outil de travail utilisé en continu — au
// lieu du "isDarkMode ? '...' : '...'" dupliqué dans chaque composant,
// chaque écran appelle getDashTokens(isDarkMode) une fois et compose ses
// styles à partir des jetons + constructeurs ci-dessous.

export const bodyFont = "var(--font-inter), 'Inter', sans-serif";
export const headFont = "var(--font-manrope), 'Manrope', sans-serif";

export function getDashTokens(isDarkMode) {
  return isDarkMode
    ? {
        bg: "oklch(0.16 0.018 255)",
        surface: "oklch(0.20 0.018 255)",
        surface2: "oklch(0.235 0.018 255)",
        surfaceHover: "oklch(0.27 0.018 255)",
        ink: "oklch(0.95 0.006 255)",
        muted: "oklch(0.68 0.015 255)",
        faint: "oklch(0.52 0.015 255)",
        line: "oklch(1 0 0 / 0.08)",
        wash: "oklch(0.62 0.18 255 / 0.14)",
        accent: "oklch(0.66 0.17 255)",
        accentInk: "oklch(0.14 0.02 255)",
        accentDark: "oklch(0.78 0.12 255)",
        accentWash: "oklch(0.66 0.17 255 / 0.16)",
        good: "oklch(0.72 0.16 155)",
        goodWash: "oklch(0.60 0.14 155 / 0.18)",
        warn: "oklch(0.78 0.15 80)",
        warnWash: "oklch(0.72 0.15 80 / 0.2)",
        bad: "oklch(0.68 0.18 25)",
        badWash: "oklch(0.58 0.19 25 / 0.18)",
        shadow: "0 1px 2px rgba(0,0,0,.3), 0 20px 40px -22px rgba(0,0,0,.6)",
      }
    : {
        bg: "oklch(0.98 0.004 255)",
        surface: "#ffffff",
        surface2: "oklch(0.97 0.006 255)",
        surfaceHover: "oklch(0.955 0.012 255)",
        ink: "oklch(0.20 0.02 255)",
        muted: "oklch(0.45 0.02 255)",
        faint: "oklch(0.60 0.02 255)",
        line: "oklch(0.90 0.015 255)",
        wash: "oklch(0.96 0.025 255)",
        accent: "oklch(0.52 0.19 255)",
        accentInk: "#ffffff",
        accentDark: "oklch(0.38 0.17 255)",
        accentWash: "oklch(0.52 0.19 255 / 0.10)",
        good: "oklch(0.60 0.14 155)",
        goodWash: "oklch(0.60 0.14 155 / 0.12)",
        warn: "oklch(0.72 0.15 80)",
        warnWash: "oklch(0.72 0.15 80 / 0.14)",
        bad: "oklch(0.58 0.19 25)",
        badWash: "oklch(0.58 0.19 25 / 0.12)",
        shadow: "0 1px 2px rgba(20,20,40,.04), 0 16px 32px -20px rgba(20,20,40,.16)",
      };
}

export const radius = 14;
export const radiusSm = 10;

// ---- Constructeurs de style réutilisables ----

export const card = (T, extra = {}) => ({
  background: T.surface,
  border: `1px solid ${T.line}`,
  borderRadius: radius,
  ...extra,
});

export const pill = (T, variant = "neutral") => {
  const map = {
    good: { background: T.goodWash, color: T.good },
    warn: { background: T.warnWash, color: T.warn },
    bad: { background: T.badWash, color: T.bad },
    neutral: { background: T.surface2, color: T.faint, border: `1px solid ${T.line}` },
  };
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    ...map[variant],
  };
};

export const btnSolid = (T, extra = {}) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "11px 20px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
  border: "none",
  background: T.accent,
  color: T.accentInk,
  cursor: "pointer",
  fontFamily: bodyFont,
  ...extra,
});

export const btnGhost = (T, extra = {}) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "11px 20px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
  border: `1px solid ${T.line}`,
  background: T.surface2,
  color: T.ink,
  cursor: "pointer",
  fontFamily: bodyFont,
  ...extra,
});

export const inputStyle = (T, extra = {}) => ({
  width: "100%",
  background: T.surface,
  border: `1px solid ${T.line}`,
  borderRadius: radiusSm,
  padding: "11px 14px",
  outline: "none",
  fontFamily: bodyFont,
  fontWeight: 600,
  fontSize: 13.5,
  color: T.ink,
  ...extra,
});

export const chipBtn = (T, extra = {}) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 14px",
  borderRadius: 999,
  background: T.surface2,
  border: `1px solid ${T.line}`,
  fontSize: 13,
  fontWeight: 700,
  color: T.muted,
  cursor: "pointer",
  ...extra,
});

export const iconBtn = (T, extra = {}) => ({
  width: 38,
  height: 38,
  borderRadius: 999,
  background: T.surface2,
  border: `1px solid ${T.line}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: T.muted,
  flex: "none",
  ...extra,
});

export const eyebrow = (T, extra = {}) => ({
  fontSize: 10.5,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: T.accent,
  ...extra,
});
