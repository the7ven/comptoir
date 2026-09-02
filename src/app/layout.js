import { Lexend, Inter, Manrope } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';

// Configuration de la police
const lexend = Lexend({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lexend',
});

// Polices dédiées à la landing page (design "Comptoir")
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
  variable: '--font-manrope',
});

export const metadata = {
  title: 'Comptoir - Gestion de restaurant',
  description: 'Gérez votre restaurant à la vitesse de la lumière',
  applicationName: 'Comptoir',
  appleWebApp: { capable: true, title: 'Comptoir', statusBarStyle: 'default' },
};

export const viewport = {
  themeColor: '#2C5FE0',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${lexend.variable} ${inter.variable} ${manrope.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning={true}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <ServiceWorkerRegistrar />
        <Analytics />
      </body>
    </html>
  );
}