import type { ReportBrandConfig, ReportConfig, ReportModelConfig, ReportModelConfigMap, ReportOptionKey } from '../types';
import type { ReportPdfKind } from '../types/report.types';

export const DEFAULT_REPORT_BRAND_CONFIG: ReportBrandConfig = {
  showLogo: false,
  logoUrl: '',
  logoWidth: 38,
  logoPosition: 'left',
  showWatermark: false,
  watermarkUrl: '',
  watermarkOpacity: 0.08,
  watermarkSize: 118,
  watermarkPosition: 'center',
  organizationName: '',
  primaryColor: '#12e000',
  secondaryColor: '#0f3d2e',
  backgroundColor: '#06140e',
  titleColor: '#101828',
  textColor: '#334155'
};

export const DEFAULT_REPORT_CONFIG: ReportConfig = {
  summaryTotal: true,
  summaryCheckedIn: true,
  summaryPending: true,
  summaryAttendanceRate: true,
  summaryCredentialLinksViewed: true,
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
  participantAreaAccess: true,
  participantCredentialLinkStatus: true,
  participantCredentialFirstView: true,
  participantCredentialViewCount: true
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
      { key: 'summaryAttendanceRate', label: 'Percentual de presenca' },
      { key: 'summaryCredentialLinksViewed', label: 'Links de QR Code visualizados' }
    ]
  },
  {
    id: 'event',
    title: 'Dados do evento',
    description: 'Cabecalho e contexto do relatorio.',
    keys: [
      { key: 'eventName', label: 'Nome do evento' },
      { key: 'eventDate', label: 'Data do evento' },
      { key: 'eventCategory', label: 'Categoria' },
      { key: 'eventStatusFilter', label: 'Status filtrado' },
      { key: 'issuedAt', label: 'Data e hora de emissao do relatorio' }
    ]
  },
  {
    id: 'charts',
    title: 'Graficos e estatisticas',
    description: 'Blocos visuais de analise operacional.',
    keys: [
      { key: 'checkinsByHour', label: 'Check-ins por horario' },
      { key: 'participantsByCategory', label: 'Participantes por categoria' },
      { key: 'presenceBreakdown', label: 'Presentes x ausentes' },
      { key: 'areaAccess', label: 'Acessos por sala' },
      { key: 'areaAccessDecisions', label: 'Liberacoes e negacoes de acesso' }
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
      { key: 'participantCheckinTime', label: 'Horario do check-in' },
      { key: 'participantAreaAccess', label: 'Sala/acesso liberado ou negado' }
    ]
  },
  {
    id: 'credential-links',
    title: 'Links visualizados',
    description: 'Dados de abertura dos links individuais com QR Code.',
    keys: [
      { key: 'participantCredentialLinkStatus', label: 'Status do link' },
      { key: 'participantCredentialFirstView', label: 'Primeira visualizacao' },
      { key: 'participantCredentialViewCount', label: 'Quantidade de aberturas' }
    ]
  }
];

export const REPORT_OPTION_KEYS = REPORT_CONFIG_GROUPS.flatMap(group => group.keys.map(item => item.key));
export const REPORT_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';
export const REPORT_IMAGE_FORMATS = 'PNG, JPG/JPEG, WebP, GIF e SVG';

const defaultText = (text = '') => ({
  mode: 'auto' as const,
  text,
  fontSize: 10,
  bold: false,
  align: 'left' as const
});

