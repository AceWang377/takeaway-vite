function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createState(payload, updatedAt = '') {
  return {
    customersRef: clone(payload.customers),
    ordersRef: clone(payload.orders),
    expensesRef: clone(payload.expenses),
    menusByDateRef: clone(payload.menusByDate),
    settingsRef: clone(payload.settings),
    syncedPayloadRef: clone(payload),
    lastAppliedUpdatedAtRef: updatedAt,
    lastSyncedRef: JSON.stringify(payload),
    pendingLocalSyncRef: '',
  };
}

const basePayload = {
  customers: [{ id: 'cust-1', customerId: 'Alice' }],
  orders: [{ id: 'ord-1', customerId: 'Alice', paymentMethod: 'other', driverId: 'd1', routeOrder: 1 }],
  expenses: [],
  menusByDate: { '2026-03-24': 'menu-a' },
  settings: { mealPrice: 10 },
};

let remote = {
  payload: clone(basePayload),
  updated_at: '2026-03-24T14:00:00.000Z',
};

function fetchLatestSharedPayload() {
  return clone(remote);
}

function persistSharedState(clientState, nextState, { preserveRemoteOrders = false } = {}, writeUpdatedAt) {
  const latestRemote = fetchLatestSharedPayload();
  const payload = {
    customers: clone(nextState.customers),
    orders: preserveRemoteOrders ? clone(latestRemote?.payload?.orders || nextState.orders) : clone(nextState.orders),
    expenses: clone(nextState.expenses),
    menusByDate: clone(nextState.menusByDate),
    settings: clone(nextState.settings),
  };
  clientState.pendingLocalSyncRef = JSON.stringify(payload);
  clientState.lastSyncedRef = JSON.stringify(payload);
  clientState.lastAppliedUpdatedAtRef = writeUpdatedAt;
  clientState.syncedPayloadRef = clone(payload);
  remote = { payload: clone(payload), updated_at: writeUpdatedAt };
  return clone(remote);
}

function applyIncomingPayload(clientState, incoming) {
  const next = incoming?.payload;
  const nextUpdatedAt = incoming?.updated_at || '';
  if (!next) return false;
  if (nextUpdatedAt && clientState.lastAppliedUpdatedAtRef && nextUpdatedAt <= clientState.lastAppliedUpdatedAtRef) {
    return false;
  }
  const serialized = JSON.stringify(next);
  if (serialized === clientState.lastSyncedRef) return false;
  if (clientState.pendingLocalSyncRef && serialized !== clientState.pendingLocalSyncRef) return false;

  clientState.lastSyncedRef = serialized;
  clientState.lastAppliedUpdatedAtRef = nextUpdatedAt;
  clientState.pendingLocalSyncRef = '';
  clientState.customersRef = clone(next.customers);
  clientState.ordersRef = clone(next.orders);
  clientState.expensesRef = clone(next.expenses);
  clientState.menusByDateRef = clone(next.menusByDate);
  clientState.settingsRef = clone(next.settings);
  clientState.syncedPayloadRef = clone(next);
  return true;
}

function run() {
  const clientA = createState(remote.payload, remote.updated_at);
  const clientB = createState(remote.payload, remote.updated_at);

  // Client B adds a new order and persists it.
  const order2 = { id: 'ord-2', customerId: 'Bob', paymentMethod: 'cash', driverId: 'd2', routeOrder: 2 };
  clientB.ordersRef = [...clientB.ordersRef, order2];
  persistSharedState(clientB, {
    customers: clientB.customersRef,
    orders: clientB.ordersRef,
    expenses: clientB.expensesRef,
    menusByDate: clientB.menusByDateRef,
    settings: clientB.settingsRef,
  }, {}, '2026-03-24T14:10:00.000Z');

  assert(remote.payload.orders.some((o) => o.id === 'ord-2'), 'B write should add new order to remote');

  // Client A has stale local orders, but changes non-order state later.
  clientA.menusByDateRef['2026-03-24'] = 'menu-b';
  persistSharedState(clientA, {
    customers: clientA.customersRef,
    orders: clientA.ordersRef, // stale local orders without ord-2
    expenses: clientA.expensesRef,
    menusByDate: clientA.menusByDateRef,
    settings: clientA.settingsRef,
  }, { preserveRemoteOrders: true }, '2026-03-24T14:20:00.000Z');

  assert(remote.payload.orders.some((o) => o.id === 'ord-2'), 'Non-order autosave must preserve remote latest orders');
  assert(remote.payload.menusByDate['2026-03-24'] === 'menu-b', 'Non-order autosave should still update menus');

  // Simulate a stale subscription payload arriving after a newer one.
  const staleIncoming = {
    payload: clone(basePayload),
    updated_at: '2026-03-24T14:05:00.000Z',
  };
  const acceptedStale = applyIncomingPayload(clientB, staleIncoming);
  assert(acceptedStale === false, 'Client must reject stale payload by updated_at');
  assert(clientB.ordersRef.some((o) => o.id === 'ord-2'), 'Rejecting stale payload must keep newer local orders');

  // Simulate receiving the valid latest remote payload.
  const acceptedFresh = applyIncomingPayload(clientA, remote);
  assert(acceptedFresh === true, 'Client should accept fresher payload');
  assert(clientA.ordersRef.some((o) => o.id === 'ord-2'), 'Fresh payload should include the newer order');

  console.log('\nTwo-client shared payload conflict simulation\n');
  console.log('PASS  new order from client B survives later non-order autosave from stale client A');
  console.log('PASS  stale incoming payload is rejected by updated_at ordering');
  console.log('PASS  fresher remote payload is accepted and applied');
  console.log('\nResult: simulation passed.');
}

run();
