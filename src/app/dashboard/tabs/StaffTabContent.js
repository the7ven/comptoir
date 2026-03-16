"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, ShieldCheck, CheckCircle2, X, Loader2, Trash2, Mail, Phone
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function StaffTabContent({ isDarkMode, userProfile }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
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
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            role: 'cashier'
          }
        }
      });

      if (authError) throw authError;

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

      alert("Compte caissier créé !");
      setShowAddModal(false);
      fetchStaff();
    } catch (error) {
      alert("Erreur: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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

      {/* --- GRILLE DE CARTES --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {staff.map((member) => (
          <div 
            key={member.id} 
            className={`group p-8 rounded-[40px] border transition-all hover:border-[#00D9FF]/30 ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100 shadow-xl'}`}
          >
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
            </div>
            
            <div className="space-y-3 mb-6">
               <div className="flex items-center gap-3 opacity-60">
                  <Mail size={14} />
                  <span className="text-xs font-medium truncate">{member.owner_email}</span>
               </div>
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

        {staff.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-20 italic">
            Aucun membre d'équipe enregistré.
          </div>
        )}
      </div>

      {/* --- MODAL D'AJOUT --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className={`w-full max-w-md p-10 rounded-[50px] border ${isDarkMode ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-gray-200 shadow-2xl'}`}>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter">Nouvel Accès</h3>
              <button onClick={() => setShowAddModal(false)} className="bg-transparent border-none text-white cursor-pointer opacity-30 hover:opacity-100"><X /></button>
            </div>
            
            <form onSubmit={handleCreateCashier} className="space-y-6">
              <input 
                type="text" 
                placeholder="Nom complet"
                className={`w-full p-5 rounded-2xl border outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50'}`}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
              <input 
                type="email" 
                placeholder="Email professionnel"
                className={`w-full p-5 rounded-2xl border outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50'}`}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
              <input 
                type="password" 
                placeholder="Mot de passe"
                className={`w-full p-5 rounded-2xl border outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50'}`}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
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