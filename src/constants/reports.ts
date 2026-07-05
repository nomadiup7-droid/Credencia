import type { ReportBrandConfig, ReportConfig, ReportOptionKey } from '../types';

export const DEFAULT_REPORT_BRAND_CONFIG: ReportBrandConfig = {
  showLogo: false,
  logoUrl: '',
  showWatermark: false,
  watermarkUrl: '',
  watermarkOpacity: 0.08
};

export const DEFAULT_REPORT_CONFIG: ReportConfig = {
  summaryTotal: true,
  summaryCheckedIn: true,
  summaryPending: true,
  summaryAttendanceRate: true,
  eventName: true,
  eventDate: true,
  eventCategory: true,
  eventStatusFilter: true,
  issuedAt: true,
  checkinsByHour: true,
  participantsByCategory: true,
  presenceBreakdown: true,
  areaAccess: true,
  areaAccessDecisions: true,
  participantName: true,
  participantCpf: true,
  participantEmail: true,
  participantPhone: false,
  participantCategory: true,
  participantCheckinStatus: true,
  participantCheckinTime: true,
  participantAreaAccess: true
};

export const REPORT_CONFIG_GROUPS: Array<{ id: string; title: string; description: string; keys: Array<{ key: ReportOptionKey; label: string }> }> = [
  {
    id: 'summary',
    title: 'Resumo geral',
    description: 'Indicadores principais do credenciamento.',
    keys: [
      { key: 'summaryTotal', label: 'Total de participantes' },
      { key: 'summaryCheckedIn', label: 'Check-ins realizados' },
      { key: 'summaryPending', label: 'Participantes pendentes' },
      { key: 'summaryAttendanceRate', label: 'Percentual de presença' }
    ]
  },
  {
    id: 'event',
    title: 'Dados do evento',
    description: 'Cabeçalho e contexto do relatório.',
    keys: [
      { key: 'eventName', label: 'Nome do evento' },
      { key: 'eventDate', label: 'Data do evento' },
      { key: 'eventCategory', label: 'Categoria' },
      { key: 'eventStatusFilter', label: 'Status filtrado' },
      { key: 'issuedAt', label: 'Data e hora de emissão do relatório' }
    ]
  },
  {
    id: 'charts',
    title: 'Gráficos e estatísticas',
    description: 'Blocos visuais de análise operacional.',
    keys: [
      { key: 'checkinsByHour', label: 'Check-ins por horário' },
      { key: 'participantsByCategory', label: 'Participantes por categoria' },
      { key: 'presenceBreakdown', label: 'Presentes x ausentes' },
      { key: 'areaAccess', label: 'Acessos por sala' },
      { key: 'areaAccessDecisions', label: 'Liberações e negações de acesso' }
    ]
  },
  {
    id: 'participants',
    title: 'Lista de participantes',
    description: 'Colunas da tabela impressa e exportada.',
    keys: [
      { key: 'participantName', label: 'Nome' },
      { key: 'participantCpf', label: 'CPF' },
      { key: 'participantEmail', label: 'E-mail' },
      { key: 'participantPhone', label: 'Telefone' },
      { key: 'participantCategory', label: 'Categoria' },
      { key: 'participantCheckinStatus', label: 'Status do check-in' },
      { key: 'participantCheckinTime', label: 'Horário do check-in' },
      { key: 'participantAreaAccess', label: 'Sala/acesso liberado ou negado' }
    ]
  }
];

export const REPORT_OPTION_KEYS = REPORT_CONFIG_GROUPS.flatMap(group => group.keys.map(item => item.key));
export const REPORT_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';
export const REPORT_IMAGE_FORMATS = 'PNG, JPG/JPEG, WebP, GIF e SVG';
