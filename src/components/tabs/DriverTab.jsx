import React from 'react';
import DriverTable from '../orders/DriverTable';

export default function DriverTab({
  driverViewMode,
  setDriverViewMode,
  driverPageFilter,
  setDriverPageFilter,
  drivers,
  getDriverColorClass,
  driverMap,
  normalDriverOrders,
  tempDriverOrders,
  updatePaymentMethod,
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow p-5 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold text-lg">司机端</h2>
            <div className="text-sm text-slate-500">支持按司机筛选；后续可扩展为司机账号模式，只显示自己的订单。</div>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <div className="text-sm text-slate-600 mb-1">查看模式</div>
              <div className="flex gap-2">
                <button onClick={() => setDriverViewMode('admin')} className={`px-3 py-2 rounded-lg border ${driverViewMode === 'admin' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white'}`}>管理视角</button>
                <button onClick={() => { setDriverViewMode('driver'); if (driverPageFilter === 'all' && drivers?.[0]?.id) setDriverPageFilter(drivers[0].id); }} className={`px-3 py-2 rounded-lg border ${driverViewMode === 'driver' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white'}`}>司机账号预留</button>
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">按司机筛选</div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setDriverPageFilter('all')} disabled={driverViewMode === 'driver'} className={`px-3 py-2 rounded-lg border ${driverPageFilter === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white'} ${driverViewMode === 'driver' ? 'opacity-50 cursor-not-allowed' : ''}`}>全部</button>
                {(drivers || []).map((driver, index) => (
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
        <DriverTable orders={normalDriverOrders} onTogglePaymentMethod={updatePaymentMethod} driverMap={driverMap} />
      </div>
      <div className="bg-orange-50 border border-orange-300 rounded-2xl shadow p-5">
        <h2 className="font-semibold text-lg mb-4 text-orange-700">司机端 · 临时订餐客人高亮区</h2>
        <DriverTable orders={tempDriverOrders} onTogglePaymentMethod={updatePaymentMethod} driverMap={driverMap} temp />
        {tempDriverOrders.length === 0 && <div className="text-sm text-orange-700 mt-3">当前筛选条件下暂无临时加单。</div>}
      </div>
    </div>
  );
}
