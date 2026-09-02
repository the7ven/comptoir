import { supabase } from '@/lib/supabase';
import { looksLikeNetworkError } from '@/lib/offline/net';
import { createOp, unsentOps, foldPendingExpenses } from '@/lib/offline/outbox';
import { readExpensesMirror, upsertExpensesMirror } from '@/lib/offline/pull';

// Dépenses — même traitement hors-ligne que les commandes (Phase 3.6) :
// écriture Supabase d'abord sinon outbox ; lecture = fusion du miroir local
// avec les opérations non envoyées.

const uuid = () =>
  (globalThis.crypto && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

// Dépenses d'un restaurant sur une plage de dates (bornes ISO inclusives),
// triées du plus récent au plus ancien.
export async function getExpensesForRange(ownerEmail, start, end) {
  const inRange = (r) => (r.created_at || '') >= start && (r.created_at || '') <= end;
  const byNewest = (a, b) => (b.created_at || '').localeCompare(a.created_at || '');
  const ops = await unsentOps(ownerEmail);

  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('owner_email', ownerEmail)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const server = data || [];
    upsertExpensesMirror(ownerEmail, server).catch((e) =>
      console.warn('[offline] miroir expenses non mis à jour', e),
    );
    return foldPendingExpenses(server, ops).filter(inRange).sort(byNewest);
  } catch (err) {
    if (!looksLikeNetworkError(err)) throw err;
    const { rows, everSynced } = await readExpensesMirror(ownerEmail);
    if (!rows.length && !ops.length && !everSynced) throw err;
    return foldPendingExpenses(rows, ops).filter(inRange).sort(byNewest);
  }
}

export async function createExpense({ restaurantId, ownerEmail, label, amount, category }) {
  const row = {
    id: uuid(),
    restaurant_id: restaurantId,
    owner_email: ownerEmail,
    label,
    amount,
    category,
    created_at: new Date().toISOString(),
  };
  try {
    const { error } = await supabase.from('expenses').insert([row]);
    if (error) throw error;
    return { synced: true };
  } catch (err) {
    if (!looksLikeNetworkError(err)) throw err;
    await createOp({ entity: 'expense', entityId: row.id, kind: 'expense.create', payload: row, ownerEmail });
    return { synced: false };
  }
}

export async function deleteExpense(id, ownerEmail) {
  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('owner_email', ownerEmail);
    if (error) throw error;
    return { synced: true };
  } catch (err) {
    if (!looksLikeNetworkError(err)) throw err;
    await createOp({ entity: 'expense', entityId: id, kind: 'expense.delete', payload: { id }, ownerEmail });
    return { synced: false };
  }
}
