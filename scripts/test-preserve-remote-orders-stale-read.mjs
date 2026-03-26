function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function choosePreservedOrders({ latestRemote, lastAppliedUpdatedAt, syncedOrders, currentOrders, nextOrders }) {
  const remoteOrdersAreAuthoritative =
    !!latestRemote?.updated_at &&
    (!lastAppliedUpdatedAt || latestRemote.updated_at >= lastAppliedUpdatedAt);

  return remoteOrdersAreAuthoritative
    ? (latestRemote?.payload?.orders || nextOrders)
    : (syncedOrders || currentOrders || nextOrders);
}

function run() {
  const localLatestOrders = [
    { id: 'ord-1', paymentMethod: 'cash', driverId: 'drv-b', routeOrder: 1 },
    { id: 'ord-2', paymentMethod: 'other', driverId: 'drv-a', routeOrder: 2 },
  ];

  const staleRemote = {
    updated_at: '2026-03-25T09:00:00.000Z',
    payload: {
      orders: [
        { id: 'ord-1', paymentMethod: 'other', driverId: 'drv-a', routeOrder: 2 },
        { id: 'ord-2', paymentMethod: 'other', driverId: 'drv-a', routeOrder: 1 },
      ],
    },
  };

  const chosenFromOldLogic = staleRemote.payload.orders;
  assert(chosenFromOldLogic[0].paymentMethod === 'other', 'Old logic would incorrectly keep stale remote orders');

  const chosenFromFixedLogic = choosePreservedOrders({
    latestRemote: staleRemote,
    lastAppliedUpdatedAt: '2026-03-25T09:05:00.000Z',
    syncedOrders: localLatestOrders,
    currentOrders: localLatestOrders,
    nextOrders: localLatestOrders,
  });

  assert(chosenFromFixedLogic[0].paymentMethod === 'cash', 'Fixed logic must prefer locally known newer orders over stale remote read');
  assert(chosenFromFixedLogic[0].driverId === 'drv-b', 'Fixed logic must preserve newer driver selection');
  assert(chosenFromFixedLogic[0].routeOrder === 1, 'Fixed logic must preserve newer route order');

  const chosenWhenRemoteIsTrulyNewer = choosePreservedOrders({
    latestRemote: {
      updated_at: '2026-03-25T09:10:00.000Z',
      payload: { orders: [{ id: 'ord-1', paymentMethod: 'wechat', driverId: 'drv-c', routeOrder: 3 }] },
    },
    lastAppliedUpdatedAt: '2026-03-25T09:05:00.000Z',
    syncedOrders: localLatestOrders,
    currentOrders: localLatestOrders,
    nextOrders: localLatestOrders,
  });

  assert(chosenWhenRemoteIsTrulyNewer[0].paymentMethod === 'wechat', 'When remote is truly newer, preserveRemoteOrders should accept remote orders');

  console.log('\nPreserve-remote-orders stale-read simulation\n');
  console.log('PASS  old logic would have reused stale remote orders');
  console.log('PASS  fixed logic preserves locally known newer orders when remote read is older');
  console.log('PASS  fixed logic still accepts truly newer remote orders');
  console.log('\nResult: simulation passed.');
}

run();
