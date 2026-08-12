import { supabase } from '@/lib/supabase';

// Dépenses d'un restaurant sur une plage de dates (bornes ISO inclusives),
// triées du plus récent au plus ancien. Centralise la requête dupliquée
// dans dashboard/page.js (Vue d'ensemble), ExpensesTabContent,
// ReportsTabContent et CashierTabContent.
export async function getExpensesForRange(ownerEmail, start, end) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('owner_email', ownerEmail)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createExpense({ restaurantId, ownerEmail, label, amount, category }) {
  const { error } = await supabase.from('expenses').insert([{
    restaurant_id: restaurantId,
    owner_email: ownerEmail,
    label,
    amount,
    category,
    created_at: new Date().toISOString(),
  }]);
  if (error) throw error;
}

export async function deleteExpense(id, ownerEmail) {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('owner_email', ownerEmail);
  if (error) throw error;
}
