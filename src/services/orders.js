import { supabase } from './supabaseClient';

function ensureSupabase() {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  return supabase;
}

const ORDER_COLUMNS = 'id,date,year,week,customer_id,address,phone,qty,note,payment_method,driver_id,is_temp,payment_done,menu,amount,is_free_meal,route_order,created_at';

export async function listOrdersByDate(date) {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('orders')
    .select(ORDER_COLUMNS)
    .eq('date', date)
    .order('route_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function listAllOrders() {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('orders')
    .select(ORDER_COLUMNS)
    .order('date', { ascending: false })
    .order('route_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createOrder(order) {
  const client = ensureSupabase();
  const payload = {
    id: order.id,
    date: order.date,
    year: order.year,
    week: order.week,
    customer_id: order.customerId,
    address: order.address,
    phone: order.phone,
    qty: order.qty,
    note: order.note,
    payment_method: order.paymentMethod,
    driver_id: order.driverId,
    is_temp: order.isTemp,
    payment_done: order.paymentDone,
    menu: order.menu,
    amount: order.amount,
    is_free_meal: order.isFreeMeal,
    route_order: order.routeOrder,
    created_at: order.createdAt,
  };

  const { error } = await client.from('orders').insert(payload);
  if (error) throw error;
  return true;
}

export async function updateOrderRow(id, patch) {
  const client = ensureSupabase();
  const payload = {};
  if (patch.date !== undefined) payload.date = patch.date;
  if (patch.year !== undefined) payload.year = patch.year;
  if (patch.week !== undefined) payload.week = patch.week;
  if (patch.customerId !== undefined) payload.customer_id = patch.customerId;
  if (patch.address !== undefined) payload.address = patch.address;
  if (patch.phone !== undefined) payload.phone = patch.phone;
  if (patch.qty !== undefined) payload.qty = patch.qty;
  if (patch.note !== undefined) payload.note = patch.note;
  if (patch.paymentMethod !== undefined) payload.payment_method = patch.paymentMethod;
  if (patch.driverId !== undefined) payload.driver_id = patch.driverId;
  if (patch.isTemp !== undefined) payload.is_temp = patch.isTemp;
  if (patch.paymentDone !== undefined) payload.payment_done = patch.paymentDone;
  if (patch.menu !== undefined) payload.menu = patch.menu;
  if (patch.amount !== undefined) payload.amount = patch.amount;
  if (patch.isFreeMeal !== undefined) payload.is_free_meal = patch.isFreeMeal;
  if (patch.routeOrder !== undefined) payload.route_order = patch.routeOrder;

  const { error } = await client.from('orders').update(payload).eq('id', id);
  if (error) throw error;
  return true;
}

export async function updateOrderPaymentMethod(id, paymentMethod) {
  const client = ensureSupabase();
  const { error } = await client.rpc('public_update_order_payment_method', {
    p_order_id: id,
    p_payment_method: paymentMethod,
  });

  if (error) throw error;
  return true;
}

export async function deleteOrderRow(id) {
  const client = ensureSupabase();
  const { error } = await client.from('orders').delete().eq('id', id);
  if (error) throw error;
}

export async function batchUpdateRouteOrders(items) {
  const client = ensureSupabase();
  const results = await Promise.all(
    items.map((item) =>
      client.from('orders').update({ route_order: item.routeOrder }).eq('id', item.id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}
