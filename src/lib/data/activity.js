import { supabase } from '@/lib/supabase';
import { getDb } from '@/lib/offline/db';
import { looksLikeNetworkError, normEmail } from '@/lib/offline/net';
import { pendingActivityEntries } from '@/lib/offline/outbox';

// Journal d'activité (Phase 3.9). Alimenté côté serveur par des triggers ;
// lu ici en cache-through : hors-ligne, on renvoie le miroir local + les
// opérations non envoyées présentées comme des entrées (marquées _local).

const PAGE = 60;

async function mirrorActivity(ownerEmail, rows) {
  const db = getDb();
  if (!db || !rows) return;
  const key = normEmail(ownerEmail);
  await db.transaction('rw', db.activity_log, db.meta, async () => {
    if (rows.length) {
      await db.activity_log.bulkPut(rows.map((r) => ({ ...r, owner_email: normEmail(r.owner_email) })));
    }
    await db.meta.put({ key: `synced:activity:${key}`, at: Date.now() });
  });
}

async function readActivityMirror(ownerEmail) {
  const db = getDb();
  if (!db) return { rows: [], everSynced: false };
  const key = normEmail(ownerEmail);
  const [rows, meta] = await Promise.all([
    db.activity_log.where('owner_email').equalsIgnoreCase(key).toArray(),
    db.meta.get(`synced:activity:${key}`),
  ]);
  return { rows, everSynced: Boolean(meta) };
}

const byNewest = (a, b) => (b.occurred_at || '').localeCompare(a.occurred_at || '');

// Fusionne : entrées serveur/miroir + opérations locales non envoyées, en
// évitant les doublons (une op locale et son entrée serveur, une fois
// synchronisée, portent des id différents mais le même entity_id + action).
function merge(serverRows, localEntries) {
  const seen = new Set(serverRows.map((r) => `${r.action}:${r.entity_id}`));
  const extras = localEntries.filter((e) => !seen.has(`${e.action}:${e.entity_id}`));
  return [...extras, ...serverRows].sort(byNewest);
}

/**
 * @param {string} ownerEmail
 * @param {{ isOwner?: boolean, before?: string|null }} opts
 *   before = occurred_at ISO : page suivante (entrées plus anciennes).
 */
export async function getActivityLog(ownerEmail, { isOwner = false, before = null } = {}) {
  const local = before ? [] : await pendingActivityEntries(ownerEmail, isOwner);

  try {
    let q = supabase
      .from('activity_log')
      .select('*')
      .eq('owner_email', ownerEmail)
      .order('occurred_at', { ascending: false })
      .limit(PAGE);
    if (before) q = q.lt('occurred_at', before);

    const { data, error } = await q;
    if (error) throw error;
    const server = data || [];
    if (!before) mirrorActivity(ownerEmail, server).catch(() => {});
    return merge(server, local);
  } catch (err) {
    if (!looksLikeNetworkError(err)) throw err;
    const { rows, everSynced } = await readActivityMirror(ownerEmail);
    if (!rows.length && !local.length && !everSynced) throw err;
    const filtered = isOwner
      ? rows
      : rows.filter((r) => r.action !== 'order.cancel' && r.action !== 'expense.delete');
    // Hors-ligne : pas de pagination fine, on renvoie le miroir complet trié.
    return merge(filtered.sort(byNewest).slice(0, PAGE * 4), local);
  }
}
