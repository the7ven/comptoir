// Petits utilitaires partagés par la couche hors-ligne.

export const normEmail = (v) => (v || "").trim().toLowerCase();

// Heuristique : cette erreur vient-elle d'une panne réseau (et non d'un refus
// applicatif type RLS / requête invalide) ? Seules les pannes réseau
// déclenchent la bascule sur le cache / l'outbox.
export function looksLikeNetworkError(err) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (err instanceof TypeError) return true; // "Failed to fetch"
  const m = (err && err.message ? err.message : "").toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("network") ||
    m.includes("fetch") ||
    m.includes("timeout") ||
    m.includes("load failed")
  );
}
