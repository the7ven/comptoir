"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
// Utilisation de Send et CheckCircle qui existent réellement dans lucide-react
import { LayoutDashboard, Mail, ArrowLeft, Loader2, Send, CheckCircle } from 'lucide-react';
import Link from 'next/link';

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
        alert("Erreur : " + error.message);
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
    <div className="min-h-screen bg-[#050505] text-white font-[family-name:var(--font-lexend)] flex items-center justify-center p-6 text-left">
      <div className="w-full max-w-md text-left">
        
        <Link href="/auth/login" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#00D9FF] mb-8 hover:opacity-70 transition-all no-underline">
          <ArrowLeft size={14} /> Retour à la connexion
        </Link>

        <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[45px] shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#00D9FF]/10 blur-[100px] rounded-full"></div>

          {!submitted ? (
            <>
              <h2 className="text-3xl font-black italic tracking-tighter mb-2 relative z-10 uppercase text-left">Récupération</h2>
              <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 mb-8 font-bold text-[#00D9FF] relative z-10 text-left">
                Saisissez votre email pour réinitialiser votre accès
              </p>

              <form onSubmit={handleReset} className="space-y-6 relative z-10">
                <div className="text-left">
                  <label className="text-[9px] uppercase font-black opacity-30 ml-4 tracking-widest block text-left">Votre Email</label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                    <input 
                      required 
                      type="email" 
                      placeholder="manager@votre-resto.com"
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      className="w-full bg-white/5 border border-white/10 px-12 py-4 rounded-2xl outline-none focus:border-[#00D9FF] transition-all font-bold placeholder:text-white/10 text-sm" 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full py-5 bg-[#00D9FF] text-black font-black rounded-2xl shadow-lg uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 border-none cursor-pointer mt-4"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <span>ENVOYER LE LIEN</span>
                      {/* CORRIGÉ ICI */}
                      <Send size={16} />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-10 relative z-10">
              <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                {/* CORRIGÉ ICI AUSSI */}
                <CheckCircle size={40} />
              </div>
              <h2 className="text-2xl font-black italic mb-4 uppercase text-left">Email Envoyé !</h2>
              <p className="text-sm opacity-40 font-medium leading-relaxed mb-8 text-left">
                Consultez votre boîte de réception. Un lien de réinitialisation vous a été envoyé à <strong>{email}</strong>.
              </p>
              <Link href="/auth/login" className="text-[#00D9FF] text-[10px] font-black uppercase tracking-widest hover:underline no-underline">
                Revenir à l'accueil
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}