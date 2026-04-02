import React from 'react';
import { Field } from '../common/FormBits';

function getPaymentMethodStyle(paymentMethod) {
  if (paymentMethod === 'wechat') {
    return { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' };
  }
  if (paymentMethod === 'transfer') {
    return { backgroundColor: '#ede9fe', color: '#5b21b6', borderColor: '#c4b5fd' };
  }
  if (paymentMethod === 'cash') {
    return { backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' };
  }
  return { backgroundColor: '#f1f5f9', color: '#334155', borderColor: '#cbd5e1' };
}

export default function TodayOrdersTab({
  ordersLoading,
  ordersTableError,
  todayOrdersDate,
  setTodayOrdersDate,
  todayDriverFilter,
  setTodayDriverFilter,
  drivers,
  getDriverColorClass,
  currentDayOrders,
  todaySummary,
  driverMap,
  isAdmin,
  updateOrder,
  updatePaymentMethod,
  moveOrder,
  editOrder,
  deleteOrder,
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold text-lg">今日订单列表</h2>
          <div className="text-sm text-slate-500">在这里确认支付方式、调整顺序、筛选司机。不同司机订单用不同背景色区分，支付方式所有人可改，其余编辑仅管理员可操作。</div>
        </div>
        {ordersLoading && <div className="text-sm text-slate-500">正在从 Supabase 读取订单...</div>}
        {ordersTableError && <div className="text-sm text-red-600">{ordersTableError}</div>}

        <div className="flex gap-3 items-end flex-wrap">
          <Field label="查看日期"><input type="date" value={todayOrdersDate} onChange={(e) => setTodayOrdersDate(e.target.value)} className="rounded-lg border p-2" /></Field>
          <div>
            <div className="text-sm text-slate-600 mb-1">按司机筛选</div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setTodayDriverFilter('all')} className={`px-3 py-2 rounded-lg border ${todayDriverFilter === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white'}`}>全部</button>
              {(drivers || []).map((driver, index) => (
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

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-slate-50 p-3">
          <div className="text-xs text-slate-500">订单数</div>
          <div className="text-xl font-bold">{todaySummary.totalOrders}</div>
        </div>
        <div className="rounded-xl border bg-blue-50 p-3">
          <div className="text-xs text-slate-500">总份数</div>
          <div className="text-xl font-bold">{todaySummary.totalQty}</div>
        </div>
        <div className="rounded-xl border bg-emerald-50 p-3">
          <div className="text-xs text-slate-500">今日营收</div>
          <div className="text-xl font-bold">£{Number(todaySummary.totalAmount || 0).toFixed(2)}</div>
        </div>
        <div className="rounded-xl border bg-amber-50 p-3">
          <div className="text-xs text-slate-500">免餐单数</div>
          <div className="text-xl font-bold">{todaySummary.freeMealCount}</div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {todaySummary.paymentBreakdown.map((item) => (
          <div key={item.value} className="rounded-xl border p-3" style={item.style}>
            <div className="text-xs" style={{ opacity: 0.8 }}>{item.label}</div>
            <div className="font-semibold">{item.count} 单</div>
            <div className="text-sm">£{Number(item.amount || 0).toFixed(2)}</div>
          </div>
        ))}
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
                <tr key={o.id} className={`border-b ${o.isTemp ? 'bg-amber-50' : driver?.colorClass || 'bg-white'}`}>
                  <td className="py-2 px-3">{index + 1}</td>
                  <td className="py-2 px-3 font-medium"><div className="flex items-center gap-2"><span>{o.customerId}</span>{o.isFreeMeal && <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700">免餐</span>}</div></td>
                  <td className="py-2 px-3">
                    <select
                      value={o.driverId || ''}
                      onChange={(e) => updateOrder(o.id, { driverId: e.target.value })}
                      disabled={!isAdmin}
                      className={`rounded border p-1 bg-white ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {(drivers || []).map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
                    </select>
                  </td>
                  <td className="py-2 px-3">x{o.qty}</td>
                  <td className="py-2 px-3">{o.address}</td>
                  <td className="py-2 px-3">{o.phone}</td>
                  <td className="py-2 px-3">{o.note || '-'}</td>
                  <td className="py-2 px-3">
                    <select
                      value={o.paymentMethod}
                      onChange={(e) => updatePaymentMethod(o.id, e.target.value)}
                      className="rounded border p-1 font-medium"
                      style={getPaymentMethodStyle(o.paymentMethod)}
                    >
                      <option value="other" style={getPaymentMethodStyle('other')}>其他</option>
                      <option value="wechat" style={getPaymentMethodStyle('wechat')}>微信</option>
                      <option value="transfer" style={getPaymentMethodStyle('transfer')}>转账</option>
                      <option value="cash" style={getPaymentMethodStyle('cash')}>现金</option>
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-2 flex-wrap">
                      <button type="button" onClick={() => moveOrder(o.id, 'up')} disabled={!isAdmin} className={`px-2 py-1 rounded border bg-white ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}>上移</button>
                      <button type="button" onClick={() => moveOrder(o.id, 'down')} disabled={!isAdmin} className={`px-2 py-1 rounded border bg-white ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}>下移</button>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => editOrder(o)} disabled={!isAdmin} className={`px-2 py-1 rounded border bg-blue-50 text-blue-700 border-blue-200 ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}>修改</button>
                      <button onClick={() => deleteOrder(o.id)} disabled={!isAdmin} className={`px-2 py-1 rounded border bg-red-50 text-red-700 border-red-200 ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}>删除</button>
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
  );
}
