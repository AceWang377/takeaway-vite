import React from 'react';

export default function DriverTable({ orders, onTogglePaymentMethod, driverMap, temp = false }) {
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
              <td className="py-2 px-3 font-medium">
                <div className="flex items-center gap-2">
                  <span>{o.customerId}</span>
                  {o.isFreeMeal && <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700">免餐</span>}
                </div>
              </td>
              <td className="py-2 px-3">
                <a href={`tel:${o.phone}`} className="text-blue-600 underline">
                  {o.phone}
                </a>
              </td>
              <td className="py-2 px-3">{o.address}</td>
              <td className="py-2 px-3">{o.note || '-'}</td>
              <td className="py-2 px-3">x{o.qty}</td>
              <td className="py-2 px-3">
                <select
                  value={o.paymentMethod || 'other'}
                  onChange={(e) => onTogglePaymentMethod(o.id, e.target.value)}
                  className={
                    `rounded border px-2 py-1 font-medium ${
                      o.paymentMethod === 'cash'
                        ? 'bg-amber-100 text-orange-700 border-amber-300'
                        : o.paymentMethod === 'wechat'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                          : o.paymentMethod === 'transfer'
                            ? 'bg-purple-50 text-slate-700 border-slate-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`
                  }
                >
                  <option value="other">其他</option>
                  <option value="wechat">微信</option>
                  <option value="transfer">转账</option>
                  <option value="cash">现金</option>
                </select>
              </td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-slate-500">
                暂无订单。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
