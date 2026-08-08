"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toUserMessage } from '@/lib/errors';
import { THEME as C, bodyFont, headFont } from '@/lib/theme';
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', restoName: '' });
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Inscription dans Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (data?.user) {
        // 2. Création/Mise à jour sécurisée du profil (UPSERT au lieu de INSERT)
        // SÉCURITÉ : on n'envoie jamais is_active / is_super_admin depuis le
        // client. Ces colonnes doivent avoir un DEFAULT false côté base et ne
        // doivent être modifiables que par un service_role (ex: validation
        // manuelle par le Master Admin) — sinon n'importe quel appel API
        // pourrait s'auto-activer ou s'auto-promouvoir super admin.
        const { error: dbError } = await supabase
          .from('restaurants')
          .upsert({
            id: data.user.id,
            name: formData.restoName,
            owner_email: formData.email,
          }, { onConflict: 'id' }); // Si l'ID existe déjà, on met à jour la ligne

        if (dbError) throw dbError;

        // 3. Connexion explicite pour stabiliser la session
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (loginError) {
          alert("Compte créé ! Connectez-vous maintenant.");
          router.push('/auth/login');
          return;
        }

        // Délai de courtoisie pour la propagation réseau
        await new Promise(resolve => setTimeout(resolve, 1000));

        router.refresh();
        router.replace('/dashboard');
      }
    } catch (err) {
      alert(toUserMessage(err, "Impossible de créer votre compte pour le moment."));
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
    <div style={{ minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: bodyFont, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 40 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.accent, flexShrink: 0 }} />
          <span style={{ fontFamily: headFont, fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: C.ink }}>Comptoir</span>
        </Link>

        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, padding: 40, boxShadow: '0 20px 50px -20px oklch(0.2 0.02 255 / 0.12)' }}>
          <h1 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 28, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Créer un compte</h1>
          <p style={{ fontSize: 14, color: C.muted, margin: '0 0 32px' }}>Lancez votre restaurant sur le cloud</p>

          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>Nom du restaurant</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.faint }} />
                <input
                  required
                  type="text"
                  placeholder="ex: Le Grill du Plateau"
                  value={formData.restoName}
                  onChange={e => setFormData({ ...formData, restoName: e.target.value })}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = C.accent)}
                  onBlur={e => (e.target.style.borderColor = C.line)}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>Email professionnel</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.faint }} />
                <input
                  required
                  type="email"
                  placeholder="contact@votre-resto.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = C.accent)}
                  onBlur={e => (e.target.style.borderColor = C.line)}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.faint }} />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 caractères"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
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
              {loading ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  <span>Devenir partenaire</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p style={{ marginTop: 28, textAlign: 'center', fontSize: 13, color: C.faint }}>
            Déjà membre ?{' '}
            <Link href="/auth/login" style={{ color: C.accent, fontWeight: 700 }}>Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
