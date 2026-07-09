import { toPng } from 'html-to-image';
import type { ReportPdfChartKey } from '../types/report.types';

export type CapturedReportChart = {
  dataUrl: string;
  width: number;
  height: number;
};

export const reportChartSelectors: Record<ReportPdfChartKey, string> = {
  visitorsByHour: '[data-report-chart="visitorsByHour"]',
  presence: '[data-report-chart="presence"]',
  category: '[data-report-chart="category"]',
  area: '[data-report-chart="area"]',
  operator: '[data-report-chart="operator"]',
  heatmap: '[data-report-chart="heatmap"]'
};

export const formatReportNumber = (value: number) =>
  new Intl.NumberFormat('pt-BR').format(value);

export const formatReportDateTime = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);

export const sanitizeReportFileName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'relatorio';

export const captureReportChart = async (key: ReportPdfChartKey) => {
  const element = document.querySelector<HTMLElement>(reportChartSelectors[key]);
  if (!element) return null;
  const rect = element.getBoundingClientRect();

  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    style: {
      transform: 'none'
    }
  });

  return {
    dataUrl,
    width: Math.max(1, rect.width),
    height: Math.max(1, rect.height)
  };
};

export const getPeakFlowText = (data: Array<{ label: string; value: number }>) => {
  if (data.length === 0) return 'Ainda não há fluxo de check-in suficiente para identificar um pico operacional.';
  const peak = [...data].sort((a, b) => b.value - a.value)[0];
  if (!peak || peak.value === 0) return 'Ainda não há fluxo de check-in suficiente para identificar um pico operacional.';
  return `O maior fluxo registrado ocorreu em ${peak.label}, com ${formatReportNumber(peak.value)} credenciamento(s).`;
};

export const buildExecutiveSummary = (eventName: string, total: number, checkedIn: number, pending: number) =>
  `O evento ${eventName} registrou ${formatReportNumber(total)} participante(s) inscrito(s), com ${formatReportNumber(checkedIn)} credenciamento(s) realizado(s) até o momento. O volume de pendentes é de ${formatReportNumber(pending)} participante(s). Os dados deste relatório consolidam a operação de credenciamento e apoiam a análise executiva de presença do evento.`;
