"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Star, Clock, 
  Phone, Mail, MoreVertical, Edit3, 
  Trash2, ShieldCheck, CheckCircle2, X, Lock, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function StaffTabContent({ isDarkMode, userProfile }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulaire pour le nouveau caissier
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
      // On récupère tous les comptes liés à ce restaurant (owner_email est le lien)
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_email', userProfile.owner_email) 
        .eq('role', 'cashier') // On ne liste que les caissiers
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
      // 1. Inscription dans Supabase Auth
      // NOTE: Dans une app réelle, l'admin utilise une Edge Function pour ne pas être déconnecté.
      // Ici on simule la création du profil lié.
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

      // 2. Création du profil dans la table restaurants
      const { error: profileError } = await supabase
        .from('restaurants')
        .insert([{
          id: authData.user.id,
          name: formData.name,
          owner_email: userProfile.owner_email, // Le lien avec le resto parent
          role: 'cashier',
          location: userProfile.location,
          is_active: true
        }]);

      if (profileError) throw profileError;

      alert("Compte caissier créé ! Le caissier peut maintenant se connecter.");
      setShowAddModal(false);
      fetchStaff();
    } catch (error) {
      alert("Erreur: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center italic opacity-50">Chargement de l'équipe...</div>;

  return (
    <div className="fade-in text-left pb-10">
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h3 className="text-3xl font-black italic tracking-tighter">Gestion du Personnel</h3>
          <p className="opacity-50 text-sm font-light uppercase tracking-widest">Compte {userProfile.name} • {staff.length} Caissiers</p>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-[#00D9FF] text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all flex items-center gap-3"
        >
          <UserPlus size={16} /> Nouveau Caissier
        </button>
      </div>

      {/* --- LISTE DES CAISSIERS --- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {staff.map((member) => (
          <div key={member.id} className={`p-6 rounded-[35px] border ${isDarkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#00D9FF]/10 text-[#00D9FF] flex items-center justify-center font-black">
                  {member.name[0]}
                </div>
                <div>
                  <h4 className="font-black">{member.name}</h4>
                  <p className="text-[10px] opacity-40 uppercase font-black">{member.owner_email}</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[9px] font-black uppercase">Actif</span>
            </div>
          </div>
        ))}
      </div>

      {/* --- MODAL D'AJOUT --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`w-full max-w-md p-8 rounded-[40px] border ${isDarkMode ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black italic uppercase">Créer un accès caissier</h3>
              <button onClick={() => setShowAddModal(false)}><X /></button>
            </div>
            
            <form onSubmit={handleCreateCashier} className="space-y-4">
              <input 
                type="text" 
                placeholder="Nom complet de l'employé"
                className={`w-full p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
              <input 
                type="email" 
                placeholder="Email de connexion"
                className={`w-full p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
              <input 
                type="password" 
                placeholder="Mot de passe provisoire"
                className={`w-full p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-4 bg-[#00D9FF] text-black font-black uppercase text-xs rounded-2xl shadow-xl flex justify-center items-center"
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