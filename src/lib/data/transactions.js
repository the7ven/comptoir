import { supabase } from '@/lib/supabase';
import { looksLikeNetworkError } from '@/lib/offline/net';
import { unsentOps, foldPendingTransactions } from '@/lib/offline/outbox';
import { readTransactionsMirror, upsertTransactionsMirror } from '@/lib/offline/pull';

// Transactions d'un restaurant sur une plage de dates (bornes ISO
// inclusives), triées du plus récent au plus ancien.
//
// Cache-through (Phase 3.7) : hors-ligne, on renvoie le miroir local fusionné
// avec les encaissements encore dans l'outbox — pour que la Caisse et les
// recettes du jour restent justes sans réseau.
export async function getTransactionsForRange(ownerEmail, start, end) {
  const inRange = (r) => (r.created_at || '') >= start && (r.created_at || '') <= end;
  const byNewest = (a, b) => (b.created_at || '').localeCompare(a.created_at || '');
  const ops = await unsentOps(ownerEmail);

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('owner_email', ownerEmail)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const server = data || [];
    upsertTransactionsMirror(ownerEmail, server).catch((e) =>
      console.warn('[offline] miroir transactions non mis à jour', e),
    );
    return foldPendingTransactions(server, ops).filter(inRange).sort(byNewest);
  } catch (err) {
    if (!looksLikeNetworkError(err)) throw err;
    const { rows, everSynced } = await readTransactionsMirror(ownerEmail);
    if (!rows.length && !ops.length && !everSynced) throw err;
    return foldPendingTransactions(rows, ops).filter(inRange).sort(byNewest);
  }
}

// Montants de toutes les transactions, tous restaurants confondus — vue
// globale réservée au Master Admin (agrégation du CA par restaurant).
// Online only (God Mode).
export async function getAllTransactionAmounts() {
  const { data, error } = await supabase.from('transactions').select('amount, restaurant_id');
  if (error) throw error;
  return data || [];
}
