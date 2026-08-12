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

// Tous les restaurants, triés par date de création — vue globale réservée
// au Master Admin.
export async function getAllRestaurants() {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Ping léger pour vérifier que la base répond (indicateur de santé du
// Master Admin) — aucune ligne renvoyée, seul le statut de la requête compte.
export async function pingDatabase() {
  const { error } = await supabase.from('restaurants').select('id', { count: 'estimated', head: true }).limit(1);
  if (error) throw error;
}
