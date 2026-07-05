import type { CertificateTemplate, CertificateTemplateElement } from '../types';

export const DEFAULT_CERTIFICATE_TEMPLATE: CertificateTemplate = {
  id: 'default',
  eventId: '',
  name: 'Template padrÃ£o',
  orientation: 'landscape',
  pageSize: 'A4',
  backgroundImageUrl: '',
  logoUrl: '',
  elements: [
    { id: 'participant_name', type: 'text', label: 'Nome do participante', placeholder: '{{participant.name}}', x: 16, y: 34, width: 68, height: 8, fontFamily: 'Arial', fontSize: 30, color: '#0f172a', bold: true, italic: false, align: 'center', order: 1 },
    { id: 'event_name', type: 'text', label: 'Nome do evento', placeholder: '{{event.name}}', x: 16, y: 47, width: 68, height: 7, fontFamily: 'Arial', fontSize: 24, color: '#0f172a', bold: true, italic: false, align: 'center', order: 2 },
    { id: 'activity_title', type: 'text', label: 'Nome da atividade', placeholder: '{{activity.title}}', x: 16, y: 58, width: 68, height: 6, fontFamily: 'Arial', fontSize: 20, color: '#334155', bold: true, italic: false, align: 'center', order: 3 },
    { id: 'activity_speaker', type: 'text', label: 'Palestrante', placeholder: '{{activity.speakerName}}', x: 22, y: 67, width: 56, height: 5, fontFamily: 'Arial', fontSize: 16, color: '#475569', bold: false, italic: false, align: 'center', order: 4 },
    { id: 'certificate_hours', type: 'text', label: 'Carga horÃ¡ria', placeholder: '{{certificate.totalHours}} horas', fontSize: 22, order: 5 },
    { id: 'certificate_code', type: 'text', label: 'CÃ³digo do certificado', placeholder: '{{certificate.code}}', fontSize: 12, order: 6 },
    { id: 'certificate_issued_at', type: 'text', label: 'Data de emissÃ£o', placeholder: '{{certificate.issuedAt}}', fontSize: 12, order: 7 }
  ],
  createdAt: '',
  updatedAt: ''
};

export const CERTIFICATE_ELEMENT_PRESETS = [
  { label: 'Texto livre', placeholder: 'Texto livre' },
  { label: 'Nome participante', placeholder: '{{participant.name}}' },
  { label: 'Evento', placeholder: '{{event.name}}' },
  { label: 'Atividade', placeholder: '{{activity.title}}' },
  { label: 'Palestrante', placeholder: '{{activity.speakerName}}' },
  { label: 'Carga horÃ¡ria', placeholder: '{{certificate.totalHours}} horas' },
  { label: 'Data', placeholder: '{{certificate.issuedAt}}' },
  { label: 'CÃ³digo do certificado', placeholder: '{{certificate.code}}' }
];

export const getCertificateElementDefaults = (element: Partial<CertificateTemplateElement>, index: number): CertificateTemplateElement => {
  const fallbackPositions = [
    { x: 16, y: 34, width: 68, height: 8, fontSize: 30, align: 'center' as const, bold: true },
    { x: 16, y: 47, width: 68, height: 7, fontSize: 24, align: 'center' as const, bold: true },
    { x: 16, y: 58, width: 68, height: 6, fontSize: 20, align: 'center' as const, bold: true },
    { x: 22, y: 67, width: 56, height: 5, fontSize: 16, align: 'center' as const, bold: false },
    { x: 32, y: 75, width: 36, height: 6, fontSize: 20, align: 'center' as const, bold: true },
    { x: 8, y: 91, width: 34, height: 4, fontSize: 11, align: 'left' as const, bold: true },
    { x: 58, y: 91, width: 34, height: 4, fontSize: 11, align: 'right' as const, bold: true }
  ];
  const fallback = fallbackPositions[index] || { x: 20, y: 20, width: 40, height: 8, fontSize: 16, align: 'center' as const, bold: false };
  const type = element.type || 'text';

  return {
    id: element.id || `ctel_${Math.random().toString(36).slice(2, 9)}`,
    type,
    label: element.label || (type === 'image' ? 'Imagem' : 'Texto'),
    placeholder: element.placeholder || element.text || '',
    text: element.text || '',
    imageUrl: element.imageUrl || '',
    x: Number.isFinite(element.x) ? element.x : fallback.x,
    y: Number.isFinite(element.y) ? element.y : fallback.y,
    width: Number.isFinite(element.width) ? element.width : fallback.width,
    height: Number.isFinite(element.height) ? element.height : (type === 'image' ? 14 : fallback.height),
    fontFamily: element.fontFamily || 'Arial',
    fontSize: Number.isFinite(element.fontSize) ? element.fontSize : fallback.fontSize,
    color: element.color || '#0f172a',
    bold: element.bold !== undefined ? element.bold : fallback.bold,
    italic: element.italic === true,
    align: element.align || fallback.align,
    order: Number.isFinite(element.order) ? element.order : index + 1
  };
};

export const normalizeCertificateTemplate = (template?: Partial<CertificateTemplate>, eventId = ''): CertificateTemplate => ({
  ...DEFAULT_CERTIFICATE_TEMPLATE,
  ...template,
  eventId: template?.eventId || eventId,
  elements: (Array.isArray(template?.elements) && template.elements.length > 0
    ? template.elements
    : DEFAULT_CERTIFICATE_TEMPLATE.elements
  ).map(getCertificateElementDefaults)
});
