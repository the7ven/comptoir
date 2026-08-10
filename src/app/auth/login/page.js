"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toUserMessage } from '@/lib/errors';
import { THEME as C, bodyFont, headFont } from '@/lib/theme';
import { Mail, Lock, LogIn, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthVisualPanel from '@/app/auth/_components/AuthVisualPanel';
import SocialAuthRow from '@/app/auth/_components/SocialAuthRow';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        alert(toUserMessage(error, "Impossible de vous connecter. Vérifiez vos identifiants."));
      } else {
        router.replace('/dashboard');
        router.refresh();
      }
    } catch (err) {
      alert("Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: C.white,
    border: `1px solid ${C.line}`,
    padding: '14px 16px 14px 44px',
    borderRadius: 10,
    outline: 'none',
    fontFamily: bodyFont,
    fontWeight: 600,
    fontSize: 14,
    color: C.ink,
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: bodyFont }}>
      <div className="auth-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', minHeight: '100vh' }}>
        <AuthVisualPanel
          eyebrow="Bon retour"
          title="Votre restaurant vous attend, prêt à reprendre le service."
          points={["Caisse & paiements en un geste", "Plan de salle en temps réel", "Rapports toujours à jour"]}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
          <div style={{ width: '100%', maxWidth: 400 }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 36 }}>
              <ArrowLeft size={15} /> Retour à l&apos;accueil
            </Link>

            <div style={{ width: 38, height: 38, borderRadius: 10, background: C.accent, marginBottom: 24 }} />

            <h1 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 28, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Bon retour</h1>
            <p style={{ fontSize: 14, color: C.muted, margin: '0 0 32px' }}>Accédez à votre console de gestion</p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.faint }} />
                  <input
                    required
                    type="email"
                    placeholder="manager@votre-resto.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = C.accent)}
                    onBlur={e => (e.target.style.borderColor = C.line)}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>Mot de passe</label>
                  <Link href="/auth/reset-password" style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>Oublié ?</Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.faint }} />
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ ...inputStyle, paddingRight: 44 }}
                    onFocus={e => (e.target.style.borderColor = C.accent)}
                    onBlur={e => (e.target.style.borderColor = C.line)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: C.faint, background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: C.accent,
                  color: '#fff',
                  fontFamily: bodyFont,
                  fontWeight: 700,
                  fontSize: 15,
                  padding: '14px 0',
                  borderRadius: 10,
                  border: 'none',
                  cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  marginTop: 8,
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Vérification...</span>
                  </>
                ) : (
                  <>
                    <span>Ouvrir la session</span>
                    <LogIn size={16} />
                  </>
                )}
              </button>
            </form>

            <SocialAuthRow />

            <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: C.faint }}>
              Pas encore de compte ?{' '}
              <Link href="/auth/signup" style={{ color: C.accent, fontWeight: 700 }}>Créer mon restaurant</Link>
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media (min-width: 880px) { .auth-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 879px) { .auth-visual { display: none !important; } }
      `}</style>
    </div>
  );
}
