import React from 'react';

export type BIChartDatum = {
  label: string;
  value: number;
  color?: string;
};

const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value);

export function BIBarChart({ data, emptyLabel = 'Sem dados para exibir' }: { data: BIChartDatum[]; emptyLabel?: string }) {
  const max = Math.max(1, ...data.map(item => item.value));

  if (data.length === 0) {
    return <div className="cx-empty-state p-6 text-center text-sm font-semibold text-slate-500">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-3">
      {data.map(item => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="truncate font-bold text-slate-700">{item.label}</span>
            <span className="font-black text-slate-950">{formatNumber(item.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-700 to-[#12e000]"
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BILineChart({ data, emptyLabel = 'Sem fluxo no período' }: { data: BIChartDatum[]; emptyLabel?: string }) {
  const max = Math.max(1, ...data.map(item => item.value));

  if (data.length === 0) {
    return <div className="cx-empty-state p-6 text-center text-sm font-semibold text-slate-500">{emptyLabel}</div>;
  }

  return (
    <div className="flex h-48 items-end gap-2 rounded-2xl border border-slate-200/80 bg-white/55 p-4">
      {data.map(item => (
        <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div
            className="w-full rounded-t-xl bg-gradient-to-t from-emerald-800 to-[#12e000] shadow-[0_10px_24px_rgba(18,224,0,0.18)]"
            style={{ height: `${Math.max(8, (item.value / max) * 132)}px` }}
            title={`${item.label}: ${item.value}`}
          />
          <span className="max-w-full truncate text-[10px] font-bold text-slate-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function BIPieChart({ data }: { data: BIChartDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const colors = ['#12e000', '#f5b842', '#0f172a', '#60a5fa', '#a78bfa'];
  const gradient = total
    ? data.map((item, index) => {
      const start = cursor;
      const end = cursor + (item.value / total) * 100;
      cursor = end;
      return `${item.color || colors[index % colors.length]} ${start}% ${end}%`;
    }).join(', ')
    : '#e5e7eb 0% 100%';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-5 items-center">
      <div className="relative mx-auto h-36 w-36 rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="absolute inset-5 rounded-full bg-white/95 shadow-inner" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-black text-slate-950">{formatNumber(total)}</span>
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Total</span>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white/60 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color || colors[index % colors.length] }} />
              <span className="truncate text-xs font-bold text-slate-700">{item.label}</span>
            </div>
            <span className="text-xs font-black text-slate-950">{formatNumber(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BIHeatmapPreview({ data }: { data: BIChartDatum[] }) {
  const max = Math.max(1, ...data.map(item => item.value));
  const cells = data.length ? data : Array.from({ length: 24 }, (_, index) => ({ label: `${index}h`, value: 0 }));

  return (
    <div>
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
        {cells.slice(0, 24).map(item => (
          <div
            key={item.label}
            className="h-9 rounded-lg border border-slate-200/70"
            title={`${item.label}: ${item.value}`}
            style={{ backgroundColor: `rgba(18, 224, 0, ${0.06 + (item.value / max) * 0.52})` }}
          />
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-500">
        Heatmap preparado para leitura de fluxo por hora e área. Sem WebSocket nesta fase.
      </p>
    </div>
  );
}
