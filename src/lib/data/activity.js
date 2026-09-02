import { supabase } from '@/lib/supabase';
import { getDb } from '@/lib/offline/db';
import { looksLikeNetworkError, normEmail } from '@/lib/offline/net';
import { pendingActivityEntries, unsentOps } from '@/lib/offline/outbox';

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

// Aperçu de la facture / commande liée à une entrée du journal.
// Cherche d'abord en local (miroir + outbox), puis le serveur.
// @returns {{ table_number, payment_method?, amount, items: [] } | null}
export async function getActivityInvoice(entityType, entityId, ownerEmail) {
  const db = getDb();

  if (entityType === 'transaction') {
    if (db) {
      const local = await db.transactions.get(entityId);
      if (local) {
        return {
          table_number: local.table_number, payment_method: local.payment_method,
          amount: Number(local.amount), items: local.items || [],
        };
      }
    }
    const op = (await unsentOps(ownerEmail)).find(
      (o) => o.kind === 'payment.create' && o.payload?.tx?.id === entityId,
    );
    if (op) {
      const tx = op.payload.tx;
      return {
        table_number: tx.table_number, payment_method: tx.payment_method,
        amount: Number(tx.amount), items: tx.items || [],
      };
    }
    try {
      const { data, error } = await supabase
        .from('transactions').select('*').eq('id', entityId).maybeSingle();
      if (error) throw error;
      return data && {
        table_number: data.table_number, payment_method: data.payment_method,
        amount: Number(data.amount), items: data.items || [],
      };
    } catch (err) {
      if (!looksLikeNetworkError(err)) throw err;
      return null;
    }
  }

  // entityType === 'order'
  if (db) {
    const local = await db.orders.get(entityId);
    if (local) {
      return {
        table_number: local.table_number, amount: Number(local.total_amount),
        items: local.items_details || [],
      };
    }
  }
  const op = (await unsentOps(ownerEmail)).find(
    (o) => o.kind === 'order.create' && o.entityId === entityId,
  );
  if (op) {
    return {
      table_number: op.payload.table_number, amount: Number(op.payload.total_amount),
      items: op.payload.items_details || [],
    };
  }
  try {
    const { data, error } = await supabase
      .from('orders').select('*').eq('id', entityId).maybeSingle();
    if (error) throw error;
    return data && {
      table_number: data.table_number, amount: Number(data.total_amount),
      items: data.items_details || [],
    };
  } catch (err) {
    if (!looksLikeNetworkError(err)) throw err;
    return null;
  }
}