const modelConfig = (title: string, overrides: Partial<ReportModelConfig> = {}): ReportModelConfig => ({
  optionConfig: { ...DEFAULT_REPORT_CONFIG },
  title: { ...defaultText(title), fontSize: 24, bold: true },
  eventName: { ...defaultText(), fontSize: 12, bold: true },
  organizationName: { ...defaultText(), fontSize: 10, bold: false },
  eventDate: defaultText(),
  eventLocation: defaultText(),
  eventStatus: defaultText(),
  filters: { ...defaultText(), fontSize: 8 },
  issuedAt: { ...defaultText(), fontSize: 8 },
  executiveSummary: { ...defaultText(), fontSize: 10 },
  metricTitles: {},
  hiddenMetricIds: [],
  chartTitles: {},
  hiddenChartKeys: [],
  tableVisibility: {
    participants: true,
    checkins: true,
    operators: true,
    access: true,
    credentialLinks: true,
    certificates: true,
    cloakroom: true,
    prints: true
  },
  sectionOrder: ['cover', 'event', 'summary', 'metrics', 'charts', 'participants', 'checkins', 'operators', 'access', 'credentialLinks', 'certificates', 'cloakroom', 'prints', 'conclusion'],
  ...overrides
});

export const REPORT_MODEL_OPTIONS: Array<{ kind: ReportPdfKind; label: string; description: string }> = [
  { kind: 'executive', label: 'Relatório Executivo', description: 'Indicadores, gráficos e análise para decisão.' },
  { kind: 'complete', label: 'Relatório Completo', description: 'Resumo com tabelas detalhadas e auditoria.' },
  { kind: 'summary', label: 'Relatório Resumido', description: 'Versão curta com os principais indicadores.' }
];

export const REPORT_CHART_OPTIONS = [
  { key: 'hourly', label: 'Check-ins por horário' },
  { key: 'presence', label: 'Presença' },
  { key: 'category', label: 'Categorias' },
  { key: 'area', label: 'Acessos por sala' },
  { key: 'operator', label: 'Operadores' }
];

export const REPORT_TABLE_OPTIONS: Array<{ key: keyof ReportModelConfig['tableVisibility']; label: string }> = [
  { key: 'participants', label: 'Participantes' },
  { key: 'checkins', label: 'Check-ins' },
  { key: 'operators', label: 'Operadores' },
  { key: 'access', label: 'Controle de acesso' },
  { key: 'credentialLinks', label: 'Links visualizados' },
  { key: 'certificates', label: 'Certificados' },
  { key: 'cloakroom', label: 'Chapelaria' },
  { key: 'prints', label: 'Impressões' }
];

export const DEFAULT_REPORT_MODEL_CONFIGS: ReportModelConfigMap = {
  executive: modelConfig('Relatório Executivo', {
    tableVisibility: {
      participants: false,
      checkins: false,
      operators: false,
      access: false,
      credentialLinks: false,
      certificates: false,
      cloakroom: false,
      prints: false
    }
  }),
  complete: modelConfig('Relatório Completo'),
  summary: modelConfig('Relatório Resumido', {
    optionConfig: {
      ...DEFAULT_REPORT_CONFIG,
      participantEmail: false,
      participantAreaAccess: false,
      participantCredentialFirstView: false
    },
    tableVisibility: {
      participants: false,
      checkins: false,
      operators: false,
      access: false,
      credentialLinks: false,
      certificates: false,
      cloakroom: false,
      prints: false
    }
  })
};

export const mergeReportModelConfigs = (saved?: Partial<ReportModelConfigMap> | null): ReportModelConfigMap => ({
  executive: { ...DEFAULT_REPORT_MODEL_CONFIGS.executive, ...(saved?.executive || {}), optionConfig: { ...DEFAULT_REPORT_CONFIG, ...(saved?.executive?.optionConfig || {}) } },
  complete: { ...DEFAULT_REPORT_MODEL_CONFIGS.complete, ...(saved?.complete || {}), optionConfig: { ...DEFAULT_REPORT_CONFIG, ...(saved?.complete?.optionConfig || {}) } },
  summary: { ...DEFAULT_REPORT_MODEL_CONFIGS.summary, ...(saved?.summary || {}), optionConfig: { ...DEFAULT_REPORT_MODEL_CONFIGS.summary.optionConfig, ...(saved?.summary?.optionConfig || {}) } }
});
