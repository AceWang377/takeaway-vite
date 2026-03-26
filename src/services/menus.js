import { supabase } from './supabaseClient';

function ensureSupabase() {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  return supabase;
}

export async function listMenus() {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('menus_by_date')
    .select('date,menu,updated_at')
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getMenuByDate(date) {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('menus_by_date')
    .select('date,menu,updated_at')
    .eq('date', date)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function upsertMenuByDate(date, menu) {
  const client = ensureSupabase();
  const { error } = await client
    .from('menus_by_date')
    .upsert({ date, menu });

  if (error) throw error;
  return true;
}
