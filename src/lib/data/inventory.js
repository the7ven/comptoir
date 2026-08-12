import { supabase } from '@/lib/supabase';

// Articles de stock d'un restaurant, triés par nom.
export async function getInventory(restaurantId) {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

// Articles en alerte (quantité <= seuil) — même filtre que StockTabContent
// applique à l'affichage, réutilisé par le snapshot en direct du dashboard.
export function getLowStockItems(inventory) {
  return inventory.filter((i) => i.quantity <= i.min_threshold);
}

export async function createInventoryItem({ restaurantId, name, quantity, minThreshold, unit }) {
  const { error } = await supabase.from('inventory').insert([{
    restaurant_id: restaurantId,
    name,
    quantity,
    min_threshold: minThreshold,
    unit,
  }]);
  if (error) throw error;
}
