"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toUserMessage } from '@/lib/errors';
import { THEME as C, bodyFont, headFont } from '@/lib/theme';
import { Mail, ArrowLeft, Loader2, Send, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import AuthDecorPattern from '@/app/auth/_components/AuthDecorPattern';

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) {
        alert(toUserMessage(error, "Impossible d'envoyer le lien de réinitialisation pour le moment."));
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      alert("Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: bodyFont, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <AuthDecorPattern />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
        <Link href="/auth/login" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 24 }}>
          <ArrowLeft size={14} /> Retour à la connexion
        </Link>

        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, padding: 40, boxShadow: '0 20px 50px -20px oklch(0.2 0.02 255 / 0.12)' }}>
          {!submitted ? (
            <>
              <h1 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 28, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Récupération</h1>
              <p style={{ fontSize: 14, color: C.muted, margin: '0 0 32px' }}>Saisissez votre email pour réinitialiser votre accès</p>

              <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>Votre email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.faint }} />
                    <input
                      required
                      type="email"
                      placeholder="manager@votre-resto.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      style={{ width: '100%', background: C.white, border: `1px solid ${C.line}`, padding: '14px 16px 14px 44px', borderRadius: 10, outline: 'none', fontFamily: bodyFont, fontWeight: 600, fontSize: 14, color: C.ink }}
                      onFocus={e => (e.target.style.borderColor = C.accent)}
                      onBlur={e => (e.target.style.borderColor = C.line)}
                    />
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
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <span>Envoyer le lien</span>
                      <Send size={16} />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 64, height: 64, background: C.wash, color: C.accentDark, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle size={32} />
              </div>
              <h2 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 22, margin: '0 0 12px' }}>Email envoyé !</h2>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, margin: '0 0 24px' }}>
                Consultez votre boîte de réception. Un lien de réinitialisation vous a été envoyé à <strong style={{ color: C.ink }}>{email}</strong>.
              </p>
              <Link href="/auth/login" style={{ color: C.accent, fontSize: 13, fontWeight: 700 }}>
                Revenir à la connexion
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
