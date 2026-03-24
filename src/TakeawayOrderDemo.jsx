import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const todayStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const uid = () => Math.random().toString(36).slice(2, 10);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SHARED_DOC_ID = 'takeaway-demo-shared';
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const serializePayload = (payload) => JSON.stringify(payload);

function getISOWeek(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstDayNr = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3);
  const week = 1 + Math.round((target - firstThursday) / (7 * 24 * 3600 * 1000));
  return week;
}

function fmtMoney(n) {
  return `£${Number(n || 0).toFixed(2)}`;
}

function getDriverColorClass(index) {
  const colors = ['bg-yellow-50', 'bg-green-50', 'bg-blue-50', 'bg-purple-50', 'bg-pink-50', 'bg-cyan-50'];
  return colors[index % colors.length] || 'bg-white';
}

const seedCustomers = [
  {
    id: 'cust-1',
    customerId: 'Die Freiheit',
    phone: '07731591655',
    address: 'Westpoint',
    note: '常点餐',
    manualCashHistory: 8,
  },
  {
    id: 'cust-2',
    customerId: 'sunshine',
    phone: '07708253264',
    address: 'ELTC S3 7LG',
    note: '',
    manualCashHistory: 0,
  },
];

const seedSettings = {
  mealPrice: 10,
  initialCash: 0,
  initialAccount: 0,
  drivers: [
    { id: 'drv-a', name: '司机A', rate: 1.2 },
    { id: 'drv-b', name: '司机B', rate: 1.2 },
    { id: 'drv-c', name: '司机C', rate: 1.2 },
  ],
};

const seedOrders = [
  {
    id: uid(),
    date: todayStr(),
    year: new Date().getFullYear(),
    week: getISOWeek(todayStr()),
    customerId: 'Die Freiheit',
    address: 'Westpoint',
    phone: '07731591655',
    qty: 1,
    note: '常规订单',
    paymentMethod: 'cash',
    driverId: 'drv-a',
    isTemp: false,
    paymentDone: false,
    menu: '宫保鸡丁 + 米饭',
    amount: 10,
    isFreeMeal: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: uid(),
    date: todayStr(),
    year: new Date().getFullYear(),
    week: getISOWeek(todayStr()),
    customerId: '临时客人A',
    address: 'Victoria House',
    phone: '07536210686',
    qty: 1,
    note: '临时加单',
    paymentMethod: 'other',
    driverId: 'drv-b',
    isTemp: true,
    paymentDone: false,
    menu: '照烧鸡排饭',
    amount: 10,
    isFreeMeal: false,
    createdAt: new Date().toISOString(),
  },
];

const seedExpenses = [
  {
    id: uid(),
    date: todayStr(),
    type: 'material',
    channel: 'account',
    amount: 35,
    note: '今日采购',
  },
  {
    id: uid(),
    date: todayStr(),
    type: 'delivery',
    channel: 'cash',
    amount: 15,
    note: '司机配送费',
  },
];

const TABS = [
  ['orders', '录单'],
  ['todayOrders', '今日订单'],
  ['customers', '客户库'],
  ['dashboard', '统计'],
  ['cashflow', '现金流'],
  ['driver', '司机端'],
  ['settings', '设置'],
];

