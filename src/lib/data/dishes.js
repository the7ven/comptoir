import { supabase } from '@/lib/supabase';

// Carte (plats/boissons) d'un restaurant, triée par nom.
export async function getDishes(ownerEmail) {
  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .ilike('owner_email', ownerEmail.trim())
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
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
