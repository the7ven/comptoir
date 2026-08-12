import { supabase } from '@/lib/supabase';

// Transactions d'un restaurant sur une plage de dates (bornes ISO
// inclusives), triées du plus récent au plus ancien. Centralise la requête
// dupliquée dans dashboard/page.js (Vue d'ensemble), ReportsTabContent et
// CashierTabContent.
export async function getTransactionsForRange(ownerEmail, start, end) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('owner_email', ownerEmail)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
