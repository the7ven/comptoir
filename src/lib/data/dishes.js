import { supabase } from '@/lib/supabase';
import { readThroughCache } from '@/lib/offline/cache';

// Carte (plats/boissons) d'un restaurant, triée par nom.
// Cache-through (Phase 2 hors-ligne) : miroir IndexedDB servi si le réseau
// est indisponible.
export async function getDishes(ownerEmail) {
  const rows = await readThroughCache('dishes', ownerEmail, async () => {
    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .ilike('owner_email', ownerEmail.trim())
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  });
  // Tri appliqué aux deux chemins (le miroir local ne garantit pas l'ordre).
  return [...rows].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', undefined, { numeric: true }),
  );
}

export async function createDish(dish) {
  const { error } = await supabase.from('dishes').insert([dish]);
  if (error) throw error;
}

export async function updateDish(id, dish) {
  const { error } = await supabase.from('dishes').update(dish).eq('id', id);
  if (error) throw error;
}

export async function deleteDish(id, ownerEmail) {
  const { error } = await supabase
    .from('dishes')
    .delete()
    .eq('id', id)
    .eq('owner_email', ownerEmail);
  if (error) throw error;
}
