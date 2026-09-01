import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReportPdfKind, ReportPdfPayload, ReportPdfProgress, ReportPdfTableRow } from '../types/report.types';
import { formatReportDateTime, formatReportNumber, getPeakFlowText, sanitizeReportFileName } from '../utils/reportPdfHelpers';

type JsPdfWithAutoTable = jsPDF & {
  lastAutoTable?: { finalY: number };
};

type ReportImage = {
  dataUrl: string;
  format: 'PNG' | 'JPEG' | 'WEBP';
};

const pageWidth = 210;
const pageHeight = 297;
const margin = 14;
const contentWidth = pageWidth - margin * 2;
const graphite = '#101828';
const muted = '#64748b';
const dark = '#07110d';

const reportTitleByKind: Record<ReportPdfKind, string> = {
  executive: 'Relatório Executivo',
  complete: 'Relatório Completo',
  summary: 'Relatório Resumido'
};

const toNumber = (value: string | number | boolean | null | undefined) => {
  if (typeof value === 'number') return value;
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const hasValues = (items: Array<{ value: number }>) => items.some(item => item.value > 0);

const formatDateStamp = (date: Date) => {
  const formatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
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

const addLogo = (doc: jsPDF, logoImage: ReportImage | null, x: number, y: number, darkBackground = false) => {
  if (logoImage) {
    if (darkBackground) {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x - 2, y - 2, 42, 14, 2, 2, 'F');
    }
    doc.addImage(logoImage.dataUrl, logoImage.format, x, y, 38, 10, undefined, 'FAST');
    return;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(darkBackground ? '#ffffff' : dark);
  doc.text('CREDENCIA', x, y + 8);
};

const addWatermark = (doc: jsPDF, watermarkImage: ReportImage | null, payload: ReportPdfPayload) => {
  if (!watermarkImage || !payload.brandConfig?.showWatermark) return;
  const GState = (doc as any).GState;
  if (!GState) return;
  doc.setGState(new GState({ opacity: Math.min(Math.max(payload.watermarkOpacity ?? 0.16, 0.06), 0.3) }));
  doc.addImage(watermarkImage.dataUrl, watermarkImage.format, 46, 86, 118, 118, undefined, 'FAST');
  doc.setGState(new GState({ opacity: 1 }));
};

const addHeader = (doc: jsPDF, payload: ReportPdfPayload, title: string, logoImage: ReportImage | null, watermarkImage: ReportImage | null) => {
  addWatermark(doc, watermarkImage, payload);
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, 18, 'F');
  addLogo(doc, logoImage, margin, 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(graphite);
  doc.text(title, pageWidth / 2, 11, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(muted);
  doc.text(payload.scope === 'organization' ? 'Organização' : payload.eventName, pageWidth - margin, 11, { align: 'right', maxWidth: 65 });
};

const addFooter = (doc: jsPDF, payload: ReportPdfPayload) => {
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(muted);
    doc.text(`Gerado em ${formatReportDateTime(payload.generatedAt)}`, margin, pageHeight - 7);
    doc.text(`Página ${page} de ${total}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }
};

const addPage = (doc: jsPDF, payload: ReportPdfPayload, title: string, logoImage: ReportImage | null, watermarkImage: ReportImage | null) => {
  doc.addPage();
  addHeader(doc, payload, title, logoImage, watermarkImage);
};

const addTitle = (doc: jsPDF, text: string, y: number) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(graphite);
  doc.text(text, margin, y);
  doc.setDrawColor(18, 224, 0);
  doc.setLineWidth(0.8);
  doc.line(margin, y + 4, margin + 30, y + 4);
};

const addParagraph = (doc: jsPDF, text: string, x: number, y: number, width = contentWidth, size = 10) => {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor('#334155');
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, x, y);
  return y + lines.length * (size * 0.45) + 4;
};

const addMetricCard = (doc: jsPDF, x: number, y: number, width: number, title: string, value: string, detail?: string) => {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, width, 26, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(muted);
  doc.text(title.toUpperCase(), x + 4, y + 7, { maxWidth: width - 8 });
  doc.setFontSize(14);
  doc.setTextColor(graphite);
  doc.text(value, x + 4, y + 17, { maxWidth: width - 8 });
  if (detail) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(muted);
    doc.text(detail, x + 4, y + 23, { maxWidth: width - 8 });
  }
};

const drawBarChart = (doc: jsPDF, title: string, items: Array<{ label: string; value: number }>, x: number, y: number, width: number, height: number, suffix = '') => {
  if (!hasValues(items)) return y;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, width, height, 4, 4, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(graphite);
  doc.text(title, x + 5, y + 8);
  const visible = items.filter(item => item.value > 0).slice(0, 8);
  const max = Math.max(...visible.map(item => item.value), 1);
  let rowY = y + 18;
  visible.forEach(item => {
    const barWidth = Math.max(8, ((width - 56) * item.value) / max);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor('#334155');
    doc.text(String(item.label), x + 5, rowY, { maxWidth: 42 });
    doc.setFillColor(18, 224, 0);
    doc.roundedRect(x + 48, rowY - 4, barWidth, 5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(graphite);
    doc.text(`${formatReportNumber(item.value)}${suffix}`, x + width - 5, rowY, { align: 'right' });
    rowY += 8;
  });
  return y + height + 5;
};

const addTable = (doc: JsPdfWithAutoTable, payload: ReportPdfPayload, title: string, rows: ReportPdfTableRow[], columns: string[], logoImage: ReportImage | null, watermarkImage: ReportImage | null) => {
  if (rows.length === 0) return;
  addPage(doc, payload, title, logoImage, watermarkImage);
  addTitle(doc, title, 32);
  autoTable(doc, {
    startY: 44,
    head: [columns],
    body: rows.map(row => columns.map(column => String(row[column] ?? '-'))),
    margin: { left: margin, right: margin, top: 24, bottom: 18 },
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 2.2, overflow: 'linebreak', lineColor: [226, 232, 240], lineWidth: 0.1 },
    headStyles: { fillColor: [15, 61, 46], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    rowPageBreak: 'avoid',
    didDrawPage: () => addHeader(doc, payload, title, logoImage, watermarkImage)
  });
};

const buildConclusion = (payload: ReportPdfPayload) => {
  if (payload.scope === 'organization') {
    return `A organização analisada possui ${formatReportNumber(payload.organizationEventRows?.length || 0)} evento(s) nos filtros atuais, com ${formatReportNumber(payload.summary.total)} participante(s) e ${formatReportNumber(payload.summary.checkedIn)} check-in(s). A taxa geral de presença é de ${payload.summary.attendanceRate}%. ${payload.summary.pending > 0 ? `Ainda há ${formatReportNumber(payload.summary.pending)} participante(s) pendente(s) no conjunto analisado.` : 'Não há pendências de presença no conjunto analisado.'}`;
  }
  const peakText = payload.hourlyData.length > 0 ? getPeakFlowText(payload.hourlyData) : '';
  return `O evento ${payload.eventName} apresenta ${formatReportNumber(payload.summary.total)} participante(s), ${formatReportNumber(payload.summary.checkedIn)} check-in(s) realizado(s) e presença de ${payload.summary.attendanceRate}%. ${payload.summary.pending > 0 ? `Ainda restam ${formatReportNumber(payload.summary.pending)} participante(s) pendente(s).` : 'Todos os participantes filtrados constam como presentes.'} ${peakText} ${payload.operatorData.length > 0 ? `A operação registrou atuação de ${formatReportNumber(payload.operatorData.length)} operador(es).` : 'Não há operador associado aos check-ins filtrados.'}`;
};

const addCover = (doc: jsPDF, payload: ReportPdfPayload, kind: ReportPdfKind, logoImage: ReportImage | null) => {
  doc.setFillColor(6, 20, 14);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.setFillColor(18, 224, 0);
  doc.circle(pageWidth - 34, 30, 24, 'F');
  addLogo(doc, logoImage, margin, 22, true);
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.text(reportTitleByKind[kind], margin, 82);
  doc.setFontSize(16);
  doc.text(payload.scope === 'organization' ? 'Organização' : payload.eventName, margin, 99, { maxWidth: contentWidth - 20 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor('#dbeafe');
  const details = [
    payload.organizationName ? `Organização: ${payload.organizationName}` : '',
    payload.scope === 'event' && payload.eventDate ? `Data: ${payload.eventDate}` : '',
    payload.scope === 'event' && payload.eventLocation ? `Local: ${payload.eventLocation}` : '',
    payload.eventStatus ? `Status: ${payload.eventStatus}` : '',
    payload.filters?.length ? `Filtros: ${payload.filters.join(' | ')}` : '',
    `Emitido em: ${formatReportDateTime(payload.generatedAt)}`
  ].filter(Boolean);
  details.forEach((line, index) => doc.text(line, margin, 119 + index * 8, { maxWidth: contentWidth }));
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 190, contentWidth, 48, 4, 4, 'F');
  addParagraph(doc, buildConclusion(payload), margin + 8, 205, contentWidth - 16, 10);
};

const addMetrics = (doc: jsPDF, payload: ReportPdfPayload, y: number, maxItems = 8) => {
  payload.metrics.slice(0, maxItems).forEach((metric, index) => {
    addMetricCard(
      doc,
      margin + (index % 2) * ((contentWidth / 2) + 4),
      y + Math.floor(index / 2) * 32,
      contentWidth / 2 - 4,
      metric.title,
      String(metric.value),
      metric.detail
    );
  });
};

const addExecutive = (doc: JsPdfWithAutoTable, payload: ReportPdfPayload, logoImage: ReportImage | null, watermarkImage: ReportImage | null) => {
  addCover(doc, payload, 'executive', logoImage);
  addPage(doc, payload, 'Indicadores e gráficos', logoImage, watermarkImage);
  addTitle(doc, 'Indicadores e gráficos', 32);
  addMetrics(doc, payload, 46, 8);
  const chartY = 178;
  if (payload.scope === 'event') {
    drawBarChart(doc, 'Check-ins por horário', payload.hourlyData, margin, chartY, 86, 64);
    drawBarChart(doc, 'Categorias', payload.categoryData, margin + 94, chartY, 86, 64);
    drawBarChart(doc, 'Operadores', payload.operatorData, margin, 247, contentWidth, 32);
  } else {
    drawBarChart(doc, 'Comparativo entre eventos', payload.categoryData, margin, chartY, 86, 64);
    drawBarChart(doc, 'Presença por eventos', payload.organizationEventRows?.map(row => ({ label: String(row.Evento), value: toNumber(row.Presença) })) || [], margin + 94, chartY, 86, 64, '%');
    drawBarChart(doc, 'Comparativo por operadores', payload.operatorData, margin, 247, contentWidth, 32);
  }
  addPage(doc, payload, 'Análise executiva', logoImage, watermarkImage);
  addTitle(doc, 'Análise executiva', 32);
  addParagraph(doc, buildConclusion(payload), margin, 48, contentWidth, 11);
};

const addSummary = (doc: JsPdfWithAutoTable, payload: ReportPdfPayload, logoImage: ReportImage | null, watermarkImage: ReportImage | null) => {
  addHeader(doc, payload, 'Relatório Resumido', logoImage, watermarkImage);
  addTitle(doc, payload.scope === 'organization' ? 'Resumo da organização' : 'Resumo do evento', 34);
  let y = addParagraph(doc, payload.scope === 'organization' ? (payload.organizationName || 'Organização') : payload.eventName, margin, 48, contentWidth, 12);
  if (payload.filters?.length) y = addParagraph(doc, `Filtros: ${payload.filters.join(' | ')}`, margin, y, contentWidth, 8);
  addMetrics(doc, payload, y + 4, 8);
  const chartY = y + 136;
  drawBarChart(doc, 'Presença', payload.presenceData, margin, chartY, 56, 56);
  drawBarChart(doc, payload.scope === 'organization' ? 'Eventos' : 'Categorias', payload.categoryData, margin + 62, chartY, 56, 56);
  drawBarChart(doc, payload.scope === 'organization' ? 'Operadores' : 'Check-ins por horário', payload.scope === 'organization' ? payload.operatorData : payload.hourlyData, margin + 124, chartY, 56, 56);
  addParagraph(doc, buildConclusion(payload), margin, 252, contentWidth, 9);
};

const addComplete = (doc: JsPdfWithAutoTable, payload: ReportPdfPayload, logoImage: ReportImage | null, watermarkImage: ReportImage | null) => {
  addCover(doc, payload, 'complete', logoImage);
  addPage(doc, payload, 'Resumo geral', logoImage, watermarkImage);
  addTitle(doc, payload.scope === 'organization' ? 'Resumo da organização' : 'Resumo do evento', 32);
  addMetrics(doc, payload, 46, 10);
  drawBarChart(doc, 'Presença', payload.presenceData, margin, 215, 56, 48);
  drawBarChart(doc, payload.scope === 'organization' ? 'Comparativo entre eventos' : 'Categorias', payload.categoryData, margin + 62, 215, 56, 48);
  drawBarChart(doc, 'Operadores', payload.operatorData, margin + 124, 215, 56, 48);

  if (payload.scope === 'organization') {
    addTable(doc, payload, 'Tabela consolidada de eventos', payload.organizationEventRows || [], ['Evento', 'Data', 'Status', 'Participantes', 'Check-ins', 'Pendentes', 'Presença', 'Local'], logoImage, watermarkImage);
  } else {
    addTable(doc, payload, 'Participantes', payload.participantRows, ['Nome', 'CPF', 'Categoria', 'Status', 'Horario do check-in', 'Operador'], logoImage, watermarkImage);
    addTable(doc, payload, 'Check-ins por operador', payload.operatorRows, ['Operador', 'Credenciamentos'], logoImage, watermarkImage);
    addTable(doc, payload, 'Controle de acesso', payload.areaRows, ['Area', 'Liberados', 'Negados', 'Total'], logoImage, watermarkImage);
    addTable(doc, payload, 'Links visualizados', payload.linksRows || [], ['Participante', 'Status', 'Primeira visualização', 'Aberturas'], logoImage, watermarkImage);
    addTable(doc, payload, 'Certificados', payload.certificateRows || [], ['Código', 'Participante', 'Tipo', 'Atividade', 'Horas', 'Emissão'], logoImage, watermarkImage);
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
      ['Ticket', 'Participante', 'Volumes', 'Status', 'Entrada', 'Retirada'],
      logoImage,
      watermarkImage
    );
    if (payload.printedLabelsCount > 0) {
      addTable(doc, payload, 'Impressões', [{ Indicador: 'Reimpressões registradas', Total: payload.printedLabelsCount }], ['Indicador', 'Total'], logoImage, watermarkImage);
    }
  }

  addPage(doc, payload, 'Conclusão', logoImage, watermarkImage);
  addTitle(doc, 'Conclusão', 32);
  addParagraph(doc, buildConclusion(payload), margin, 48, contentWidth, 11);
};

export async function generateReportPdf(payload: ReportPdfPayload, kind: ReportPdfKind, onProgress?: ReportPdfProgress) {
  onProgress?.('Carregando identidade visual...');
  const [logoImage, watermarkImage] = await Promise.all([
    loadImageDataUrl(payload.logoUrl),
    loadImageDataUrl(payload.watermarkUrl)
  ]);

  onProgress?.('Montando PDF...');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true }) as JsPdfWithAutoTable;

  if (kind === 'summary') {
    addSummary(doc, payload, logoImage, watermarkImage);
  } else if (kind === 'executive') {
    addExecutive(doc, payload, logoImage, watermarkImage);
  } else {
    addComplete(doc, payload, logoImage, watermarkImage);
  }

  addFooter(doc, payload);
  onProgress?.('PDF gerado com sucesso.');
  const baseName = payload.scope === 'organization' ? 'RELATORIO_GERAL' : payload.eventName;
  doc.save(`${sanitizeReportFileName(baseName)}_${kind}_${formatDateStamp(payload.generatedAt)}.pdf`);
}
