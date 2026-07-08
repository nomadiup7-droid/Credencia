import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`cx-skeleton rounded-xl ${className}`} />;
}

export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
      <div className="h-10 w-10 rounded-full border border-emerald-200 border-t-emerald-500 animate-spin" />
      <p className="text-sm font-semibold text-slate-500">{label}</p>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="cx-empty-state flex min-h-[180px] flex-col items-center justify-center gap-2 p-8 text-center">
      <h3 className="font-display text-lg font-bold text-slate-900">{title}</h3>
      {description && <p className="max-w-md text-sm text-slate-500">{description}</p>}
    </div>
  );
}
