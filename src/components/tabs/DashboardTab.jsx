import React from 'react';
import { Field, StatCard } from '../common/FormBits';

export default function DashboardTab({
  filters,
  setFilters,
  todayStr,
  dashboard,
  filteredOrders,
  fmtMoney,
  drivers,
  getDriverColorClass,
  writeDriverFeeToCashflow,
  exportDashboardOrders,
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-lg">营业统计</h2>
            <div className="text-sm text-slate-500">按时间区间动态统计，并支持把当前区间订单导出为 CSV。</div>
          </div>
          <button onClick={exportDashboardOrders} className="px-3 py-2 rounded-lg border bg-slate-50">
            导出统计订单
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="开始日期"><input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="w-full rounded-lg border p-2" /></Field>
          <Field label="结束日期"><input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="w-full rounded-lg border p-2" /></Field>
          <div className="flex items-end"><button onClick={() => setFilters({ from: todayStr(), to: todayStr() })} className="w-full rounded-lg border p-2 bg-slate-50">切回今天</button></div>
        </div>
        <div className="text-sm text-slate-500 mt-3">当前区间共筛选出 {filteredOrders.length} 条订单。</div>
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
              {(drivers || []).map((driver, index) => {
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
  );
}
