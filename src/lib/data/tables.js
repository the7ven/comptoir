import { supabase } from '@/lib/supabase';

// Couche d'accès aux données pour le plan de salle (table `restaurant_tables`)
// et le rattachement des commandes à une table. Centralise ce qui était
// dupliqué entre le dashboard (snapshot en direct) et TablesTabContent.

// Les tables ("TABLE 07", toujours en majuscules côté plan de salle) et les
// commandes ("Table 07", préfixe ajouté par MenuTabContent à partir de ce
// que tape le caissier) ne partagent pas la même casse — et certains noms
// de table libres ("Terrasse", "VIP"...) n'ont même pas de préfixe
// "TABLE " du tout. On normalise donc les deux côtés (préfixe "table"
// retiré, casse ignorée) avant toute comparaison, sinon aucune commande ne
// "retrouve" jamais sa table.
export const normalizeTableId = (v) => (v || "").trim().replace(/^table\s*/i, "").toUpperCase();

// Commandes actives (déjà filtrées "hors Servi" en amont) rattachées à une
// table donnée.
export function getOrdersForTable(tableName, activeOrders) {
  return activeOrders.filter(
    (o) => normalizeTableId(o.table_number) === normalizeTableId(tableName)
  );
}

// Statut d'une table à partir de ses commandes actives déjà filtrées :
// "Libre" si aucune, "Addition" si au moins une commande est prête (le
// client attend l'addition), "Occupée" sinon.
export function getStatusFromOrders(tableOrders) {
  if (tableOrders.length === 0) return "Libre";
  return tableOrders.some((o) => o.status === "Prêt") ? "Addition" : "Occupée";
}

// Raccourci getOrdersForTable + getStatusFromOrders, pour les cas qui n'ont
// pas besoin de la liste intermédiaire (ex: agrégation de compteurs).
export function getTableStatus(tableName, activeOrders) {
  return getStatusFromOrders(getOrdersForTable(tableName, activeOrders));
}

export async function getRestaurantTables(ownerEmail) {
  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('owner_email', ownerEmail);
  if (error) throw error;
  return data || [];
}

export async function createTable({ restaurantId, ownerEmail, tableName, capacity }) {
  const { error } = await supabase.from('restaurant_tables').insert([{
    restaurant_id: restaurantId,
    owner_email: ownerEmail,
    table_name: tableName,
    capacity,
    status: 'Libre',
  }]);
  if (error) throw error;
}

export async function deleteTable(id) {
  const { error } = await supabase.from('restaurant_tables').delete().eq('id', id);
  if (error) throw error;
}
