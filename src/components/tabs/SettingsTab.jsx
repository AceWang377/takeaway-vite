import React from 'react';
import { Field } from '../common/FormBits';

export default function SettingsTab({
  settings,
  setSettings,
  customers,
  setOrders,
  ordersRef,
  refreshFreeMealStatus,
  persistSettings,
  todayOrdersDate,
  setTodayOrdersDate,
  menusByDate,
  setMenusByDate,
  saveMenuForDate,
  drivers,
  getDriverColorClass,
  renameDriver,
  updateDriverRate,
  removeDriver,
  newDriverName,
  setNewDriverName,
  newDriverRate,
  setNewDriverRate,
  addDriver,
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 max-w-5xl space-y-6">
      <div>
        <h2 className="font-semibold text-lg mb-4">设置</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="单份餐食定价 (£)"><input type="number" step="0.01" value={settings.mealPrice} onChange={(e) => { const next = { ...settings, mealPrice: Number(e.target.value || 0) }; setSettings(next); setOrders((prev) => { const updated = refreshFreeMealStatus(prev, customers, next); ordersRef.current = updated; return updated; }); }} onBlur={() => persistSettings(settings)} className="w-full rounded-lg border p-2" /></Field>
          <Field label="初始现金余额 (£)"><input type="number" step="0.01" value={settings.initialCash} onChange={(e) => { const next = { ...settings, initialCash: Number(e.target.value || 0) }; setSettings(next); }} onBlur={() => persistSettings(settings)} className="w-full rounded-lg border p-2" /></Field>
          <Field label="初始账户余额 (£)"><input type="number" step="0.01" value={settings.initialAccount} onChange={(e) => { const next = { ...settings, initialAccount: Number(e.target.value || 0) }; setSettings(next); }} onBlur={() => persistSettings(settings)} className="w-full rounded-lg border p-2" /></Field>
          <div className="md:col-span-2">
            <Field label="今日菜谱维护（用于客户分析）">
              <div className="grid md:grid-cols-[180px_1fr] gap-3">
                <input type="date" value={todayOrdersDate} onChange={(e) => setTodayOrdersDate(e.target.value)} className="w-full rounded-lg border p-2" />
                <input value={menusByDate[todayOrdersDate] || ''} onChange={(e) => setMenusByDate({ ...menusByDate, [todayOrdersDate]: e.target.value })} onBlur={(e) => saveMenuForDate(todayOrdersDate, e.target.value)} className="w-full rounded-lg border p-2" placeholder="如：香菇鸡腿 + 米饭" />
              </div>
            </Field>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="font-semibold mb-3">司机设置</h3>
        <div className="space-y-3 mb-4">
          {(drivers || []).map((driver, index) => (
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
  );
}
