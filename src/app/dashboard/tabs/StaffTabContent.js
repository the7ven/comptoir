"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Star, Clock, 
  Phone, Mail, MoreVertical, Edit3, 
  Trash2, ShieldCheck, CheckCircle2, X, Lock, Loader2, User
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function StaffTabContent({ isDarkMode, userProfile }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulaire adapté pour le pseudo-email
  const [formData, setFormData] = useState({
    username: '', // On demande un nom d'utilisateur au lieu d'un vrai mail
    name: '',
    password: '',
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_email', userProfile.owner_email) 
        .eq('role', 'cashier') 
        .order('name', { ascending: true });

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Erreur:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCashier = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // GÉNÉRATION DU PSEUDO-EMAIL
    // On transforme "moussa" en "moussa@restopay.resto"
    const pseudoEmail = `${formData.username.toLowerCase().trim()}@restopay.resto`;

    try {
      // 1. Inscription dans Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: pseudoEmail,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            role: 'cashier'
          }
        }
      });

      if (authError) throw authError;

      // 2. Création du profil dans la table restaurants
      const { error: profileError } = await supabase
        .from('restaurants')
        .insert([{
          id: authData.user.id,
          name: formData.name,
          owner_email: userProfile.owner_email, 
          role: 'cashier',
          location: userProfile.location,
          is_active: true
        }]);

      if (profileError) throw profileError;

      alert(`Compte créé ! Identifiant : ${pseudoEmail}`);
      setShowAddModal(false);
      setFormData({ username: '', name: '', password: '' });
      fetchStaff();
    } catch (error) {
      alert("Erreur: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteStaff = async (id, name) => {
    if(confirm(`Voulez-vous vraiment supprimer l'accès de ${name} ?`)) {
      // Note: Cela supprime le profil, pas l'auth (nécessite une Edge Function pour l'auth)
      const { error } = await supabase.from('restaurants').delete().eq('id', id);
      if (!error) fetchStaff();
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center italic opacity-50 font-black uppercase text-[10px] tracking-widest">Chargement de l'équipe...</div>;

  return (
    <div className="fade-in text-left pb-10">
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h3 className="text-3xl font-black italic tracking-tighter uppercase">Gestion du Personnel</h3>
          <p className="opacity-50 text-[10px] font-black uppercase tracking-[0.2em] text-[#00D9FF]">
            {userProfile.name} • {staff.length} Membres
          </p>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-[#00D9FF] text-black px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all flex items-center gap-3 border-none cursor-pointer"
        >
          <UserPlus size={16} /> Nouveau Caissier
        </button>
      </div>

      {/* --- LISTE DES CAISSIERS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {staff.map((member) => (
          <div key={member.id} className={`group p-8 rounded-[40px] border transition-all hover:border-[#00D9FF]/30 ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-xl'}`}>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#00D9FF]/10 text-[#00D9FF] flex items-center justify-center font-black text-xl italic border border-[#00D9FF]/20">
                  {member.name[0]}
                </div>
                <div>
                  <h4 className="font-black text-lg uppercase tracking-tighter">{member.name}</h4>
                  <div className="flex items-center gap-2 opacity-40">
                    <ShieldCheck size={12} className="text-[#00D9FF]" />
                    <p className="text-[10px] uppercase font-black tracking-widest">Caissier Certifié</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => deleteStaff(member.id, member.name)}
                className="p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-transparent border-none cursor-pointer"
              >
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="flex items-center justify-between pt-6 border-t border-white/5">
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase opacity-30 tracking-[0.2em] mb-1">Status</span>
                <span className="flex items-center gap-1.5 text-green-500 text-[10px] font-black uppercase italic">
                  <CheckCircle2 size={12} /> En Service
                </span>
              </div>
              <button className="px-4 py-2 rounded-xl bg-white/5 text-[9px] font-black uppercase tracking-widest border-none text-white/40 cursor-pointer hover:bg-white/10 transition-all">
                Détails
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* --- MODAL D'AJOUT --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className={`w-full max-w-md p-10 rounded-[50px] border ${isDarkMode ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-gray-200 shadow-2xl'}`}>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter">Accès Caissier</h3>
              <button onClick={() => setShowAddModal(false)} className="bg-transparent border-none text-white cursor-pointer opacity-30 hover:opacity-100"><X /></button>
            </div>
            
            <form onSubmit={handleCreateCashier} className="space-y-6">
              <div>
                <label className="text-[9px] font-black uppercase opacity-30 ml-4 tracking-widest">Nom complet</label>
                <input 
                  type="text" 
                  placeholder="ex: Moussa Traoré"
                  className={`w-full mt-2 p-5 rounded-2xl border outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-[#00D9FF]' : 'bg-gray-50 border-gray-200'}`}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase opacity-30 ml-4 tracking-widest">Identifiant (Pseudo)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="moussa"
                    className={`w-full mt-2 p-5 rounded-2xl border outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-[#00D9FF]' : 'bg-gray-50 border-gray-200'}`}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required
                  />
                  <span className="absolute right-5 top-[27px] text-[10px] font-black opacity-20 uppercase">@restopay.resto</span>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase opacity-30 ml-4 tracking-widest">Mot de passe</label>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className={`w-full mt-2 p-5 rounded-2xl border outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-[#00D9FF]' : 'bg-gray-50 border-gray-200'}`}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-6 bg-[#00D9FF] text-black font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl shadow-2xl flex justify-center items-center gap-3 border-none cursor-pointer active:scale-95 transition-all mt-4"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : "Générer les accès"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}