function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

let remote = {
  payload: {
    customers: [{ id: 'cust-1', customerId: 'Alice' }],
    orders: [
      { id: 'ord-1', customerId: 'Alice', paymentMethod: 'other', driverId: 'drv-a', routeOrder: 1, note: '' },
      { id: 'ord-2', customerId: 'Bob', paymentMethod: 'other', driverId: 'drv-b', routeOrder: 2, note: '' },
      { id: 'ord-3', customerId: 'Cara', paymentMethod: 'other', driverId: 'drv-c', routeOrder: 3, note: '' },
    ],
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

function moveOrder(clientState, targetId, direction, updatedAt) {
  const dayOrders = [...clientState.ordersRef].sort((a, b) => a.routeOrder - b.routeOrder);
  const index = dayOrders.findIndex((o) => o.id === targetId);
  const nextIndex = direction === 'up' ? index - 1 : index + 1;
  const reordered = [...dayOrders];
  [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
  const nextOrders = reordered.map((o, i) => ({ ...o, routeOrder: i + 1 }));
  clientState.ordersRef = clone(nextOrders);
  persistSharedState({
    customers: clientState.customers,
    orders: nextOrders,
    expenses: clientState.expenses,
    menusByDate: clientState.menusByDate,
    settings: clientState.settings,
  }, updatedAt);
}

function oldUpdateOrder(clientState, id, patch, updatedAt) {
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

function fixedUpdateOrder(clientState, id, patch, updatedAt) {
  const latestRemote = fetchLatestSharedPayload();
  const baseOrders = latestRemote?.payload?.orders || clientState.ordersRef;
  const previousLocal = clientState.ordersRef.find((o) => o.id === id);
  const remoteCurrent = baseOrders.find((o) => o.id === id);
  const mergedOrder = {
    ...remoteCurrent,
    routeOrder: previousLocal?.routeOrder ?? remoteCurrent?.routeOrder,
    ...patch,
  };
  const nextOrders = baseOrders.map((o) => (o.id === id ? mergedOrder : o));
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
  // Reproduce failure: user moves locally, then field update based on stale remote order position.
  remote = {
    payload: {
      customers: [{ id: 'cust-1', customerId: 'Alice' }],
      orders: [
        { id: 'ord-1', customerId: 'Alice', paymentMethod: 'other', driverId: 'drv-a', routeOrder: 1, note: '' },
        { id: 'ord-2', customerId: 'Bob', paymentMethod: 'other', driverId: 'drv-b', routeOrder: 2, note: '' },
        { id: 'ord-3', customerId: 'Cara', paymentMethod: 'other', driverId: 'drv-c', routeOrder: 3, note: '' },
      ],
      expenses: [],
      menusByDate: { '2026-03-24': 'menu-a' },
      settings: { mealPrice: 10 },
    },
    updated_at: '2026-03-24T22:00:00.000Z',
  };

  const client = createClientState();
  moveOrder(client, 'ord-2', 'up', '2026-03-24T22:05:00.000Z');
  assert(client.ordersRef.find((o) => o.id === 'ord-2').routeOrder === 1, 'After local move, ord-2 should be at routeOrder 1');

  // Simulate stale local view keeping moved routeOrder while remote is still stale for this field update.
  remote.payload.orders = [
    { id: 'ord-1', customerId: 'Alice', paymentMethod: 'other', driverId: 'drv-a', routeOrder: 1, note: '' },
    { id: 'ord-2', customerId: 'Bob', paymentMethod: 'other', driverId: 'drv-b', routeOrder: 2, note: '' },
    { id: 'ord-3', customerId: 'Cara', paymentMethod: 'other', driverId: 'drv-c', routeOrder: 3, note: '' },
  ];

  oldUpdateOrder(client, 'ord-2', { paymentMethod: 'cash' }, '2026-03-24T22:06:00.000Z');
  assert(remote.payload.orders.find((o) => o.id === 'ord-2').routeOrder === 2, 'Old path wrongly restores stale routeOrder after field update');

  // Reset and verify fixed behavior.
  remote = {
    payload: {
      customers: [{ id: 'cust-1', customerId: 'Alice' }],
      orders: [
        { id: 'ord-1', customerId: 'Alice', paymentMethod: 'other', driverId: 'drv-a', routeOrder: 1, note: '' },
        { id: 'ord-2', customerId: 'Bob', paymentMethod: 'other', driverId: 'drv-b', routeOrder: 2, note: '' },
        { id: 'ord-3', customerId: 'Cara', paymentMethod: 'other', driverId: 'drv-c', routeOrder: 3, note: '' },
      ],
      expenses: [],
      menusByDate: { '2026-03-24': 'menu-a' },
      settings: { mealPrice: 10 },
    },
    updated_at: '2026-03-24T22:00:00.000Z',
  };

  const fixedClient = createClientState();
  moveOrder(fixedClient, 'ord-2', 'up', '2026-03-24T22:05:00.000Z');
  remote.payload.orders = [
    { id: 'ord-1', customerId: 'Alice', paymentMethod: 'other', driverId: 'drv-a', routeOrder: 1, note: '' },
    { id: 'ord-2', customerId: 'Bob', paymentMethod: 'other', driverId: 'drv-b', routeOrder: 2, note: '' },
    { id: 'ord-3', customerId: 'Cara', paymentMethod: 'other', driverId: 'drv-c', routeOrder: 3, note: '' },
  ];

  fixedUpdateOrder(fixedClient, 'ord-2', { paymentMethod: 'cash' }, '2026-03-24T22:06:00.000Z');
  const updated = remote.payload.orders.find((o) => o.id === 'ord-2');
  assert(updated.routeOrder === 1, 'Fixed path must preserve local moved routeOrder when updating another field');
  assert(updated.paymentMethod === 'cash', 'Fixed path must still apply payment method update');

  console.log('\nRoute-order preservation on order field update simulation\n');
  console.log('PASS  old path reproduces routeOrder rollback after later field update');
  console.log('PASS  fixed path preserves moved routeOrder while applying field update');
  console.log('\nResult: simulation passed.');
}

run();
