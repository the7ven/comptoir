"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, Lock, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';
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
        alert("Erreur : " + error.message);
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
    <div className="min-h-screen bg-[#050505] text-white font-[family-name:var(--font-lexend)] flex items-center justify-center p-6 text-left">
      <div className="w-full max-w-md">
        
        <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[45px] shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#00D9FF]/10 blur-[100px] rounded-full"></div>

          {!isSuccess ? (
            <>
              <h2 className="text-3xl font-black italic tracking-tighter mb-2 relative z-10 uppercase text-left">Nouveau Code</h2>
              <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 mb-8 font-bold text-[#00D9FF] relative z-10 text-left">
                Définissez votre nouveau mot de passe sécurisé
              </p>

              <form onSubmit={handleUpdate} className="space-y-6 relative z-10">
                <div className="text-left">
                  <label className="text-[9px] uppercase font-black opacity-30 ml-4 tracking-widest block text-left">Nouveau Mot de passe</label>
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

                <button 
                  type="submit" 
                  disabled={loading || password.length < 6} 
                  className="w-full py-5 bg-[#00D9FF] text-black font-black rounded-2xl shadow-lg uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 border-none cursor-pointer mt-4"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <span>METTRE À JOUR</span>
                      <CheckCircle2 size={16} />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-10 relative z-10">
              <div className="w-20 h-20 bg-[#00D9FF]/10 text-[#00D9FF] rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-black italic mb-4 uppercase text-left text-white">Succès !</h2>
              <p className="text-sm opacity-40 font-medium leading-relaxed mb-4 text-left">
                Votre mot de passe a été réinitialisé avec succès.
              </p>
              <p className="text-[10px] font-black text-[#00D9FF] uppercase tracking-widest animate-pulse text-left">
                Redirection vers la connexion...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}