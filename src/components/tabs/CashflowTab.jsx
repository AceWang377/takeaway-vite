import React from 'react';
import { Field, StatCard } from '../common/FormBits';

export default function CashflowTab({ expenseForm, setExpenseForm, addExpense, expenses, fmtMoney, cashflow }) {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-2xl shadow p-5">
        <h2 className="font-semibold text-lg mb-4">现金流录入</h2>
        <form onSubmit={addExpense} className="grid md:grid-cols-2 gap-3">
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
  );
}
