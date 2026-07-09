import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReportPdfChartKey, ReportPdfKind, ReportPdfPayload, ReportPdfProgress, ReportPdfTableRow } from '../types/report.types';
import {
  buildExecutiveSummary,
  captureReportChart,
  formatReportDateTime,
  formatReportNumber,
  getPeakFlowText,
  sanitizeReportFileName
} from '../utils/reportPdfHelpers';
import type { CapturedReportChart } from '../utils/reportPdfHelpers';

type JsPdfWithAutoTable = jsPDF & {
  lastAutoTable?: { finalY: number };
};

const pageWidth = 210;
const pageHeight = 297;
const margin = 16;
const contentWidth = pageWidth - margin * 2;
const green = '#12e000';
const darkGreen = '#0f3d2e';
const graphite = '#101828';
const muted = '#64748b';

const chartKeys: ReportPdfChartKey[] = ['visitorsByHour', 'presence', 'category', 'area', 'operator', 'heatmap'];

type ReportImage = {
  dataUrl: string;
  format: 'PNG' | 'JPEG' | 'WEBP';
};

const addFooter = (doc: jsPDF, payload: ReportPdfPayload) => {
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(muted);
    doc.text(`Gerado em ${formatReportDateTime(payload.generatedAt)}`, margin, pageHeight - 8);
    doc.text(`Pagina ${page} de ${total}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }
};

const addHeader = (doc: jsPDF, title: string, payload: ReportPdfPayload) => {
  doc.setFillColor(247, 250, 247);
  doc.rect(0, 0, pageWidth, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(darkGreen);
  doc.text('CREDENCIA', margin, 11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(muted);
  doc.text(title, pageWidth / 2, 11, { align: 'center' });
  doc.text(payload.eventName || 'Evento nao informado', pageWidth - margin, 11, { align: 'right' });
};

const addPage = (doc: jsPDF, title: string, payload: ReportPdfPayload) => {
  doc.addPage();
  addHeader(doc, title, payload);
};

const addSectionTitle = (doc: jsPDF, title: string, y: number) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(graphite);
  doc.text(title, margin, y);
  doc.setDrawColor(18, 224, 0);
  doc.setLineWidth(0.8);
  doc.line(margin, y + 4, margin + 32, y + 4);
};

const addParagraph = (doc: jsPDF, text: string, x: number, y: number, width = contentWidth, size = 10) => {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor('#334155');
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, x, y);
  return y + lines.length * (size * 0.44) + 4;
};

const addMetricCard = (doc: jsPDF, x: number, y: number, width: number, title: string, value: string, detail?: string) => {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, width, 27, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(muted);
  doc.text(title.toUpperCase(), x + 4, y + 7, { maxWidth: width - 8 });
  doc.setFontSize(15);
  doc.setTextColor(graphite);
  doc.text(value, x + 4, y + 17, { maxWidth: width - 8 });
  if (detail) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(muted);
    doc.text(detail, x + 4, y + 23, { maxWidth: width - 8 });
  }
};

const addChartImage = (doc: jsPDF, chart: CapturedReportChart | null, x: number, y: number, width: number, height: number, fallback: string) => {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, width, height, 4, 4, 'FD');

  if (chart) {
    const padding = 5;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;
    const ratio = chart.width / chart.height;
    let drawWidth = availableWidth;
    let drawHeight = drawWidth / ratio;

    if (drawHeight > availableHeight) {
      drawHeight = availableHeight;
      drawWidth = drawHeight * ratio;
    }

    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;
    doc.addImage(chart.dataUrl, 'PNG', drawX, drawY, drawWidth, drawHeight, undefined, 'FAST');
    return;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(muted);
  doc.text(fallback, x + width / 2, y + height / 2, { align: 'center', maxWidth: width - 18 });
};

const loadImageDataUrl = async (src?: string): Promise<ReportImage | null> => {
  if (!src) return null;
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const format = dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')
      ? 'JPEG'
      : dataUrl.includes('image/webp')
        ? 'WEBP'
        : 'PNG';
    return { dataUrl, format };
  } catch {
    return null;
  }
};

const addTable = (doc: JsPdfWithAutoTable, payload: ReportPdfPayload, title: string, rows: ReportPdfTableRow[], columns: string[]) => {
  addPage(doc, title, payload);
  addSectionTitle(doc, title, 32);
  if (rows.length === 0) {
    addParagraph(doc, 'Nao ha dados disponiveis para esta secao nos filtros atuais.', margin, 48);
    return;
  }

  autoTable(doc, {
    startY: 45,
    head: [columns],
    body: rows.map(row => columns.map(column => String(row[column] ?? '-'))),
    margin: { left: margin, right: margin, top: 24, bottom: 18 },
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [15, 61, 46], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: () => addHeader(doc, title, payload)
  });
};

const addCover = (doc: jsPDF, payload: ReportPdfPayload, logoImage: ReportImage | null) => {
  doc.setFillColor(6, 20, 14);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.setFillColor(18, 224, 0);
  doc.circle(pageWidth - 34, 30, 28, 'F');
  doc.setFillColor(15, 61, 46);
  doc.circle(pageWidth - 22, 46, 22, 'F');

  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  if (logoImage) {
    doc.addImage(logoImage.dataUrl, logoImage.format, margin, 22, 42, 13, undefined, 'FAST');
  } else {
    doc.text('CREDENCIA', margin, 32);
  }

  doc.setFontSize(30);
  doc.text('Relatorio Executivo', margin, 92);
  doc.text('de Credenciamento', margin, 105);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor('#dbeafe');
  doc.text(payload.eventName || 'Evento nao informado', margin, 121);
  doc.text(`Data: ${payload.eventDate || 'Nao informado'}`, margin, 130);
  if (payload.eventLocation) doc.text(`Local: ${payload.eventLocation}`, margin, 139);
  if (payload.organizationName) doc.text(`Organizacao: ${payload.organizationName}`, margin, 148);
  doc.text(`Gerado em: ${formatReportDateTime(payload.generatedAt)}`, margin, 157);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 184, contentWidth, 48, 4, 4, 'F');
  addParagraph(
    doc,
    buildExecutiveSummary(payload.eventName, payload.summary.total, payload.summary.checkedIn, payload.summary.pending),
    margin + 8,
    198,
    contentWidth - 16,
    10
  );
};

const addMetricPages = (doc: jsPDF, payload: ReportPdfPayload) => {
  addPage(doc, 'Indicadores principais', payload);
  addSectionTitle(doc, 'Indicadores principais', 32);
  payload.metrics.forEach((metric, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    addMetricCard(
      doc,
      margin + col * ((contentWidth / 2) + 4),
      48 + row * 34,
      contentWidth / 2 - 4,
      metric.title,
      String(metric.value),
      metric.detail
    );
  });
};

const addVisualPages = (doc: jsPDF, payload: ReportPdfPayload, charts: Partial<Record<ReportPdfChartKey, CapturedReportChart | null>>, kind: ReportPdfKind) => {
  addPage(doc, 'Fluxo operacional', payload);
  addSectionTitle(doc, 'Fluxo operacional', 32);
  addChartImage(doc, charts.visitorsByHour || null, margin, 46, contentWidth, 80, 'Sem fluxo por hora nos filtros atuais');
  addParagraph(doc, getPeakFlowText(payload.hourlyData), margin, 140);

  addPage(doc, 'Presenca', payload);
  addSectionTitle(doc, 'Presenca', 32);
  addChartImage(doc, charts.presence || null, margin, 46, contentWidth, 80, 'Sem dados de presenca nos filtros atuais');
  addParagraph(doc, `Presenca: ${payload.summary.attendanceRate}%. Ausencia: ${Math.max(0, 100 - payload.summary.attendanceRate)}%.`, margin, 140);

  if (kind !== 'summary') {
    addPage(doc, 'Categorias e areas', payload);
    addSectionTitle(doc, 'Categorias e areas', 32);
    addChartImage(doc, charts.category || null, margin, 46, contentWidth, 70, 'Sem categorias nos filtros atuais');
    addChartImage(doc, charts.area || null, margin, 130, contentWidth, 70, 'Nenhum acesso por area nos filtros atuais');

    addPage(doc, 'Equipe', payload);
    addSectionTitle(doc, 'Equipe', 32);
    addChartImage(doc, charts.operator || null, margin, 46, contentWidth, 80, 'Sem operador associado aos check-ins filtrados');

    addPage(doc, 'Heatmap / fluxo', payload);
    addSectionTitle(doc, 'Heatmap / fluxo', 32);
    addChartImage(doc, charts.heatmap || null, margin, 46, contentWidth, 70, 'Mapa de fluxo preparado para eventos com controle de acesso por area.');
    addParagraph(doc, 'Mapa de fluxo preparado para eventos com controle de acesso por area.', margin, 132);
  }
};

const addSummaryReport = (doc: jsPDF, payload: ReportPdfPayload, charts: Partial<Record<ReportPdfChartKey, CapturedReportChart | null>>, logoImage: ReportImage | null) => {
  addCover(doc, payload, logoImage);
  addPage(doc, 'Resumo', payload);
  addSectionTitle(doc, 'Resumo do evento', 32);
  const cards = [
    ['Inscritos', formatReportNumber(payload.summary.total)],
    ['Presentes', formatReportNumber(payload.summary.checkedIn)],
    ['Pendentes', formatReportNumber(payload.summary.pending)],
    ['Presenca', `${payload.summary.attendanceRate}%`]
  ];
  cards.forEach(([title, value], index) => {
    addMetricCard(doc, margin + (index % 2) * ((contentWidth / 2) + 4), 48 + Math.floor(index / 2) * 34, contentWidth / 2 - 4, title, value);
  });
  addChartImage(doc, charts.presence || null, margin, 128, contentWidth, 74, 'Sem dados de presenca nos filtros atuais');
  addParagraph(doc, buildExecutiveSummary(payload.eventName, payload.summary.total, payload.summary.checkedIn, payload.summary.pending), margin, 218);
};

export async function generateReportPdf(payload: ReportPdfPayload, kind: ReportPdfKind, onProgress?: ReportPdfProgress) {
  onProgress?.('Capturando gráficos...');
  const chartEntries = await Promise.all(chartKeys.map(async key => [key, await captureReportChart(key)] as const));
  const charts = Object.fromEntries(chartEntries) as Partial<Record<ReportPdfChartKey, CapturedReportChart | null>>;
  const logoImage = await loadImageDataUrl(payload.logoUrl);

  onProgress?.('Montando PDF...');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true }) as JsPdfWithAutoTable;

  if (kind === 'summary') {
    addSummaryReport(doc, payload, charts, logoImage);
  } else {
    addCover(doc, payload, logoImage);
    addMetricPages(doc, payload);
    addVisualPages(doc, payload, charts, kind);

    addPage(doc, 'Conclusao', payload);
    addSectionTitle(doc, 'Conclusao executiva', 32);
    addParagraph(doc, buildExecutiveSummary(payload.eventName, payload.summary.total, payload.summary.checkedIn, payload.summary.pending), margin, 48);

    if (kind === 'complete') {
      addTable(doc, payload, 'Participantes', payload.participantRows, ['Nome', 'CPF', 'Categoria', 'Status', 'Horario do check-in', 'Operador']);
      addTable(doc, payload, 'Acessos por area', payload.areaRows, ['Area', 'Liberados', 'Negados', 'Total']);
      addTable(doc, payload, 'Operadores', payload.operatorRows, ['Operador', 'Credenciamentos']);
      addTable(
        doc,
        payload,
        'Chapelaria',
        payload.cloakroomItems.map(item => ({
          Ticket: item.tagNumber,
          Participante: item.participantName,
          Volumes: item.volumeCount || 1,
          Status: item.status,
          Entrada: item.registeredAt ? new Date(item.registeredAt).toLocaleString('pt-BR') : '-',
          Retirada: item.returnedAt ? new Date(item.returnedAt).toLocaleString('pt-BR') : '-'
        })),
        ['Ticket', 'Participante', 'Volumes', 'Status', 'Entrada', 'Retirada']
      );
      addTable(
        doc,
        payload,
        'Etiquetas e impressoes',
        [{ Indicador: 'Reimpressoes registradas', Total: payload.printedLabelsCount }],
        ['Indicador', 'Total']
      );
    }
  }

  addFooter(doc, payload);
  onProgress?.('PDF gerado com sucesso.');
  doc.save(`${sanitizeReportFileName(payload.eventName)}_${kind}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
