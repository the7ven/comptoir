import { supabase } from '@/lib/supabase';

// Profil restaurant complet par id — utilisé pour l'auth (profil réel +
// cible d'impersonation) et pour toute lecture de profil (Paramètres).
export async function getRestaurantProfile(id) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Membres d'équipe (comptes caissier) d'un owner.
export async function getStaffForOwner(ownerEmail) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_email', ownerEmail)
    .eq('role', 'cashier')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

// Met à jour le profil d'un restaurant (nom, localisation, logo...).
export async function updateRestaurantProfile(id, updates) {
  const { error } = await supabase.from('restaurants').update(updates).eq('id', id);
  if (error) throw error;
}
