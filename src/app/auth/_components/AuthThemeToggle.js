"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { getTheme } from "@/lib/theme";

// Bouton bascule clair/sombre partagé par les écrans d'auth — même
// ThemeContext que la landing page et le dashboard, donc le choix de
// l'utilisateur (persisté en localStorage) suit d'un écran à l'autre.
export default function AuthThemeToggle({ style }) {
  const { isDarkMode, toggleTheme } = useTheme();
  const C = getTheme(isDarkMode);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDarkMode ? "Passer au thème clair" : "Passer au thème sombre"}
      title={isDarkMode ? "Thème clair" : "Thème sombre"}
      style={{
        width: 38,
        height: 38,
        borderRadius: 999,
        border: `1px solid ${C.line}`,
        background: C.surface,
        color: C.muted,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        ...style,
      }}
    >
      {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