export default function TakeawayOrderDemo() {
  const [activeTab, setActiveTab] = useState('orders');
  const [customers, setCustomers] = useState(seedCustomers);
  const [orders, setOrders] = useState(seedOrders);
  const [expenses, setExpenses] = useState(seedExpenses);
  const [menusByDate, setMenusByDate] = useState({ [todayStr()]: '宫保鸡丁 + 米饭' });
  const [settings, setSettings] = useState(seedSettings);
  const [filters, setFilters] = useState({ from: todayStr(), to: todayStr() });
  const [todayOrdersDate, setTodayOrdersDate] = useState(todayStr());
  const [todayDriverFilter, setTodayDriverFilter] = useState('all');
  const [driverPageFilter, setDriverPageFilter] = useState('all');
  const [driverViewMode, setDriverViewMode] = useState('admin');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverRate, setNewDriverRate] = useState('1.2');
  const [syncError, setSyncError] = useState('');
  const [syncReady, setSyncReady] = useState(false);
  const saveTimerRef = useRef(null);
  const lastSyncedRef = useRef('');
  const pendingLocalSyncRef = useRef('');
  const orderMutationLockUntilRef = useRef(0);
  const ordersRef = useRef(seedOrders);
  const customersRef = useRef(seedCustomers);
  const expensesRef = useRef(seedExpenses);
  const menusByDateRef = useRef({ [todayStr()]: '宫保鸡丁 + 米饭' });
  const settingsRef = useRef(seedSettings);
  const syncedPayloadRef = useRef(null);
  const lastAppliedUpdatedAtRef = useRef('');

  useEffect(() => {
    let alive = true;

    async function bootSharedState() {
      if (!supabase) {
        setSyncError('未配置 Supabase（请设置 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY）');
        return;
      }

      const { data, error } = await supabase
        .from('takeaway_shared_state')
        .select('payload, updated_at')
        .eq('id', SHARED_DOC_ID)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        setSyncError(`读取 Supabase 失败：${error.message}`);
        return;
      }

      if (data?.payload) {
        customersRef.current = data.payload.customers || seedCustomers;
        ordersRef.current = data.payload.orders || seedOrders;
        expensesRef.current = data.payload.expenses || seedExpenses;
        menusByDateRef.current = data.payload.menusByDate || { [todayStr()]: '宫保鸡丁 + 米饭' };
        settingsRef.current = data.payload.settings || seedSettings;
        setCustomers(data.payload.customers || seedCustomers);
        setOrders(data.payload.orders || seedOrders);
        setExpenses(data.payload.expenses || seedExpenses);
        setMenusByDate(data.payload.menusByDate || { [todayStr()]: '宫保鸡丁 + 米饭' });
        setSettings(data.payload.settings || seedSettings);
        syncedPayloadRef.current = data.payload;
        lastAppliedUpdatedAtRef.current = data.updated_at || '';
        lastSyncedRef.current = serializePayload(data.payload);
      } else {
        const payload = {
          customers: seedCustomers,
          orders: seedOrders,
          expenses: seedExpenses,
          menusByDate: { [todayStr()]: '宫保鸡丁 + 米饭' },
          settings: seedSettings,
        };
        const { error: insertError } = await supabase
          .from('takeaway_shared_state')
          .upsert({ id: SHARED_DOC_ID, payload, updated_at: new Date().toISOString() });
        if (insertError) {
          setSyncError(`初始化 Supabase 失败：${insertError.message}`);
          return;
        }
        syncedPayloadRef.current = payload;
        lastAppliedUpdatedAtRef.current = new Date().toISOString();
        lastSyncedRef.current = serializePayload(payload);
      }

      setSyncReady(true);
    }

    bootSharedState();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!supabase || !syncReady) return;
    const channel = supabase
      .channel('takeaway-shared-state')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'takeaway_shared_state', filter: `id=eq.${SHARED_DOC_ID}` }, (payload) => {
        const next = payload?.new?.payload;
        const nextUpdatedAt = payload?.new?.updated_at || '';
        if (!next) return;
        if (nextUpdatedAt && lastAppliedUpdatedAtRef.current && nextUpdatedAt <= lastAppliedUpdatedAtRef.current) return;
        const serialized = serializePayload(next);
        if (serialized === lastSyncedRef.current) return;
        if (Date.now() < orderMutationLockUntilRef.current && serialized !== pendingLocalSyncRef.current) return;
        lastSyncedRef.current = serialized;
        lastAppliedUpdatedAtRef.current = nextUpdatedAt;
        pendingLocalSyncRef.current = '';
        customersRef.current = next.customers || seedCustomers;
        ordersRef.current = next.orders || seedOrders;
        expensesRef.current = next.expenses || seedExpenses;
        menusByDateRef.current = next.menusByDate || { [todayStr()]: '宫保鸡丁 + 米饭' };
        settingsRef.current = next.settings || seedSettings;
        setCustomers(next.customers || seedCustomers);
        setOrders(next.orders || seedOrders);
        setExpenses(next.expenses || seedExpenses);
        setMenusByDate(next.menusByDate || { [todayStr()]: '宫保鸡丁 + 米饭' });
        setSettings(next.settings || seedSettings);
        syncedPayloadRef.current = next;
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [syncReady]);

  useEffect(() => {
    if (!supabase || !syncReady) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      const nextState = {
        customers: customersRef.current,
        orders: ordersRef.current,
        expenses: expensesRef.current,
        menusByDate: menusByDateRef.current,
        settings: settingsRef.current,
      };
      const serialized = serializePayload({
        customers: nextState.customers,
        orders: syncedPayloadRef.current?.orders || nextState.orders,
        expenses: nextState.expenses,
        menusByDate: nextState.menusByDate,
        settings: nextState.settings,
      });
      if (serialized === lastSyncedRef.current) return;

      await persistSharedState(nextState, { preserveRemoteOrders: true });
      pendingLocalSyncRef.current = '';
    }, 350);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [customers, expenses, menusByDate, settings, syncReady]);

  const [orderForm, setOrderForm] = useState({
    date: todayStr(),
    customerId: '',
    address: '',
    phone: '',
    qty: 1,
    note: '',
    isTemp: false,
    driverId: seedSettings.drivers[0].id,
  });

  const [customerSearch, setCustomerSearch] = useState('');
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editingCustomerRowId, setEditingCustomerRowId] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    date: todayStr(),
    type: 'material',
    channel: 'account',
    amount: '',
    note: '',
  });

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    customersRef.current = customers;
  }, [customers]);

  useEffect(() => {
    expensesRef.current = expenses;
  }, [expenses]);

  useEffect(() => {
    menusByDateRef.current = menusByDate;
  }, [menusByDate]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const driverMap = useMemo(() => {
    const map = {};
    (settings.drivers || []).forEach((d, index) => {
      map[d.id] = { ...d, colorClass: getDriverColorClass(index) };
    });
    return map;
  }, [settings.drivers]);

  const matchingCustomers = useMemo(() => {
    const q = (orderForm.customerId || orderForm.phone || '').trim().toLowerCase();
    if (!q) return [];
    return customers.filter((c) => [c.customerId, c.phone, c.address, c.note].join(' ').toLowerCase().includes(q));
  }, [customers, orderForm.customerId, orderForm.phone]);

  function getCustomerByName(customerId) {
    return customers.find((c) => c.customerId === customerId);
  }

  function getCustomerStats(customerId) {
    const customer = getCustomerByName(customerId);
    const manualCashHistory = Number(customer?.manualCashHistory || 0);
    const list = orders.filter((o) => o.customerId === customerId);
    const totalQty = list.reduce((s, o) => s + Number(o.qty || 0), 0);
    const cashOrders = list.filter((o) => o.paymentMethod === 'cash' && !o.isFreeMeal).length + manualCashHistory;
    const usedFreeMeals = list.filter((o) => o.isFreeMeal).length;
    const earnedFreeMeals = Math.floor(cashOrders / 10);
    const availableFreeMeals = Math.max(earnedFreeMeals - usedFreeMeals, 0);
    return { totalQty, cashOrders, usedFreeMeals, earnedFreeMeals, availableFreeMeals, list, manualCashHistory };
  }

  const selectedCustomerStats = useMemo(() => getCustomerStats(orderForm.customerId), [orders, customers, orderForm.customerId]);

  function ensureCustomerExists(form) {
    const exists = customers.find((c) => c.customerId === form.customerId);
    if (exists) {
      const updated = { ...exists, address: form.address, phone: form.phone, note: form.note };
      setCustomers((prev) => prev.map((c) => (c.id === exists.id ? updated : c)));
      return updated;
    }
    const next = {
      id: uid(),
      customerId: form.customerId,
      address: form.address,
      phone: form.phone,
      note: form.note,
      manualCashHistory: 0,
    };
    setCustomers((prev) => [next, ...prev]);
    return next;
  }

  function fillFromCustomer(c) {
    setOrderForm((f) => ({ ...f, customerId: c.customerId, address: c.address || '', phone: c.phone || '', note: c.note || '' }));
  }

  function refreshFreeMealStatus(nextOrders, customerState = customers, currentSettings = settings) {
    const groups = {};
    const computedById = new Map();
    const sorted = [...nextOrders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    sorted.forEach((o) => {
      const customerKey = o.customerId;
      if (!groups[customerKey]) {
        const customer = customerState.find((c) => c.customerId === customerKey);
        groups[customerKey] = {
          cashPaidCount: Number(customer?.manualCashHistory || 0),
          freeUsedCount: 0,
        };
      }
      const stats = groups[customerKey];
      let isFreeMeal = false;
      if (o.paymentMethod === 'cash') {
        const availableBefore = Math.floor(stats.cashPaidCount / 10) - stats.freeUsedCount;
        if (availableBefore > 0) {
          isFreeMeal = true;
          stats.freeUsedCount += 1;
        } else {
          stats.cashPaidCount += 1;
        }
      }
      computedById.set(o.id, {
        isFreeMeal,
        amount: isFreeMeal ? 0 : Number(currentSettings.mealPrice) * Number(o.qty || 1),
      });
    });

    return nextOrders.map((o) => ({
      ...o,
      ...(computedById.get(o.id) || { isFreeMeal: false, amount: Number(currentSettings.mealPrice) * Number(o.qty || 1) }),
    }));
  }

  function applyOrders(nextOrders, customerState = customers, currentSettings = settings) {
    return normalizeRouteOrders(refreshFreeMealStatus(nextOrders, customerState, currentSettings));
  }

  function buildSharedState(overrides = {}) {
    return {
      customers: overrides.customers ?? customersRef.current,
      orders: overrides.orders ?? ordersRef.current,
      expenses: overrides.expenses ?? expensesRef.current,
      menusByDate: overrides.menusByDate ?? menusByDateRef.current,
      settings: overrides.settings ?? settingsRef.current,
    };
  }

  async function fetchLatestSharedPayload() {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('takeaway_shared_state')
      .select('payload, updated_at')
      .eq('id', SHARED_DOC_ID)
      .maybeSingle();

    if (error) {
      setSyncError(`读取 Supabase 失败：${error.message}`);
      return null;
    }

    return data || null;
  }

  async function persistSharedState(nextState, options = {}) {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!supabase) return;

    const { preserveRemoteOrders = false } = options;
    const latestRemote = await fetchLatestSharedPayload();
    const writeUpdatedAt = new Date().toISOString();
    const payload = {
      customers: nextState.customers,
      orders: preserveRemoteOrders ? (latestRemote?.payload?.orders || nextState.orders) : nextState.orders,
      expenses: nextState.expenses,
      menusByDate: nextState.menusByDate,
      settings: nextState.settings,
    };
    const serialized = serializePayload(payload);
    pendingLocalSyncRef.current = serialized;
    lastSyncedRef.current = serialized;
    lastAppliedUpdatedAtRef.current = writeUpdatedAt;
    syncedPayloadRef.current = payload;
    const { error } = await supabase
      .from('takeaway_shared_state')
      .upsert({ id: SHARED_DOC_ID, payload, updated_at: writeUpdatedAt });
    if (error) {
      setSyncError(`保存 Supabase 失败：${error.message}`);
    } else {
      if (preserveRemoteOrders) {
        customersRef.current = payload.customers;
        expensesRef.current = payload.expenses;
        menusByDateRef.current = payload.menusByDate;
        settingsRef.current = payload.settings;
        syncedPayloadRef.current = {
          ...payload,
          orders: syncedPayloadRef.current?.orders || ordersRef.current,
        };
        setCustomers(payload.customers);
        setExpenses(payload.expenses);
        setMenusByDate(payload.menusByDate);
        setSettings(payload.settings);
      }
      pendingLocalSyncRef.current = '';
      setSyncError('');
    }
  }

  function sortOrdersForRoute(list) {
    return [...list].sort((a, b) => {
      const ao = Number(a.routeOrder ?? Number.MAX_SAFE_INTEGER);
      const bo = Number(b.routeOrder ?? Number.MAX_SAFE_INTEGER);
      if (ao !== bo) return ao - bo;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  function normalizeRouteOrders(list) {
    const routeOrderMap = new Map();
    const dates = [...new Set(list.map((order) => order.date))];

    dates.forEach((date) => {
      const dayOrders = sortOrdersForRoute(list.filter((order) => order.date === date));
      dayOrders.forEach((order, index) => {
        routeOrderMap.set(order.id, index + 1);
      });
    });

    return list.map((order) => ({
      ...order,
      routeOrder: routeOrderMap.get(order.id) ?? Number(order.routeOrder ?? 1),
    }));
  }

  function reorderDayByIds(list, date, orderedIds) {
    const routeOrderMap = new Map(orderedIds.map((id, index) => [id, index + 1]));
    return list.map((order) => (
      order.date === date && routeOrderMap.has(order.id)
        ? { ...order, routeOrder: routeOrderMap.get(order.id) }
        : order
    ));
  }

  function moveIdInList(ids, targetId, direction) {
    const index = ids.findIndex((id) => id === targetId);
    if (index < 0) return ids;
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= ids.length) return ids;
    const nextIds = [...ids];
    [nextIds[index], nextIds[nextIndex]] = [nextIds[nextIndex], nextIds[index]];
    return nextIds;
  }

  async function saveOrder(e) {
    e.preventDefault();
    if (!orderForm.customerId || !orderForm.address || !orderForm.phone) return;

    const savedDate = orderForm.date;
    const nextCustomer = ensureCustomerExists(orderForm);
    const nextCustomers = customers.some((c) => c.id === nextCustomer.id)
      ? customers.map((c) => (c.id === nextCustomer.id ? nextCustomer : c))
      : [nextCustomer, ...customers];

    const existingOrder = orders.find((o) => o.id === editingOrderId);
    const nextRouteOrder = existingOrder?.routeOrder
      || (orders.filter((o) => o.date === orderForm.date).reduce((max, o) => Math.max(max, Number(o.routeOrder || 0)), 0) + 1);

    const record = {
      id: editingOrderId || uid(),
      date: orderForm.date,
      year: new Date(orderForm.date).getFullYear(),
      week: getISOWeek(orderForm.date),
      customerId: orderForm.customerId,
      address: orderForm.address,
      phone: orderForm.phone,
      qty: Number(orderForm.qty || 1),
      note: orderForm.note,
      paymentMethod: existingOrder?.paymentMethod || 'other',
      driverId: orderForm.driverId,
      isTemp: orderForm.isTemp,
      paymentDone: existingOrder?.paymentDone || false,
      menu: menusByDate[orderForm.date] || '',
      amount: Number(settings.mealPrice) * Number(orderForm.qty || 1),
      isFreeMeal: false,
      createdAt: existingOrder?.createdAt || new Date().toISOString(),
      routeOrder: nextRouteOrder,
    };

    const nextOrders = applyOrders(
      editingOrderId ? orders.map((o) => (o.id === editingOrderId ? record : o)) : [...orders, record],
      nextCustomers,
      settings
    );

    const nextState = buildSharedState({ customers: nextCustomers, orders: nextOrders });

    orderMutationLockUntilRef.current = Date.now() + 3000;
    customersRef.current = nextCustomers;
    ordersRef.current = nextOrders;
    setCustomers(nextCustomers);
    ordersRef.current = nextOrders;
    setOrders(nextOrders);
    setTodayOrdersDate(savedDate);
    setTodayDriverFilter('all');
    setActiveTab('todayOrders');
    setEditingOrderId(null);
    setOrderForm((prev) => ({
      ...prev,
      customerId: '',
      address: '',
      phone: '',
      qty: 1,
      note: '',
      isTemp: false,
      driverId: settings.drivers?.[0]?.id || '',
    }));

    await persistSharedState(nextState);
  }

  async function updateOrder(id, patch) {
    const latestRemote = await fetchLatestSharedPayload();
    const baseOrders = latestRemote?.payload?.orders || ordersRef.current;
    const localCurrent = ordersRef.current.find((o) => o.id === id);
    const nextOrders = applyOrders(baseOrders.map((o) => {
      if (o.id !== id) return o;
      return {
        ...o,
        routeOrder: localCurrent?.routeOrder ?? o.routeOrder,
        ...patch,
      };
    }), customers, settings);
    const nextState = buildSharedState({ orders: nextOrders });

    orderMutationLockUntilRef.current = Date.now() + 3000;
    ordersRef.current = nextOrders;
    setOrders(nextOrders);

    await persistSharedState(nextState);
  }

  function editOrder(order) {
    setEditingOrderId(order.id);
    setOrderForm({
      date: order.date,
      customerId: order.customerId || '',
      address: order.address || '',
      phone: order.phone || '',
      qty: Number(order.qty || 1),
      note: order.note || '',
      isTemp: Boolean(order.isTemp),
      driverId: order.driverId || settings.drivers?.[0]?.id || '',
    });
    setActiveTab('orders');
  }

  async function deleteOrder(id) {
    const nextOrders = normalizeRouteOrders(orders.filter((o) => o.id !== id));
    const payload = buildSharedState({ orders: nextOrders });
    const serialized = serializePayload(payload);

    orderMutationLockUntilRef.current = Date.now() + 3000;
    pendingLocalSyncRef.current = serialized;
    lastSyncedRef.current = serialized;

    setOrders(nextOrders);
    if (editingOrderId === id) setEditingOrderId(null);

    if (!supabase) return;

    const { error } = await supabase
      .from('takeaway_shared_state')
      .upsert({ id: SHARED_DOC_ID, payload, updated_at: new Date().toISOString() });

    if (error) {
      setSyncError(`保存 Supabase 失败：${error.message}`);
      pendingLocalSyncRef.current = '';
    } else {
      setSyncError('');
      pendingLocalSyncRef.current = '';
    }
  }

  function updateCustomerManualCash(customerId, value) {
    const nextCustomers = customers.map((c) => (c.customerId === customerId ? { ...c, manualCashHistory: Number(value || 0) } : c));
    customersRef.current = nextCustomers;
    setCustomers(nextCustomers);
    setOrders((prev) => { const next = applyOrders(prev, nextCustomers); ordersRef.current = next; return next; });
  }

  function updateCustomer(rowId, patch) {
    const existing = customers.find((c) => c.id === rowId);
    if (!existing) return;
    const oldCustomerId = existing.customerId;
    const nextCustomerId = patch.customerId ?? existing.customerId;
    const nextPhone = patch.phone ?? existing.phone;
    const nextAddress = patch.address ?? existing.address;
    const nextNote = patch.note ?? existing.note;
    const nextCustomers = customers.map((c) => (
      c.id === existing.id
        ? { ...c, customerId: nextCustomerId, phone: nextPhone, address: nextAddress, note: nextNote }
        : c
    ));
    customersRef.current = nextCustomers;
    setCustomers(nextCustomers);
    setOrders((prev) => { const next = applyOrders(prev.map((o) => (
      o.customerId === oldCustomerId
        ? { ...o, customerId: nextCustomerId, phone: nextPhone, address: nextAddress, note: o.note === existing.note ? nextNote : o.note }
        : o
    )), nextCustomers); ordersRef.current = next; return next; });
  }

  function deleteCustomer(rowId) {
    const existing = customers.find((c) => c.id === rowId);
    if (!existing) return;
    const nextCustomers = customers.filter((c) => c.id !== rowId);
    customersRef.current = nextCustomers;
    setCustomers(nextCustomers);
    setOrders((prev) => { const next = prev.filter((o) => o.customerId !== existing.customerId); ordersRef.current = next; return next; });
    if (editingCustomerRowId === rowId) setEditingCustomerRowId(null);
  }

  function addDriver() {
    const name = newDriverName.trim();
    if (!name) return;
    const exists = (settings.drivers || []).some((d) => d.name === name);
    if (exists) return;
    const nextDrivers = [...(settings.drivers || []), { id: uid(), name, rate: Number(newDriverRate || 0) }];
    setSettings((prev) => ({ ...prev, drivers: nextDrivers }));
    setNewDriverName('');
    setNewDriverRate('1.2');
  }

  function renameDriver(driverId, name) {
    setSettings((prev) => ({
      ...prev,
      drivers: prev.drivers.map((d) => (d.id === driverId ? { ...d, name } : d)),
    }));
  }

  function updateDriverRate(driverId, rate) {
    setSettings((prev) => ({
      ...prev,
      drivers: prev.drivers.map((d) => (d.id === driverId ? { ...d, rate: Number(rate || 0) } : d)),
    }));
  }

  function removeDriver(driverId) {
    if ((settings.drivers || []).length <= 1) return;
    const nextDrivers = settings.drivers.filter((d) => d.id !== driverId);
    const fallbackId = nextDrivers[0]?.id || '';
    setSettings((prev) => ({ ...prev, drivers: nextDrivers }));
    setOrders((prev) => { const next = prev.map((o) => (o.driverId === driverId ? { ...o, driverId: fallbackId } : o)); ordersRef.current = next; return next; });
    setOrderForm((prev) => ({ ...prev, driverId: prev.driverId === driverId ? fallbackId : prev.driverId }));
    if (todayDriverFilter === driverId) setTodayDriverFilter('all');
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => (!filters.from || o.date >= filters.from) && (!filters.to || o.date <= filters.to));
  }, [orders, filters]);

  const dashboard = useMemo(() => {
    const byDriver = {};
    (settings.drivers || []).forEach((d) => {
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
          stats.byDriver[o.driverId] = { driverId: o.driverId, driverName: driverMap[o.driverId]?.name || '未命名司机', rate: Number(driverMap[o.driverId]?.rate || 0), orders: 0, qty: 0, fee: 0 };
        }
        stats.byDriver[o.driverId].orders += 1;
        stats.byDriver[o.driverId].qty += Number(o.qty || 0);
      }
    });

    Object.values(stats.byDriver).forEach((row) => {
      row.fee = Number(row.qty || 0) * Number(row.rate || 0);
    });

    return stats;
  }, [filteredOrders, settings.drivers, driverMap]);

  const currentDayOrders = useMemo(() => {
    const dayOrders = sortOrdersForRoute(orders.filter((o) => o.date === todayOrdersDate));
    return todayDriverFilter === 'all' ? dayOrders : dayOrders.filter((o) => o.driverId === todayDriverFilter);
  }, [orders, todayOrdersDate, todayDriverFilter]);

  const driverOrdersToday = useMemo(() => {
    return sortOrdersForRoute(orders.filter((o) => o.date === todayStr()));
  }, [orders]);

  const visibleDriverOrders = useMemo(() => {
    if (driverViewMode === 'admin') {
      return driverPageFilter === 'all' ? driverOrdersToday : driverOrdersToday.filter((o) => o.driverId === driverPageFilter);
    }
    return driverPageFilter === 'all' ? [] : driverOrdersToday.filter((o) => o.driverId === driverPageFilter);
  }, [driverOrdersToday, driverPageFilter, driverViewMode]);

  const normalDriverOrders = visibleDriverOrders.filter((o) => !o.isTemp);
  const tempDriverOrders = visibleDriverOrders.filter((o) => o.isTemp);

  const cashflow = useMemo(() => {
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
  }, [orders, expenses, settings]);

  window.moveDriverOrder = moveOrder;

  async function moveOrder(orderId, direction) {
    const baseOrders = ordersRef.current;
    const dayOrders = sortOrdersForRoute(baseOrders.filter((order) => order.date === todayOrdersDate));
    const movableOrders = todayDriverFilter === 'all'
      ? dayOrders
      : dayOrders.filter((order) => order.driverId === todayDriverFilter);

    const currentIndex = movableOrders.findIndex((order) => order.id === orderId);
    if (currentIndex < 0) return;

    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= movableOrders.length) return;

    const reorderedMovable = [...movableOrders];
    [reorderedMovable[currentIndex], reorderedMovable[nextIndex]] = [reorderedMovable[nextIndex], reorderedMovable[currentIndex]];
    const reorderedIds = reorderedMovable.map((order) => order.id);

    let pointer = 0;
    const nextDayIds = dayOrders.map((order) => {
      if (todayDriverFilter !== 'all' && order.driverId !== todayDriverFilter) return order.id;
      return reorderedIds[pointer++] ?? order.id;
    });

    const nextOrders = reorderDayByIds(baseOrders, todayOrdersDate, nextDayIds);
    const nextState = { customers, orders: nextOrders, expenses, menusByDate, settings };

    orderMutationLockUntilRef.current = Date.now() + 3000;
    ordersRef.current = nextOrders;
    setOrders(nextOrders);

    await persistSharedState(nextState);
  }

  function writeDriverFeeToCashflow(driverId) {
    const row = dashboard.byDriver[driverId];
    if (!row || row.qty <= 0) return;
    const exists = expenses.some(
      (x) => x.type === 'delivery' && x.date === (filters.to || todayStr()) && x.note === `${row.driverName} 配送费自动写入`
    );
    if (exists) return;
    const nextExpense = {
      id: uid(),
      date: filters.to || todayStr(),
      type: 'delivery',
      channel: 'cash',
      amount: Number(row.fee.toFixed(2)),
      note: `${row.driverName} 配送费自动写入`,
    };
    setExpenses((prev) => [nextExpense, ...prev]);
    setActiveTab('cashflow');
  }

  async function resetDemo() {
    if (!window.confirm('确定清空并恢复演示数据？')) return;

    const payload = {
      customers: seedCustomers,
      orders: seedOrders,
      expenses: seedExpenses,
      menusByDate: { [todayStr()]: '宫保鸡丁 + 米饭' },
      settings: seedSettings,
    };

    if (supabase) {
      const { error } = await supabase
        .from('takeaway_shared_state')
        .upsert({ id: SHARED_DOC_ID, payload, updated_at: new Date().toISOString() });
      if (error) {
        setSyncError(`重置失败：${error.message}`);
        return;
      }
    }

    lastSyncedRef.current = serializePayload(payload);
    setCustomers(payload.customers);
    setOrders(payload.orders);
    setExpenses(payload.expenses);
    setMenusByDate(payload.menusByDate);
    setSettings(payload.settings);
  }

  const customerRows = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    const list = q ? customers.filter((c) => [c.customerId, c.phone, c.address, c.note].join(' ').toLowerCase().includes(q)) : customers;
    return list.map((c) => ({ ...c, stats: getCustomerStats(c.customerId) }));
  }, [customers, customerSearch, orders]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">中餐外卖录单 Demo</h1>
            <p className="text-sm text-slate-600">已切换 Supabase 共享存储，支持多人同步数据。</p>
            <p className="text-xs mt-1 text-slate-500">{syncError ? `⚠️ ${syncError}` : (syncReady ? '✅ Supabase 已连接（自动同步已开启）' : '正在连接 Supabase…')}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 rounded-xl border ${activeTab === key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-300'}`}
              >
                {label}
              </button>
            ))}
