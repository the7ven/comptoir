import { Lexend } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext'; 

// Configuration de la police
const lexend = Lexend({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lexend',
});

export const metadata = {
  title: 'RestoPay - Gestion de restaurant',
  description: 'Gérez votre restaurant à la vitesse de la lumière',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={lexend.variable} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning={true}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}