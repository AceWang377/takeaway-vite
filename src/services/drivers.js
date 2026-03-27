import { supabase } from './supabaseClient';

function ensureSupabase() {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  return supabase;
}

const DRIVER_COLUMNS = 'id,name,rate,active,sort_order,created_at';

export async function listDrivers() {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('drivers')
    .select(DRIVER_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createDriver(driver) {
  const client = ensureSupabase();
  const payload = {
    id: driver.id,
    name: driver.name,
    rate: Number(driver.rate || 0),
    active: driver.active ?? true,
    sort_order: Number(driver.sortOrder || 0),
  };

  const { error } = await client.from('drivers').insert(payload);
  if (error) throw error;
  return true;
}

export async function updateDriverRow(id, patch) {
  const client = ensureSupabase();
  const payload = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.rate !== undefined) payload.rate = Number(patch.rate || 0);
  if (patch.active !== undefined) payload.active = !!patch.active;
  if (patch.sortOrder !== undefined) payload.sort_order = Number(patch.sortOrder || 0);

  const { error } = await client.from('drivers').update(payload).eq('id', id);
  if (error) throw error;
  return true;
}

export async function deleteDriverRow(id) {
  const client = ensureSupabase();
  const { error } = await client.from('drivers').update({ active: false }).eq('id', id);
  if (error) throw error;
}
