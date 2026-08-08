// Jetons de design partagés par les surfaces "marketing" de l'app
// (landing page, connexion, inscription) — thème clair "Comptoir".
// Le reste de l'app (dashboard, God Mode) garde son propre thème
// sombre/clair basculable via ThemeContext ; ces pages-ci sont à
// thème unique, à l'image de la landing page.

export const THEME = {
  bg: "oklch(0.995 0.002 255)",
  ink: "oklch(0.20 0.02 255)",
  muted: "oklch(0.45 0.02 255)",
  faint: "oklch(0.55 0.02 255)",
  line: "oklch(0.9 0.015 255)",
  wash: "oklch(0.96 0.025 255)",
  accent: "oklch(0.52 0.19 255)",
  accentDark: "oklch(0.38 0.17 255)",
  white: "#ffffff",
};

export const bodyFont = "var(--font-inter), 'Inter', sans-serif";
export const headFont = "var(--font-manrope), 'Manrope', sans-serif";
