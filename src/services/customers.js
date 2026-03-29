import { supabase } from './supabaseClient';

function ensureSupabase() {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  return supabase;
}

const CUSTOMER_COLUMNS = 'id,customer_id,phone,address,note,manual_cash_history,created_at';

export async function listCustomers() {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('customers')
    .select(CUSTOMER_COLUMNS)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createCustomer(customer) {
  const client = ensureSupabase();
  const payload = {
    id: customer.id,
    customer_id: customer.customerId,
    phone: customer.phone || '',
    address: customer.address || '',
    note: customer.note || '',
    manual_cash_history: Number(customer.manualCashHistory || 0),
    created_at: customer.createdAt || new Date().toISOString(),
  };

  const { error } = await client.from('customers').insert(payload);
  if (error) throw error;
  return true;
}

export async function updateCustomerRow(id, patch) {
  const client = ensureSupabase();
  const payload = {};
  if (patch.customerId !== undefined) payload.customer_id = patch.customerId;
  if (patch.phone !== undefined) payload.phone = patch.phone;
  if (patch.address !== undefined) payload.address = patch.address;
  if (patch.note !== undefined) payload.note = patch.note;
  if (patch.manualCashHistory !== undefined) payload.manual_cash_history = Number(patch.manualCashHistory || 0);

  const { error } = await client.from('customers').update(payload).eq('id', id);
  if (error) throw error;
  return true;
}

export async function deleteCustomerRow(id) {
  const client = ensureSupabase();
  const { error } = await client.from('customers').delete().eq('id', id);
  if (error) throw error;
}
