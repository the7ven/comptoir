import { supabase } from '@/lib/supabase';
import { getDb } from '@/lib/offline/db';
import { looksLikeNetworkError, normEmail } from '@/lib/offline/net';
import {
  createOp, unsentOps, foldPendingOrders, newOrderId, newTransactionId,
} from '@/lib/offline/outbox';

// Couche d'accès aux commandes (`orders`) et à leur encaissement (insertion
// dans `transactions`).
//
// Chantier hors-ligne : chaque écriture tente Supabase d'abord ; sur panne
// réseau, elle est déposée dans l'outbox local (src/lib/offline/outbox.js),
// rejouée ensuite par src/lib/offline/sync.js dès le retour du réseau. Les
// lectures fusionnent le dernier instantané serveur/miroir avec les
// opérations non envoyées pour que l'UI reste cohérente sans réseau.

// ---------------------------------------------------------------------------
// Miroir local du dernier instantané "commandes actives"
// ---------------------------------------------------------------------------

async function replaceActiveMirror(ownerEmail, rows) {
  const db = getDb();
  if (!db) return;
  const key = normEmail(ownerEmail);
  await db.transaction('rw', db.orders, db.meta, async () => {
    await db.orders.where('owner_email').equalsIgnoreCase(key).delete();
    if (rows.length) {
      await db.orders.bulkPut(rows.map((r) => ({ ...r, owner_email: normEmail(r.owner_email) })));
    }
    await db.meta.put({ key: `synced:orders:${key}`, at: Date.now() });
  });
}

async function readActiveMirror(ownerEmail) {
  const db = getDb();
  if (!db) return { rows: [], everSynced: false };
  const key = normEmail(ownerEmail);
  const [rows, meta] = await Promise.all([
    db.orders.where('owner_email').equalsIgnoreCase(key).toArray(),
    db.meta.get(`synced:orders:${key}`),
  ]);
  return { rows, everSynced: Boolean(meta) };
}

// ---------------------------------------------------------------------------
// Lectures
// ---------------------------------------------------------------------------

// Commandes actives (tout sauf "Servi") — plan de salle + snapshot dashboard.
export async function getActiveOrders(ownerEmail) {
  const ops = await unsentOps(ownerEmail);
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('owner_email', ownerEmail)
      .neq('status', 'Servi');
    if (error) throw error;
    const server = data || [];
    replaceActiveMirror(ownerEmail, server).catch((e) =>
      console.warn('[offline] miroir orders non mis à jour', e),
    );
    return foldPendingOrders(server, ops).filter((o) => o.status !== 'Servi');
  } catch (err) {
    if (!looksLikeNetworkError(err)) throw err;
    const { rows, everSynced } = await readActiveMirror(ownerEmail);
    if (!rows.length && !ops.length && !everSynced) throw err;
    return foldPendingOrders(rows, ops).filter((o) => o.status !== 'Servi');
  }
}

// Toutes les commandes d'une journée (bornes UTC, comme la requête d'origine).
export async function getOrdersForDay(ownerEmail, dateISO) {
  const start = `${dateISO}T00:00:00.000Z`;
  const end = `${dateISO}T23:59:59.999Z`;
  const inDay = (r) => (r.created_at || '') >= start && (r.created_at || '') <= end;
  const byNewest = (a, b) => (b.created_at || '').localeCompare(a.created_at || '');
  const ops = await unsentOps(ownerEmail);

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('owner_email', ownerEmail)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return foldPendingOrders(data || [], ops).filter(inDay).sort(byNewest);
  } catch (err) {
    if (!looksLikeNetworkError(err)) throw err;
    const { rows, everSynced } = await readActiveMirror(ownerEmail);
    if (!rows.length && !ops.length && !everSynced) throw err;
    // Hors-ligne, le miroir ne contient que les commandes actives : les
    // commandes déjà servies avant la coupure n'apparaîtront pas (limite
    // assumée de la Phase 3).
    return foldPendingOrders(rows, ops).filter(inDay).sort(byNewest);
  }
}

// ---------------------------------------------------------------------------
// Écritures — Supabase d'abord, sinon outbox
// ---------------------------------------------------------------------------

async function tryOnlineElseQueue({ online, offline }) {
  try {
    await online();
    return { synced: true };
  } catch (err) {
    if (!looksLikeNetworkError(err)) throw err;
    await offline();
    return { synced: false };
  }
}

// Nouvelle commande (statut initial "En cours"), depuis le panier du Menu.
// L'`id` est toujours généré côté client : clé d'idempotence pour le rejeu.
export async function createOrder({ restaurantId, ownerEmail, orderFields }) {
  const row = {
    id: newOrderId(),
    restaurant_id: restaurantId,
    owner_email: ownerEmail,
    status: 'En cours',
    priority: 'medium',
    created_at: new Date().toISOString(),
    ...orderFields,
  };
  return tryOnlineElseQueue({
    online: async () => {
      const { error } = await supabase.from('orders').insert([row]);
      if (error) throw error;
    },
    offline: () => createOp({
      entity: 'order', entityId: row.id, kind: 'order.create', payload: row, ownerEmail,
    }),
  });
}

// Met à jour les champs d'une commande existante (panier modifié avant renvoi
// en cuisine).
export async function updateOrder(orderId, ownerEmail, fields) {
  return tryOnlineElseQueue({
    online: async () => {
      const { error } = await supabase
        .from('orders')
        .update(fields)
        .eq('id', orderId)
        .eq('owner_email', ownerEmail);
      if (error) throw error;
    },
    offline: () => createOp({
      entity: 'order', entityId: orderId, kind: 'order.update', payload: fields, ownerEmail,
    }),
  });
}

export async function updateOrderStatus(orderId, status, ownerEmail) {
  return tryOnlineElseQueue({
    online: async () => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
      if (error) throw error;
    },
    offline: () => createOp({
      entity: 'order', entityId: orderId, kind: 'order.status', payload: { status }, ownerEmail,
    }),
  });
}

export async function deleteOrder(orderId, ownerEmail) {
  return tryOnlineElseQueue({
    online: async () => {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) throw error;
    },
    offline: () => createOp({
      entity: 'order', entityId: orderId, kind: 'order.delete', payload: { id: orderId }, ownerEmail,
    }),
  });
}

// Encaissement : insère la transaction puis marque la commande "Servi".
// Hors-ligne, les deux étapes partent dans l'outbox (transaction avec UUID
// client = idempotence au rejeu).
export async function finalizeOrder({ order, restaurantId, ownerEmail, method }) {
  const tx = {
    id: newTransactionId(),
    restaurant_id: restaurantId,
    owner_email: ownerEmail,
    table_number: order.table_number,
    amount: order.total_amount,
    payment_method: method,
    items: order.items_details || [],
    created_at: new Date().toISOString(),
  };

  const txRes = await tryOnlineElseQueue({
    online: async () => {
      const { error } = await supabase.from('transactions').insert([tx]);
      if (error) throw error;
    },
    offline: () => createOp({
      entity: 'transaction', entityId: tx.id, kind: 'payment.create',
      payload: { tx, orderId: order.id }, ownerEmail,
    }),
  });

  await updateOrderStatus(order.id, 'Servi', ownerEmail);

  return txRes;
}
