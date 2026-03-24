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

let remote = {
  payload: {
    customers: [{ id: 'cust-1', customerId: 'Alice' }],
    orders: [{ id: 'ord-1', customerId: 'Alice', paymentMethod: 'other', driverId: 'drv-a', routeOrder: 1 }],
    expenses: [],
    menusByDate: { '2026-03-24': 'menu-a' },
    settings: { mealPrice: 10 },
  },
  updated_at: '2026-03-24T21:00:00.000Z',
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

  if (preserveRemoteOrders) {
    clientState.customersRef = clone(payload.customers);
    clientState.ordersRef = clone(payload.orders);
    clientState.expensesRef = clone(payload.expenses);
    clientState.menusByDateRef = clone(payload.menusByDate);
    clientState.settingsRef = clone(payload.settings);
  }

  clientState.pendingLocalSyncRef = '';
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

function updatePaymentMethod(clientState, paymentMethod, updatedAt) {
  clientState.ordersRef = clientState.ordersRef.map((o) => (
    o.id === 'ord-1' ? { ...o, paymentMethod } : o
  ));

  persistSharedState(clientState, {
    customers: clientState.customersRef,
    orders: clientState.ordersRef,
    expenses: clientState.expensesRef,
    menusByDate: clientState.menusByDateRef,
    settings: clientState.settingsRef,
  }, {}, updatedAt);
}

function run() {
  const clientA = createState(remote.payload, remote.updated_at);
  const staleClient = createState(remote.payload, remote.updated_at);

  // Rapid successive changes on client A.
  updatePaymentMethod(clientA, 'cash', '2026-03-24T21:05:00.000Z');
  updatePaymentMethod(clientA, 'transfer', '2026-03-24T21:06:00.000Z');
  updatePaymentMethod(clientA, 'wechat', '2026-03-24T21:07:00.000Z');

  assert(remote.payload.orders[0].paymentMethod === 'wechat', 'Latest rapid change should win on remote');
  assert(clientA.ordersRef[0].paymentMethod === 'wechat', 'Client A should keep latest selected payment method');

  // Stale client does a non-order autosave later.
  staleClient.menusByDateRef['2026-03-24'] = 'menu-b';
  persistSharedState(staleClient, {
    customers: staleClient.customersRef,
    orders: staleClient.ordersRef, // stale: still other
    expenses: staleClient.expensesRef,
    menusByDate: staleClient.menusByDateRef,
    settings: staleClient.settingsRef,
  }, { preserveRemoteOrders: true }, '2026-03-24T21:10:00.000Z');

  assert(remote.payload.orders[0].paymentMethod === 'wechat', 'Stale non-order autosave must not revert latest payment method');
  assert(staleClient.ordersRef[0].paymentMethod === 'wechat', 'Stale client should reconcile to latest payment method after autosave');

  // Old payload arrives after the latest state.
  const oldIncoming = {
    payload: {
      ...clone(remote.payload),
      orders: [{ id: 'ord-1', customerId: 'Alice', paymentMethod: 'cash', driverId: 'drv-a', routeOrder: 1 }],
    },
    updated_at: '2026-03-24T21:05:00.000Z',
  };
  const acceptedOld = applyIncomingPayload(clientA, oldIncoming);
  assert(acceptedOld === false, 'Client A should reject older payment-method payload');
  assert(clientA.ordersRef[0].paymentMethod === 'wechat', 'Rejecting old payload must preserve the latest payment method');

  // Latest payload can be re-applied or ignored, but must not regress state.
  const acceptedLatestAgain = applyIncomingPayload(clientA, remote);
  assert(typeof acceptedLatestAgain === 'boolean', 'Latest payload handling should complete deterministically');
  assert(clientA.ordersRef[0].paymentMethod === 'wechat', 'Handling latest payload again must keep final payment method');

  console.log('\nRapid payment-method switch simulation\n');
  console.log('PASS  latest rapid switch wins on remote');
  console.log('PASS  client keeps latest selected payment method');
  console.log('PASS  stale non-order autosave does not revert latest payment method');
  console.log('PASS  stale client reconciles to latest payment method');
  console.log('PASS  older incoming payload is rejected');
  console.log('PASS  re-receiving latest payload does not lose state');
  console.log('\nResult: simulation passed.');
}

run();
