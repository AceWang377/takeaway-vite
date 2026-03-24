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
  updated_at: '2026-03-24T20:00:00.000Z',
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

function run() {
  const clientA = createState(remote.payload, remote.updated_at);
  const clientB = createState(remote.payload, remote.updated_at);

  // A changes payment method from other -> cash and explicitly persists.
  clientA.ordersRef = clientA.ordersRef.map((o) => (
    o.id === 'ord-1' ? { ...o, paymentMethod: 'cash' } : o
  ));
  persistSharedState(clientA, {
    customers: clientA.customersRef,
    orders: clientA.ordersRef,
    expenses: clientA.expensesRef,
    menusByDate: clientA.menusByDateRef,
    settings: clientA.settingsRef,
  }, {}, '2026-03-24T20:05:00.000Z');

  assert(remote.payload.orders[0].paymentMethod === 'cash', 'Explicit order update must persist new payment method to remote');

  // B is stale and later triggers a non-order autosave.
  clientB.menusByDateRef['2026-03-24'] = 'menu-b';
  persistSharedState(clientB, {
    customers: clientB.customersRef,
    orders: clientB.ordersRef, // stale: still other
    expenses: clientB.expensesRef,
    menusByDate: clientB.menusByDateRef,
    settings: clientB.settingsRef,
  }, { preserveRemoteOrders: true }, '2026-03-24T20:10:00.000Z');

  assert(remote.payload.orders[0].paymentMethod === 'cash', 'Non-order autosave must not revert payment method');
  assert(clientB.ordersRef[0].paymentMethod === 'cash', 'Stale client should be reconciled to latest payment method');

  // Stale payload arrives after latest.
  const staleIncoming = {
    payload: {
      ...clone(remote.payload),
      orders: [{ id: 'ord-1', customerId: 'Alice', paymentMethod: 'other', driverId: 'drv-a', routeOrder: 1 }],
    },
    updated_at: '2026-03-24T20:03:00.000Z',
  };
  const acceptedStale = applyIncomingPayload(clientA, staleIncoming);
  assert(acceptedStale === false, 'Client must reject stale payment-method payload');
  assert(clientA.ordersRef[0].paymentMethod === 'cash', 'Rejecting stale payload must preserve payment method');

  console.log('\nPayment method persistence simulation\n');
  console.log('PASS  explicit payment-method update persists to remote');
  console.log('PASS  stale non-order autosave does not revert payment method');
  console.log('PASS  stale client is reconciled to latest payment method');
  console.log('PASS  stale incoming payload is rejected');
  console.log('\nResult: simulation passed.');
}

run();