</div>
        </div>

        {activeTab === 'orders' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl shadow p-5">
              <h2 className="font-semibold text-lg mb-4">订单输入</h2>
              <form onSubmit={saveOrder} className="space-y-4">
                <div className="grid md:grid-cols-3 gap-3">
                  <Field label="日期"><input type="date" value={orderForm.date} onChange={(e) => setOrderForm({ ...orderForm, date: e.target.value })} className="w-full rounded-lg border p-2" /></Field>
                  <ReadOnlyField label="年份" value={new Date(orderForm.date).getFullYear()} />
                  <ReadOnlyField label="周数" value={getISOWeek(orderForm.date)} />
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="客人ID / 名称"><input value={orderForm.customerId} onChange={(e) => setOrderForm({ ...orderForm, customerId: e.target.value })} className="w-full rounded-lg border p-2" placeholder="输入姓名、微信名等" /></Field>
                  <Field label="联系电话"><input value={orderForm.phone} onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })} className="w-full rounded-lg border p-2" placeholder="07..." /></Field>
                </div>

                {matchingCustomers.length > 0 && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                    <div className="font-medium mb-2">自动匹配到客户</div>
                    <div className="space-y-2">
                      {matchingCustomers.slice(0, 5).map((c) => (
                        <button key={c.id} type="button" onClick={() => fillFromCustomer(c)} className="w-full text-left rounded-lg border bg-white p-2 hover:bg-slate-50">
                          <div className="font-medium">{c.customerId}</div>
                          <div className="text-sm text-slate-600">{c.phone} · {c.address}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Field label="客人地址"><input value={orderForm.address} onChange={(e) => setOrderForm({ ...orderForm, address: e.target.value })} className="w-full rounded-lg border p-2" placeholder="公寓地址 / 门牌" /></Field>

                <div className="grid md:grid-cols-3 gap-3">
                  <Field label="订餐数量"><input type="number" min="1" value={orderForm.qty} onChange={(e) => setOrderForm({ ...orderForm, qty: e.target.value })} className="w-full rounded-lg border p-2" /></Field>
                  <Field label="分配司机">
                    <select value={orderForm.driverId} onChange={(e) => setOrderForm({ ...orderForm, driverId: e.target.value })} className="w-full rounded-lg border p-2">
                      {(settings.drivers || []).map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
                    </select>
                  </Field>
                  <label className="flex items-center gap-2 rounded-xl border p-3 bg-slate-50 mt-6">
                    <input type="checkbox" checked={orderForm.isTemp} onChange={(e) => setOrderForm({ ...orderForm, isTemp: e.target.checked })} />
                    <span>临时订餐客人</span>
                  </label>
                </div>

                <Field label="特别备注"><textarea value={orderForm.note} onChange={(e) => setOrderForm({ ...orderForm, note: e.target.value })} className="w-full rounded-lg border p-2 min-h-24" placeholder="少饭、加辣、房号、临时加单说明..." /></Field>

                <div className="flex items-center justify-between rounded-xl bg-slate-100 p-3">
                  <div>
                    <div className="text-sm text-slate-600">订单金额</div>
                    <div className="text-xl font-bold">{fmtMoney(Number(settings.mealPrice) * Number(orderForm.qty || 1))}</div>
                    <div className="text-xs text-slate-500 mt-1">支付方式请在"今日订单"页面确认，统计与免餐会同步更新。</div>
                  </div>
                  <button type="submit" className="px-5 py-3 rounded-xl bg-slate-900 text-white">{editingOrderId ? '更新订单' : '保存订单'}</button>
                </div>
              </form>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow p-5">
                <h3 className="font-semibold mb-3">客户即时信息</h3>
                {orderForm.customerId ? (
                  <div className="space-y-2 text-sm">
                    <InfoRow label="客人">{orderForm.customerId}</InfoRow>
                    <InfoRow label="历史订餐数量">{selectedCustomerStats.totalQty}</InfoRow>
                    <InfoRow label="手动现金历史">{selectedCustomerStats.manualCashHistory}</InfoRow>
                    <InfoRow label="现金付费订单数">{selectedCustomerStats.cashOrders}</InfoRow>
                    <InfoRow label="已用免餐">{selectedCustomerStats.usedFreeMeals}</InfoRow>
                    <InfoRow label="可用免餐"><span className={selectedCustomerStats.availableFreeMeals > 0 ? 'text-emerald-600 font-semibold' : ''}>{selectedCustomerStats.availableFreeMeals}</span></InfoRow>
                  </div>
                ) : <div className="text-sm text-slate-500">输入客户名称后，这里会显示历史数据和免餐资格。</div>}
              </div>

              <div className="bg-white rounded-2xl shadow p-5">
                <h3 className="font-semibold mb-3">录单说明</h3>
                <div className="text-sm text-slate-600 space-y-2">
                  <div>1. 客服只录入已在微信确认过的订单。</div>
                  <div>2. 支付方式统一在"今日订单"页面确认。</div>
                  <div>3. 录单时可直接分配司机。</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'todayOrders' && (
          <div className="bg-white rounded-2xl shadow p-5 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-semibold text-lg">今日订单列表</h2>
                <div className="text-sm text-slate-500">在这里确认支付方式、调整顺序、筛选司机。不同司机订单用不同背景色区分。</div>
              </div>
              <div className="flex gap-3 items-end flex-wrap">
                <Field label="查看日期"><input type="date" value={todayOrdersDate} onChange={(e) => setTodayOrdersDate(e.target.value)} className="rounded-lg border p-2" /></Field>
                <div>
                  <div className="text-sm text-slate-600 mb-1">按司机筛选</div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setTodayDriverFilter('all')} className={`px-3 py-2 rounded-lg border ${todayDriverFilter === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white'}`}>全部</button>
                    {(settings.drivers || []).map((driver, index) => (
                      <button
                        key={driver.id}
                        onClick={() => setTodayDriverFilter(driver.id)}
                        className={`px-3 py-2 rounded-lg border ${todayDriverFilter === driver.id ? 'bg-slate-900 text-white border-slate-900' : `${getDriverColorClass(index)} border-slate-300`}`}
                      >
                        {driver.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left">
                    <th className="py-2 px-3">顺序</th>
                    <th className="py-2 px-3">客户</th>
                    <th className="py-2 px-3">司机</th>
                    <th className="py-2 px-3">数量</th>
                    <th className="py-2 px-3">地址</th>
                    <th className="py-2 px-3">电话</th>
                    <th className="py-2 px-3">备注</th>
                    <th className="py-2 px-3">支付方式</th>
                    <th className="py-2 px-3">调整</th>
                    <th className="py-2 px-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDayOrders.map((o, index) => {
                    const driver = driverMap[o.driverId];
                    return (
                      <tr key={o.id} className={`border-b ${o.isTemp ? 'bg-orange-50' : driver?.colorClass || 'bg-white'}`}>
                        <td className="py-2 px-3">{index + 1}</td>
                        <td className="py-2 px-3 font-medium"><div className="flex items-center gap-2"><span>{o.customerId}</span>{o.isFreeMeal && <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700">免餐</span>}</div></td>
                        <td className="py-2 px-3">
                          <select value={o.driverId || ''} onChange={(e) => updateOrder(o.id, { driverId: e.target.value })} className="rounded border p-1 bg-white">
                            {(settings.drivers || []).map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
                          </select>
                        </td>
                        <td className="py-2 px-3">x{o.qty}</td>
                        <td className="py-2 px-3">{o.address}</td>
                        <td className="py-2 px-3">{o.phone}</td>
                        <td className="py-2 px-3">{o.note || '-'}</td>
                        <td className="py-2 px-3">
                          <select value={o.paymentMethod} onChange={(e) => updateOrder(o.id, { paymentMethod: e.target.value })} className="rounded border p-1 bg-white">
                            <option value="other">其他</option>
                            <option value="wechat">微信</option>
                            <option value="transfer">转账</option>
                            <option value="cash">现金</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex gap-2 flex-wrap">
                            <button type="button" onClick={() => moveOrder(o.id, 'up')} className="px-2 py-1 rounded border bg-white">上移</button>
                            <button type="button" onClick={() => moveOrder(o.id, 'down')} className="px-2 py-1 rounded border bg-white">下移</button>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => editOrder(o)} className="px-2 py-1 rounded border bg-blue-50 text-blue-700 border-blue-200">修改</button>
                            <button onClick={() => deleteOrder(o.id)} className="px-2 py-1 rounded border bg-red-50 text-red-700 border-red-200">删除</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {currentDayOrders.length === 0 && <tr><td colSpan={10} className="py-8 text-center text-slate-500">当前日期暂无订单。</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="bg-white rounded-2xl shadow p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="font-semibold text-lg">客户数据库</h2>
              <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="rounded-lg border p-2 min-w-[280px]" placeholder="搜索客户 / 电话 / 地址" />
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-3">客户</th>
                    <th className="py-2 pr-3">电话</th>
                    <th className="py-2 pr-3">地址</th>
                    <th className="py-2 pr-3">历史数量</th>
                    <th className="py-2 pr-3">手动现金历史</th>
                    <th className="py-2 pr-3">现金订单</th>
                    <th className="py-2 pr-3">可用免餐</th>
                    <th className="py-2 pr-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {customerRows.map((row) => {
                    const isEditing = editingCustomerRowId === row.id;
                    return (
                    <tr key={row.id} className="border-b align-top">
                      <td className="py-3 pr-3 font-medium">
                        {isEditing ? (
                          <input value={row.customerId} onChange={(e) => updateCustomer(row.id, { customerId: e.target.value })} className="w-full rounded border p-1" />
                        ) : row.customerId}
                      </td>
                      <td className="py-3 pr-3">
                        {isEditing ? (
                          <input value={row.phone} onChange={(e) => updateCustomer(row.id, { phone: e.target.value })} className="w-full rounded border p-1" />
                        ) : row.phone}
                      </td>
                      <td className="py-3 pr-3">
                        {isEditing ? (
                          <input value={row.address} onChange={(e) => updateCustomer(row.id, { address: e.target.value })} className="w-full rounded border p-1" />
                        ) : row.address}
                      </td>
                      <td className="py-3 pr-3">{row.stats.totalQty}</td>
                      <td className="py-3 pr-3"><input type="number" min="0" value={row.manualCashHistory || 0} onChange={(e) => updateCustomerManualCash(row.customerId, e.target.value)} className="w-20 rounded border p-1" /></td>
                      <td className="py-3 pr-3">{row.stats.cashOrders}</td>
                      <td className="py-3 pr-3"><span className={row.stats.availableFreeMeals > 0 ? 'px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-semibold' : ''}>{row.stats.availableFreeMeals}</span></td>
                      <td className="py-3 pr-3">
                        <div className="flex gap-2 flex-wrap">
                          <button type="button" onClick={() => setEditingCustomerRowId(isEditing ? null : row.id)} className="px-2 py-1 rounded border bg-blue-50 text-blue-700 border-blue-200">{isEditing ? '完成' : '修改'}</button>
                          <button type="button" onClick={() => deleteCustomer(row.id)} className="px-2 py-1 rounded border bg-red-50 text-red-700 border-red-200">删除</button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow p-5">
              <h2 className="font-semibold text-lg mb-4">营业统计</h2>
              <div className="grid md:grid-cols-3 gap-3">
                <Field label="开始日期"><input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="w-full rounded-lg border p-2" /></Field>
                <Field label="结束日期"><input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="w-full rounded-lg border p-2" /></Field>
                <div className="flex items-end"><button onClick={() => setFilters({ from: todayStr(), to: todayStr() })} className="w-full rounded-lg border p-2 bg-slate-50">切回今天</button></div>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <StatCard label="订单数" value={dashboard.totalOrders} />
              <StatCard label="份数" value={dashboard.totalQty} />
              <StatCard label="营业额" value={fmtMoney(dashboard.revenue)} />
              <StatCard label="免餐数量" value={dashboard.freeMeals} highlight />
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              {['cash', 'wechat', 'transfer', 'other'].map((method) => (
                <div key={method} className={`rounded-2xl shadow p-5 ${method === 'cash' ? 'bg-blue-50' : method === 'wechat' ? 'bg-green-50' : method === 'transfer' ? 'bg-red-50' : 'bg-white'}`}>
                  <div className="text-sm text-slate-500 mb-1">{method === 'cash' ? '现金' : method === 'wechat' ? '微信' : method === 'transfer' ? '转账' : '其他'}</div>
                  <div className="text-2xl font-bold">{dashboard.byPayment[method].count}</div>
                  <div className="text-sm text-slate-600 mt-1">金额 {fmtMoney(dashboard.byPayment[method].amount)}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow p-5">
              <div className="mb-4">
                <h3 className="font-semibold text-lg">司机送餐统计</h3>
                <div className="text-sm text-slate-500">根据当前所选日期区间，自动同步司机订单数、送餐份数、单价和配送费。一键写入现金流。</div>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left bg-slate-50">
                      <th className="py-2 px-3">司机</th>
                      <th className="py-2 px-3">订单数</th>
                      <th className="py-2 px-3">送餐数量</th>
                      <th className="py-2 px-3">单价</th>
                      <th className="py-2 px-3">配送费</th>
                      <th className="py-2 px-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settings.drivers || []).map((driver, index) => {
                      const row = dashboard.byDriver[driver.id] || { orders: 0, qty: 0, fee: 0, rate: Number(driver.rate || 0) };
                      return (
                        <tr key={driver.id} className={`border-b ${getDriverColorClass(index)}`}>
                          <td className="py-2 px-3 font-medium">{driver.name}</td>
                          <td className="py-2 px-3">{row.orders}</td>
                          <td className="py-2 px-3">{row.qty}</td>
                          <td className="py-2 px-3">{fmtMoney(row.rate)}</td>
                          <td className="py-2 px-3 font-semibold">{row.qty} × {fmtMoney(row.rate)} = {fmtMoney(row.fee)}</td>
                          <td className="py-2 px-3">
                            <button onClick={() => writeDriverFeeToCashflow(driver.id)} className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50">写入现金流</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cashflow' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl shadow p-5">
              <h2 className="font-semibold text-lg mb-4">现金流录入</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!expenseForm.amount) return;
                setExpenses((prev) => [{ ...expenseForm, id: uid(), amount: Number(expenseForm.amount) }, ...prev]);
                setExpenseForm({ date: todayStr(), type: 'material', channel: 'account', amount: '', note: '' });
              }} className="grid md:grid-cols-2 gap-3">
                <Field label="日期"><input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} className="w-full rounded-lg border p-2" /></Field>
                <Field label="支出类型"><select value={expenseForm.type} onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value })} className="w-full rounded-lg border p-2"><option value="material">采购物料</option><option value="delivery">送餐费</option><option value="other">其他</option></select></Field>
                <Field label="付款渠道"><select value={expenseForm.channel} onChange={(e) => setExpenseForm({ ...expenseForm, channel: e.target.value })} className="w-full rounded-lg border p-2"><option value="cash">现金</option><option value="account">账户</option></select></Field>
                <Field label="金额"><input type="number" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-full rounded-lg border p-2" /></Field>
                <div className="md:col-span-2"><Field label="备注"><input value={expenseForm.note} onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })} className="w-full rounded-lg border p-2" placeholder="如：鸡腿肉、米饭、司机补贴" /></Field></div>
                <div className="md:col-span-2 flex justify-end"><button className="px-5 py-3 rounded-xl bg-slate-900 text-white">保存支出</button></div>
              </form>

              <div className="mt-6 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-3">日期</th>
                      <th className="py-2 pr-3">类型</th>
                      <th className="py-2 pr-3">渠道</th>
                      <th className="py-2 pr-3">金额</th>
                      <th className="py-2 pr-3">备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((x) => (
                      <tr key={x.id} className="border-b">
                        <td className="py-2 pr-3">{x.date}</td>
                        <td className="py-2 pr-3">{x.type === 'material' ? '采购物料' : x.type === 'delivery' ? '送餐费' : '其他'}</td>
                        <td className="py-2 pr-3">{x.channel === 'cash' ? '现金' : '账户'}</td>
                        <td className="py-2 pr-3">{fmtMoney(x.amount)}</td>
                        <td className="py-2 pr-3">{x.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <StatCard label="现金收入" value={fmtMoney(cashflow.incomeCash)} />
              <StatCard label="账户收入" value={fmtMoney(cashflow.incomeAccount)} />
              <StatCard label="现金剩余" value={fmtMoney(cashflow.cashLeft)} highlight />
              <StatCard label="账户剩余" value={fmtMoney(cashflow.accountLeft)} highlight />
            </div>
          </div>
        )}

        {activeTab === 'driver' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow p-5 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-lg">司机端</h2>
                  <div className="text-sm text-slate-500">当前先支持按司机筛选。正式上线时可切换为司机账号模式，只显示自己的订单。</div>
                </div>
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <div className="text-sm text-slate-600 mb-1">查看模式</div>
                    <div className="flex gap-2">
                      <button onClick={() => setDriverViewMode('admin')} className={`px-3 py-2 rounded-lg border ${driverViewMode === 'admin' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white'}`}>管理视角</button>
                      <button onClick={() => { setDriverViewMode('driver'); if (driverPageFilter === 'all' && settings.drivers?.[0]?.id) setDriverPageFilter(settings.drivers[0].id); }} className={`px-3 py-2 rounded-lg border ${driverViewMode === 'driver' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white'}`}>司机账号预留</button>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600 mb-1">按司机筛选</div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => setDriverPageFilter('all')} disabled={driverViewMode === 'driver'} className={`px-3 py-2 rounded-lg border ${driverPageFilter === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white'} ${driverViewMode === 'driver' ? 'opacity-50 cursor-not-allowed' : ''}`}>全部</button>
                      {(settings.drivers || []).map((driver, index) => (
                        <button key={driver.id} onClick={() => setDriverPageFilter(driver.id)} className={`px-3 py-2 rounded-lg border ${driverPageFilter === driver.id ? 'bg-slate-900 text-white border-slate-900' : `${getDriverColorClass(index)} border-slate-300`}`}>{driver.name}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border bg-slate-50 p-3 text-sm text-slate-600">
                {driverViewMode === 'admin' ? '当前为管理视角：可切换查看全部司机或指定司机。' : `当前为司机账号预留视角：正式上线后该角色登录只显示自己的订单。当前模拟显示 ${driverMap[driverPageFilter]?.name || '未选择司机'} 的订单。`}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-5">
              <h2 className="font-semibold text-lg mb-4">司机端 · 今日正常订单</h2>
              <DriverTable orders={normalDriverOrders} onToggle={updateOrder} driverMap={driverMap} />
            </div>
            <div className="bg-orange-50 border border-orange-300 rounded-2xl shadow p-5">
              <h2 className="font-semibold text-lg mb-4 text-orange-700">司机端 · 临时订餐客人高亮区</h2>
              <DriverTable orders={tempDriverOrders} onToggle={updateOrder} driverMap={driverMap} temp />
              {tempDriverOrders.length === 0 && <div className="text-sm text-orange-700 mt-3">当前筛选条件下暂无临时加单。</div>}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl shadow p-5 max-w-5xl space-y-6">
            <div>
              <h2 className="font-semibold text-lg mb-4">设置</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="单份餐食定价 (£)"><input type="number" step="0.01" value={settings.mealPrice} onChange={(e) => { const next = { ...settings, mealPrice: Number(e.target.value || 0) }; setSettings(next); setOrders((prev) => { const updated = refreshFreeMealStatus(prev, customers, next); ordersRef.current = updated; return updated; }); }} className="w-full rounded-lg border p-2" /></Field>
                <Field label="初始现金余额 (£)"><input type="number" step="0.01" value={settings.initialCash} onChange={(e) => setSettings({ ...settings, initialCash: Number(e.target.value || 0) })} className="w-full rounded-lg border p-2" /></Field>
                <Field label="初始账户余额 (£)"><input type="number" step="0.01" value={settings.initialAccount} onChange={(e) => setSettings({ ...settings, initialAccount: Number(e.target.value || 0) })} className="w-full rounded-lg border p-2" /></Field>
                <div className="md:col-span-2">
                  <Field label="今日菜谱维护（用于客户分析）">
                    <div className="grid md:grid-cols-[180px_1fr] gap-3">
                      <input type="date" value={todayOrdersDate} onChange={(e) => setTodayOrdersDate(e.target.value)} className="w-full rounded-lg border p-2" />
                      <input value={menusByDate[todayOrdersDate] || ''} onChange={(e) => setMenusByDate({ ...menusByDate, [todayOrdersDate]: e.target.value })} className="w-full rounded-lg border p-2" placeholder="如：香菇鸡腿 + 米饭" />
                    </div>
                  </Field>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3">司机设置</h3>
              <div className="space-y-3 mb-4">
                {(settings.drivers || []).map((driver, index) => (
                  <div key={driver.id} className={`grid md:grid-cols-[120px_120px_120px_auto] gap-3 items-center px-3 py-3 rounded border ${getDriverColorClass(index)}`}>
                    <input value={driver.name} onChange={(e) => renameDriver(driver.id, e.target.value)} className="border rounded px-2 py-2" />
                    <div className="flex items-center gap-2"><span className="text-sm text-slate-600">单价 £</span><input type="number" step="0.01" value={driver.rate} onChange={(e) => updateDriverRate(driver.id, e.target.value)} className="border rounded px-2 py-2 w-24" /></div>
                    <div className="text-sm text-slate-600">背景色预览</div>
                    <div className="flex justify-end"><button onClick={() => removeDriver(driver.id)} className="px-3 py-2 rounded border text-red-600 bg-white">删除</button></div>
                  </div>
                ))}
              </div>
              <div className="grid md:grid-cols-[1fr_140px_120px] gap-2">
                <input value={newDriverName} onChange={(e) => setNewDriverName(e.target.value)} className="rounded-lg border p-2" placeholder="新增司机名称，如司机D" />
                <input type="number" step="0.01" value={newDriverRate} onChange={(e) => setNewDriverRate(e.target.value)} className="rounded-lg border p-2" placeholder="单价" />
                <button onClick={addDriver} className="px-4 py-2 rounded-lg bg-slate-900 text-white">添加司机</button>
              </div>
            </div>

            <div className="text-sm text-slate-600">
              规则说明：现金付费订单每累计 10 单，系统自动给该客户累积 1 份免餐资格。客户库中可手动录入既有现金支付历史，系统会与后续实时现金订单连续计算。统计页可按时间区间自动计算每位司机的配送费，并一键写入现金流的"送餐费"。司机端当前支持顶部按司机筛选；同时已预留未来账号权限结构，正式上线后可让司机登录后只看自己的订单。
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-sm text-slate-600 mb-1">{label}</div>
      {children}
    </label>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <div className="text-sm text-slate-600 mb-1">{label}</div>
      <div className="w-full rounded-lg border p-2 bg-slate-50">{value}</div>
    </div>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-2">
      <div className="text-slate-500">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function StatCard({ label, value, highlight = false }) {
  return (
    <div className={`rounded-2xl shadow p-5 ${highlight ? 'bg-emerald-50' : 'bg-white'}`}>
      <div className="text-sm text-slate-500 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function DriverTable({ orders, onToggle, driverMap, temp = false }) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={`border-b text-left ${temp ? 'bg-orange-100' : 'bg-slate-50'}`}>
            <th className="py-2 px-3">客户</th>
            <th className="py-2 px-3">电话</th>
            <th className="py-2 px-3">地址</th>
            <th className="py-2 px-3">备注</th>
            <th className="py-2 px-3">订单量</th>
            <th className="py-2 px-3">支付</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className={`border-b ${temp ? 'bg-orange-50' : driverMap[o.driverId]?.colorClass || 'bg-white'}`}>
              <td className="py-2 px-3 font-medium"><div className="flex items-center gap-2"><span>{o.customerId}</span>{o.isFreeMeal && <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700">免餐</span>}</div></td>
              <td className="py-2 px-3"><a href={`tel:${o.phone}`} className="text-blue-600 underline">{o.phone}</a></td>
              <td className="py-2 px-3">{o.address}</td>
              <td className="py-2 px-3">{o.note || '-'}</td>
              <td className="py-2 px-3">x{o.qty}</td>
              <td className="py-2 px-3">
                <select
                  value={o.paymentMethod === 'cash' ? 'cash' : 'other'}
                  onChange={(e) => onToggle(o.id, { paymentMethod: e.target.value === 'cash' ? 'cash' : 'other' })}
                  className={`rounded border px-2 py-1 font-medium ${o.paymentMethod === 'cash' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-100 text-slate-700 border-slate-300'}`}
                >
                  <option value="other">其他</option>
                  <option value="cash">现金</option>
                </select>
              </td>
            </tr>
          ))}
          {orders.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-500">暂无订单。</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
