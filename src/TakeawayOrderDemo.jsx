import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './services/supabaseClient';
import {
  listOrdersByDate,
  listAllOrders,
  createOrder,
  updateOrderRow,
  deleteOrderRow,
  batchUpdateRouteOrders,
} from './services/orders';

import {
  listDrivers,
  createDriver,
  updateDriverRow,
  deleteDriverRow,
} from './services/drivers';

import {
  listCustomers,
  createCustomer,
  updateCustomerRow,
  deleteCustomerRow,
} from './services/customers';

import {
  listExpenses,
  createExpense,
} from './services/expenses';

import {
  listMenus,
  upsertMenuByDate,
} from './services/menus';

import {
  getAppSettings,
  upsertAppSettings,
} from './services/settings';
import { Field } from './components/common/FormBits';
import DriverTab from './components/tabs/DriverTab';
import CashflowTab from './components/tabs/CashflowTab';
import OrdersTab from './components/tabs/OrdersTab';
import TodayOrdersTab from './components/tabs/TodayOrdersTab';
import CustomersTab from './components/tabs/CustomersTab';
import SettingsTab from './components/tabs/SettingsTab';
import DashboardTab from './components/tabs/DashboardTab';
import {
  buildCustomerStats,
  buildCustomerRows,
  buildDashboard,
  buildCashflow,
} from './utils/takeawayDerived';

const todayStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const uid = () => Math.random().toString(36).slice(2, 10);


function mapDbOrder(row) {
  return {
  id: row.id,
  date: row.date,
  year: row.year,
  week: row.week,
  customerId: row.customer_id,
  address: row.address || '',
  phone: row.phone || '',
  qty: Number(row.qty || 1),
  note: row.note || '',
  paymentMethod: row.payment_method || 'other',
  driverId: row.driver_id || '',
  isTemp: Boolean(row.is_temp),
  paymentDone: Boolean(row.payment_done),
  menu: row.menu || '',
  amount: Number(row.amount || 0),
  isFreeMeal: Boolean(row.is_free_meal),
  routeOrder: Number(row.route_order || 1),
  createdAt: row.created_at || new Date().toISOString(),
  };
}


function mapDbDriver(row) {
  return {
    id: row.id,
    name: row.name,
    rate: Number(row.rate || 0),
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order || 0),
  };
}

function mapDbCustomer(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    phone: row.phone || '',
    address: row.address || '',
    note: row.note || '',
    manualCashHistory: Number(row.manual_cash_history || 0),
  };
}

function mapDbExpense(row) {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    channel: row.channel,
    amount: Number(row.amount || 0),
    note: row.note || '',
  };
}

function mapDbMenuRow(row) {
  return {
    date: row.date,
    menu: row.menu || '',
  };
}

function mapDbSettingsRow(row) {
  return {
    ...seedSettings,
    mealPrice: Number(row?.meal_price || seedSettings.mealPrice),
    initialCash: Number(row?.initial_cash || seedSettings.initialCash),
    initialAccount: Number(row?.initial_account || seedSettings.initialAccount),
  };
}

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

const seedCustomers = [];

const seedSettings = {
  mealPrice: 10,
  initialCash: 0,
  initialAccount: 0,
  drivers: [],
};

const seedOrders = [];

const seedExpenses = [];

const TABS = [
  ['orders', '录单'],
  ['todayOrders', '今日订单'],
  ['customers', '客户库'],
  ['dashboard', '统计'],
  ['cashflow', '现金流'],
  ['driver', '司机端'],
  ['settings', '设置'],
];

