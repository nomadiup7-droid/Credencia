import React from 'react';
import { Activity, AreaChart, BarChart3, Clock, Download, FileSpreadsheet, FileText, FolderLock, PieChart, Radio, ShieldCheck, Users } from 'lucide-react';
import { BIBarChart, BIChartDatum, BIHeatmapPreview, BILineChart, BIPieChart } from './BICharts';
import ReportChartCapture from '../reports/ReportChartCapture';
import ReportExportMenu from '../reports/ReportExportMenu';
import type { ReportPdfKind } from '../../types/report.types';

export type BIMetric = {
  id: string;
  title: string;
  value: string | number;
  detail?: string;
  icon: React.ElementType;
  tone?: 'green' | 'graphite' | 'amber' | 'rose' | 'blue';
};

export type BIReportDefinition = {
  id: string;
  title: string;
  description: string;
  status: 'available' | 'prepared';
};

export interface BusinessIntelligenceDashboardProps {
  metrics: BIMetric[];
  hourlyData: BIChartDatum[];
  categoryData: BIChartDatum[];
  presenceData: BIChartDatum[];
  areaData: BIChartDatum[];
  operatorData: BIChartDatum[];
  reportDefinitions: BIReportDefinition[];
  pollingEnabled: boolean;
  onTogglePolling: () => void;
  onExportExcel: () => void;
  onExportCsv: () => void;
  onGeneratePdf: (kind: ReportPdfKind) => void;
  onPrintCurrent: () => void;
  pdfLoadingLabel?: string;
}

const toneClasses: Record<NonNullable<BIMetric['tone']>, string> = {
  green: 'border-emerald-200/80 bg-emerald-50/70 text-emerald-800',
  graphite: 'border-slate-200/80 bg-slate-50/80 text-slate-800',
  amber: 'border-amber-200/80 bg-amber-50/80 text-amber-800',
  rose: 'border-rose-200/80 bg-rose-50/80 text-rose-800',
  blue: 'border-blue-200/80 bg-blue-50/80 text-blue-800'
};

export default function BusinessIntelligenceDashboard({
  metrics,
  hourlyData,
  categoryData,
  presenceData,
  areaData,
  operatorData,
  reportDefinitions,
  pollingEnabled,
  onTogglePolling,
  onExportExcel,
  onExportCsv,
  onGeneratePdf,
  onPrintCurrent,
  pdfLoadingLabel
}: BusinessIntelligenceDashboardProps) {
  return (
    <div className="space-y-6">
      <section className="cx-card relative overflow-hidden p-6 lg:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full bg-[#12e000]/10 blur-3xl" />
        <div className="relative flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
          <div>
            <div className="cx-badge inline-flex px-3 py-1 text-[11px]">Business Intelligence</div>
            <h2 className="mt-3 font-display text-3xl font-black tracking-tight text-slate-950">
              Centro de inteligência do evento
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
              Indicadores executivos, fluxo operacional, relatórios segmentados e arquitetura preparada para atualização automática e grandes volumes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={onTogglePolling}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-black transition ${
                pollingEnabled
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white/70 text-slate-700 hover:border-emerald-200'
              }`}
            >
              <Radio size={15} />
              {pollingEnabled ? 'Tempo real ativo' : 'Ativar polling'}
            </button>
            <button type="button" onClick={onExportExcel} className="cx-button-secondary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black">
              <FileSpreadsheet size={15} />
              Excel
            </button>
            <button type="button" onClick={onExportCsv} className="cx-button-secondary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black">
              <Download size={15} />
              CSV
            </button>
            <ReportExportMenu onGeneratePdf={onGeneratePdf} onPrintCurrent={onPrintCurrent} loadingLabel={pdfLoadingLabel} compact />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {metrics.map(metric => {
          const Icon = metric.icon;
          return (
            <div key={metric.id} className={`cx-card p-4 ${toneClasses[metric.tone || 'graphite']}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] opacity-75">{metric.title}</p>
                  <p className="mt-2 font-display text-3xl font-black text-slate-950">{metric.value}</p>
                  {metric.detail && <p className="mt-1 truncate text-xs font-semibold opacity-75">{metric.detail}</p>}
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white/70 shadow-sm">
                  <Icon size={19} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="cx-card p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Fluxo operacional</p>
              <h3 className="font-display text-xl font-black text-slate-950">Visitantes por hora</h3>
            </div>
            <AreaChart size={22} className="text-emerald-700" />
          </div>
          <ReportChartCapture id="visitorsByHour">
            <BILineChart data={hourlyData} />
          </ReportChartCapture>
        </div>

        <div className="cx-card p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Presença</p>
              <h3 className="font-display text-xl font-black text-slate-950">Presentes x pendentes</h3>
            </div>
            <PieChart size={22} className="text-emerald-700" />
          </div>
          <ReportChartCapture id="presence">
            <BIPieChart data={presenceData} />
          </ReportChartCapture>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="cx-card p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Categorias</p>
              <h3 className="font-display text-lg font-black text-slate-950">Participantes por categoria</h3>
            </div>
            <Users size={21} className="text-emerald-700" />
          </div>
          <ReportChartCapture id="category">
            <BIBarChart data={categoryData} />
          </ReportChartCapture>
        </div>

        <div className="cx-card p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Acessos</p>
              <h3 className="font-display text-lg font-black text-slate-950">Total por área</h3>
            </div>
            <ShieldCheck size={21} className="text-emerald-700" />
          </div>
          <ReportChartCapture id="area">
            <BIBarChart data={areaData} emptyLabel="Nenhum acesso por área nos filtros atuais" />
          </ReportChartCapture>
        </div>

        <div className="cx-card p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Equipe</p>
              <h3 className="font-display text-lg font-black text-slate-950">Credenciamentos por operador</h3>
            </div>
            <BarChart3 size={21} className="text-emerald-700" />
          </div>
          <ReportChartCapture id="operator">
            <BIBarChart data={operatorData} emptyLabel="Sem operador associado aos check-ins filtrados" />
          </ReportChartCapture>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[0.92fr_1.08fr] gap-6">
        <div className="cx-card p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Heatmap</p>
              <h3 className="font-display text-lg font-black text-slate-950">Mapa de fluxo preparado</h3>
            </div>
            <Activity size={21} className="text-emerald-700" />
          </div>
          <ReportChartCapture id="heatmap">
            <BIHeatmapPreview data={hourlyData} />
          </ReportChartCapture>
        </div>

        <div className="cx-card p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Relatórios disponíveis</p>
              <h3 className="font-display text-lg font-black text-slate-950">Catálogo modular</h3>
            </div>
            <FileText size={21} className="text-emerald-700" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {reportDefinitions.map(report => (
              <div key={report.id} className="rounded-2xl border border-slate-200/80 bg-white/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-950">{report.title}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{report.description}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black ${
                    report.status === 'available' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {report.status === 'available' ? 'Ativo' : 'Preparado'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cx-card p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Performance e automação</p>
            <h3 className="font-display text-lg font-black text-slate-950">Preparado para grandes volumes</h3>
            <p className="mt-1 text-sm text-slate-500">
              Relatórios segmentados, filtros inteligentes, exportação CSV/Excel/PDF e polling sem WebSocket nesta fase.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {[
              ['Paginação', 'pronta'],
              ['Cache', 'local'],
              ['Polling', pollingEnabled ? 'ativo' : 'manual'],
              ['PDF', 'impressão']
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
                <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
