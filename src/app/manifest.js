// Manifeste PWA — Comptoir.
// Servi par Next sur /manifest.webmanifest ; le <link rel="manifest"> est
// injecté automatiquement grâce à la convention de fichier app/manifest.js.
export default function manifest() {
  return {
    name: 'Comptoir — Gestion de restaurant',
    short_name: 'Comptoir',
    description:
      'Caisse, plan de salle, stocks et rapports pour votre restaurant — même sans connexion.',
    id: '/',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    lang: 'fr',
    dir: 'ltr',
    background_color: '#ffffff',
    theme_color: '#2C5FE0',
    categories: ['business', 'productivity', 'food'],
    icons: [
      { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
