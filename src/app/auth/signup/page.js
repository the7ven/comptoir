"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toUserMessage } from '@/lib/errors';
import { LayoutDashboard, Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
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
  return (
    <div className="min-h-screen bg-[#050505] text-white font-[family-name:var(--font-lexend)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 text-2xl font-black tracking-tighter text-[#00D9FF] mb-12 justify-center">
          <LayoutDashboard size={32} />
          <span>RestoPay SaaS</span>
        </div>

        <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[45px] shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#00D9FF]/5 blur-[100px] rounded-full"></div>

          <h2 className="text-3xl font-black italic tracking-tighter mb-2 relative z-10 text-left">CRÉER UN COMPTE</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 mb-8 font-bold text-[#00D9FF] relative z-10 text-left text-wrap">Lancez votre restaurant sur le cloud</p>

          <form onSubmit={handleSignup} className="space-y-6 relative z-10">
            {/* NOM RESTO */}
            <div className="text-left">
              <label className="text-[9px] uppercase font-black opacity-30 ml-4 tracking-widest text-left block">Nom du Restaurant</label>
              <div className="relative mt-2">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                <input 
                  required 
                  type="text" 
                  placeholder="ex: Le Grill du Plateau" 
                  value={formData.restoName} 
                  onChange={e => setFormData({...formData, restoName: e.target.value})} 
                  className="w-full bg-white/5 border border-white/10 px-12 py-4 rounded-2xl outline-none focus:border-[#00D9FF] transition-all font-bold placeholder:text-white/10 text-sm" 
                />
              </div>
            </div>

            {/* EMAIL */}
            <div className="text-left">
              <label className="text-[9px] uppercase font-black opacity-30 ml-4 tracking-widest text-left block">Email Professionnel</label>
              <div className="relative mt-2">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                <input 
                  required 
                  type="email" 
                  placeholder="contact@votre-resto.com" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  className="w-full bg-white/5 border border-white/10 px-12 py-4 rounded-2xl outline-none focus:border-[#00D9FF] transition-all font-bold placeholder:text-white/10 text-sm" 
                />
              </div>
            </div>

            {/* MOT DE PASSE */}
            <div className="text-left">
              <label className="text-[9px] uppercase font-black opacity-30 ml-4 tracking-widest text-left block">Mot de passe</label>
              <div className="relative mt-2">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                <input 
                  required 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Min. 6 caractères" 
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                  className="w-full bg-white/5 border border-white/10 px-12 py-4 rounded-2xl outline-none focus:border-[#00D9FF] transition-all font-bold placeholder:text-white/10 text-sm" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-[#00D9FF] transition-colors p-0 border-none bg-transparent cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-5 bg-[#00D9FF] text-black font-black rounded-2xl shadow-lg uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 mt-4"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <>DEVENIR PARTENAIRE <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="mt-8 text-center text-[10px] font-bold opacity-30 relative z-10">
            DÉJÀ MEMBRE ? <Link href="/auth/login" className="text-[#00D9FF] hover:underline hover:text-cyan-300">SE CONNECTER</Link>
          </p>
        </div>
      </div>
    </div>
  );
}