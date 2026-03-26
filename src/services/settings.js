import { supabase } from './supabaseClient';

function ensureSupabase() {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  return supabase;
}

export async function getAppSettings() {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('app_settings')
    .select('id,meal_price,initial_cash,initial_account,updated_at')
    .eq('id', 'default')
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function upsertAppSettings(settings) {
  const client = ensureSupabase();
  const payload = {
    id: 'default',
    meal_price: Number(settings.mealPrice || 0),
    initial_cash: Number(settings.initialCash || 0),
    initial_account: Number(settings.initialAccount || 0),
  };

  const { error } = await client
    .from('app_settings')
    .upsert(payload);

  if (error) throw error;
  return true;
}
