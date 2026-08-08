"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toUserMessage } from '@/lib/errors';
import { LayoutDashboard, Mail, Lock, LogIn, Loader2, Eye, EyeOff, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

  return (
    <div className="min-h-screen bg-[#050505] text-white font-[family-name:var(--font-lexend)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 text-2xl font-black tracking-tighter text-[#00D9FF] mb-12 justify-center">
          <LayoutDashboard size={32} />
          <span>Comptoir Luxe</span>
        </div>

        <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[45px] shadow-2xl relative overflow-hidden">
          
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#00D9FF]/10 blur-[100px] rounded-full"></div>

          <h2 className="text-3xl font-black italic tracking-tighter mb-2 relative z-10 text-left">BON RETOUR</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 mb-8 font-bold text-[#00D9FF] relative z-10 text-left">Accédez à votre console de gestion</p>

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            {/* EMAIL */}
            <div className="text-left">
              <label className="text-[9px] uppercase font-black opacity-30 ml-4 tracking-widest text-left block">Email</label>
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

            {/* MOT DE PASSE */}
            <div className="text-left">
              <div className="flex justify-between items-center ml-4">
                <label className="text-[9px] uppercase font-black opacity-30 tracking-widest block">Mot de passe</label>
                <Link 
                  href="/auth/reset-password" 
                  className="text-[9px] font-black uppercase text-[#00D9FF]/50 hover:text-[#00D9FF] transition-colors no-underline"
                >
                  Oublié ?
                </Link>
              </div>
              <div className="relative mt-2">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                <input 
                  required 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full bg-white/5 border border-white/10 px-12 py-4 rounded-2xl outline-none focus:border-[#00D9FF] transition-all font-bold placeholder:text-white/10 text-sm" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-[#00D9FF] transition-colors bg-transparent border-none p-0 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* BOUTON SUBMIT */}
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-5 bg-[#00D9FF] text-black font-black rounded-2xl shadow-lg uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 border-none cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Vérification...</span>
                </>
              ) : (
                <>
                  <span>OUVRIR LA SESSION</span>
                  <LogIn size={16} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[10px] font-bold opacity-30 relative z-10">
            PAS ENCORE DE COMPTE ? <Link href="/auth/signup" className="text-[#00D9FF] hover:underline hover:text-cyan-300 transition-colors no-underline">CRÉER MON RESTAURANT</Link>
          </p>
        </div>
      </div>
    </div>
  );
}