export default function TakeawayOrder() {
  const [activeTab, setActiveTab] = useState('orders');
  const [customers, setCustomers] = useState(seedCustomers);
  const [orders, setOrders] = useState(seedOrders);
  // New to supabase
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersTableError, setOrdersTableError] = useState('');

  const [expenses, setExpenses] = useState(seedExpenses);
  const [menusByDate, setMenusByDate] = useState({ [todayStr()]: '宫保鸡丁 + 米饭' });
  const [settings, setSettings] = useState(seedSettings);
  const [drivers, setDrivers] = useState(seedSettings.drivers || []);

  const [filters, setFilters] = useState({ from: todayStr(), to: todayStr() });
  const [todayOrdersDate, setTodayOrdersDate] = useState(todayStr());
  const [todayDriverFilter, setTodayDriverFilter] = useState('all');
  const [driverPageFilter, setDriverPageFilter] = useState('all');
  const [driverViewMode, setDriverViewMode] = useState('admin');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverRate, setNewDriverRate] = useState('1.2');
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [authUserEmail, setAuthUserEmail] = useState('');
  const syncError = '';
  const ordersRef = useRef(seedOrders);
  const customersRef = useRef(seedCustomers);
  const expensesRef = useRef(seedExpenses);
  const menusByDateRef = useRef({ [todayStr()]: '宫保鸡丁 + 米饭' });
  const settingsRef = useRef(seedSettings);
  const driversRef = useRef(seedSettings.drivers || []);
  const allDriversRef = useRef(seedSettings.drivers || []);

  const [orderForm, setOrderForm] = useState({
    date: todayStr(),
    customerId: '',
    address: '',
    phone: '',
    qty: 1,
    note: '',
    isTemp: false,
    driverId: seedSettings.drivers?.[0]?.id || '',
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

  useEffect(() => {
  driversRef.current = drivers;
  }, [drivers]);

  const driverMap = useMemo(() => {
  const map = {};
  (drivers || []).forEach((driver, index) => {
  map[driver.id] = { ...driver, colorClass: getDriverColorClass(index) };
  });
  return map;
  }, [drivers]);

  const matchingCustomers = useMemo(() => {
    const q = (orderForm.customerId || orderForm.phone || '').trim().toLowerCase();
    if (!q) return [];
    return customers.filter((c) => [c.customerId, c.phone, c.address, c.note].join(' ').toLowerCase().includes(q));
  }, [customers, orderForm.customerId, orderForm.phone]);


  const selectedCustomerStats = useMemo(
    () => buildCustomerStats(orders, customers, orderForm.customerId),
    [orders, customers, orderForm.customerId]
  );

  async function ensureCustomerExists(order) {
  const normalizedName = order.customerId.trim();
  const normalizedPhone = (order.phone || '').trim();
  const normalizedAddress = (order.address || '').trim();

  const existing = customers.find(
  (c) =>
  c.customerId === normalizedName ||
  (normalizedPhone && c.phone === normalizedPhone)
  );

  if (existing) {
  const patch = {};
  if (normalizedPhone && existing.phone !== normalizedPhone) patch.phone = normalizedPhone;
  if (normalizedAddress && existing.address !== normalizedAddress) patch.address = normalizedAddress;

  if (Object.keys(patch).length > 0) {
  try {
  await updateCustomerRow(existing.id, patch);
  await loadCustomers();
  } catch (error) {
  setOrdersTableError(error.message || '更新客户失败');
  }
  }

  return {
  ...existing,
  ...patch,
  };
  }

  const nextCustomer = {
  id: uid(),
  customerId: normalizedName,
  phone: normalizedPhone,
  address: normalizedAddress,
  note: '',
  manualCashHistory: 0,
  };

  try {
  await createCustomer(nextCustomer);
  await loadCustomers();
  } catch (error) {
  setOrdersTableError(error.message || '创建客户失败');
  }

  return nextCustomer;
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



  async function refreshAdminAccess(session) {
    try {
      const user = session?.user;
      if (!user) {
        setIsAdmin(false);
        setAuthUserEmail('');
        return;
      }
      setAuthUserEmail(user.email || '');
      const { data, error } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) {
        setIsAdmin(false);
        return;
      }
      setIsAdmin(data?.role === 'admin');
    } catch {
      setIsAdmin(false);
    }
  }

  async function sendAdminMagicLink() {
    const email = adminEmailInput.trim();
    if (!email) {
      setOrdersTableError('请先输入管理员邮箱');
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      setOrdersTableError(error.message || '发送登录链接失败');
      return;
    }
    setOrdersTableError('管理员登录链接已发送，请去邮箱点击 Magic Link。');
    window.alert('Magic link sent. Please check your email inbox (and spam folder).');
  }

  async function logoutAdmin() {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setAuthUserEmail('');
  }


  function normalizeDriverName(name) {
    return String(name || '').trim().toLowerCase();
  }

  function getCanonicalDriverId(rawDriverId) {
    if (!rawDriverId) return rawDriverId || '';
    const activeDrivers = driversRef.current || [];
    const allDrivers = allDriversRef.current || activeDrivers;

    const historical = allDrivers.find((d) => d.id === rawDriverId);
    if (!historical) return rawDriverId;

    const targetName = normalizeDriverName(historical.name);
    if (!targetName) return rawDriverId;

    // always normalize same-name drivers to one active canonical id
    const activeSameName = activeDrivers
      .filter((d) => normalizeDriverName(d.name) === targetName)
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));

    if (activeSameName.length > 0) return activeSameName[0].id;

    // fallback: if driver still active and unique by id, keep it
    if (activeDrivers.some((d) => d.id === rawDriverId)) return rawDriverId;

    return rawDriverId;
  }

  function canonicalizeOrderDriver(order) {
    const canonicalId = getCanonicalDriverId(order.driverId);
    return canonicalId === order.driverId ? order : { ...order, driverId: canonicalId };
  }

  async function loadOrdersForDate(date) {
    if (!supabase) return;
    setOrdersLoading(true);
    setOrdersTableError('');
    try {
      const rows = await listOrdersByDate(date);
      const mapped = rows.map(mapDbOrder).map(canonicalizeOrderDriver);
      ordersRef.current = mapped;
      setOrders(mapped);
    } catch (error) {
      setOrdersTableError(error.message || '读取 orders 表失败');
    } finally {
      setOrdersLoading(false);
    }
  }


  async function loadDrivers() {
    if (!supabase) return;
    try {
      const rows = await listDrivers();
      const mapped = rows.map(mapDbDriver);
      allDriversRef.current = mapped;
      const visibleDriversRaw = mapped.filter((d) => d.active !== false)
        .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
      const seen = new Set();
      const visibleDrivers = visibleDriversRaw.filter((d) => {
        const key = normalizeDriverName(d.name);
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      driversRef.current = visibleDrivers;
      setDrivers(visibleDrivers);
      setOrders((prev) => {
        const fixed = prev.map(canonicalizeOrderDriver);
        ordersRef.current = fixed;
        return fixed;
      });
    } catch (error) {
      setOrdersTableError(error.message || '读取司机列表失败');
    }
  }

  async function loadCustomers() {
    if (!supabase) return;
    try {
      const rows = await listCustomers();
      const mapped = rows.map(mapDbCustomer);
      customersRef.current = mapped;
      setCustomers(mapped);
    } catch (error) {
      setOrdersTableError(error.message || '读取客户列表失败');
    }
  }

  async function loadExpenses() {
    if (!supabase) return;
    try {
      const rows = await listExpenses();
      const mapped = rows.map(mapDbExpense);
      expensesRef.current = mapped;
      setExpenses(mapped);
    } catch (error) {
      setOrdersTableError(error.message || '读取费用列表失败');
    }
  }

  async function loadMenus() {
    if (!supabase) return;
    try {
      const rows = await listMenus();
      const mapped = rows.map(mapDbMenuRow);
      const nextMenus = Object.fromEntries(mapped.map((item) => [item.date, item.menu]));
      menusByDateRef.current = nextMenus;
      setMenusByDate(nextMenus);
    } catch (error) {
      setOrdersTableError(error.message || '读取菜单失败');
    }
  }

  async function loadSettings() {
    if (!supabase) return;
    try {
      const row = await getAppSettings();
      const mapped = mapDbSettingsRow(row);
      const next = { ...settingsRef.current, ...mapped };
      settingsRef.current = next;
      setSettings(next);
    } catch (error) {
      setOrdersTableError(error.message || '读取设置失败');
    }
  }

  useEffect(() => {
    if (!supabase) return;
    loadOrdersForDate(todayOrdersDate);
  }, [todayOrdersDate]);

  useEffect(() => {
    if (!supabase) return;
    loadDrivers();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    loadCustomers();
  }, []);

  useEffect(() => {
  if (!supabase) return;
  loadExpenses();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    loadMenus();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    loadSettings();
  }, []);


  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      refreshAdminAccess(data?.session || null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      refreshAdminAccess(session || null);
    });

    return () => {
      active = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

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
    if (!isAdmin) { setOrdersTableError('仅管理员可修改数据'); return; }
    e.preventDefault();
    if (!orderForm.customerId || !orderForm.address || !orderForm.phone) return;

    const savedDate = orderForm.date;
    const nextCustomer = await ensureCustomerExists(orderForm);
    const nextCustomers = customersRef.current.some((c) => c.id === nextCustomer.id)
    ? customersRef.current.map((c) => (c.id === nextCustomer.id ? nextCustomer : c))
    : [nextCustomer, ...customersRef.current];

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

    const finalRecordRaw = nextOrders.find((o) => o.id === record.id) || record;
    const finalRecord = canonicalizeOrderDriver(finalRecordRaw);

    customersRef.current = nextCustomers;
    setCustomers(nextCustomers);

    try {
      if (editingOrderId) {
        await updateOrderRow(editingOrderId, {
          date: finalRecord.date,
          year: finalRecord.year,
          week: finalRecord.week,
          customerId: finalRecord.customerId,
          address: finalRecord.address,
          phone: finalRecord.phone,
          qty: finalRecord.qty,
          note: finalRecord.note,
          paymentMethod: finalRecord.paymentMethod,
          driverId: finalRecord.driverId,
          isTemp: finalRecord.isTemp,
          paymentDone: finalRecord.paymentDone,
          menu: finalRecord.menu,
          amount: finalRecord.amount,
          isFreeMeal: finalRecord.isFreeMeal,
          routeOrder: finalRecord.routeOrder,
        });
      } else {
        await createOrder(finalRecord);
      }

      if (savedDate === todayOrdersDate) {
        await loadOrdersForDate(savedDate);
      } else {
        setTodayOrdersDate(savedDate);
      }
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
        driverId: drivers?.[0]?.id || '',
      }));
    } catch (error) {
      setOrdersTableError(error.message || '保存订单失败');
    }
  }

  async function updateOrder(id, patch) {
    if (!isAdmin) { setOrdersTableError('仅管理员可修改数据'); return; }
    const current = ordersRef.current.find((o) => o.id === id);
    if (!current) return;

    const merged = canonicalizeOrderDriver({
      ...current,
      ...patch,
      routeOrder: patch.routeOrder ?? current.routeOrder,
    });

    const recalculated = applyOrders(
      ordersRef.current.map((o) => (o.id === id ? merged : o)),
      customers,
      settings
    );
    const finalOrder = recalculated.find((o) => o.id === id) || merged;

    await updateOrderRow(id, {
      date: finalOrder.date,
      year: finalOrder.year,
      week: finalOrder.week,
      customerId: finalOrder.customerId,
      address: finalOrder.address,
      phone: finalOrder.phone,
      qty: finalOrder.qty,
      note: finalOrder.note,
      paymentMethod: finalOrder.paymentMethod,
      driverId: finalOrder.driverId,
      isTemp: finalOrder.isTemp,
      paymentDone: finalOrder.paymentDone,
      menu: finalOrder.menu,
      amount: finalOrder.amount,
      isFreeMeal: finalOrder.isFreeMeal,
      routeOrder: finalOrder.routeOrder,
    });

    await loadOrdersForDate(todayOrdersDate);
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
      driverId: order.driverId || drivers?.[0]?.id || '',
    });
    setActiveTab('orders');
  }

  async function deleteOrder(id) {
    if (!isAdmin) { setOrdersTableError('仅管理员可修改数据'); return; }
    await deleteOrderRow(id);
    if (editingOrderId === id) setEditingOrderId(null);
    await loadOrdersForDate(todayOrdersDate);
  }

  async function updateCustomerManualCash(customerId, value) {
    if (!isAdmin) { setOrdersTableError('仅管理员可修改数据'); return; }
    const existing = customers.find((c) => c.customerId === customerId);
    if (!existing) return;

    try {
      await updateCustomerRow(existing.id, {
      manualCashHistory: Number(value || 0),
      });
      await loadCustomers();
    } catch (error) {
      setOrdersTableError(error.message || '更新客户现金历史失败');
    }
  }

  async function updateCustomer(rowId, patch) {
    if (!isAdmin) { setOrdersTableError('仅管理员可修改数据'); return; }
    const existing = customers.find((c) => c.id === rowId);
    if (!existing) return;

    const oldCustomerId = existing.customerId;
    const nextCustomerId = patch.customerId ?? existing.customerId;
    const nextPhone = patch.phone ?? existing.phone;
    const nextAddress = patch.address ?? existing.address;
    const nextNote = patch.note ?? existing.note;

    try {
      await updateCustomerRow(rowId, {
      customerId: nextCustomerId,
      phone: nextPhone,
      address: nextAddress,
      note: nextNote,
      });

      await loadCustomers();

      const affectedOrders = ordersRef.current.filter((o) => o.customerId === oldCustomerId);
      for (const order of affectedOrders) {
        await updateOrderRow(order.id, {
        customerId: nextCustomerId,
        phone: nextPhone,
        address: nextAddress,
      });
    }

    await loadOrdersForDate(todayOrdersDate);
    } catch (error) {
    setOrdersTableError(error.message || '更新客户失败');
    }
  }

  async function deleteCustomer(rowId) {
    if (!isAdmin) { setOrdersTableError('仅管理员可修改数据'); return; }
    const existing = customers.find((c) => c.id === rowId);
    if (!existing) return;

    try {
    const affectedOrders = ordersRef.current.filter((o) => o.customerId === existing.customerId);

    for (const order of affectedOrders) {
    await deleteOrderRow(order.id);
    }

    await deleteCustomerRow(rowId);
    await loadCustomers();
    await loadOrdersForDate(todayOrdersDate);

    if (editingCustomerRowId === rowId) {
    setEditingCustomerRowId(null);
    }
    } catch (error) {
    setOrdersTableError(error.message || '删除客户失败');
    }
  }

  async function addDriver() {
    if (!isAdmin) { setOrdersTableError('仅管理员可修改数据'); return; }
    const name = newDriverName.trim();
    if (!name) return;

    const exists = (drivers || []).some((d) => d.name === name);
    if (exists) return;

    const nextSortOrder =
    (drivers || []).reduce((max, d) => Math.max(max, Number(d.sortOrder || 0)), 0) + 1;

    try {
      await createDriver({
      id: uid(),
      name,
      rate: Number(newDriverRate || 0),
      active: true,
      sortOrder: nextSortOrder,
    });

      await loadDrivers();
      setNewDriverName('');
      setNewDriverRate('1.2');
    } catch (error) {
      setOrdersTableError(error.message || '新增司机失败');
    }
  }

  async function renameDriver(driverId, name) {
    if (!isAdmin) { setOrdersTableError('仅管理员可修改数据'); return; }
    try {
      await updateDriverRow(driverId, { name });
      await loadDrivers();
    } catch (error) {
      setOrdersTableError(error.message || '修改司机名称失败');
    }
  }

  async function updateDriverRate(driverId, rate) {
    if (!isAdmin) { setOrdersTableError('仅管理员可修改数据'); return; }
    try {
      await updateDriverRow(driverId, { rate: Number(rate || 0) });
      await loadDrivers();
    } catch (error) {
      setOrdersTableError(error.message || '修改司机费率失败');
    }
  }

  async function removeDriver(driverId) {
    if (!isAdmin) { setOrdersTableError('仅管理员可修改数据'); return; }
    if ((drivers || []).length <= 1) return;

    const nextDrivers = drivers.filter((d) => d.id !== driverId);
    const fallbackId = nextDrivers[0]?.id || '';
    if (!fallbackId) return;

    try {
    const affectedOrders = ordersRef.current.filter((o) => o.driverId === driverId);

    for (const order of affectedOrders) {
      await updateOrderRow(order.id, { driverId: fallbackId });
    }

    await deleteDriverRow(driverId);
    await loadDrivers();
    await loadOrdersForDate(todayOrdersDate);

    setOrderForm((prev) => ({
    ...prev,
    driverId: prev.driverId === driverId ? fallbackId : prev.driverId,
    }));

      if (todayDriverFilter === driverId) setTodayDriverFilter('all');
      if (driverPageFilter === driverId) setDriverPageFilter('all');
    } catch (error) {
      setOrdersTableError(error.message || '删除司机失败');
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => (!filters.from || o.date >= filters.from) && (!filters.to || o.date <= filters.to));
  }, [orders, filters]);

  const dashboard = useMemo(
    () => buildDashboard(filteredOrders, drivers, driverMap),
    [filteredOrders, drivers, driverMap]
  );

  const currentDayOrders = useMemo(() => {
    const dayOrders = sortOrdersForRoute(orders.filter((o) => o.date === todayOrdersDate));
    return todayDriverFilter === 'all' ? dayOrders : dayOrders.filter((o) => o.driverId === todayDriverFilter);
  }, [orders, todayOrdersDate, todayDriverFilter]);

  const driverOrdersToday = useMemo(() => {
    return sortOrdersForRoute(orders.filter((o) => o.date === todayOrdersDate));
  }, [orders, todayOrdersDate]);

  const visibleDriverOrders = useMemo(() => {
    if (driverViewMode === 'admin') {
      return driverPageFilter === 'all' ? driverOrdersToday : driverOrdersToday.filter((o) => o.driverId === driverPageFilter);
    }
    return driverPageFilter === 'all' ? [] : driverOrdersToday.filter((o) => o.driverId === driverPageFilter);
  }, [driverOrdersToday, driverPageFilter, driverViewMode]);

  const normalDriverOrders = visibleDriverOrders.filter((o) => !o.isTemp);
  const tempDriverOrders = visibleDriverOrders.filter((o) => o.isTemp);

  const cashflow = useMemo(
    () => buildCashflow(orders, expenses, settings),
    [orders, expenses, settings]
  );


  async function moveOrder(orderId, direction) {
    if (!isAdmin) { setOrdersTableError('仅管理员可修改数据'); return; }
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
    const updates = nextOrders
      .filter((order) => order.date === todayOrdersDate)
      .map((order) => ({ id: order.id, routeOrder: order.routeOrder }));

    await batchUpdateRouteOrders(updates);
    await loadOrdersForDate(todayOrdersDate);
  }


  async function persistSettings(nextSettings) {
    if (!isAdmin) { setOrdersTableError('仅管理员可修改数据'); return; }
    try {
      await upsertAppSettings(nextSettings);
    } catch (error) {
      setOrdersTableError(error.message || '保存设置失败');
    }
  }

  async function saveMenuForDate(date, menu) {
    if (!isAdmin) { setOrdersTableError('仅管理员可修改数据'); return; }
    try {
      const nextMenus = { ...menusByDateRef.current, [date]: menu };
      menusByDateRef.current = nextMenus;
      setMenusByDate(nextMenus);
      await upsertMenuByDate(date, menu);
    } catch (error) {
      setOrdersTableError(error.message || '保存菜单失败');
    }
  }

  async function addExpense(e) {
    if (!isAdmin) { setOrdersTableError('仅管理员可修改数据'); return; }
    e.preventDefault();
    if (!expenseForm.amount) return;

    const record = {
      id: uid(),
      date: expenseForm.date,
      type: expenseForm.type,
      channel: expenseForm.channel,
      amount: Number(expenseForm.amount || 0),
      note: expenseForm.note || '',
    };

    try {
      await createExpense(record);
      await loadExpenses();
      setExpenseForm({ date: todayStr(), type: 'material', channel: 'account', amount: '', note: '' });
    } catch (error) {
      setOrdersTableError(error.message || '新增费用失败');
    }
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


  const customerRows = useMemo(
    () => buildCustomerRows(customers, customerSearch, orders),
    [customers, customerSearch, orders]
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">中餐外卖录单系统</h1>
            <p className="text-sm text-slate-600">已切换为 Supabase 真表数据模式，支持真实业务读写。</p>
            <p className="text-xs mt-1 text-slate-500">{syncError ? `⚠️ ${syncError}` : '✅ Supabase 真表已连接'}</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <input
              value={adminEmailInput}
              onChange={(e) => setAdminEmailInput(e.target.value)}
              placeholder="管理员邮箱"
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm"
            />
            {!isAdmin ? (
              <button onClick={sendAdminMagicLink} className="px-3 py-2 rounded-xl border bg-white">管理员登录</button>
            ) : (
              <button onClick={logoutAdmin} className="px-3 py-2 rounded-xl border bg-white">退出管理员</button>
            )}
            <span className={`text-xs px-2 py-1 rounded ${isAdmin ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {isAdmin ? `管理员: ${authUserEmail || '已登录'}` : '访客只读'}
            </span>
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
          <OrdersTab
            saveOrder={saveOrder}
            orderForm={orderForm}
            setOrderForm={setOrderForm}
            matchingCustomers={matchingCustomers}
            fillFromCustomer={fillFromCustomer}
            selectedCustomerStats={selectedCustomerStats}
            settings={settings}
            drivers={drivers}
            editingOrderId={editingOrderId}
            fmtMoney={fmtMoney}
            getISOWeek={getISOWeek}
          />
        )}
        {activeTab === 'todayOrders' && (
          <TodayOrdersTab
            ordersLoading={ordersLoading}
            ordersTableError={ordersTableError}
            todayOrdersDate={todayOrdersDate}
            setTodayOrdersDate={setTodayOrdersDate}
            todayDriverFilter={todayDriverFilter}
            setTodayDriverFilter={setTodayDriverFilter}
            drivers={drivers}
            getDriverColorClass={getDriverColorClass}
            currentDayOrders={currentDayOrders}
            driverMap={driverMap}
            updateOrder={updateOrder}
            moveOrder={moveOrder}
            editOrder={editOrder}
            deleteOrder={deleteOrder}
          />
        )}
        {activeTab === 'customers' && (
          <CustomersTab
            customerSearch={customerSearch}
            setCustomerSearch={setCustomerSearch}
            customerRows={customerRows}
            editingCustomerRowId={editingCustomerRowId}
            updateCustomer={updateCustomer}
            updateCustomerManualCash={updateCustomerManualCash}
            setEditingCustomerRowId={setEditingCustomerRowId}
            deleteCustomer={deleteCustomer}
          />
        )}
        {activeTab === 'dashboard' && (
          <DashboardTab
            filters={filters}
            setFilters={setFilters}
            todayStr={todayStr}
            dashboard={dashboard}
            fmtMoney={fmtMoney}
            drivers={drivers}
            getDriverColorClass={getDriverColorClass}
            writeDriverFeeToCashflow={writeDriverFeeToCashflow}
          />
        )}
        {activeTab === 'cashflow' && (
          <CashflowTab
            expenseForm={expenseForm}
            setExpenseForm={setExpenseForm}
            addExpense={addExpense}
            expenses={expenses}
            fmtMoney={fmtMoney}
            cashflow={cashflow}
          />
        )}
        {activeTab === 'driver' && (
          <DriverTab
            driverViewMode={driverViewMode}
            setDriverViewMode={setDriverViewMode}
            driverPageFilter={driverPageFilter}
            setDriverPageFilter={setDriverPageFilter}
            drivers={drivers}
            getDriverColorClass={getDriverColorClass}
            driverMap={driverMap}
            normalDriverOrders={normalDriverOrders}
            tempDriverOrders={tempDriverOrders}
            updateOrder={updateOrder}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            setSettings={setSettings}
            customers={customers}
            setOrders={setOrders}
            ordersRef={ordersRef}
            refreshFreeMealStatus={refreshFreeMealStatus}
            persistSettings={persistSettings}
            todayOrdersDate={todayOrdersDate}
            setTodayOrdersDate={setTodayOrdersDate}
            menusByDate={menusByDate}
            setMenusByDate={setMenusByDate}
            saveMenuForDate={saveMenuForDate}
            drivers={drivers}
            getDriverColorClass={getDriverColorClass}
            renameDriver={renameDriver}
            updateDriverRate={updateDriverRate}
            removeDriver={removeDriver}
            newDriverName={newDriverName}
            setNewDriverName={setNewDriverName}
            newDriverRate={newDriverRate}
            setNewDriverRate={setNewDriverRate}
            addDriver={addDriver}
          />
        )}
      </div>
    </div>
  );
}


