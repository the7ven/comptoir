import { supabase } from '@/lib/supabase';

// Enregistre la clôture de caisse du jour.
export async function createDailyClosing({
  restaurantId, ownerEmail, date, theoreticalAmount, realAmount, difference, notes, closedBy,
}) {
  const { error } = await supabase.from('daily_closings').insert([{
    restaurant_id: restaurantId,
    owner_email: ownerEmail,
    date,
    theoretical_amount: theoreticalAmount,
    real_amount: realAmount,
    difference,
    notes,
    closed_by: closedBy,
  }]);
  if (error) throw error;
}

// La caisse du jour a-t-elle déjà été clôturée ? (snapshot du dashboard)
export async function isDailyClosingDone(ownerEmail, date) {
  const { data, error } = await supabase
    .from('daily_closings')
    .select('id')
    .eq('owner_email', ownerEmail)
    .eq('date', date)
    .limit(1);
  if (error) throw error;
  return (data?.length || 0) > 0;
}
