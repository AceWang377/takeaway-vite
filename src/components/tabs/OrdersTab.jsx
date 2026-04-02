import React from 'react';
import { Field, ReadOnlyField, InfoRow } from '../common/FormBits';

export default function OrdersTab({
  saveOrder,
  orderForm,
  setOrderForm,
  matchingCustomers,
  fillFromCustomer,
  selectedCustomerStats,
  settings,
  drivers,
  editingOrderId,
  fmtMoney,
  getISOWeek,
  errorMessage,
}) {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-2xl shadow p-5">
        <h2 className="font-semibold text-lg mb-4">订单输入</h2>
        {errorMessage && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>}
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
                {(drivers || []).map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 rounded-xl border p-3 bg-slate-50 mt-6">
              <input type="checkbox" checked={orderForm.isTemp} onChange={(e) => setOrderForm({ ...orderForm, isTemp: e.target.checked })} />
              <span>晚餐</span>
            </label>
          </div>

          <Field label="特别备注"><textarea value={orderForm.note} onChange={(e) => setOrderForm({ ...orderForm, note: e.target.value })} className="w-full rounded-lg border p-2 min-h-24" placeholder="少饭、加辣、房号、晚餐说明..." /></Field>

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
  );
}
