// Logo Comptoir — carré arrondi + deux barres empilées (évoque un comptoir/
// des étagères). Composant partagé, indépendant du thème appelant (theme.js
// pour les pages marketing, dashTheme.js pour le dashboard) : on lui passe
// simplement les couleurs à utiliser.
export default function BrandMark({ size = 32, color = "oklch(0.5 0.16 250)", barColor = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
      <rect x="2" y="2" width="52" height="52" rx="14" fill={color} />
      <rect x="14" y="32" width="28" height="6" rx="3" fill={barColor} />
      <rect x="14" y="18" width="18" height="6" rx="3" fill={barColor} fillOpacity="0.55" />
    </svg>
  );
}
