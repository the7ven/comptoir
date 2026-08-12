import { supabase } from '@/lib/supabase';

// Couche d'accès aux données pour les commandes (`orders`) et leur
// encaissement (insertion dans `transactions`). Centralise ce qui était
// dupliqué entre le plan de salle (TablesTabContent) et l'onglet Commandes.

// Commandes actives (tout sauf "Servi") d'un restaurant — utilisé par le
// plan de salle et le snapshot en direct du dashboard.
export async function getActiveOrders(ownerEmail) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('owner_email', ownerEmail)
    .neq('status', 'Servi');
  if (error) throw error;
  return data || [];
}

// Toutes les commandes d'une journée donnée (active + déjà servies),
// utilisé par l'onglet Commandes.
export async function getOrdersForDay(ownerEmail, dateISO) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('owner_email', ownerEmail)
    .gte('created_at', `${dateISO}T00:00:00.000Z`)
    .lte('created_at', `${dateISO}T23:59:59.999Z`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateOrderStatus(orderId, status) {
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
  if (error) throw error;
}

// Crée une nouvelle commande (statut initial "En cours"), depuis le panier
// du Menu.
export async function createOrder({ restaurantId, ownerEmail, orderFields }) {
  const { error } = await supabase.from('orders').insert([{
    restaurant_id: restaurantId,
    owner_email: ownerEmail,
    status: 'En cours',
    ...orderFields,
  }]);
  if (error) throw error;
}

// Met à jour les champs d'une commande existante (ex: panier modifié avant
// renvoi en cuisine) — distinct de updateOrderStatus, qui ne touche que le
// statut, et de finalizeOrder, réservé à l'encaissement.
export async function updateOrder(orderId, ownerEmail, fields) {
  const { error } = await supabase
    .from('orders')
    .update(fields)
    .eq('id', orderId)
    .eq('owner_email', ownerEmail);
  if (error) throw error;
}

export async function deleteOrder(orderId) {
  const { error } = await supabase.from('orders').delete().eq('id', orderId);
  if (error) throw error;
}

// Encaissement d'une commande : insère la transaction correspondante puis
// marque la commande "Servi". Avant cette centralisation, cette même
// séquence à deux étapes était écrite à l'identique dans TablesTabContent
// (handleFinalizeTable) et OrdersTabContent (handleFinalizeOrder).
export async function finalizeOrder({ order, restaurantId, ownerEmail, method }) {
  const { error: transError } = await supabase.from('transactions').insert([{
    restaurant_id: restaurantId,
    owner_email: ownerEmail,
    table_number: order.table_number,
    amount: order.total_amount,
    payment_method: method,
    items: order.items_details || [],
    created_at: new Date().toISOString(),
  }]);
  if (transError) throw transError;

  await updateOrderStatus(order.id, 'Servi');
}
