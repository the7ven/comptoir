"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toUserMessage } from '@/lib/errors';
import { THEME as C, bodyFont, headFont } from '@/lib/theme';
import { Lock, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        alert(toUserMessage(error, "Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré."));
      } else {
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      }
    } catch (err) {
      alert("Une erreur est survenue lors de la mise à jour.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: bodyFont, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, padding: 40, boxShadow: '0 20px 50px -20px oklch(0.2 0.02 255 / 0.12)' }}>
          {!isSuccess ? (
            <>
              <h1 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 28, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Nouveau mot de passe</h1>
              <p style={{ fontSize: 14, color: C.muted, margin: '0 0 32px' }}>Définissez votre nouveau mot de passe sécurisé</p>

              <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>Nouveau mot de passe</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.faint }} />
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{ width: '100%', background: C.white, border: `1px solid ${C.line}`, padding: '14px 44px 14px 44px', borderRadius: 10, outline: 'none', fontFamily: bodyFont, fontWeight: 600, fontSize: 14, color: C.ink }}
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
                  disabled={loading || password.length < 6}
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
                    cursor: (loading || password.length < 6) ? 'default' : 'pointer',
                    opacity: (loading || password.length < 6) ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    marginTop: 8,
                  }}
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <span>Mettre à jour</span>
                      <CheckCircle2 size={16} />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 64, height: 64, background: C.wash, color: C.accentDark, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle2 size={32} />
              </div>
              <h2 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 22, margin: '0 0 12px' }}>Succès !</h2>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, margin: '0 0 12px' }}>
                Votre mot de passe a été réinitialisé avec succès.
              </p>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>
                Redirection vers la connexion...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
