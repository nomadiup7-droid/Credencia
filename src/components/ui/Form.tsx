import React from 'react';

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      {children}
      {(hint || error) && (
        <span className={`block text-xs font-semibold ${error ? 'text-rose-600' : 'text-slate-500'}`}>
          {error || hint}
        </span>
      )}
    </label>
  );
}

export const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none backdrop-blur-sm focus:border-emerald-400';
