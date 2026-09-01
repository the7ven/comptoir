import BrandMark from "@/components/BrandMark";

export const metadata = {
  title: "Hors ligne — Comptoir",
};

// Page de repli affichée par le Service Worker quand une navigation échoue
// et qu'aucune version en cache n'est disponible. Aucune dépendance réseau.
export default function OfflinePage() {
  return (
    <div className="offline-root">
      <div className="offline-card">
        <BrandMark size={44} color="#2C5FE0" />
        <h1>Vous êtes hors ligne</h1>
        <p>
          Impossible de charger cette page sans connexion. Les pages déjà
          ouvertes restent accessibles — reconnectez-vous pour le reste.
        </p>
        <a href="/dashboard" className="offline-btn">Réessayer</a>
      </div>

      <style>{`
        .offline-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: #f6f7f9;
          color: #16202e;
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        }
        .offline-card {
          max-width: 380px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }
        .offline-card h1 {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 6px 0 0;
        }
        .offline-card p {
          font-size: 14px;
          line-height: 1.6;
          color: #566173;
          margin: 0;
        }
        .offline-btn {
          margin-top: 8px;
          padding: 12px 28px;
          border-radius: 999px;
          background: #2C5FE0;
          color: #fff;
          font-weight: 700;
          font-size: 13px;
          text-decoration: none;
        }
        @media (prefers-color-scheme: dark) {
          .offline-root { background: #0e131a; color: #e7ebf1; }
          .offline-card p { color: #9ba7b5; }
        }
      `}</style>
    </div>
  );
}
