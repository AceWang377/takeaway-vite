import { supabase } from './supabaseClient';

function ensureSupabase() {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  return supabase;
}

const EXPENSE_COLUMNS = 'id,date,type,channel,amount,note,created_at';

export async function listExpenses() {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('expenses')
    .select(EXPENSE_COLUMNS)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createExpense(expense) {
  const client = ensureSupabase();
  const payload = {
    id: expense.id,
    date: expense.date,
    type: expense.type,
    channel: expense.channel,
    amount: Number(expense.amount || 0),
    note: expense.note || '',
  };

  const { error } = await client.from('expenses').insert(payload);
  if (error) throw error;
  return true;
}

export async function updateExpenseRow(id, patch) {
  const client = ensureSupabase();
  const payload = {};
  if (patch.date !== undefined) payload.date = patch.date;
  if (patch.type !== undefined) payload.type = patch.type;
  if (patch.channel !== undefined) payload.channel = patch.channel;
  if (patch.amount !== undefined) payload.amount = Number(patch.amount || 0);
  if (patch.note !== undefined) payload.note = patch.note;

  const { error } = await client.from('expenses').update(payload).eq('id', id);
  if (error) throw error;
  return true;
}

export async function deleteExpenseRow(id) {
  const client = ensureSupabase();
  const { error } = await client.from('expenses').delete().eq('id', id);
  if (error) throw error;
}
