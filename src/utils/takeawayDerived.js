export function buildCustomerStats(orders, customers, customerId) {
  const customer = customers.find((c) => c.customerId === customerId);
  const manualCashHistory = Number(customer?.manualCashHistory || 0);
  const list = orders.filter((o) => o.customerId === customerId);
  const totalQty = list.reduce((s, o) => s + Number(o.qty || 0), 0);
  const cashOrders = list.filter((o) => o.paymentMethod === 'cash' && !o.isFreeMeal).length + manualCashHistory;
  const usedFreeMeals = list.filter((o) => o.isFreeMeal).length;
  const earnedFreeMeals = Math.floor(cashOrders / 10);
  const availableFreeMeals = Math.max(earnedFreeMeals - usedFreeMeals, 0);
  return { totalQty, cashOrders, usedFreeMeals, earnedFreeMeals, availableFreeMeals, list, manualCashHistory };
}

export function buildCustomerRows(customers, customerSearch, orders) {
  const q = customerSearch.trim().toLowerCase();
  const list = q
    ? customers.filter((c) => [c.customerId, c.phone, c.address, c.note].join(' ').toLowerCase().includes(q))
    : customers;

  return list.map((c) => ({
    ...c,
    stats: buildCustomerStats(orders, customers, c.customerId),
  }));
}

export function buildDashboard(filteredOrders, drivers, driverMap) {
  const byDriver = {};
  (drivers || []).forEach((d) => {
    byDriver[d.id] = { driverId: d.id, driverName: d.name, rate: Number(d.rate || 0), orders: 0, qty: 0, fee: 0 };
  });

  const stats = {
    totalOrders: filteredOrders.length,
    totalQty: filteredOrders.reduce((s, o) => s + Number(o.qty || 0), 0),
    revenue: filteredOrders.reduce((s, o) => s + Number(o.amount || 0), 0),
    freeMeals: filteredOrders.filter((o) => o.isFreeMeal).length,
    byPayment: {
      cash: { count: 0, amount: 0 },
      wechat: { count: 0, amount: 0 },
      transfer: { count: 0, amount: 0 },
      other: { count: 0, amount: 0 },
    },
    byDriver,
  };

  filteredOrders.forEach((o) => {
    if (stats.byPayment[o.paymentMethod]) {
      stats.byPayment[o.paymentMethod].count += 1;
      stats.byPayment[o.paymentMethod].amount += Number(o.amount || 0);
    }

    if (o.driverId) {
      if (!stats.byDriver[o.driverId]) {
        stats.byDriver[o.driverId] = {
          driverId: o.driverId,
          driverName: driverMap[o.driverId]?.name || '未命名司机',
          rate: Number(driverMap[o.driverId]?.rate || 0),
          orders: 0,
          qty: 0,
          fee: 0,
        };
      }
      stats.byDriver[o.driverId].orders += 1;
      stats.byDriver[o.driverId].qty += Number(o.qty || 0);
    }
  });

  Object.values(stats.byDriver).forEach((row) => {
    row.fee = Number(row.qty || 0) * Number(row.rate || 0);
  });

  return stats;
}

export function buildCashflow(orders, expenses, settings) {
  const incomeCash = orders.filter((o) => o.paymentMethod === 'cash').reduce((s, o) => s + Number(o.amount || 0), 0);
  const incomeAccount = orders.filter((o) => o.paymentMethod !== 'cash').reduce((s, o) => s + Number(o.amount || 0), 0);
  const cashExpense = expenses.filter((x) => x.channel === 'cash').reduce((s, x) => s + Number(x.amount || 0), 0);
  const accountExpense = expenses.filter((x) => x.channel === 'account').reduce((s, x) => s + Number(x.amount || 0), 0);

  return {
    incomeCash,
    incomeAccount,
    cashExpense,
    accountExpense,
    cashLeft: Number(settings.initialCash || 0) + incomeCash - cashExpense,
    accountLeft: Number(settings.initialAccount || 0) + incomeAccount - accountExpense,
  };
}
