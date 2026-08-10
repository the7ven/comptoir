// Jetons de design partagés par les surfaces "marketing" de l'app.
//
// THEME reste l'alias historique : palette claire figée, utilisée telle
// quelle par les pages sans bascule (connexion, inscription, réinitialisation
// de mot de passe) — inchangé, pour ne rien casser sur ces écrans.
//
// getTheme(isDarkMode) est la version bascule clair/sombre, utilisée par la
// landing page via le ThemeContext global (le même bouton clair/sombre que
// le dashboard). Les valeurs sombres reprennent volontairement la même
// identité "Comptoir" que src/lib/dashTheme.js pour que le site entier
// (landing + dashboard) partage un seul thème sombre cohérent.

const LIGHT = {
  bg: "oklch(0.995 0.002 255)",
  surface: "#ffffff",
  ink: "oklch(0.20 0.02 255)",
  muted: "oklch(0.45 0.02 255)",
  faint: "oklch(0.55 0.02 255)",
  line: "oklch(0.9 0.015 255)",
  wash: "oklch(0.96 0.025 255)",
  accent: "oklch(0.52 0.19 255)",
  // Texte accent lisible sur fond clair/wash (badges, initiales témoignages).
  accentDark: "oklch(0.38 0.17 255)",
  // Fond des sections "punch" plein cadre (bandeau stats, CTA final).
  panel: "oklch(0.38 0.17 255)",
  // Texte posé sur une surface accent/panel saturée (boutons, bandeau stats).
  accentInk: "#ffffff",
  accentInkMuted: "oklch(0.88 0.03 255)",
  white: "#ffffff",
};

const DARK = {
  bg: "oklch(0.16 0.018 255)",
  surface: "oklch(0.20 0.018 255)",
  ink: "oklch(0.95 0.006 255)",
  muted: "oklch(0.68 0.015 255)",
  faint: "oklch(0.52 0.015 255)",
  line: "oklch(1 0 0 / 0.08)",
  wash: "oklch(0.62 0.18 255 / 0.14)",
  accent: "oklch(0.66 0.17 255)",
  accentDark: "oklch(0.78 0.12 255)",
  panel: "oklch(0.66 0.17 255)",
  accentInk: "oklch(0.14 0.02 255)",
  accentInkMuted: "oklch(0.30 0.05 255)",
  white: "#ffffff",
};

export const THEME = LIGHT;

export function getTheme(isDarkMode) {
  return isDarkMode ? DARK : LIGHT;
}

export const bodyFont = "var(--font-inter), 'Inter', sans-serif";
export const headFont = "var(--font-manrope), 'Manrope', sans-serif";
