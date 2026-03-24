function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

let remote = {
  payload: {
    customers: [{ id: 'cust-1', customerId: 'Alice' }],
    orders: [{ id: 'ord-1', customerId: 'Alice', paymentMethod: 'other', driverId: 'drv-a', routeOrder: 1, note: '' }],
    expenses: [],
    menusByDate: { '2026-03-24': 'menu-a' },
    settings: { mealPrice: 10 },
  },
  updated_at: '2026-03-24T22:00:00.000Z',
};

function createClientState() {
  return {
    customers: clone(remote.payload.customers),
    ordersRef: clone(remote.payload.orders),
    expenses: clone(remote.payload.expenses),
    menusByDate: clone(remote.payload.menusByDate),
    settings: clone(remote.payload.settings),
  };
}

function fetchLatestSharedPayload() {
  return clone(remote);
}

function persistSharedState(nextState, updatedAt) {
  remote = {
    payload: {
      customers: clone(nextState.customers),
      orders: clone(nextState.orders),
      expenses: clone(nextState.expenses),
      menusByDate: clone(nextState.menusByDate),
      settings: clone(nextState.settings),
    },
    updated_at: updatedAt,
  };
}

function oldUpdateOrder(clientState, id, patch, updatedAt) {
  const baseOrders = clientState.ordersRef;
  const nextOrders = baseOrders.map((o) => (o.id === id ? { ...o, ...patch } : o));
  clientState.ordersRef = clone(nextOrders);
  persistSharedState({
    customers: clientState.customers,
    orders: nextOrders,
    expenses: clientState.expenses,
    menusByDate: clientState.menusByDate,
    settings: clientState.settings,
  }, updatedAt);
}

function fixedUpdateOrder(clientState, id, patch, updatedAt) {
  const latestRemote = fetchLatestSharedPayload();
  const baseOrders = latestRemote?.payload?.orders || clientState.ordersRef;
  const nextOrders = baseOrders.map((o) => (o.id === id ? { ...o, ...patch } : o));
  clientState.ordersRef = clone(nextOrders);
  persistSharedState({
    customers: clientState.customers,
    orders: nextOrders,
    expenses: clientState.expenses,
    menusByDate: clientState.menusByDate,
    settings: clientState.settings,
  }, updatedAt);
}

function run() {
  // Demonstrate the real failure mode with stale explicit update.
  remote = {
    payload: {
      customers: [{ id: 'cust-1', customerId: 'Alice' }],
      orders: [{ id: 'ord-1', customerId: 'Alice', paymentMethod: 'other', driverId: 'drv-a', routeOrder: 1, note: '' }],
      expenses: [],
      menusByDate: { '2026-03-24': 'menu-a' },
      settings: { mealPrice: 10 },
    },
    updated_at: '2026-03-24T22:00:00.000Z',
  };

  const clientA = createClientState();
  const clientB = createClientState();

  oldUpdateOrder(clientA, 'ord-1', { driverId: 'drv-b' }, '2026-03-24T22:05:00.000Z');
  assert(remote.payload.orders[0].driverId === 'drv-b', 'A should persist new driver first');

  oldUpdateOrder(clientB, 'ord-1', { paymentMethod: 'cash' }, '2026-03-24T22:06:00.000Z');
  assert(remote.payload.orders[0].driverId === 'drv-a', 'Old update path wrongly reverts driver with stale explicit update');

  // Reset and verify fixed behavior.
  remote = {
    payload: {
      customers: [{ id: 'cust-1', customerId: 'Alice' }],
      orders: [{ id: 'ord-1', customerId: 'Alice', paymentMethod: 'other', driverId: 'drv-a', routeOrder: 1, note: '' }],
      expenses: [],
      menusByDate: { '2026-03-24': 'menu-a' },
      settings: { mealPrice: 10 },
    },
    updated_at: '2026-03-24T22:00:00.000Z',
  };

  const fixedA = createClientState();
  const fixedB = createClientState();

  fixedUpdateOrder(fixedA, 'ord-1', { driverId: 'drv-b' }, '2026-03-24T22:05:00.000Z');
  assert(remote.payload.orders[0].driverId === 'drv-b', 'Fixed path should persist new driver first');

  fixedUpdateOrder(fixedB, 'ord-1', { paymentMethod: 'cash' }, '2026-03-24T22:06:00.000Z');
  assert(remote.payload.orders[0].driverId === 'drv-b', 'Fixed path must preserve latest remote driver during later explicit update');
  assert(remote.payload.orders[0].paymentMethod === 'cash', 'Fixed path must still apply new payment method');

  console.log('\nStale explicit order update overwrite simulation\n');
  console.log('PASS  old path reproduces driver rollback via stale explicit order update');
  console.log('PASS  fixed path preserves latest remote driver while applying new field update');
  console.log('\nResult: simulation passed.');
}

run();
