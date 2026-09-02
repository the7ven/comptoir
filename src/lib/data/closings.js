import { supabase } from '@/lib/supabase';
import { getDb } from '@/lib/offline/db';
import { looksLikeNetworkError, normEmail } from '@/lib/offline/net';
import { createOp } from '@/lib/offline/outbox';

const uuid = () =>
  (globalThis.crypto && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

const doneKey = (ownerEmail, date) => `closing_done:${normEmail(ownerEmail)}:${date}`;

async function markClosingDoneLocally(ownerEmail, date) {
  const db = getDb();
  if (!db) return;
  try { await db.meta.put({ key: doneKey(ownerEmail, date), value: true }); } catch { /* */ }
}

// Enregistre la clôture de caisse du jour. Hors-ligne : mise en file (outbox).
// Le garde-fou multi-caisses est côté UI (CashierTabContent), pas ici.
export async function createDailyClosing({
  restaurantId, ownerEmail, date, theoreticalAmount, realAmount, difference, notes, closedBy,
}) {
  const row = {
    id: uuid(),
    restaurant_id: restaurantId,
    owner_email: ownerEmail,
    date,
    theoretical_amount: theoreticalAmount,
    real_amount: realAmount,
    difference,
    notes,
    closed_by: closedBy,
    created_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase.from('daily_closings').insert([row]);
    if (error) throw error;
    markClosingDoneLocally(ownerEmail, date);
    return { synced: true };
  } catch (err) {
    if (!looksLikeNetworkError(err)) throw err;
    await createOp({ entity: 'closing', entityId: row.id, kind: 'closing.create', payload: row, ownerEmail });
    markClosingDoneLocally(ownerEmail, date);
    return { synced: false };
  }
}

// La caisse du jour a-t-elle déjà été clôturée ? Cache-through : hors-ligne on
// renvoie la dernière valeur connue (ou celle posée par une clôture en file).
export async function isDailyClosingDone(ownerEmail, date) {
  try {
    const { data, error } = await supabase
      .from('daily_closings')
      .select('id')
      .eq('owner_email', ownerEmail)
      .eq('date', date)
      .limit(1);
    if (error) throw error;
    const done = (data?.length || 0) > 0;
    const db = getDb();
    if (db) {
      try { await db.meta.put({ key: doneKey(ownerEmail, date), value: done }); } catch { /* */ }
    }
    return done;
  } catch (err) {
    if (!looksLikeNetworkError(err)) throw err;
    const db = getDb();
    if (!db) return false;
    const m = await db.meta.get(doneKey(ownerEmail, date));
    return Boolean(m && m.value);
  }
}
