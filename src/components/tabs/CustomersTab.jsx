import React from 'react';
import { Field } from '../common/FormBits';

export default function CustomersTab({
  customerSearch,
  setCustomerSearch,
  customerRows,
  editingCustomerRowId,
  updateCustomer,
  updateCustomerManualCash,
  setEditingCustomerRowId,
  deleteCustomer,
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold text-lg">客户数据库</h2>
          <div className="text-sm text-slate-500">所有历史录单客户都会自动沉淀在这里，可用于快速搜索、补全地址与电话，并追踪免餐资格。</div>
        </div>
        <Field label="搜索客户">
          <input
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="rounded-lg border p-2 w-72"
            placeholder="姓名 / 电话 / 地址 / 备注"
          />
        </Field>
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
  );
}
