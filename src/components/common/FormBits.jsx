import React from 'react';

export function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-sm text-slate-600 mb-1">{label}</div>
      {children}
    </label>
  );
}

export function ReadOnlyField({ label, value }) {
  return (
    <div>
      <div className="text-sm text-slate-600 mb-1">{label}</div>
      <div className="w-full rounded-lg border p-2 bg-slate-50">{value}</div>
    </div>
  );
}

export function InfoRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-2">
      <div className="text-slate-500">{label}</div>
      <div>{children}</div>
    </div>
  );
}

export function StatCard({ label, value, highlight = false }) {
  return (
    <div className={`rounded-2xl shadow p-5 ${highlight ? 'bg-emerald-50' : 'bg-white'}`}>
      <div className="text-sm text-slate-500 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
