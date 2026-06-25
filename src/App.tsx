import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  QrCode,
  FolderLock,
  BarChart3,
  LogOut,
  Plus,
  Search,
  Check,
  FileText,
  XCircle,
  Sparkles,
  Building,
  AlertTriangle,
  Download,
  Upload,
  UserCheck,
  Trash2,
  Tag,
  History,
  Info,
  ShieldAlert,
  Edit,
  RefreshCw,
  Printer,
  ChevronRight,
  ArrowRight,
  Sliders,
  Settings,
  Camera,
  X,
  ShieldCheck,
  MoreHorizontal,
  Sun,
  Moon,
  ClipboardCheck,
  BookOpen,
  Award
} from 'lucide-react';
import PrintCredential from './components/PrintCredential';
import LabelConfigTab from './components/LabelConfigTab';
import Dashboard from './components/Dashboard';
import StatsCard from './components/StatsCard';
import EventsPage from './pages/EventsPage';
import CheckinPage from './pages/CheckinPage';
import ScanAccessControlPage from './pages/ScanAccessControlPage';
import CheckInModular from './pages/CheckInModular';
import UserQRCode from './components/UserQRCode';
import FieldsConfig from './components/FieldsConfig';
import AreaAccessControl from './components/AreaAccessControl';
import credenciaLogo from './assets/credencia-logo-lockup.png';
import { User, Event, Participant, CloakroomItem, DashboardStats, ParticipantCategory, UserRole, EventUserRole, EventUser, Area, AccessProfile, CloakroomLabelConfig, Activity, Certificate, CertificateTemplate, CertificateTemplateElement } from './types';

// Sleek CSS Color mapping & constants
const CATEGORY_TAGS: Record<ParticipantCategory, { bg: string, text: string, border: string }> = {
  VIP: { bg: 'bg-amber-100 text-amber-800', text: 'text-amber-800', border: 'border-amber-200' },
  Palestrante: { bg: 'bg-purple-100 text-purple-800', text: 'text-purple-800', border: 'border-purple-200' },
  Expositor: { bg: 'bg-teal-100 text-teal-800', text: 'text-teal-800', border: 'border-teal-200' },
  Participante: { bg: 'bg-blue-100 text-blue-800', text: 'text-blue-800', border: 'border-blue-200' },
  Staff: { bg: 'bg-rose-100 text-rose-800', text: 'text-rose-800', border: 'border-rose-200' }
};

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

type ImportTargetField = 'name' | 'cpf' | 'email' | 'company' | 'category' | 'ticketCode' | 'areas' | 'profile' | 'ignore';

interface ImportTemplate {
  id: string;
  name: string;
  eventId?: string;
  global: boolean;
  mapping: Record<string, ImportTargetField>;
  fieldOrder: ImportTargetField[];
  updatedAt: string;
}

const IMPORT_TARGET_OPTIONS: Array<{ value: ImportTargetField; label: string }> = [
  { value: 'name', label: 'Nome' },
  { value: 'cpf', label: 'CPF' },
  { value: 'email', label: 'Email' },
  { value: 'company', label: 'Empresa' },
  { value: 'category', label: 'Categoria' },
  { value: 'ticketCode', label: 'Codigo QR / Codigo do ingresso' },
  { value: 'areas', label: 'Area de acesso' },
  { value: 'profile', label: 'Perfil de acesso' },
  { value: 'ignore', label: 'Ignorar coluna' }
];

const DEFAULT_IMPORT_FIELD_ORDER: ImportTargetField[] = ['name', 'cpf', 'email', 'company', 'category', 'ticketCode', 'areas', 'profile'];
const IMPORT_TEMPLATES_STORAGE_KEY = 'credencia_import_templates';

interface PermissionDefinition {
  id: string;
  label: string;
}

interface PermissionGroupDefinition {
  id: string;
  title: string;
  icon: React.ElementType;
  permissions: PermissionDefinition[];
}

const PERMISSION_GROUPS: PermissionGroupDefinition[] = [
  {
    id: 'events',
    title: 'Eventos',
    icon: Calendar,
    permissions: [
      { id: 'events.view', label: 'Visualizar eventos' },
      { id: 'events.create', label: 'Criar eventos' },
      { id: 'events.edit', label: 'Editar eventos' },
      { id: 'events.delete', label: 'Excluir eventos' },
      { id: 'events.configure', label: 'Configurar eventos' }
    ]
  },
  {
    id: 'participants',
    title: 'Participantes',
    icon: Users,
    permissions: [
      { id: 'participants.view', label: 'Visualizar participantes' },
      { id: 'participants.create', label: 'Cadastrar participantes' },
      { id: 'participants.edit', label: 'Editar participantes' },
      { id: 'participants.delete', label: 'Excluir participantes' },
      { id: 'participants.import', label: 'Importar participantes' },
      { id: 'participants.export', label: 'Exportar participantes' }
    ]
  },
  {
    id: 'checkin',
    title: 'Check-in',
    icon: CheckCircle2,
    permissions: [
      { id: 'checkin.access', label: 'Acessar tela de Check-in' },
      { id: 'checkin.perform', label: 'Fazer Check-in' },
      { id: 'checkin.reprint', label: 'Reimprimir credencial' },
      { id: 'checkin.createParticipant', label: 'Cadastrar participante durante o Check-in' }
    ]
  },
  {
    id: 'access',
    title: 'Controle de Acesso',
    icon: ShieldCheck,
    permissions: [
      { id: 'access.scanQr', label: 'Scanner QR Code' },
      { id: 'access.rooms', label: 'Controle de Salas' },
      { id: 'access.restaurants', label: 'Controle de Restaurantes' },
      { id: 'access.shows', label: 'Controle de Shows' },
      { id: 'access.manageAreas', label: 'Gerenciar Areas' }
    ]
  },
  {
    id: 'cloakroom',
    title: 'Chapelaria',
    icon: FolderLock,
    permissions: [
      { id: 'cloakroom.checkin', label: 'Registrar entrada' },
      { id: 'cloakroom.checkout', label: 'Registrar retirada' },
      { id: 'cloakroom.reprint', label: 'Reimprimir etiquetas' }
    ]
  },
  {
    id: 'certificates',
    title: 'Certificados',
    icon: Award,
    permissions: [
      { id: 'certificates.issue', label: 'Emitir certificados' },
      { id: 'certificates.manageActivities', label: 'Gerenciar atividades' },
      { id: 'certificates.editTemplate', label: 'Editar template de certificado' }
    ]
  },
  {
    id: 'print',
    title: 'Impressao',
    icon: Printer,
    permissions: [
      { id: 'print.configureLabels', label: 'Configurar etiquetas' },
      { id: 'print.configureBadges', label: 'Configurar crachas' },
      { id: 'print.labels', label: 'Imprimir etiquetas' },
      { id: 'print.badges', label: 'Imprimir crachas' }
    ]
  },
  {
    id: 'reports',
    title: 'Relatorios',
    icon: Download,
    permissions: [
      { id: 'reports.view', label: 'Visualizar relatorios' },
      { id: 'reports.exportExcel', label: 'Exportar Excel' },
      { id: 'reports.exportPdf', label: 'Exportar PDF' }
    ]
  },
  {
    id: 'operators',
    title: 'Operadores',
    icon: UserCheck,
    permissions: [
      { id: 'operators.create', label: 'Criar operadores' },
      { id: 'operators.edit', label: 'Editar operadores' },
      { id: 'operators.delete', label: 'Excluir operadores' },
      { id: 'operators.managePermissions', label: 'Gerenciar permissoes' }
    ]
  },
  {
    id: 'settings',
    title: 'Configuracoes',
    icon: Settings,
    permissions: [
      { id: 'settings.general', label: 'Configuracoes gerais' },
      { id: 'settings.customFields', label: 'Campos personalizados' },
      { id: 'settings.importTemplates', label: 'Modelos de importacao' },
      { id: 'settings.labelConfig', label: 'Configuracao de etiquetas' },
      { id: 'settings.badgeConfig', label: 'Configuracao de crachas' },
      { id: 'settings.certificateTemplates', label: 'Templates de certificados' },
      { id: 'settings.integrations', label: 'Integracoes' },
      { id: 'settings.backup', label: 'Backup' }
    ]
  }
];

const ALL_PERMISSION_IDS = PERMISSION_GROUPS.flatMap(group => group.permissions.map(permission => permission.id));

const normalizePermissions = (permissions?: string[]) =>
  [...new Set((permissions || []).filter(permission => ALL_PERMISSION_IDS.includes(permission)))];

const legacyPermissionsForRole = (role?: string): string[] => {
  const normalized = String(role || '').toUpperCase();
  if (normalized === 'ADMIN' || role === 'admin') return ALL_PERMISSION_IDS;
  if (normalized === 'SUPERVISOR') {
    return normalizePermissions([
      'events.view', 'participants.view', 'participants.create', 'participants.edit', 'participants.import', 'participants.export',
      'checkin.access', 'checkin.perform', 'checkin.reprint', 'checkin.createParticipant',
      'access.scanQr', 'access.rooms', 'access.restaurants', 'access.shows', 'access.manageAreas',
      'certificates.issue', 'certificates.manageActivities',
      'reports.view', 'reports.exportExcel'
    ]);
  }
  if (normalized === 'CHECKIN_CADASTRO') {
    return normalizePermissions([
      'events.view', 'participants.view', 'participants.create', 'participants.import',
      'checkin.access', 'checkin.perform', 'checkin.reprint', 'checkin.createParticipant',
      'certificates.issue'
    ]);
  }
  if (normalized === 'RELATORIO' || normalized === 'VISUALIZADOR') {
    return normalizePermissions(['events.view', 'participants.view', 'reports.view', 'reports.exportExcel', 'reports.exportPdf']);
  }
  if (normalized === 'CHECKIN' || normalized === 'ATENDENTE' || normalized === 'OPERATOR' || normalized === 'OPERADOR') {
    return normalizePermissions(['events.view', 'participants.view', 'checkin.access', 'checkin.perform', 'checkin.reprint']);
  }
  return [];
};

const PERMISSION_PRESETS: Record<string, { label: string; role: UserRole; eventRole: EventUserRole; permissions: string[] }> = {
  ADMIN: { label: 'Administrador', role: 'ADMIN', eventRole: 'ADMIN', permissions: ALL_PERMISSION_IDS },
  RECEPCAO: {
    label: 'Recepcao',
    role: 'OPERADOR',
    eventRole: 'CHECKIN_CADASTRO',
    permissions: normalizePermissions(['events.view', 'participants.view', 'participants.create', 'participants.edit', 'participants.import', 'checkin.access', 'checkin.perform', 'checkin.reprint', 'checkin.createParticipant', 'print.labels', 'print.badges'])
  },
  CHECKIN: {
    label: 'Check-in',
    role: 'OPERADOR',
    eventRole: 'CHECKIN',
    permissions: normalizePermissions(['events.view', 'participants.view', 'checkin.access', 'checkin.perform', 'checkin.reprint'])
  },
  CHAPELARIA: {
    label: 'Chapelaria',
    role: 'OPERADOR',
    eventRole: 'CHECKIN',
    permissions: normalizePermissions(['events.view', 'participants.view', 'cloakroom.checkin', 'cloakroom.checkout', 'cloakroom.reprint'])
  },
  SCANNER: {
    label: 'Scanner',
    role: 'OPERADOR',
    eventRole: 'CHECKIN',
    permissions: normalizePermissions(['events.view', 'participants.view', 'access.scanQr', 'access.rooms', 'access.restaurants', 'access.shows'])
  },
  CERTIFICADOS: {
    label: 'Certificados',
    role: 'OPERADOR',
    eventRole: 'CHECKIN_CADASTRO',
    permissions: normalizePermissions(['events.view', 'participants.view', 'certificates.issue', 'certificates.manageActivities', 'certificates.editTemplate'])
  },
  RELATORIOS: {
    label: 'Relatorios',
    role: 'VISUALIZADOR',
    eventRole: 'RELATORIO',
    permissions: normalizePermissions(['events.view', 'participants.view', 'reports.view', 'reports.exportExcel', 'reports.exportPdf'])
  },
  SECRETARIA: {
    label: 'Secretaria',
    role: 'OPERADOR',
    eventRole: 'CHECKIN_CADASTRO',
    permissions: normalizePermissions(['events.view', 'participants.view', 'participants.create', 'participants.edit', 'participants.import', 'participants.export', 'checkin.access', 'reports.view', 'reports.exportExcel', 'certificates.issue', 'settings.importTemplates'])
  },
  ORGANIZACAO: {
    label: 'Organizacao',
    role: 'OPERADOR',
    eventRole: 'ADMIN',
    permissions: normalizePermissions(ALL_PERMISSION_IDS.filter(permission => !['events.delete', 'operators.delete', 'settings.backup', 'settings.integrations'].includes(permission)))
  }
};

const formatUserRoleLabel = (role?: string) => {
  const normalized = String(role || '').toUpperCase();
  if (normalized === 'ADMIN' || role === 'admin') return 'Administrador';
  if (normalized === 'VISUALIZADOR' || normalized === 'RELATORIO') return 'Visualizador';
  return 'Operador';
};

interface ReportAreaAccessLog {
  id: string;
  participantId: string;
  areaId: string;
  status: 'ALLOWED' | 'DENIED';
  userId: string;
  timestamp: string;
  participantName?: string;
  participantCpf?: string;
  areaName?: string;
  operatorName?: string;
}

interface ReportActionLog {
  id: string;
  eventId: string;
  userId: string;
  participantId?: string;
  action: string;
  timestamp: string;
  participantName?: string;
  operatorName?: string;
}

interface ActivityAttendanceView {
  id: string;
  eventId: string;
  activityId: string;
  participantId: string;
  checkedAt: string;
  checkedByUserId: string;
  participantName?: string;
  participantCpf?: string;
  participantCategory?: string;
  operatorName?: string;
}

interface CertificateActivityView extends Activity {
  checkedAt?: string;
  attendanceId?: string;
}

interface CertificateLookupResult {
  participant: Participant;
  event: Event;
  attendedActivities: CertificateActivityView[];
  totalHours: number;
  certificates: Certificate[];
}

interface ReportCertificate extends Certificate {
  participantName?: string;
  participantCpf?: string;
  participantCategory?: string;
  activityTitle?: string;
  activitySpeakerName?: string;
  operatorName?: string;
}

interface ReportBrandConfig {
  showLogo: boolean;
  logoUrl: string;
  showWatermark: boolean;
  watermarkUrl: string;
  watermarkOpacity: number;
}

const DEFAULT_REPORT_BRAND_CONFIG: ReportBrandConfig = {
  showLogo: false,
  logoUrl: '',
  showWatermark: false,
  watermarkUrl: '',
  watermarkOpacity: 0.08
};

const REPORT_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';
const REPORT_IMAGE_FORMATS = 'PNG, JPG/JPEG, WebP, GIF e SVG';

const DEFAULT_CERTIFICATE_TEMPLATE: CertificateTemplate = {
  id: 'default',
  eventId: '',
  name: 'Template padrão',
  orientation: 'landscape',
  pageSize: 'A4',
  backgroundImageUrl: '',
  logoUrl: '',
  elements: [
    { id: 'participant_name', type: 'text', label: 'Nome do participante', placeholder: '{{participant.name}}', x: 16, y: 34, width: 68, height: 8, fontFamily: 'Arial', fontSize: 30, color: '#0f172a', bold: true, italic: false, align: 'center', order: 1 },
    { id: 'event_name', type: 'text', label: 'Nome do evento', placeholder: '{{event.name}}', x: 16, y: 47, width: 68, height: 7, fontFamily: 'Arial', fontSize: 24, color: '#0f172a', bold: true, italic: false, align: 'center', order: 2 },
    { id: 'activity_title', type: 'text', label: 'Nome da atividade', placeholder: '{{activity.title}}', x: 16, y: 58, width: 68, height: 6, fontFamily: 'Arial', fontSize: 20, color: '#334155', bold: true, italic: false, align: 'center', order: 3 },
    { id: 'activity_speaker', type: 'text', label: 'Palestrante', placeholder: '{{activity.speakerName}}', x: 22, y: 67, width: 56, height: 5, fontFamily: 'Arial', fontSize: 16, color: '#475569', bold: false, italic: false, align: 'center', order: 4 },
    { id: 'certificate_hours', type: 'text', label: 'Carga horária', placeholder: '{{certificate.totalHours}} horas', fontSize: 22, order: 5 },
    { id: 'certificate_code', type: 'text', label: 'Código do certificado', placeholder: '{{certificate.code}}', fontSize: 12, order: 6 },
    { id: 'certificate_issued_at', type: 'text', label: 'Data de emissão', placeholder: '{{certificate.issuedAt}}', fontSize: 12, order: 7 }
  ],
  createdAt: '',
  updatedAt: ''
};

const CERTIFICATE_ELEMENT_PRESETS = [
  { label: 'Texto livre', placeholder: 'Texto livre' },
  { label: 'Nome participante', placeholder: '{{participant.name}}' },
  { label: 'Evento', placeholder: '{{event.name}}' },
  { label: 'Atividade', placeholder: '{{activity.title}}' },
  { label: 'Palestrante', placeholder: '{{activity.speakerName}}' },
  { label: 'Carga horária', placeholder: '{{certificate.totalHours}} horas' },
  { label: 'Data', placeholder: '{{certificate.issuedAt}}' },
  { label: 'Código do certificado', placeholder: '{{certificate.code}}' }
];

const getCertificateElementDefaults = (element: Partial<CertificateTemplateElement>, index: number): CertificateTemplateElement => {
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

const normalizeCertificateTemplate = (template?: Partial<CertificateTemplate>, eventId = ''): CertificateTemplate => ({
  ...DEFAULT_CERTIFICATE_TEMPLATE,
  ...template,
  eventId: template?.eventId || eventId,
  elements: (Array.isArray(template?.elements) && template.elements.length > 0
    ? template.elements
    : DEFAULT_CERTIFICATE_TEMPLATE.elements
  ).map(getCertificateElementDefaults)
});

const DEFAULT_CLOAKROOM_LABEL_CONFIG: CloakroomLabelConfig = {
  showEventName: false,
  showLabelType: false,
  showTicketNumber: true,
  showParticipantName: true,
  showDescription: true,
  showVolumeCount: false,
  showDateTime: false,
  showOperator: false,
  lineOrder: ['participantName', 'description', 'ticketNumber'],
  fontSizes: {
    participantName: 24,
    description: 13,
    ticketNumber: 34,
    volumeCount: 11,
    eventName: 11,
    labelType: 11,
    dateTime: 10,
    operator: 10
  }
};

type ActiveTab =
  | 'dashboard'
  | 'eventos-ativos'
  | 'evento-dashboard'
  | 'eventos'
  | 'participantes'
  | 'checkin'
  | 'checkin-modular'
  | 'scanner'
  | 'atividades'
  | 'presenca-atividade'
  | 'certificados'
  | 'areas'
  | 'chapelaria'
  | 'relatorios'
  | 'impressao'
  | 'etiquetas'
  | 'usuarios'
  | 'campos';

const ACTIVE_TAB_STORAGE_KEY = 'credencia_active_tab';
const CURRENT_EVENT_ID_STORAGE_KEY = 'currentEventId';
const CURRENT_USER_ROLE_STORAGE_KEY = 'currentUserRole';
const LEGACY_SELECTED_EVENT_ID_STORAGE_KEY = 'credencia_selected_event_id';
const ACTIVE_TABS: ActiveTab[] = [
  'dashboard',
  'eventos-ativos',
  'evento-dashboard',
  'eventos',
  'participantes',
  'checkin',
  'checkin-modular',
  'scanner',
  'atividades',
  'presenca-atividade',
  'certificados',
  'areas',
  'chapelaria',
  'relatorios',
  'impressao',
  'etiquetas',
  'usuarios',
  'campos'
];

const isActiveTab = (value: string | null): value is ActiveTab => {
  return !!value && ACTIVE_TABS.includes(value as ActiveTab);
};

const readStoredToken = () => {
  const saved = localStorage.getItem('credencia_token');
  return saved && saved !== 'undefined' && saved !== 'null' ? saved : null;
};

const readStoredUser = (): User | null => {
  const saved = localStorage.getItem('credencia_user');
  if (!saved || saved === 'undefined' || saved === 'null') return null;

  try {
    return JSON.parse(saved) || null;
  } catch (error) {
    localStorage.removeItem('credencia_user');
    return null;
  }
};

const fixMojibake = (value?: string) => {
  if (!value || !/[ÃÂ]/.test(value)) return value || '';
  try {
    return decodeURIComponent(escape(value));
  } catch (error) {
    return value;
  }
};

const escapeCertificateHtml = (value?: string) => fixMojibake(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const replaceCertificatePlaceholders = (
  value: string,
  participant: Participant,
  event: Event,
  certificate: Certificate,
  activity?: CertificateActivityView
) => {
  const replacements: Record<string, string> = {
    '{{participant.name}}': participant.name || '',
    '{{event.name}}': event.name || '',
    '{{activity.title}}': activity?.title || '',
    '{{activity.speakerName}}': activity?.speakerName || '',
    '{{activity.workloadHours}}': String(activity?.workloadHours || ''),
    '{{certificate.totalHours}}': String(certificate.totalHours || 0),
    '{{certificate.code}}': certificate.certificateCode || '',
    '{{certificate.issuedAt}}': certificate.issuedAt ? new Date(certificate.issuedAt).toLocaleString('pt-BR') : ''
  };

  return Object.entries(replacements).reduce(
    (text, [placeholder, replacement]) => text.split(placeholder).join(fixMojibake(replacement)),
    value || ''
  );
};

const normalizeParticipantSearch = (value?: string) => fixMojibake(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[._\-+/ ]/g, '');

const getParticipantSearchScore = (participant: Participant, query: string) => {
  const name = normalizeParticipantSearch(participant.name);
  const badgeName = normalizeParticipantSearch(participant.badgeName || '');
  const firstName = normalizeParticipantSearch(participant.name.split(/\s+/)[0] || '');
  const badgeFirstName = normalizeParticipantSearch((participant.badgeName || '').split(/\s+/)[0] || '');
  const cpf = normalizeParticipantSearch(participant.cpf || '');
  const ticketCode = normalizeParticipantSearch(participant.ticketCode || '');
  const id = normalizeParticipantSearch(participant.id || '');

  if (firstName.startsWith(query)) return 0;
  if (badgeFirstName.startsWith(query)) return 1;
  if (name.startsWith(query)) return 2;
  if (badgeName.startsWith(query)) return 3;
  if (cpf.startsWith(query)) return 4;
  if (ticketCode.startsWith(query) || id.startsWith(query) || query.includes(ticketCode) || query.includes(id)) return 5;
  if (name.includes(query)) return 6;
  if (badgeName.includes(query)) return 7;
  if (cpf.includes(query) || ticketCode.includes(query) || id.includes(query)) return 8;
  return 99;
};

export default function App() {
  const [isDarkTheme, setIsDarkTheme] = useState(() => localStorage.getItem('credencia_theme') === 'dark');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showFernandoWelcome, setShowFernandoWelcome] = useState(false);

  // Session / Auth States
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [currentUser, setCurrentUser] = useState<User | null>(() => readStoredUser());
  const [currentEventRole, setCurrentEventRole] = useState<string>('');
  const [currentEventPermissions, setCurrentEventPermissions] = useState<string[]>(() => normalizePermissions(readStoredUser()?.permissions || []));

  const userRole = String(currentUser?.role || '').toUpperCase();
  const eventRole = String(currentEventRole || currentUser?.role || '').toUpperCase();
  const effectivePermissions = currentEventPermissions.length
    ? currentEventPermissions
    : normalizePermissions(currentUser?.permissions?.length ? currentUser.permissions : legacyPermissionsForRole(currentEventRole || currentUser?.role));
  const hasSystemPermission = (permission: string) => effectivePermissions.includes(permission);
  const isUserAdmin = userRole === 'ADMIN' || currentUser?.role === 'admin' || eventRole === 'ADMIN';
  const canManageOperators = isUserAdmin || hasSystemPermission('operators.managePermissions');
  const canCreateParticipants = isUserAdmin || eventRole === 'CHECKIN_CADASTRO' || hasSystemPermission('participants.create') || hasSystemPermission('checkin.createParticipant');
  const canIssueCertificates = isUserAdmin || eventRole === 'CHECKIN_CADASTRO' || hasSystemPermission('certificates.issue');
  const canManageParticipants = isUserAdmin || eventRole === 'SUPERVISOR' || eventRole === 'CHECKIN_CADASTRO' || hasSystemPermission('participants.view') || hasSystemPermission('participants.edit');
  const canViewReports = isUserAdmin || eventRole === 'SUPERVISOR' || eventRole === 'RELATORIO' || hasSystemPermission('reports.view');
  const isFernandoAdmin = String(currentUser?.email || '').toLowerCase() === 'fernando@credencia.com';

  // Login Form States
  const [loginMethod, setLoginMethod] = useState<'pin' | 'email'>('email');
  const [pinInput, setPinInput] = useState('');
  const [emailInput, setEmailInput] = useState('admin@credencia.com');
  const [passwordInput, setPasswordInput] = useState('admin123');
  const [authLoading, setAuthLoading] = useState(false);

  // New Login/Sign Up and Profile Editing States
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registerNameInput, setRegisterNameInput] = useState('');
  const [registerOrgInput, setRegisterOrgInput] = useState('');
  const [registerRoleInput, setRegisterRoleInput] = useState<UserRole>('admin');
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', password: '' });

  // System Users Management (Admin)
  const [usersList, setUsersList] = useState<User[]>([]);
  const [eventUsers, setEventUsers] = useState<EventUser[]>([]);
  const [eventUserForm, setEventUserForm] = useState({
    eventId: '',
    userId: '',
    role: 'CHECKIN' as EventUserRole,
    permissions: legacyPermissionsForRole('CHECKIN'),
    active: true
  });
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    id: '',
    name: '',
    email: '',
    password: '',
    role: 'OPERADOR' as UserRole,
    permissions: PERMISSION_PRESETS.CHECKIN.permissions,
    eventId: '',
    eventRole: 'CHECKIN' as EventUserRole,
    eventPermissions: PERMISSION_PRESETS.CHECKIN.permissions,
    eventActive: true
  });
  const [permissionSearch, setPermissionSearch] = useState('');
  const [eventPermissionSearch, setEventPermissionSearch] = useState('');
  const [openPermissionGroups, setOpenPermissionGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(PERMISSION_GROUPS.map(group => [group.id, group.id === 'events' || group.id === 'participants' || group.id === 'checkin']))
  );
  const [openEventPermissionGroups, setOpenEventPermissionGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(PERMISSION_GROUPS.map(group => [group.id, group.id === 'events' || group.id === 'participants' || group.id === 'checkin']))
  );

  // Active Event
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(() => (
    localStorage.getItem(CURRENT_EVENT_ID_STORAGE_KEY) ||
    localStorage.getItem(LEGACY_SELECTED_EVENT_ID_STORAGE_KEY) ||
    ''
  ));
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (window.location.pathname === '/checkin') return 'checkin';

    const savedTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    if (isActiveTab(savedTab)) return savedTab;

    const saved = localStorage.getItem('credencia_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const savedRole = String(parsed?.role || '').toUpperCase();
        if (savedRole !== 'ADMIN' && parsed?.role !== 'admin') {
          return 'checkin';
        }
      } catch (e) {}
    }
    return 'dashboard';
  });

  // Core Entity States
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [cloakroom, setCloakroom] = useState<CloakroomItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [availableAreas, setAvailableAreas] = useState<Area[]>([]);
  const [accessProfiles, setAccessProfiles] = useState<AccessProfile[]>([]);
  const [areaAccessLogs, setAreaAccessLogs] = useState<ReportAreaAccessLog[]>([]);
  const [actionLogs, setActionLogs] = useState<ReportActionLog[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityAttendances, setActivityAttendances] = useState<ActivityAttendanceView[]>([]);
  const [certificates, setCertificates] = useState<ReportCertificate[]>([]);
  const [loadingMain, setLoadingMain] = useState(false);

  // Filter / Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedPresenceFilter, setSelectedPresenceFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [reportBrandConfig, setReportBrandConfig] = useState<ReportBrandConfig>(DEFAULT_REPORT_BRAND_CONFIG);

  // Modal / Form trigger states
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const [isCloakroomModalOpen, setIsCloakroomModalOpen] = useState(false);
  const [cloakroomTab, setCloakroomTab] = useState<'store' | 'return' | 'history' | 'settings'>('store');
  const [cloakroomLabelConfig, setCloakroomLabelConfig] = useState<CloakroomLabelConfig>(DEFAULT_CLOAKROOM_LABEL_CONFIG);
  const [cloakroomSearch, setCloakroomSearch] = useState('');
  const [cloakroomSelectedParticipant, setCloakroomSelectedParticipant] = useState<Participant | null>(null);
  const [cloakroomVolumeCount, setCloakroomVolumeCount] = useState(1);
  const [cloakroomDescription, setCloakroomDescription] = useState('');
  const [cloakroomSuccess, setCloakroomSuccess] = useState<CloakroomItem | null>(null);
  const cloakroomSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [cloakroomReturnSearch, setCloakroomReturnSearch] = useState('');
  const [cloakroomReturnItem, setCloakroomReturnItem] = useState<CloakroomItem | null>(null);
  const [cloakroomReturnSuccess, setCloakroomReturnSuccess] = useState<CloakroomItem | null>(null);
  const [pendingCloakroomReturn, setPendingCloakroomReturn] = useState<CloakroomItem | null>(null);
  const [cloakroomHistoryFilter, setCloakroomHistoryFilter] = useState<'all' | 'guardado' | 'retirado'>('all');
  const [cloakroomHistorySearch, setCloakroomHistorySearch] = useState('');
  const [eventForm, setEventForm] = useState({
    id: '',
    name: '',
    date: '',
    location: '',
    capacity: 200,
    enableAccessControl: true,
    enableCloakroom: false,
    enableScanner: true
  });
  const [participantForm, setParticipantForm] = useState<{ id: string, name: string, email: string, cpf: string, category: ParticipantCategory, company: string, allowedAreaIds: string[], allowedAreas: string[] }>({
    id: '', name: '', email: '', cpf: '', category: 'Participante', company: '', allowedAreaIds: [], allowedAreas: []
  });
  const [cloakroomForm, setCloakroomForm] = useState({ participantId: '', participantName: '', itemDescription: '' });
  const [activityForm, setActivityForm] = useState({
    id: '',
    title: '',
    roomName: '',
    speakerName: '',
    date: '',
    startTime: '',
    endTime: '',
    workloadHours: 1,
    active: true
  });
  const [activityAttendanceActivityId, setActivityAttendanceActivityId] = useState('');
  const [activityAttendanceSearch, setActivityAttendanceSearch] = useState('');
  const [activityAttendanceFeedback, setActivityAttendanceFeedback] = useState<{ type: 'success' | 'warning' | 'error'; title: string; message: string } | null>(null);
  const [certificateSearch, setCertificateSearch] = useState('');
  const [certificateLookup, setCertificateLookup] = useState<CertificateLookupResult | null>(null);
  const [certificateFeedback, setCertificateFeedback] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);
  const [activeCertificate, setActiveCertificate] = useState<{ certificate: Certificate; activity?: CertificateActivityView } | null>(null);
  const [certificateTemplate, setCertificateTemplate] = useState<CertificateTemplate>(DEFAULT_CERTIFICATE_TEMPLATE);
  const [savingCertificateTemplate, setSavingCertificateTemplate] = useState(false);
  const [selectedCertificateElementId, setSelectedCertificateElementId] = useState<string>('');
  const certificateCanvasRef = useRef<HTMLDivElement | null>(null);

  // Badge Visualizer state
  const [activeBadgeParticipant, setActiveBadgeParticipant] = useState<Participant | null>(null);

  // Participant QR code modal state
  const [selectedQrParticipant, setSelectedQrParticipant] = useState<Participant | null>(null);

  // Scanner Simulator States
  const [scanCode, setScanCode] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; participant?: Participant } | null>(null);

  // Import Preview & Validation States
  const [isImportPreviewModalOpen, setIsImportPreviewModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importStep, setImportStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRawRows, setImportRawRows] = useState<any[]>([]);
  const [importColumnMapping, setImportColumnMapping] = useState<Record<string, ImportTargetField>>({});
  const [importFieldOrder, setImportFieldOrder] = useState<ImportTargetField[]>(DEFAULT_IMPORT_FIELD_ORDER);
  const [importTemplates, setImportTemplates] = useState<ImportTemplate[]>([]);
  const [importTemplateName, setImportTemplateName] = useState('');
  const [importTemplateGlobal, setImportTemplateGlobal] = useState(false);
  const [editingImportTemplateId, setEditingImportTemplateId] = useState('');
  const [importFileIsLoading, setImportFileIsLoading] = useState(false);
  const [isImportingInProgress, setIsImportingInProgress] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [autoPrintOnCheckin, setAutoPrintOnCheckin] = useState(true);
  const [checkinSearchQuery, setCheckinSearchQuery] = useState('');
  const [showCheckinAddForm, setShowCheckinAddForm] = useState(false);
  const [checkinAddForm, setCheckinAddForm] = useState({ name: '', email: '', cpf: '', category: 'Participante', company: '' });
  const [checkinFilter, setCheckinFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Global Toast Notification triggers
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const persistSelectedEvent = (eventId: string, role?: string) => {
    setSelectedEventId(eventId);

    if (!eventId) {
      setCurrentEventRole('');
      localStorage.removeItem(CURRENT_EVENT_ID_STORAGE_KEY);
      localStorage.removeItem(CURRENT_USER_ROLE_STORAGE_KEY);
      localStorage.removeItem(LEGACY_SELECTED_EVENT_ID_STORAGE_KEY);
      return;
    }

    const eventRole = role || events.find(event => event.id === eventId)?.currentUserRole || currentUser?.role || '';
    setCurrentEventRole(eventRole);
    localStorage.setItem(CURRENT_EVENT_ID_STORAGE_KEY, eventId);
    localStorage.setItem(LEGACY_SELECTED_EVENT_ID_STORAGE_KEY, eventId);
    if (eventRole) {
      localStorage.setItem(CURRENT_USER_ROLE_STORAGE_KEY, eventRole);
    }
  };

  const getActiveHeaders = () => {
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  useEffect(() => {
    localStorage.setItem('credencia_theme', isDarkTheme ? 'dark' : 'light');
  }, [isDarkTheme]);

  useEffect(() => {
    if (!currentUser || !token || !isFernandoAdmin) return;
    const key = `credencia_fernando_welcome_${currentUser.id}`;
    if (sessionStorage.getItem(key) === 'seen') return;
    setShowFernandoWelcome(true);
    sessionStorage.setItem(key, 'seen');
  }, [currentUser, token, isFernandoAdmin]);

  // Safe fetch helper
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    try {
      const res = await fetch(endpoint, {
        ...options,
        headers: {
          ...getActiveHeaders(),
          ...options.headers
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `HTTP error! status: ${res.status}`);
      }
      return await res.json();
    } catch (e: any) {
      console.error(`API Call failed to [${endpoint}]:`, e);
      addToast(e.message || 'Erro de comunicação com o servidor', 'error');
      throw e;
    }
  };

  const loadCertificateTemplate = async (eventId: string) => {
    if (!eventId || !canIssueCertificates) {
      setCertificateTemplate(DEFAULT_CERTIFICATE_TEMPLATE);
      return;
    }

    try {
      const template = await apiCall(`/api/events/${eventId}/certificate-template`);
      setCertificateTemplate(normalizeCertificateTemplate(template, eventId));
    } catch (error) {
      setCertificateTemplate(normalizeCertificateTemplate(undefined, eventId));
    }
  };

  const saveCertificateTemplate = async () => {
    if (!selectedEventId) {
      addToast('Selecione um evento ativo primeiro.', 'error');
      return;
    }

    setSavingCertificateTemplate(true);
    try {
      const saved = await apiCall(`/api/events/${selectedEventId}/certificate-template`, {
        method: 'PUT',
        body: JSON.stringify(normalizeCertificateTemplate(certificateTemplate, selectedEventId))
      });
      setCertificateTemplate(normalizeCertificateTemplate(saved, selectedEventId));
      addToast('Template de certificado salvo com sucesso.', 'success');
    } catch (error) {
      // apiCall already shows the error toast
    } finally {
      setSavingCertificateTemplate(false);
    }
  };

  const handleCertificateTemplateImageUpload = (file: File | undefined, target: 'logoUrl' | 'backgroundImageUrl') => {
    if (!file) return;

    const supportedTypes = REPORT_IMAGE_ACCEPT.split(',');
    if (!supportedTypes.includes(file.type)) {
      addToast(`Formato não suportado. Use: ${REPORT_IMAGE_FORMATS}.`, 'error');
      return;
    }

    const maxSizeMb = 2;
    if (file.size > maxSizeMb * 1024 * 1024) {
      addToast(`Imagem muito grande. Use um arquivo de até ${maxSizeMb} MB.`, 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        addToast('Não foi possível carregar a imagem.', 'error');
        return;
      }

      setCertificateTemplate(prev => ({ ...prev, [target]: result }));
      addToast('Imagem carregada com sucesso.', 'success');
    };
    reader.onerror = () => addToast('Erro ao ler a imagem enviada.', 'error');
    reader.readAsDataURL(file);
  };

  const updateCertificateElement = (elementId: string, updates: Partial<CertificateTemplateElement>) => {
    setCertificateTemplate(prev => ({
      ...prev,
      elements: prev.elements.map((element, index) =>
        element.id === elementId ? getCertificateElementDefaults({ ...element, ...updates }, index) : element
      )
    }));
  };

  const addCertificateElement = (preset: { label: string; placeholder: string }, type: 'text' | 'image' = 'text') => {
    const id = `ctel_${Math.random().toString(36).slice(2, 9)}`;
    const element = getCertificateElementDefaults({
      id,
      type,
      label: preset.label,
      placeholder: preset.placeholder,
      text: type === 'text' ? preset.placeholder : '',
      imageUrl: type === 'image' ? (preset.label === 'Logo' ? certificateTemplate.logoUrl : '') : '',
      x: type === 'image' ? 38 : 24,
      y: type === 'image' ? 12 : 24,
      width: type === 'image' ? 24 : 52,
      height: type === 'image' ? 14 : 7,
      order: certificateTemplate.elements.length + 1
    }, certificateTemplate.elements.length);

    setCertificateTemplate(prev => ({ ...prev, elements: [...prev.elements, element] }));
    setSelectedCertificateElementId(id);
  };

  const duplicateCertificateTemplate = () => {
    setCertificateTemplate(prev => ({
      ...prev,
      id: `ctpl_${Math.random().toString(36).slice(2, 9)}`,
      name: `${prev.name || 'Template'} - cópia`,
      elements: prev.elements.map((element, index) => ({
        ...element,
        id: `ctel_${Math.random().toString(36).slice(2, 9)}`,
        x: Math.min((element.x || 0) + 2, 92),
        y: Math.min((element.y || 0) + 2, 92),
        order: index + 1
      }))
    }));
    addToast('Template duplicado localmente. Clique em salvar para gravar.', 'info');
  };

  const restoreDefaultCertificateTemplate = () => {
    setCertificateTemplate(normalizeCertificateTemplate({
      ...DEFAULT_CERTIFICATE_TEMPLATE,
      eventId: selectedEventId,
      logoUrl: certificateTemplate.logoUrl,
      backgroundImageUrl: certificateTemplate.backgroundImageUrl
    }, selectedEventId));
    setSelectedCertificateElementId('');
  };

  const handleCertificateElementPointerDown = (
    event: React.MouseEvent<HTMLDivElement>,
    element: CertificateTemplateElement,
    mode: 'move' | 'resize'
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedCertificateElementId(element.id);

    const canvas = certificateCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const start = {
      x: element.x || 0,
      y: element.y || 0,
      width: element.width || 20,
      height: element.height || 8
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = ((moveEvent.clientX - startX) / rect.width) * 100;
      const deltaY = ((moveEvent.clientY - startY) / rect.height) * 100;
      if (mode === 'resize') {
        updateCertificateElement(element.id, {
          width: Math.min(100 - start.x, Math.max(4, start.width + deltaX)),
          height: Math.min(100 - start.y, Math.max(3, start.height + deltaY))
        });
      } else {
        updateCertificateElement(element.id, {
          x: Math.min(100 - start.width, Math.max(0, start.x + deltaX)),
          y: Math.min(100 - start.height, Math.max(0, start.y + deltaY))
        });
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    if (!selectedEventId || !canIssueCertificates) {
      setCertificateTemplate(DEFAULT_CERTIFICATE_TEMPLATE);
      return;
    }

    void loadCertificateTemplate(selectedEventId);
  }, [selectedEventId, canIssueCertificates]);

  // Perform Application Authentication
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      addToast('Por favor, preencha todos os campos.', 'error');
      return;
    }

    setAuthLoading(true);
    try {
      const data = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      });

      localStorage.setItem('credencia_token', data.token);
      localStorage.setItem('credencia_user', JSON.stringify(data.user));
      localStorage.removeItem(CURRENT_EVENT_ID_STORAGE_KEY);
      localStorage.removeItem(CURRENT_USER_ROLE_STORAGE_KEY);
      localStorage.removeItem(LEGACY_SELECTED_EVENT_ID_STORAGE_KEY);
      setToken(data.token);
      setCurrentUser(data.user);
      setCurrentEventRole('');
      setSelectedEventId('');
      setActiveTab(String(data.user?.role || '').toUpperCase() === 'ADMIN' || data.user?.role === 'admin' ? 'dashboard' : 'checkin');
      addToast(`Bem-vindo de volta, ${data.user.name}!`, 'success');
    } catch (err) {
      // API call triggers toast automatically
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePinLogin = async (pinValue: string) => {
    if (!pinValue) return;
    setAuthLoading(true);
    try {
      const data = await apiCall('/api/auth/login-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue })
      });

      localStorage.setItem('credencia_token', data.token);
      localStorage.setItem('credencia_user', JSON.stringify(data.user));
      localStorage.removeItem(CURRENT_EVENT_ID_STORAGE_KEY);
      localStorage.removeItem(CURRENT_USER_ROLE_STORAGE_KEY);
      localStorage.removeItem(LEGACY_SELECTED_EVENT_ID_STORAGE_KEY);
      setToken(data.token);
      setCurrentUser(data.user);
      setCurrentEventRole('');
      setSelectedEventId('');
      setActiveTab(String(data.user?.role || '').toUpperCase() === 'ADMIN' || data.user?.role === 'admin' ? 'dashboard' : 'checkin');
      addToast(`Bem-vindo de volta, ${data.user.name}!`, 'success');
    } catch (err: any) {
      // failed PIN attempts are warned
      addToast(err.message || 'Código PIN incorreto', 'error');
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  // Auto-submit PIN once it reaches 4-6 digits with a small delay for visual satisfaction
  useEffect(() => {
    if (pinInput.length >= 4 && pinInput.length <= 6) {
      const runAutoSubmit = async () => {
        try {
          await handlePinLogin(pinInput);
          setPinInput('');
        } catch (e) {
          setPinInput('');
        }
      };
      const tid = setTimeout(runAutoSubmit, 150);
      return () => clearTimeout(tid);
    }
  }, [pinInput]);

  const handleLogout = () => {
    localStorage.removeItem('credencia_token');
    localStorage.removeItem('credencia_user');
    localStorage.removeItem(CURRENT_EVENT_ID_STORAGE_KEY);
    localStorage.removeItem(CURRENT_USER_ROLE_STORAGE_KEY);
    localStorage.removeItem(LEGACY_SELECTED_EVENT_ID_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
    setToken(null);
    setCurrentUser(null);
    setCurrentEventRole('');
    setSelectedEventId('');
    setEvents([]);
    setParticipants([]);
    setStats(null);
    addToast('Sessão encerrada com sucesso', 'info');
  };

  // Signup/Registration Handler
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerNameInput || !emailInput || !passwordInput) {
      addToast('Por favor, preencha todos os campos do cadastro.', 'error');
      return;
    }

    setAuthLoading(true);
    try {
      const data = await apiCall('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          name: registerNameInput,
          email: emailInput,
          password: passwordInput,
          role: registerRoleInput,
          orgName: registerOrgInput
        })
      });

      localStorage.setItem('credencia_token', data.token);
      localStorage.setItem('credencia_user', JSON.stringify(data.user));
      setToken(data.token);
      setCurrentUser(data.user);
      addToast(`Conta criada! Bem-vindo, ${data.user.name}!`, 'success');
      setIsRegisterMode(false);
      setRegisterNameInput('');
      setRegisterOrgInput('');
    } catch (err) {
      // apiCall displays toast automatically
    } finally {
      setAuthLoading(false);
    }
  };

  // Self-Profile Details update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name || !profileForm.email) {
      addToast('Nome e e-mail são obrigatórios para seu perfil.', 'error');
      return;
    }

    try {
      const updated = await apiCall(`/api/users/${currentUser?.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: profileForm.name,
          email: profileForm.email,
          ...(profileForm.password ? { password: profileForm.password } : {})
        })
      });

      const updatedUser = {
        ...currentUser,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        id: updated.id,
        createdAt: updated.createdAt
      };

      localStorage.setItem('credencia_user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser as User);
      setIsProfileModalOpen(false);
      addToast('Seu perfil e credenciais de acesso foram atualizados!', 'success');
    } catch (err) {}
  };

  const setPermissionCollection = (
    source: string[],
    permissions: string[],
    checked: boolean
  ) => {
    const current = new Set(source);
    permissions.forEach(permission => checked ? current.add(permission) : current.delete(permission));
    return normalizePermissions([...current]);
  };

  const applyUserPermissionPreset = (presetKey: string) => {
    const preset = PERMISSION_PRESETS[presetKey];
    if (!preset) return;
    setUserForm(prev => ({
      ...prev,
      role: preset.role,
      permissions: preset.permissions,
      eventRole: preset.eventRole,
      eventPermissions: preset.permissions
    }));
  };

  const applyEventUserPermissionPreset = (presetKey: string) => {
    const preset = PERMISSION_PRESETS[presetKey];
    if (!preset) return;
    setEventUserForm(prev => ({
      ...prev,
      role: preset.eventRole,
      permissions: preset.permissions
    }));
  };

  const toggleUserPermission = (permission: string, checked: boolean) => {
    setUserForm(prev => ({
      ...prev,
      permissions: setPermissionCollection(prev.permissions, [permission], checked)
    }));
  };

  const toggleUserPermissionGroup = (permissions: string[], checked: boolean) => {
    setUserForm(prev => ({
      ...prev,
      permissions: setPermissionCollection(prev.permissions, permissions, checked)
    }));
  };

  const toggleEventPermission = (permission: string, checked: boolean) => {
    setUserForm(prev => ({
      ...prev,
      eventPermissions: setPermissionCollection(prev.eventPermissions, [permission], checked)
    }));
  };

  const toggleEventPermissionGroup = (permissions: string[], checked: boolean) => {
    setUserForm(prev => ({
      ...prev,
      eventPermissions: setPermissionCollection(prev.eventPermissions, permissions, checked)
    }));
  };

  const toggleEventUserFormPermission = (permission: string, checked: boolean) => {
    setEventUserForm(prev => ({
      ...prev,
      permissions: setPermissionCollection(prev.permissions, [permission], checked)
    }));
  };

  const toggleEventUserFormPermissionGroup = (permissions: string[], checked: boolean) => {
    setEventUserForm(prev => ({
      ...prev,
      permissions: setPermissionCollection(prev.permissions, permissions, checked)
    }));
  };

  // Load and cache all users for administrator management
  const loadUsers = async () => {
    if (!canManageOperators) return;
    setIsLoadingUsers(true);
    try {
      const data = await apiCall('/api/users');
      setUsersList(data);
    } catch (e) {
      console.error('Erro ao ler lista de usuários:', e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadEventUsers = async (eventId: string) => {
    if (!canManageOperators || !eventId) {
      setEventUsers([]);
      return;
    }
    try {
      const data = await apiCall(`/api/events/${eventId}/users`);
      setEventUsers(data);
    } catch (e) {
      console.error('Erro ao carregar vínculos de operadores por evento:', e);
    }
  };

  const handleSaveEventUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventUserForm.eventId || !eventUserForm.userId || !eventUserForm.role) {
      addToast('Selecione evento, usuário e permissão do vínculo.', 'error');
      return;
    }

    try {
      const saved = await apiCall(`/api/events/${eventUserForm.eventId}/users`, {
        method: 'POST',
        body: JSON.stringify({
          userId: eventUserForm.userId,
          role: eventUserForm.role,
          permissions: eventUserForm.permissions,
          active: eventUserForm.active
        })
      });
      setEventUsers(prev => {
        const exists = prev.some(link => link.id === saved.id);
        return exists ? prev.map(link => link.id === saved.id ? saved : link) : [...prev, saved];
      });
      addToast('Vínculo entre usuário e evento salvo com sucesso!', 'success');
    } catch (e) {}
  };

  const handleToggleEventUser = async (link: EventUser) => {
    try {
      const updated = await apiCall(`/api/events/${link.eventId}/users/${link.id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !link.active })
      });
      setEventUsers(prev => prev.map(item => item.id === updated.id ? updated : item));
    } catch (e) {}
  };

  const handleDeleteEventUser = async (link: EventUser) => {
    if (!window.confirm('Remover este vínculo entre usuário e evento?')) return;
    try {
      await apiCall(`/api/events/${link.eventId}/users/${link.id}`, { method: 'DELETE' });
      setEventUsers(prev => prev.filter(item => item.id !== link.id));
      addToast('Vínculo removido com sucesso.', 'info');
    } catch (e) {}
  };

  // Admin inserts or updates system users (operator/admin)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email || (!userForm.id && !userForm.password)) {
      addToast('Nome, E-mail e Senha são campos obrigatórios para novos operadores.', 'error');
      return;
    }

    try {
      const isEdit = !!userForm.id;
      const endpoint = isEdit ? `/api/users/${userForm.id}` : '/api/users';
      const method = isEdit ? 'PUT' : 'POST';

      const saved = await apiCall(endpoint, {
        method,
        body: JSON.stringify({
          name: userForm.name,
          email: userForm.email,
          role: userForm.role,
          permissions: userForm.permissions,
          ...(userForm.password ? { password: userForm.password } : {})
        })
      });

      if (isEdit) {
        setUsersList(prev => prev.map(u => u.id === saved.id ? saved : u));
        addToast(`Usuário "${saved.name}" atualizado com sucesso!`, 'success');
      } else {
        setUsersList(prev => [...prev, saved]);
        addToast(`Usuário "${saved.name}" criado com login e senha prontos!`, 'success');
      }

      if (userForm.eventId) {
        const savedLink = await apiCall(`/api/events/${userForm.eventId}/users`, {
          method: 'POST',
          body: JSON.stringify({
            userId: saved.id,
            role: userForm.eventRole,
            permissions: userForm.eventPermissions.length ? userForm.eventPermissions : userForm.permissions,
            active: userForm.eventActive
          })
        });

        if (userForm.eventId === eventUserForm.eventId) {
          setEventUsers(prev => {
            const exists = prev.some(link => link.id === savedLink.id);
            return exists ? prev.map(link => link.id === savedLink.id ? savedLink : link) : [...prev, savedLink];
          });
        }

        addToast(`Vínculo de "${saved.name}" com evento criado.`, 'success');
      }

      setIsUserModalOpen(false);
      setUserForm({
        id: '',
        name: '',
        email: '',
        password: '',
        role: 'OPERADOR',
        permissions: PERMISSION_PRESETS.CHECKIN.permissions,
        eventId: '',
        eventRole: 'CHECKIN',
        eventPermissions: PERMISSION_PRESETS.CHECKIN.permissions,
        eventActive: true
      });
    } catch (err) {}
  };

  // Delete credentials of an operator/admin
  const handleDeleteUser = async (id: string) => {
    if (id === currentUser?.id) {
      addToast('Você não pode excluir sua própria conta atualmente ativa.', 'error');
      return;
    }
    if (!window.confirm('Excluir este login removerá definitivamente o acesso dele ao sistema. Confirmar exclusão?')) return;

    try {
      await apiCall(`/api/users/${id}`, { method: 'DELETE' });
      addToast('Usuário revogado do sistema.', 'success');
      setUsersList(prev => prev.filter(u => u.id !== id));
    } catch (e) {}
  };

  // Load user management lists on tab change
  useEffect(() => {
    if (activeTab === 'usuarios' && canManageOperators && token) {
      loadUsers();
      if (selectedEventId) {
        loadEventUsers(selectedEventId);
      }
    }
  }, [activeTab, canManageOperators, token, selectedEventId]);

  useEffect(() => {
    if (!eventUserForm.eventId && selectedEventId) {
      setEventUserForm(prev => ({ ...prev, eventId: selectedEventId }));
    }
  }, [selectedEventId, eventUserForm.eventId]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  // Keep the current tab when it is allowed; only redirect when permissions require it.
  useEffect(() => {
    if (!currentUser) return;
    const allowedTabs: ActiveTab[] = isUserAdmin
      ? [
          'dashboard',
          'eventos',
          'participantes',
          'campos',
          'checkin',
          'atividades',
          'presenca-atividade',
          'certificados',
          'areas',
          'scanner',
          'chapelaria',
          'impressao',
          'evento-dashboard',
          'eventos-ativos',
          'etiquetas',
          'checkin-modular'
        ]
      : ['eventos-ativos', 'checkin', 'presenca-atividade'];

    if (canManageOperators) allowedTabs.push('usuarios');
    if (isUserAdmin || canManageParticipants) allowedTabs.push('participantes');
    if (isUserAdmin || canViewReports) allowedTabs.push('relatorios');
    if (canIssueCertificates) allowedTabs.push('certificados');

    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(isUserAdmin ? 'dashboard' : 'checkin');
    }
  }, [currentUser, isUserAdmin, canManageOperators, canManageParticipants, canViewReports, canIssueCertificates, activeTab]);

  // --- Fetch Operations ---
  const loadEvents = async () => {
    try {
      const data: Event[] = await apiCall('/api/events');
      setEvents(data);

      if (data.length === 0) {
        persistSelectedEvent('');
        return;
      }

      const savedEventId = localStorage.getItem(CURRENT_EVENT_ID_STORAGE_KEY) || localStorage.getItem(LEGACY_SELECTED_EVENT_ID_STORAGE_KEY);
      const savedEvent = data.find(event => event.id === savedEventId);

      if (data.length === 1) {
        persistSelectedEvent(data[0].id, data[0].currentUserRole);
        if (!selectedEventId || activeTab === 'eventos-ativos') {
          setActiveTab(isUserAdmin ? 'evento-dashboard' : 'checkin');
        }
        return;
      }

      if (savedEvent) {
        persistSelectedEvent(savedEvent.id, savedEvent.currentUserRole);
        return;
      }

      persistSelectedEvent('');
      setActiveTab('eventos-ativos');
    } catch (e) {}
  };

  const loadDataForEvent = async (eventId: string) => {
    if (!eventId) return;
    setLoadingMain(true);
    try {
      // Load current areas and access profiles for the event dynamically
      const [areasData, profilesData, accessLogsData, actionLogsData, activitiesData, activityAttendancesData, certificatesData] = await Promise.all([
        apiCall(`/api/areas?eventId=${eventId}`),
        apiCall(`/api/access-profiles?eventId=${eventId}`),
        apiCall('/api/access-control/logs').catch(() => []),
        apiCall(`/api/action-logs?eventId=${eventId}`).catch(() => []),
        apiCall(`/api/events/${eventId}/activities`).catch(() => []),
        apiCall(`/api/events/${eventId}/activity-attendances`).catch(() => []),
        apiCall(`/api/events/${eventId}/certificates`).catch(() => [])
      ]);
      setAvailableAreas(areasData || []);
      setAccessProfiles(profilesData || []);
      setAreaAccessLogs(Array.isArray(accessLogsData) ? accessLogsData : []);
      setActionLogs(Array.isArray(actionLogsData) ? actionLogsData : []);
      setActivities(Array.isArray(activitiesData) ? activitiesData : []);
      setActivityAttendances(Array.isArray(activityAttendancesData) ? activityAttendancesData : []);
      setCertificates(Array.isArray(certificatesData) ? certificatesData : []);

      if (isUserAdmin || canViewReports) {
        // Parallelize fetches for speedy Operacao load times for admins
        const [plist, clist, statData] = await Promise.all([
          apiCall(`/api/events/${eventId}/participants`),
          apiCall(`/api/events/${eventId}/cloakroom`),
          apiCall(`/api/events/${eventId}/dashboard`)
        ]);
        setParticipants(plist);
        setCloakroom(clist);
        setStats(statData);
      } else {
        // Non-admin can only request the event participants list
        const plist = await apiCall(`/api/events/${eventId}/participants`);
        setParticipants(plist);
        setCloakroom([]);
        setStats(null);
      }
    } catch (e) {
      console.error('Error loading event operational details:', e);
    } finally {
      setLoadingMain(false);
    }
  };

  // Bootstrapping
  useEffect(() => {
    if (token) {
      loadEvents();
    }
  }, [token]);

  useEffect(() => {
    if (selectedEventId) {
      loadDataForEvent(selectedEventId);
    }
  }, [selectedEventId]);

  // Current selected Event Object
  const currentEvent = useMemo(() => {
    return events.find(e => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  useEffect(() => {
    if (!currentEvent) return;
    const eventRole = currentEvent.currentUserRole || currentUser?.role || '';
    setCurrentEventRole(eventRole);
    setCurrentEventPermissions(normalizePermissions(currentEvent.currentUserPermissions?.length ? currentEvent.currentUserPermissions : currentUser?.permissions || legacyPermissionsForRole(eventRole || currentUser?.role)));
    localStorage.setItem(CURRENT_EVENT_ID_STORAGE_KEY, currentEvent.id);
    localStorage.setItem(LEGACY_SELECTED_EVENT_ID_STORAGE_KEY, currentEvent.id);
    if (eventRole) {
      localStorage.setItem(CURRENT_USER_ROLE_STORAGE_KEY, eventRole);
    }
  }, [currentEvent, currentUser]);

  useEffect(() => {
    if (!selectedEventId) {
      setReportBrandConfig(DEFAULT_REPORT_BRAND_CONFIG);
      return;
    }

    const savedConfig = localStorage.getItem(`credencia_report_brand_${selectedEventId}`);
    if (!savedConfig) {
      setReportBrandConfig(DEFAULT_REPORT_BRAND_CONFIG);
      return;
    }

    try {
      setReportBrandConfig({
        ...DEFAULT_REPORT_BRAND_CONFIG,
        ...JSON.parse(savedConfig)
      });
    } catch (error) {
      setReportBrandConfig(DEFAULT_REPORT_BRAND_CONFIG);
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) return;
    localStorage.setItem(`credencia_report_brand_${selectedEventId}`, JSON.stringify(reportBrandConfig));
  }, [reportBrandConfig, selectedEventId]);

  const handleReportImageUpload = (file: File | undefined, target: 'logoUrl' | 'watermarkUrl') => {
    if (!file) return;

    const supportedTypes = REPORT_IMAGE_ACCEPT.split(',');
    if (!supportedTypes.includes(file.type)) {
      addToast(`Formato não suportado. Use: ${REPORT_IMAGE_FORMATS}.`, 'error');
      return;
    }

    const maxSizeMb = 2;
    if (file.size > maxSizeMb * 1024 * 1024) {
      addToast(`Imagem muito grande. Use um arquivo de até ${maxSizeMb} MB.`, 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        addToast('Não foi possível carregar a imagem.', 'error');
        return;
      }

      setReportBrandConfig(prev => ({
        ...prev,
        [target]: result,
        ...(target === 'logoUrl' ? { showLogo: true } : { showWatermark: true })
      }));
      addToast('Imagem carregada com sucesso.', 'success');
    };
    reader.onerror = () => addToast('Erro ao ler a imagem enviada.', 'error');
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    setCloakroomLabelConfig({
      ...DEFAULT_CLOAKROOM_LABEL_CONFIG,
      ...(currentEvent?.cloakroomLabelConfig || {})
    });
  }, [currentEvent?.id, currentEvent?.cloakroomLabelConfig]);

  useEffect(() => {
    if (cloakroomTab === 'settings' && !isUserAdmin) {
      setCloakroomTab('store');
    }
  }, [cloakroomTab, isUserAdmin]);

  useEffect(() => {
    if (activeTab === 'chapelaria' && cloakroomTab === 'store') {
      setTimeout(() => cloakroomSearchInputRef.current?.focus(), 80);
    }
  }, [activeTab, cloakroomTab]);

  useEffect(() => {
    if (!cloakroomSuccess) return;
    const timer = window.setTimeout(() => setCloakroomSuccess(null), 6500);
    return () => window.clearTimeout(timer);
  }, [cloakroomSuccess]);

  useEffect(() => {
    if (!currentEvent) return;
    if (isUserAdmin) return;
    if (activeTab === 'areas' && currentEvent.enableAccessControl === false) setActiveTab('evento-dashboard');
    if (activeTab === 'chapelaria' && currentEvent.enableCloakroom !== true) setActiveTab('evento-dashboard');
    if (activeTab === 'scanner' && currentEvent.enableScanner === false) setActiveTab('evento-dashboard');
  }, [activeTab, currentEvent, isUserAdmin]);

  useEffect(() => {
    if (activityAttendanceActivityId && activities.some(activity => activity.id === activityAttendanceActivityId && activity.active !== false)) return;
    const firstActive = activities.find(activity => activity.active !== false);
    setActivityAttendanceActivityId(firstActive?.id || '');
  }, [activities, activityAttendanceActivityId]);

  // Handle Select Event action
  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    persistSelectedEvent(val);
    addToast('Evento alterado com sucesso', 'info');
  };

  // --- Crucial Event Handlers (CRUD) ---
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.name || !eventForm.date || !eventForm.location || !eventForm.capacity) {
      addToast('Todos os campos são obrigatórios', 'error');
      return;
    }

    try {
      const isEdit = !!eventForm.id;
      const endpoint = isEdit ? `/api/events/${eventForm.id}` : '/api/events';
      const method = isEdit ? 'PUT' : 'POST';

      const saved = await apiCall(endpoint, {
        method,
        body: JSON.stringify(eventForm)
      });

      if (isEdit) {
        setEvents(prev => prev.map(ev => ev.id === saved.id ? saved : ev));
        addToast('Evento atualizado com sucesso!', 'success');
      } else {
        setEvents(prev => [...prev, saved]);
        persistSelectedEvent(saved.id, saved.currentUserRole || 'ADMIN');
        setActiveTab('evento-dashboard');
        addToast('Evento criado e ativado com sucesso!', 'success');
      }

      setIsEventModalOpen(false);
      setEventForm({ id: '', name: '', date: '', location: '', capacity: 200, enableAccessControl: true, enableCloakroom: false, enableScanner: true });
    } catch (err) {}
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Atenção: A remoção deste evento excluirá em cascata todos os participantes e itens de chapelaria relacionados. Deseja prosseguir?')) return;
    try {
      await apiCall(`/api/events/${id}`, { method: 'DELETE' });
      addToast('Evento removido do sistema.', 'success');
      setEvents(prev => prev.filter(ev => ev.id !== id));
      if (selectedEventId === id) {
        persistSelectedEvent('');
      }
    } catch (e) {}
  };

  const resetActivityForm = () => {
    setActivityForm({
      id: '',
      title: '',
      roomName: '',
      speakerName: '',
      date: currentEvent?.date || '',
      startTime: '',
      endTime: '',
      workloadHours: 1,
      active: true
    });
  };

  const editActivity = (activity: Activity) => {
    setActivityForm({
      id: activity.id,
      title: fixMojibake(activity.title),
      roomName: fixMojibake(activity.roomName),
      speakerName: fixMojibake(activity.speakerName || ''),
      date: activity.date,
      startTime: activity.startTime,
      endTime: activity.endTime,
      workloadHours: activity.workloadHours || 0,
      active: activity.active !== false
    });
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      addToast('Selecione um evento ativo primeiro.', 'error');
      return;
    }
    if (!activityForm.title || !activityForm.roomName || !activityForm.date || !activityForm.startTime || !activityForm.endTime) {
      addToast('Preencha título, sala, data, início e fim da atividade.', 'error');
      return;
    }

    try {
      const isEdit = !!activityForm.id;
      const saved = await apiCall(isEdit ? `/api/activities/${activityForm.id}` : `/api/events/${selectedEventId}/activities`, {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify({
          title: fixMojibake(activityForm.title),
          roomName: fixMojibake(activityForm.roomName),
          speakerName: fixMojibake(activityForm.speakerName),
          date: activityForm.date,
          startTime: activityForm.startTime,
          endTime: activityForm.endTime,
          workloadHours: Number(activityForm.workloadHours) || 0,
          active: activityForm.active
        })
      });

      setActivities(prev => isEdit ? prev.map(item => item.id === saved.id ? saved : item) : [saved, ...prev]);
      resetActivityForm();
      addToast(isEdit ? 'Atividade atualizada.' : 'Atividade criada.', 'success');
    } catch (err) {}
  };

  const handleDeleteActivity = async (id: string) => {
    if (!window.confirm('Excluir esta atividade também removerá suas presenças registradas. Confirmar?')) return;
    try {
      await apiCall(`/api/activities/${id}`, { method: 'DELETE' });
      setActivities(prev => prev.filter(item => item.id !== id));
      setActivityAttendances(prev => prev.filter(item => item.activityId !== id));
      if (activityAttendanceActivityId === id) setActivityAttendanceActivityId('');
      addToast('Atividade excluída.', 'success');
    } catch (err) {}
  };

  const handleToggleActivity = async (activity: Activity) => {
    try {
      const updated = await apiCall(`/api/activities/${activity.id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: activity.active === false })
      });
      setActivities(prev => prev.map(item => item.id === updated.id ? updated : item));
      addToast(updated.active === false ? 'Atividade desativada.' : 'Atividade ativada.', 'success');
    } catch (err) {}
  };

  const handleSubmitActivityAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !activityAttendanceActivityId) {
      setActivityAttendanceFeedback({ type: 'error', title: 'Selecione uma atividade', message: 'Escolha a atividade antes de registrar presença.' });
      return;
    }
    if (!activityAttendanceSearch.trim()) {
      setActivityAttendanceFeedback({ type: 'error', title: 'Informe o participante', message: 'Leia o QR Code ou busque por nome/CPF.' });
      return;
    }

    try {
      const result = await apiCall(`/api/events/${selectedEventId}/activity-attendances`, {
        method: 'POST',
        body: JSON.stringify({
          activityId: activityAttendanceActivityId,
          search: activityAttendanceSearch
        })
      });

      if (result.status === 'ALREADY_REGISTERED') {
        setActivityAttendanceFeedback({
          type: 'warning',
          title: 'Participante já registrado nesta atividade',
          message: result.participant?.name || 'Esta presença já existe.'
        });
        return;
      }

      setActivityAttendanceFeedback({
        type: 'success',
        title: 'Presença registrada',
        message: result.participant?.name || 'Registro concluído com sucesso.'
      });
      setActivityAttendanceSearch('');
      const updated = await apiCall(`/api/events/${selectedEventId}/activity-attendances?activityId=${activityAttendanceActivityId}`).catch(() => []);
      setActivityAttendances(prev => [
        ...(Array.isArray(updated) ? updated : []),
        ...prev.filter(item => item.activityId !== activityAttendanceActivityId)
      ]);
    } catch (err: any) {
      setActivityAttendanceFeedback({
        type: 'error',
        title: 'Participante não encontrado',
        message: err?.message || 'Nenhum participante localizado para esta busca.'
      });
    }
  };

  const loadCertificateParticipant = async (searchValue: string) => {
    if (!selectedEventId) {
      setCertificateFeedback({ type: 'error', message: 'Selecione um evento ativo primeiro.' });
      return;
    }
    if (!searchValue.trim()) {
      setCertificateFeedback({ type: 'error', message: 'Informe nome, CPF ou QR Code do participante.' });
      return;
    }

    try {
      const result = await apiCall(`/api/events/${selectedEventId}/certificates/participant?search=${encodeURIComponent(searchValue.trim())}`);
      setCertificateLookup(result);
      setActiveCertificate(null);
      setCertificateFeedback(result.attendedActivities?.length
        ? null
        : { type: 'warning', message: 'Participante não possui presença registrada.' });
    } catch (err: any) {
      setCertificateLookup(null);
      setActiveCertificate(null);
      setCertificateFeedback({ type: 'error', message: err?.message || 'Participante não encontrado.' });
    }
  };

  const handleSearchCertificateParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadCertificateParticipant(certificateSearch);
  };

  const handleIssueCertificate = async (type: 'general' | 'activity', activityId?: string) => {
    if (!selectedEventId || !certificateLookup?.participant) {
      setCertificateFeedback({ type: 'error', message: 'Busque um participante antes de emitir o certificado.' });
      return;
    }
    if (certificateLookup.attendedActivities.length === 0) {
      setCertificateFeedback({ type: 'warning', message: 'Participante não possui presença registrada.' });
      return;
    }

    try {
      const result = await apiCall(`/api/events/${selectedEventId}/certificates`, {
        method: 'POST',
        body: JSON.stringify({
          participantId: certificateLookup.participant.id,
          type,
          ...(activityId ? { activityId } : {})
        })
      });
      const certificate: Certificate = result.certificate;
      if (result.template) {
        setCertificateTemplate(normalizeCertificateTemplate(result.template, selectedEventId));
      }
      const activity = activityId ? certificateLookup.attendedActivities.find(item => item.id === activityId) : undefined;
      setCertificateLookup(prev => prev ? ({ ...prev, certificates: [certificate, ...(prev.certificates || [])] }) : prev);
      setActiveCertificate({ certificate, activity });
      setCertificateFeedback({ type: 'success', message: `Certificado emitido: ${certificate.certificateCode}` });
    } catch (err: any) {
      setCertificateFeedback({ type: 'error', message: err?.message || 'Erro ao emitir certificado.' });
    }
  };

  const printCertificate = () => {
    if (!activeCertificate || !certificateLookup) return;
    const participant = certificateLookup.participant;
    const event = certificateLookup.event;
    const activity = activeCertificate.activity || certificateLookup.attendedActivities.find(item => item.id === activeCertificate.certificate.activityId);
    const certificate = activeCertificate.certificate;
    const template = certificateTemplate || DEFAULT_CERTIFICATE_TEMPLATE;
    const pageSize = template.pageSize || 'A4';
    const orientation = template.orientation || 'landscape';
    const hasVisualTemplate = Array.isArray(template.elements) && template.elements.length > 0;
    const dynamicElements = (template.elements || DEFAULT_CERTIFICATE_TEMPLATE.elements)
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((element, index) => {
        const normalized = getCertificateElementDefaults(element, index);
        if (normalized.type === 'image') {
          return `<div class="field" style="left:${normalized.x}%; top:${normalized.y}%; width:${normalized.width}%; height:${normalized.height}%;">${normalized.imageUrl ? `<img src="${normalized.imageUrl}" alt="${escapeCertificateHtml(normalized.label)}" />` : ''}</div>`;
        }
        const value = replaceCertificatePlaceholders(normalized.placeholder || normalized.text || '', participant, event, certificate, activity);
        return `<div class="field" style="left:${normalized.x}%; top:${normalized.y}%; width:${normalized.width}%; height:${normalized.height}%; color:${normalized.color}; font-family:${normalized.fontFamily}; font-size:${normalized.fontSize}px; font-weight:${normalized.bold ? 900 : 500}; font-style:${normalized.italic ? 'italic' : 'normal'}; text-align:${normalized.align}; justify-content:${normalized.align === 'left' ? 'flex-start' : normalized.align === 'right' ? 'flex-end' : 'center'};">${escapeCertificateHtml(value)}</div>`;
      })
      .join('');
    const isActivity = activeCertificate.certificate.type === 'activity' && activity;
    const certificateBody = isActivity
      ? `
        <p>Certificamos que <strong>${escapeCertificateHtml(participant.name)}</strong></p>
        <p>participou da atividade</p>
        <h2>${escapeCertificateHtml(activity.title)}</h2>
        <p>ministrada por</p>
        <h3>${escapeCertificateHtml(activity.speakerName || 'Palestrante não informado')}</h3>
        <p>com carga horária de</p>
        <h2>${activeCertificate.certificate.totalHours} horas.</h2>
      `
      : `
        <p>Certificamos que <strong>${escapeCertificateHtml(participant.name)}</strong></p>
        <p>participou do evento</p>
        <h2>${escapeCertificateHtml(event.name)}</h2>
        <p>com carga horária total de</p>
        <h2>${activeCertificate.certificate.totalHours} horas.</h2>
      `;
    const win = window.open('', '_blank', 'width=1120,height=760');
    if (!win) return;
    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Certificado ${activeCertificate.certificate.certificateCode}</title>
          <style>
            @page { size: ${pageSize} ${orientation}; margin: 14mm; }
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Arial, sans-serif; color: #0f172a; background: #fff; }
            .certificate { position: relative; min-height: calc(100vh - 28mm); border: ${hasVisualTemplate ? '0' : '12px solid #e5e7eb'}; padding: ${hasVisualTemplate ? '0' : '52px'}; display: flex; flex-direction: column; justify-content: center; text-align: center; overflow: hidden; ${template.backgroundImageUrl ? `background-image: url("${template.backgroundImageUrl}"); background-size: cover; background-position: center;` : ''} }
            .certificate::before { content: ""; position: absolute; inset: 0; background: rgba(255,255,255,0.78); z-index: 0; }
            .content { position: absolute; inset: 0; z-index: 1; }
            .fallback { position: relative; z-index: 1; height: 100%; padding: 52px; display: flex; flex-direction: column; justify-content: center; text-align: center; }
            .logo { max-height: 90px; max-width: 240px; object-fit: contain; margin: 0 auto 20px; display: block; }
            .label { font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.34em; color: #64748b; }
            h1 { margin: 22px 0 6px; font-size: 44px; }
            h2 { margin: 8px 0; font-size: 32px; }
            h3 { margin: 8px 0; font-size: 26px; }
            p { margin: 10px 0; font-size: 22px; line-height: 1.45; }
            .line { width: 140px; height: 1px; background: #cbd5e1; margin: 26px auto; }
            .dynamic { position: absolute; inset: 0; z-index: 2; }
            .field { position: absolute; display: flex; align-items: center; overflow: hidden; line-height: 1.15; }
            .field img { width: 100%; height: 100%; object-fit: contain; }
            .meta { margin-top: 42px; font-size: 12px; font-weight: 700; color: #64748b; }
            ${hasVisualTemplate ? '.label, h1, .line, .meta, .logo { display: none !important; }' : ''}
          </style>
        </head>
        <body>
          <section class="certificate">
            <div class="content">
            ${template.logoUrl ? `<img src="${template.logoUrl}" class="logo" alt="Logo" />` : ''}
            <div class="label">Certificado</div>
            <h1>${escapeCertificateHtml(template.name || 'CREDENCIA')}</h1>
            <div class="line"></div>
            ${template.elements?.length ? '' : certificateBody}
            <div class="dynamic">${dynamicElements}</div>
            <div class="meta">
              <div>Código: ${activeCertificate.certificate.certificateCode}</div>
              <div>Emitido em ${new Date(activeCertificate.certificate.issuedAt).toLocaleString('pt-BR')}</div>
            </div>
            </div>
          </section>
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  // --- Participant Operations ---
  const handleSaveParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateParticipants && !participantForm.id) {
      addToast('Usuário sem permissão para cadastrar participantes neste evento.', 'error');
      return;
    }
    if (!selectedEventId) {
      addToast('Selecione um evento ativo primeiro.', 'error');
      return;
    }
    if (!participantForm.name || !participantForm.email) {
      addToast('Nome e e-mail são obrigatórios!', 'error');
      return;
    }

    try {
      const isEdit = !!participantForm.id;
      const endpoint = isEdit ? `/api/participants/${participantForm.id}` : `/api/events/${selectedEventId}/participants`;
      const method = isEdit ? 'PUT' : 'POST';

      const saved = await apiCall(endpoint, {
        method,
        body: JSON.stringify({
          ...participantForm,
          allowedAreaIds: participantForm.allowedAreaIds || participantForm.allowedAreas || [],
          allowedAreas: participantForm.allowedAreaIds || participantForm.allowedAreas || []
        })
      });

      if (isEdit) {
        setParticipants(prev => prev.map(p => p.id === saved.id ? saved : p));
        addToast('Participante atualizado com sucesso!', 'success');
      } else {
        setParticipants(prev => [saved, ...prev]);
        addToast('Participante cadastrado no evento!', 'success');
      }

      setIsParticipantModalOpen(false);
      setParticipantForm({ id: '', name: '', email: '', cpf: '', category: 'Participante', company: '', allowedAreaIds: [], allowedAreas: [] });
      // Refresh current dashboard metrics
      loadDataForEvent(selectedEventId);
    } catch (err) {}
  };

  const handleDeleteParticipant = async (id: string) => {
    if (!window.confirm('Deseja realmente remover este participante?')) return;
    try {
      await apiCall(`/api/participants/${id}`, { method: 'DELETE' });
      setParticipants(prev => prev.filter(p => p.id !== id));
      addToast('Participante removido com sucesso.', 'success');
      if (selectedEventId) {
        loadDataForEvent(selectedEventId);
      }
    } catch (e) {}
  };

  const handleToggleCheckin = async (participant: Participant) => {
    const nextCheckinState = !participant.checkedIn;
    try {
      const data = await apiCall(`/api/participants/${participant.id}/checkin`, {
        method: 'POST',
        body: JSON.stringify({ checkedIn: nextCheckinState })
      });

      setParticipants(prev => prev.map(p => p.id === participant.id ? data.participant : p));
      addToast(data.message, 'success');
      
      if (selectedEventId) {
        loadDataForEvent(selectedEventId);
      }
    } catch (e) {}
  };

  // Quick scan simulation (from quick scanner)
  const handleQuickScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      addToast('Por favor, selecione um evento ativo.', 'error');
      return;
    }
    if (!scanCode.trim()) {
      addToast('Insira um CPF ou código do convite.', 'error');
      return;
    }

    try {
      const res = await apiCall(`/api/events/${selectedEventId}/checkin/scan`, {
        method: 'POST',
        body: JSON.stringify({ code: scanCode.trim() })
      });

      if (res && res.error) {
        setScanResult({
          success: false,
          message: res.error
        });
        return;
      }

      setScanResult({
        success: true,
        message: res.message,
        participant: res.participant
      });

      addToast(res.message, 'success');
      setScanCode('');
      loadDataForEvent(selectedEventId);

      if (autoPrintOnCheckin && res.participant) {
        setActiveBadgeParticipant(res.participant);
      }
    } catch (err: any) {
      setScanResult({
        success: false,
        message: err.message || 'Código do participante não localizado ou já credenciado.'
      });
    }
  };

  // Cadastra e efetua Check-in com Impressão de Etiqueta instantânea na recepção
  const handleCheckinAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      addToast('Selecione um evento ativo primeiro.', 'error');
      return;
    }
    if (!checkinAddForm.name || !checkinAddForm.email || !checkinAddForm.cpf) {
      addToast('Preencha os campos obrigatórios!', 'error');
      return;
    }

    try {
      const saved = await apiCall(`/api/events/${selectedEventId}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...checkinAddForm,
          checkedIn: true,
          checkedInAt: new Date().toISOString()
        })
      });

      setParticipants(prev => [saved, ...prev]);
      addToast('Membro cadastrado e credenciado com sucesso!', 'success');
      
      // Limpa formulário da recepção
      setCheckinAddForm({ name: '', email: '', cpf: '', category: 'Participante', company: '' });
      setShowCheckinAddForm(false);
      
      // Auto-abre para impressão da etiqueta
      setActiveBadgeParticipant(saved);
      
      // Recarrega dados
      loadDataForEvent(selectedEventId);
    } catch (err: any) {
      addToast(err.message || 'Erro ao realizar o cadastro de recepção.', 'error');
    }
  };

  // Realiza check-in e dispara a impressão de crachá de uma só vez
  const handleCheckinAndPrint = async (participant: Participant) => {
    try {
      let updatedParticipant = participant;
      
      if (!participant.checkedIn) {
        const data = await apiCall(`/api/participants/${participant.id}/checkin`, {
          method: 'POST',
          body: JSON.stringify({ checkedIn: true })
        });
        
        updatedParticipant = data.participant;
        setParticipants(prev => prev.map(p => p.id === participant.id ? updatedParticipant : p));
        addToast(`Check-in de ${participant.name} realizado com sucesso!`, 'success');
        
        if (selectedEventId) {
          loadDataForEvent(selectedEventId);
        }
      } else {
        addToast(`Reemitindo etiqueta de ${participant.name}...`, 'info');
      }
      
      setActiveBadgeParticipant(updatedParticipant);
    } catch (e: any) {
      addToast(e.message || 'Falha ao processar o check-in.', 'error');
    }
  };

  // --- Chapelaria Operations ---
  const normalizeCloakroomQuery = (value: string) => value.toLowerCase().replace(/\D/g, '').trim();
  const normalizeCloakroomText = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const normalizeCloakroomCode = (value: string) => normalizeCloakroomText(value).replace(/[^a-z0-9_-]/g, '');
  const cloakroomCodeMatches = (source: string, query: string) => source.length > 0 && query.length > 0 && (source.includes(query) || query.includes(source));

  const cloakroomParticipantResults = useMemo(() => {
    const query = cloakroomSearch.trim();
    if (query.length < 2) return [];

    const textQuery = normalizeCloakroomText(query);
    const numberQuery = normalizeCloakroomQuery(query);
    const codeQuery = normalizeCloakroomCode(query);

    return participants
      .filter(participant => {
        const nameMatch = normalizeCloakroomText(participant.name).includes(textQuery);
        const cpfMatch = numberQuery.length >= 3 && participant.cpf.replace(/\D/g, '').includes(numberQuery);
        const participantId = normalizeCloakroomCode(participant.id || '');
        const participantTicketCode = normalizeCloakroomCode(participant.ticketCode || '');
        const codeMatch = cloakroomCodeMatches(participantId, codeQuery) || cloakroomCodeMatches(participantTicketCode, codeQuery);
        return nameMatch || cpfMatch || codeMatch;
      })
      .slice(0, 8);
  }, [cloakroomSearch, participants]);

  const cloakroomReturnResults = useMemo(() => {
    const query = cloakroomReturnSearch.trim();
    if (query.length < 1) return [];

    const textQuery = normalizeCloakroomText(query);
    const numberQuery = normalizeCloakroomQuery(query);
    const codeQuery = normalizeCloakroomCode(query);

    return cloakroom
      .filter(item => item.status === 'guardado')
      .filter(item => {
        const tagMatch = String(item.tagNumber).includes(query) || (item.volumeTags || []).some(tag => tag.includes(query));
        const participant = participants.find(p => p.id === item.participantId);
        const nameMatch = normalizeCloakroomText(item.participantName).includes(textQuery);
        const cpfMatch = numberQuery.length >= 3 && (participant?.cpf || '').replace(/\D/g, '').includes(numberQuery);
        const participantId = normalizeCloakroomCode(participant?.id || item.participantId || '');
        const participantTicketCode = normalizeCloakroomCode(participant?.ticketCode || '');
        const codeMatch = cloakroomCodeMatches(participantId, codeQuery) || cloakroomCodeMatches(participantTicketCode, codeQuery);
        return tagMatch || nameMatch || cpfMatch || codeMatch;
      })
      .slice(0, 10);
  }, [cloakroom, cloakroomReturnSearch, participants]);

  const filteredCloakroomHistory = useMemo(() => {
    const query = cloakroomHistorySearch.trim();
    const textQuery = normalizeCloakroomText(query);
    const numberQuery = normalizeCloakroomQuery(query);

    return cloakroom.filter(item => {
      const statusMatch = cloakroomHistoryFilter === 'all' || item.status === cloakroomHistoryFilter;
      const participant = participants.find(p => p.id === item.participantId);
      const searchMatch = !query
        || String(item.tagNumber).includes(query)
        || (item.volumeTags || []).some(tag => tag.includes(query))
        || normalizeCloakroomText(item.participantName).includes(textQuery)
        || (numberQuery.length >= 3 && (participant?.cpf || '').replace(/\D/g, '').includes(numberQuery));
      return statusMatch && searchMatch;
    });
  }, [cloakroom, cloakroomHistoryFilter, cloakroomHistorySearch, participants]);

  const nextCloakroomTicket = useMemo(() => {
    const highestTicket = cloakroom.reduce((highest, item) => Math.max(highest, Number(item.tagNumber) || 0), 0);
    return highestTicket + 1;
  }, [cloakroom]);

  const escapePrintHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const formatPrintLine = (value: string) => escapePrintHtml(value).replace(/\r?\n/g, '<br />');

  type CloakroomLabelLineKey = NonNullable<CloakroomLabelConfig['lineOrder']>[number];

  const cloakroomLabelLineOptions: Array<{ key: CloakroomLabelLineKey; label: string; showKey: keyof Pick<CloakroomLabelConfig, 'showEventName' | 'showLabelType' | 'showTicketNumber' | 'showParticipantName' | 'showDescription' | 'showVolumeCount' | 'showDateTime' | 'showOperator'> }> = [
    { key: 'participantName', label: 'Nome do participante', showKey: 'showParticipantName' },
    { key: 'description', label: 'Descrição', showKey: 'showDescription' },
    { key: 'ticketNumber', label: 'Número / ticket', showKey: 'showTicketNumber' },
    { key: 'volumeCount', label: 'Quantidade de volumes', showKey: 'showVolumeCount' },
    { key: 'eventName', label: 'Nome do evento', showKey: 'showEventName' },
    { key: 'labelType', label: 'Tipo da etiqueta', showKey: 'showLabelType' },
    { key: 'dateTime', label: 'Data e hora', showKey: 'showDateTime' },
    { key: 'operator', label: 'Operador', showKey: 'showOperator' }
  ];

  const getCloakroomLabelOrder = (config = cloakroomLabelConfig) => {
    const configured = Array.isArray(config.lineOrder) ? config.lineOrder : [];
    const unique = configured.filter((key, index) => configured.indexOf(key) === index);
    const missing = cloakroomLabelLineOptions.map(option => option.key).filter(key => !unique.includes(key));
    return [...unique, ...missing];
  };

  const getCloakroomLabelFontSize = (key: CloakroomLabelLineKey, config = cloakroomLabelConfig) => {
    return config.fontSizes?.[key] || DEFAULT_CLOAKROOM_LABEL_CONFIG.fontSizes?.[key] || 12;
  };

  const getCloakroomLabelLineValue = (key: CloakroomLabelLineKey, item: CloakroomItem, label: { title: string; tag: string; detail: string }) => {
    switch (key) {
      case 'participantName':
        return item.participantName;
      case 'description':
        return item.itemDescription || '-';
      case 'ticketNumber':
        return label.tag;
      case 'volumeCount':
        return label.detail;
      case 'eventName':
        return currentEvent?.name || '';
      case 'labelType':
        return label.title;
      case 'dateTime':
        return new Date(item.registeredAt).toLocaleString('pt-BR');
      case 'operator':
        return item.registeredByName || '';
      default:
        return '';
    }
  };

  const printCloakroomLabels = (item: CloakroomItem) => {
    const labelWidthCm = 9;
    const labelHeightCm = 4;
    const volumeTags = item.volumeTags && item.volumeTags.length > 0
      ? item.volumeTags
      : Array.from({ length: item.volumeCount || 1 }, (_, index) => `${item.tagNumber}-${index + 1}`);

    const labels = [
      {
        title: 'CHAPELARIA',
        tag: String(item.tagNumber),
        subtitle: 'Etiqueta principal',
        detail: `${item.volumeCount || volumeTags.length} volume(s)`
      },
      ...volumeTags.map((tag, index) => ({
        title: 'VOLUME',
        tag,
        subtitle: `Volume ${index + 1} de ${volumeTags.length}`,
        detail: `Principal #${item.tagNumber}`
      }))
    ];

    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.style.visibility = 'hidden';

    const labelHtml = labels.map((label, index) => `
      <section class="label ${index === labels.length - 1 ? 'last' : ''}">
        ${(cloakroomLabelConfig.showEventName || cloakroomLabelConfig.showLabelType) ? `
          <div class="meta">
            <strong>${cloakroomLabelConfig.showLabelType ? escapePrintHtml(label.title) : ''}</strong>
            <span>${cloakroomLabelConfig.showEventName ? escapePrintHtml(currentEvent?.name || '') : ''}</span>
          </div>
        ` : ''}
        ${cloakroomLabelConfig.showTicketNumber ? `<div class="ticket">${escapePrintHtml(label.tag)}</div>` : ''}
        ${cloakroomLabelConfig.showParticipantName ? `<div class="participant">${escapePrintHtml(item.participantName)}</div>` : ''}
        ${cloakroomLabelConfig.showDescription ? `<div class="description">${escapePrintHtml(item.itemDescription || '-')}</div>` : ''}
        ${(cloakroomLabelConfig.showVolumeCount || cloakroomLabelConfig.showDateTime || cloakroomLabelConfig.showOperator) ? `
          <div class="footer">
            <span>${cloakroomLabelConfig.showVolumeCount ? escapePrintHtml(label.detail) : ''}</span>
            <span>${[
              cloakroomLabelConfig.showOperator ? item.registeredByName || '' : '',
              cloakroomLabelConfig.showDateTime ? new Date(item.registeredAt).toLocaleString('pt-BR') : ''
            ].filter(Boolean).map(escapePrintHtml).join(' • ')}</span>
          </div>
        ` : ''}
      </section>
    `).join('');
    void labelHtml;

    const configurableLabelHtml = labels.map((label, index) => {
      const lines = getCloakroomLabelOrder()
        .map(key => {
          const option = cloakroomLabelLineOptions.find(lineOption => lineOption.key === key);
          if (!option || !cloakroomLabelConfig[option.showKey]) return '';
          const value = getCloakroomLabelLineValue(key, item, label);
          if (!value) return '';
          return `<div class="line line-${key}" style="font-size:${getCloakroomLabelFontSize(key)}px">${formatPrintLine(value)}</div>`;
        })
        .filter(Boolean)
        .join('');

      return `
        <section class="label ${index === labels.length - 1 ? 'last' : ''}">
          <div class="label-content">${lines}</div>
        </section>
      `;
    }).join('');

    const printHtml = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Etiquetas Chapelaria</title>
          <style>
            @page {
              size: ${labelWidthCm}cm ${labelHeightCm}cm;
              margin: 0;
            }
            html,
            body {
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
              font-family: Arial, Helvetica, sans-serif;
            }
            .label {
              width: ${labelWidthCm}cm;
              height: ${labelHeightCm}cm;
              box-sizing: border-box;
              padding: 0.35cm 0.45cm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              page-break-after: always;
              break-after: page;
            }
            .label.last {
              page-break-after: auto;
              break-after: auto;
            }
            .meta,
            .footer {
              display: flex;
              justify-content: space-between;
              gap: 10px;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }
            .meta strong {
              font-size: 13px;
            }
            .ticket {
              text-align: center;
              font-size: 42px;
              line-height: 1;
              font-weight: 900;
              font-family: Arial Black, Arial, Helvetica, sans-serif;
            }
            .participant {
              text-align: center;
              font-size: 18px;
              font-weight: 800;
              line-height: 1.05;
            }
            .description {
              text-align: center;
              font-size: 11px;
              line-height: 1.15;
              min-height: 14px;
            }
            .label-content {
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: center;
              gap: 0.12cm;
            }
            .line {
              text-align: center;
              line-height: 1.12;
              font-weight: 700;
              overflow-wrap: anywhere;
            }
            .line-ticketNumber {
              font-family: Arial Black, Arial, Helvetica, sans-serif;
              font-weight: 900;
            }
            .line-description,
            .line-volumeCount,
            .line-dateTime,
            .line-operator {
              font-weight: 500;
            }
          </style>
        </head>
        <body>${configurableLabelHtml}</body>
      </html>`;

    document.body.appendChild(frame);
    const printDocument = frame.contentWindow?.document;
    if (!printDocument || !frame.contentWindow) {
      frame.remove();
      return;
    }

    printDocument.open();
    printDocument.write(printHtml);
    printDocument.close();

    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1000);
    }, 250);
  };

  const handleOperationalCloakroomSave = async () => {
    if (!selectedEventId) {
      addToast('Selecione um evento ativo', 'error');
      return;
    }
    if (!cloakroomSelectedParticipant) {
      addToast('Localize e selecione um participante antes de guardar os pertences.', 'error');
      return;
    }

    try {
      const saved = await apiCall(`/api/events/${selectedEventId}/cloakroom`, {
        method: 'POST',
        body: JSON.stringify({
          participantId: cloakroomSelectedParticipant.id,
          participantName: cloakroomSelectedParticipant.name,
          itemDescription: cloakroomDescription.trim(),
          volumeCount: cloakroomVolumeCount
        })
      });

      setCloakroom(prev => [saved, ...prev]);
      setCloakroomSuccess(saved);
      setCloakroomSearch('');
      setCloakroomSelectedParticipant(null);
      setCloakroomVolumeCount(1);
      setCloakroomDescription('');
      printCloakroomLabels(saved);
      addToast(`Pertences registrados. Ticket #${saved.tagNumber}`, 'success');
      loadDataForEvent(selectedEventId);
    } catch (err: any) {
      addToast(err.message || 'Erro ao registrar pertences.', 'error');
    }
  };

  const handleSaveCloakroomLabelConfig = async () => {
    if (!currentEvent || !isUserAdmin) {
      addToast('Apenas administradores podem alterar a etiqueta da chapelaria.', 'error');
      return;
    }

    try {
      const updated = await apiCall(`/api/events/${currentEvent.id}`, {
        method: 'PUT',
        body: JSON.stringify({ cloakroomLabelConfig })
      });
      setEvents(prev => prev.map(event => event.id === updated.id ? updated : event));
      addToast('Configuração da etiqueta da chapelaria salva com sucesso.', 'success');
    } catch (error: any) {
      addToast(error.message || 'Erro ao salvar configuração da etiqueta.', 'error');
    }
  };

  const handleSaveCloakroomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      addToast('Selecione um evento ativo', 'error');
      return;
    }
    if (!cloakroomForm.participantName) {
      addToast('Nome do participante é obrigatório', 'error');
      return;
    }

    try {
      const saved = await apiCall(`/api/events/${selectedEventId}/cloakroom`, {
        method: 'POST',
        body: JSON.stringify({ ...cloakroomForm, volumeCount: 1 })
      });

      setCloakroom(prev => [saved, ...prev]);
      printCloakroomLabels(saved);
      addToast(`Item guardado com sucesso! Etiqueta gerada: #${saved.tagNumber}`, 'success');
      setIsCloakroomModalOpen(false);
      setCloakroomForm({ participantId: '', participantName: '', itemDescription: '' });
      loadDataForEvent(selectedEventId);
    } catch (err) {}
  };

  const handleWithdrawCloakroomItem = async (id: string, tagNum: number, skipConfirm = false) => {
    if (!skipConfirm) {
      const item = cloakroom.find(cloakroomItem => cloakroomItem.id === id);
      setPendingCloakroomReturn(item || {
        id,
        eventId: selectedEventId || '',
        participantName: '',
        itemDescription: '',
        tagNumber: tagNum,
        status: 'guardado',
        registeredAt: new Date().toISOString()
      });
      return;
    }
    try {
      const updated = await apiCall(`/api/cloakroom/${id}/collect`, { method: 'POST' });
      setCloakroom(prev => prev.map(item => item.id === id ? updated : item));
      setCloakroomReturnSuccess(updated);
      setCloakroomReturnItem(null);
      setPendingCloakroomReturn(null);
      setCloakroomReturnSearch('');
      addToast(`Etiqueta #${tagNum} devolvida e concluída com sucesso!`, 'success');
      if (selectedEventId) {
        loadDataForEvent(selectedEventId);
      }
    } catch (e) {}
  };

  const handleDeleteCloakroomItem = async (id: string) => {
    if (!window.confirm('Remover definitivamente este registro de chapelaria do histórico?')) return;
    try {
      await apiCall(`/api/cloakroom/${id}`, { method: 'DELETE' });
      setCloakroom(prev => prev.filter(item => item.id !== id));
      addToast('Registro removido.', 'success');
    } catch (e) {}
  };


  // --- EXCEL (.XLSX/.CSV) IMPORT / PARSE LOGIC WITH PREVIEW & VALIDATION ---
  const validateCPF = (cpf: string): boolean => {
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false; // same digits
    
    // Check digits
    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
    
    return true;
  };

  const normalizeImportText = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const guessImportTarget = (header: string): ImportTargetField => {
    const normalized = normalizeImportText(header);
    if (['nome', 'name', 'participante', 'participant'].includes(normalized)) return 'name';
    if (['cpf', 'c p f', 'documento', 'identidade', 'cpf cnpj'].includes(normalized)) return 'cpf';
    if (['email', 'e mail', 'mail'].includes(normalized)) return 'email';
    if (['empresa', 'company', 'corporação', 'corporacao', 'organizacao', 'organizacao', 'org', 'trabalho'].includes(normalized)) return 'company';
    if (['categoria', 'category', 'grupo'].includes(normalized)) return 'category';
    if (['codigo qr', 'qr code', 'codigo do ingresso', 'ingresso', 'ticket', 'ticket code', 'ticketcode', 'codigo'].includes(normalized)) return 'ticketCode';
    if (['area', 'areas', 'area de acesso', 'areas de acesso', 'acesso', 'acessos', 'allowed areas'].includes(normalized)) return 'areas';
    if (['perfil', 'tipo', 'profile', 'access profile', 'perfil de acesso'].includes(normalized)) return 'profile';
    return 'ignore';
  };

  const loadImportTemplates = () => {
    try {
      const stored = localStorage.getItem(IMPORT_TEMPLATES_STORAGE_KEY);
      setImportTemplates(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.warn('Unable to load import templates', error);
      setImportTemplates([]);
    }
  };

  const resetImportWizard = () => {
    setImportStep(1);
    setImportRows([]);
    setImportFileName('');
    setImportHeaders([]);
    setImportRawRows([]);
    setImportColumnMapping({});
    setImportFieldOrder(DEFAULT_IMPORT_FIELD_ORDER);
    setImportTemplateName('');
    setImportTemplateGlobal(false);
    setEditingImportTemplateId('');
  };

  const getMappedValue = (row: any, target: ImportTargetField, mapping = importColumnMapping) => {
    const header = importHeaders.find(item => mapping[item] === target);
    if (!header) return undefined;
    return row[header];
  };

  const applyImportTemplate = (template: ImportTemplate, editMode = false) => {
    setImportColumnMapping(prev => {
      const next = { ...prev };
      importHeaders.forEach(header => {
        if (template.mapping[header]) {
          next[header] = template.mapping[header];
        }
      });
      return next;
    });
    setImportFieldOrder(template.fieldOrder && template.fieldOrder.length > 0 ? template.fieldOrder : DEFAULT_IMPORT_FIELD_ORDER);
    if (editMode) {
      setImportTemplateName(template.name);
      setImportTemplateGlobal(template.global);
      setEditingImportTemplateId(template.id);
    } else {
      setEditingImportTemplateId('');
    }
    addToast(`Modelo "${template.name}" aplicado.`, 'info');
  };

  const saveImportTemplate = () => {
    const name = importTemplateName.trim();
    if (!name) {
      addToast('Informe um nome para salvar o modelo.', 'error');
      return;
    }
    const template: ImportTemplate = {
      id: editingImportTemplateId || `tpl_${Date.now().toString(36)}`,
      name,
      eventId: importTemplateGlobal ? undefined : selectedEventId,
      global: importTemplateGlobal,
      mapping: importColumnMapping,
      fieldOrder: importFieldOrder,
      updatedAt: new Date().toISOString()
    };
    const next = editingImportTemplateId
      ? importTemplates.map(item => item.id === editingImportTemplateId ? template : item)
      : [...importTemplates, template];
    setImportTemplates(next);
    localStorage.setItem(IMPORT_TEMPLATES_STORAGE_KEY, JSON.stringify(next));
    setEditingImportTemplateId(template.id);
    addToast('Modelo de importacao salvo.', 'success');
  };

  const deleteImportTemplate = (templateId: string) => {
    const next = importTemplates.filter(item => item.id !== templateId);
    setImportTemplates(next);
    localStorage.setItem(IMPORT_TEMPLATES_STORAGE_KEY, JSON.stringify(next));
    if (editingImportTemplateId === templateId) {
      setEditingImportTemplateId('');
      setImportTemplateName('');
    }
  };

  const duplicateImportTemplate = (template: ImportTemplate) => {
    const duplicated: ImportTemplate = {
      ...template,
      id: `tpl_${Date.now().toString(36)}`,
      name: `${template.name} - copia`,
      updatedAt: new Date().toISOString()
    };
    const next = [...importTemplates, duplicated];
    setImportTemplates(next);
    localStorage.setItem(IMPORT_TEMPLATES_STORAGE_KEY, JSON.stringify(next));
  };

  const moveImportField = (field: ImportTargetField, direction: -1 | 1) => {
    setImportFieldOrder(prev => {
      const index = prev.indexOf(field);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      next[index] = prev[targetIndex];
      next[targetIndex] = field;
      return next;
    });
  };

  const buildImportPreviewRows = () => {
    const seenCPFsInSheet = new Set<string>();
    const seenTicketsInSheet = new Set<string>();

    const validatedList = importRawRows.map((row: any, idx) => {
      const rawNome = getMappedValue(row, 'name');
      const rawEmail = getMappedValue(row, 'email');
      const rawCpf = getMappedValue(row, 'cpf');
      const rawCategory = getMappedValue(row, 'category');
      const rawCompany = getMappedValue(row, 'company');
      const rawTicketCode = getMappedValue(row, 'ticketCode');
      const rawProfile = getMappedValue(row, 'profile');
      const rawAreas = getMappedValue(row, 'areas');

      const nome = rawNome !== undefined ? String(rawNome).trim() : '';
      const email = rawEmail !== undefined ? String(rawEmail).trim() : '';
      const originalCpf = rawCpf !== undefined ? String(rawCpf).trim() : '';
      const cleanCpf = originalCpf.replace(/\D/g, '');
      const category = rawCategory !== undefined ? String(rawCategory).trim() : 'Participante';
      const company = rawCompany !== undefined ? String(rawCompany).trim() : '';
      const ticketCode = rawTicketCode !== undefined ? String(rawTicketCode).trim() : '';
      const profile = rawProfile !== undefined ? String(rawProfile).trim() : '';
      const areasText = rawAreas !== undefined ? String(rawAreas).trim() : '';
      const errors: string[] = [];

      if (!nome) errors.push('Nome e obrigatorio');

      if (originalCpf) {
        if (!validateCPF(cleanCpf)) {
          errors.push('CPF invalido');
        } else {
          if (seenCPFsInSheet.has(cleanCpf)) errors.push('CPF duplicado na planilha');
          else seenCPFsInSheet.add(cleanCpf);
          if (participants.some(p => p.cpf.replace(/\D/g, '') === cleanCpf)) {
            errors.push('CPF ja cadastrado neste evento');
          }
        }
      }

      if (ticketCode) {
        const ticketKey = ticketCode.toLowerCase();
        if (seenTicketsInSheet.has(ticketKey)) errors.push('Codigo duplicado na planilha');
        else seenTicketsInSheet.add(ticketKey);
        if (participants.some(p => String(p.ticketCode || '').toLowerCase() === ticketKey)) {
          errors.push('Codigo ja cadastrado neste evento');
        }
      }

      let resolvedAreaIds: string[] = [];
      let resolvedAreaNames: string[] = [];

      if (profile) {
        const matchedProfile = accessProfiles.find(ap => ap.name.toLowerCase() === profile.toLowerCase());
        if (!matchedProfile) {
          errors.push(`Perfil de acesso "${profile}" nao encontrado no sistema`);
        } else {
          const profileAreaIds = Array.isArray(matchedProfile.area_ids) ? matchedProfile.area_ids : [];
          resolvedAreaIds = [...new Set([...resolvedAreaIds, ...profileAreaIds])];
          const profileAreaNames = profileAreaIds
            .map(areaId => availableAreas.find(area => area.id === areaId)?.name)
            .filter(Boolean) as string[];
          resolvedAreaNames = [...new Set([...resolvedAreaNames, ...profileAreaNames])];
        }
      }

      if (areasText) {
        areasText.split(/[;,]+/).map(s => s.trim()).filter(Boolean).forEach(item => {
          const matchedArea = availableAreas.find(a =>
            a.id.toLowerCase() === item.toLowerCase() ||
            a.name.toLowerCase() === item.toLowerCase()
          );
          if (!matchedArea) {
            errors.push(`Area "${item}" nao cadastrada no evento`);
          } else {
            if (!resolvedAreaIds.includes(matchedArea.id)) resolvedAreaIds.push(matchedArea.id);
            if (!resolvedAreaNames.includes(matchedArea.name)) resolvedAreaNames.push(matchedArea.name);
          }
        });
      }

      return {
        rowNumber: idx + 1,
        originalData: row,
        nome,
        email,
        cpf: cleanCpf || originalCpf,
        category,
        company,
        ticketCode,
        profile,
        areasText,
        resolvedAreaIds,
        resolvedAreaNames,
        errors,
        isValid: errors.length === 0
      };
    });

    setImportRows(validatedList);
    setImportStep(4);
  };

  const processUploadedFile = (file: File) => {
    if (!canCreateParticipants) {
      addToast('Usuario sem permissao para importar participantes neste evento.', 'error');
      return;
    }

    loadImportTemplates();
    resetImportWizard();
    setImportFileName(file.name);
    setImportFileIsLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          addToast('A planilha esta vazia ou nao possui dados legiveis.', 'error');
          setImportFileIsLoading(false);
          return;
        }

        const headers = Object.keys(rawRows[0] || {});
        if (headers.length === 0) {
          addToast('Nao foi possivel ler os cabecalhos da planilha.', 'error');
          setImportFileIsLoading(false);
          return;
        }

        const inferredMapping = headers.reduce<Record<string, ImportTargetField>>((acc, header) => {
          acc[header] = guessImportTarget(header);
          return acc;
        }, {});

        setImportHeaders(headers);
        setImportRawRows(rawRows);
        setImportColumnMapping(inferredMapping);
        setImportFieldOrder(DEFAULT_IMPORT_FIELD_ORDER);
        setImportRows([]);
        setImportStep(2);
        setIsImportPreviewModalOpen(true);
      } catch (error) {
        console.error(error);
        addToast('Erro ao ler arquivo. Verifique se e um Excel/CSV valido.', 'error');
      } finally {
        setImportFileIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEventId) return;
    processUploadedFile(file);
    e.target.value = '';
  };

  const confirmBatchImport = async () => {
    if (importRows.some(row => !row.isValid)) {
      addToast('Corrija todas as inconsistências e erros antes de importar os dados.', 'error');
      return;
    }

    if (importRows.length === 0) {
      addToast('Sua planilha não possui registros válidos.', 'error');
      return;
    }

    setIsImportingInProgress(true);
    try {
      const payloadRows = importRows.map(row => {
        const item: any = {};
        item['nome'] = row.nome;
        item['email'] = row.email;
        item['cpf'] = row.cpf;
        item['categoria'] = row.category;
        item['empresa'] = row.company;
        if (row.ticketCode) {
          item['ticketCode'] = row.ticketCode;
        }
        
        if (row.profile) {
          item['perfil'] = row.profile;
        }
        if (row.resolvedAreaIds?.length > 0) {
          item['allowedAreaIds'] = row.resolvedAreaIds;
          item['allowedAreas'] = row.resolvedAreaIds;
        } else if (row.areasText) {
          item['acessos'] = row.areasText;
        }
        return item;
      });

      const responseData = await apiCall(`/api/events/${selectedEventId}/participants/batch`, {
        method: 'POST',
        body: JSON.stringify({ participants: payloadRows })
      });

      addToast(
        `Sucesso! Importados: ${responseData.totalImported}, Ignorados por duplicidade: ${responseData.skipped}`,
        responseData.totalImported > 0 ? 'success' : 'info'
      );
      
      setIsImportPreviewModalOpen(false);
      resetImportWizard();
      loadDataForEvent(selectedEventId);
    } catch (err: any) {
      console.error('Error conducting batch import:', err);
      setImportStep(4);
      addToast(err.message || 'Erro durante a gravação dos dados da planilha no banco de dados.', 'error');
    } finally {
      setIsImportingInProgress(false);
    }
  };

  // Generate an instant Template Excel download
  const downloadSampleExcelTemplate = () => {
    const templateData = [
      { Nome: 'João da Silva', Email: 'joao.silva@email.com', CPF: '12345678901', Empresa: 'Tech Soluções', Categoria: 'Participante' },
      { Nome: 'Dr. Marcos Souza', Email: 'marcos.s@email.com', CPF: '98765432100', Empresa: 'Universidade Federal', Categoria: 'Palestrante' },
      { Nome: 'Empresa Alpha Ltda', Email: 'contato@alpha.com', CPF: '33344455566', Empresa: 'Alpha Ventures', Categoria: 'Expositor' },
      { Nome: 'Juliana Garcia', Email: 'juliana.g@email.com', CPF: '55566677788', Empresa: 'Inova Digital', Categoria: 'VIP' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Participantes');
    
    // Create direct blob buffer download
    XLSX.writeFile(workbook, 'Modelo_Importacao_CREDENCIA.xlsx');
    addToast('Modelo Excel de importação baixado!', 'success');
  };


  // --- REPORTS EXPORT GENERATORS ---
  const exportParticipantsToExcelWithFilter = (presentOnly: boolean, sourceList?: Participant[], fileLabel?: string) => {
    if (!currentEvent) return;

    const reportSource = sourceList || participants;
    
    const baseList = presentOnly 
      ? reportSource.filter(p => p.checkedIn)
      : reportSource;

    const titleSuffix = fileLabel || (presentOnly ? 'Presentes' : 'Inscritos_Geral');
    
    const outputRows = baseList.map(p => {
      const participantAreaLogs = areaAccessLogs.filter(log => log.participantId === p.id);
      const allowedAreaNames = [...new Set(participantAreaLogs
        .filter(log => log.status === 'ALLOWED')
        .map(log => log.areaName || availableAreas.find(area => area.id === log.areaId)?.name || 'Área'))];
      const deniedCount = participantAreaLogs.filter(log => log.status === 'DENIED').length;
      const participantCertificates = certificates.filter(certificate => certificate.participantId === p.id);

      return {
        Nome: p.name,
        'E-mail': p.email,
        CPF: p.cpf,
        Empresa: p.company || '',
        Categoria: p.category,
        'Credenciado?': p.checkedIn ? 'Sim' : 'Não',
        'Horário do Credenciamento': p.checkedInAt ? new Date(p.checkedInAt).toLocaleString('pt-BR') : 'Não realizado',
        'Acessos por Sala': allowedAreaNames.length > 0 ? allowedAreaNames.join(', ') : '-',
        'Acessos Negados': deniedCount,
        'Certificados Emitidos': participantCertificates.length,
        'Códigos dos Certificados': participantCertificates.map(certificate => certificate.certificateCode).join(', '),
        'Horas em Certificados': participantCertificates.reduce((sum, certificate) => sum + (Number(certificate.totalHours) || 0), 0),
        'Operador Responsável': getReportCheckinOperator(p),
        'Código do Convite': p.ticketCode
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(outputRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
    XLSX.writeFile(workbook, `Filtro_${titleSuffix}_${currentEvent.name.replace(/\s+/g, '_')}.xlsx`);
    addToast('Planilha gerada com sucesso!', 'success');
  };

  // Direct CSV printable list
  const triggerPrintableReport = () => {
    window.print();
  };

  // Filtered Participants computed list
  const filteredParticipantsList = useMemo(() => {
    return participants.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.cpf.includes(searchQuery) || 
                          p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.ticketCode.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchCategory = selectedCategoryFilter === 'all' || p.category === selectedCategoryFilter;
      const matchPresence = selectedPresenceFilter === 'all' || 
                            (selectedPresenceFilter === 'present' ? p.checkedIn : !p.checkedIn);

      return matchSearch && matchCategory && matchPresence;
    });
  }, [participants, searchQuery, selectedCategoryFilter, selectedPresenceFilter]);

  const reportParticipants = filteredParticipantsList;

  const reportSummary = useMemo(() => {
    const total = reportParticipants.length;
    const checkedIn = reportParticipants.filter(p => p.checkedIn).length;
    const pending = total - checkedIn;
    const attendanceRate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

    return { total, checkedIn, pending, attendanceRate };
  }, [reportParticipants]);

  const reportCheckinsByHour = useMemo(() => {
    const buckets = reportParticipants
      .filter(p => p.checkedIn && p.checkedInAt)
      .reduce<Record<string, number>>((acc, participant) => {
        const hour = new Date(participant.checkedInAt as string).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        }).slice(0, 2) + 'h';
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {});

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, count]) => ({ label, count }));
  }, [reportParticipants]);

  const reportParticipantsByCategory = useMemo(() => {
    return (Object.keys(CATEGORY_TAGS) as ParticipantCategory[])
      .map(category => ({
        label: category,
        count: reportParticipants.filter(p => p.category === category).length
      }))
      .filter(item => item.count > 0);
  }, [reportParticipants]);

  const reportPresenceBreakdown = useMemo(() => ([
    { label: 'Credenciados', count: reportSummary.checkedIn, color: 'bg-emerald-500' },
    { label: 'Pendentes', count: reportSummary.pending, color: 'bg-amber-400' }
  ]), [reportSummary]);

  const reportCheckinOperatorByParticipant = useMemo(() => {
    const map = new Map<string, string>();
    const checkinLogs = actionLogs
      .filter(log => log.action === 'CHECKIN' && log.participantId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    checkinLogs.forEach(log => {
      if (log.participantId && !map.has(log.participantId)) {
        map.set(log.participantId, log.operatorName || 'Operador');
      }
    });

    return map;
  }, [actionLogs]);

  const getReportCheckinOperator = (participant: Participant) => {
    return reportCheckinOperatorByParticipant.get(participant.id)
      || (participant as any).operatorName
      || (participant as any).checkedInByName
      || (participant as any).checkedInBy
      || '-';
  };

  const reportAreaAccessLogs = useMemo(() => {
    const participantIds = new Set(reportParticipants.map(p => p.id));
    const areaIds = new Set(availableAreas.map(area => area.id));

    return areaAccessLogs.filter(log => {
      const logParticipant = participants.find(p => p.id === log.participantId);
      const matchesParticipant = participantIds.has(log.participantId);
      const matchesArea = areaIds.size === 0 || areaIds.has(log.areaId);
      const matchesEvent = !currentEvent?.id || logParticipant?.eventId === currentEvent.id || matchesParticipant;
      return matchesParticipant && matchesArea && matchesEvent;
    });
  }, [areaAccessLogs, availableAreas, currentEvent, participants, reportParticipants]);

  const reportAreaAccessSummary = useMemo(() => {
    return availableAreas.map(area => {
      const logs = reportAreaAccessLogs.filter(log => log.areaId === area.id);
      const allowed = logs.filter(log => log.status === 'ALLOWED').length;
      const denied = logs.filter(log => log.status === 'DENIED').length;

      return {
        areaId: area.id,
        areaName: area.name,
        allowed,
        denied,
        total: logs.length
      };
    }).filter(item => item.total > 0);
  }, [availableAreas, reportAreaAccessLogs]);

  const reportParticipantAreaAccess = useMemo(() => {
    return reportParticipants.map(participant => {
      const logs = reportAreaAccessLogs.filter(log => log.participantId === participant.id);
      const allowedAreaNames = [...new Set(logs
        .filter(log => log.status === 'ALLOWED')
        .map(log => log.areaName || availableAreas.find(area => area.id === log.areaId)?.name || 'Área'))];
      const deniedCount = logs.filter(log => log.status === 'DENIED').length;

      return {
        participantId: participant.id,
        allowedAreaNames,
        deniedCount,
        total: logs.length,
        lastAccessAt: logs[0]?.timestamp
      };
    });
  }, [availableAreas, reportAreaAccessLogs, reportParticipants]);

  const reportParticipantIds = useMemo(() => new Set(reportParticipants.map(participant => participant.id)), [reportParticipants]);

  const reportCertificates = useMemo(() => {
    return certificates.filter(certificate => reportParticipantIds.has(certificate.participantId));
  }, [certificates, reportParticipantIds]);

  const reportCertificateSummary = useMemo(() => {
    const general = reportCertificates.filter(certificate => certificate.type === 'general').length;
    const activity = reportCertificates.filter(certificate => certificate.type === 'activity').length;
    const totalHours = reportCertificates.reduce((sum, certificate) => sum + (Number(certificate.totalHours) || 0), 0);
    const participantCount = new Set(reportCertificates.map(certificate => certificate.participantId)).size;
    return {
      total: reportCertificates.length,
      general,
      activity,
      participantCount,
      totalHours
    };
  }, [reportCertificates]);

  const reportCloakroomItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return cloakroom
      .filter(item => {
        const participant = item.participantId ? participants.find(p => p.id === item.participantId) : undefined;
        const matchesParticipantFilters = item.participantId
          ? reportParticipantIds.has(item.participantId)
          : selectedCategoryFilter === 'all' && selectedPresenceFilter === 'all';

        const searchableText = [
          item.participantName,
          item.itemDescription,
          String(item.tagNumber),
          ...(item.volumeTags || []),
          participant?.cpf || ''
        ].join(' ').toLowerCase();

        return matchesParticipantFilters && (!query || searchableText.includes(query));
      })
      .sort((a, b) => new Date(b.returnedAt || b.registeredAt).getTime() - new Date(a.returnedAt || a.registeredAt).getTime());
  }, [cloakroom, participants, reportParticipantIds, searchQuery, selectedCategoryFilter, selectedPresenceFilter]);

  const reportCloakroomSummary = useMemo(() => {
    const stored = reportCloakroomItems.filter(item => item.status === 'guardado');
    const returned = reportCloakroomItems.filter(item => item.status === 'retirado');
    const totalVolumes = reportCloakroomItems.reduce((sum, item) => sum + (item.volumeCount || 1), 0);
    const storedVolumes = stored.reduce((sum, item) => sum + (item.volumeCount || 1), 0);

    return {
      totalTickets: reportCloakroomItems.length,
      stored: stored.length,
      returned: returned.length,
      totalVolumes,
      storedVolumes
    };
  }, [reportCloakroomItems]);


  // Clean up initial bootstrap user if missing key items
  const editParticipant = (p: Participant) => {
    setParticipantForm({
      id: p.id,
      name: p.name,
      email: p.email,
      cpf: p.cpf,
      category: p.category,
      company: p.company || '',
      allowedAreaIds: p.allowedAreaIds || p.allowedAreas || [],
      allowedAreas: p.allowedAreas || p.allowedAreaIds || []
    });
    setIsParticipantModalOpen(true);
  };

  const editEvent = (ev: Event) => {
    setEventForm({
      id: ev.id,
      name: ev.name,
      date: ev.date,
      location: ev.location,
      capacity: ev.capacity,
      enableAccessControl: ev.enableAccessControl !== false,
      enableCloakroom: ev.enableCloakroom === true,
      enableScanner: ev.enableScanner !== false
    });
    setIsEventModalOpen(true);
  };

  // --- Layout components Render helpers ---
  const renderPermissionAccordion = ({
    selected,
    search,
    openGroups,
    onToggleOpen,
    onTogglePermission,
    onToggleGroup
  }: {
    selected: string[];
    search: string;
    openGroups: Record<string, boolean>;
    onToggleOpen: (groupId: string) => void;
    onTogglePermission: (permission: string, checked: boolean) => void;
    onToggleGroup: (permissions: string[], checked: boolean) => void;
  }) => {
    const normalizedSearch = search.trim().toLowerCase();
    const filteredGroups = PERMISSION_GROUPS
      .map(group => ({
        ...group,
        permissions: group.permissions.filter(permission =>
          !normalizedSearch ||
          permission.label.toLowerCase().includes(normalizedSearch) ||
          group.title.toLowerCase().includes(normalizedSearch)
        )
      }))
      .filter(group => group.permissions.length > 0);

    return (
      <div className="space-y-2">
        {filteredGroups.map(group => {
          const Icon = group.icon;
          const groupPermissionIds = group.permissions.map(permission => permission.id);
          const selectedCount = groupPermissionIds.filter(permission => selected.includes(permission)).length;
          const isOpen = normalizedSearch ? true : openGroups[group.id] !== false;

          return (
            <div key={group.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => onToggleOpen(group.id)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition cursor-pointer"
              >
                <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Icon size={16} className="text-blue-600" />
                  {group.title}
                </span>
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  {selectedCount}/{groupPermissionIds.length}
                  <ChevronRight size={15} className={`transition ${isOpen ? 'rotate-90' : ''}`} />
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 p-3 space-y-3 bg-slate-50/50">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleGroup(groupPermissionIds, true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-bold hover:bg-emerald-100 transition cursor-pointer"
                    >
                      Marcar todos
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleGroup(groupPermissionIds, false)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold hover:bg-slate-200 transition cursor-pointer"
                    >
                      Desmarcar todos
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.permissions.map(permission => (
                      <label key={permission.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer hover:border-blue-200 hover:bg-blue-50/40 transition">
                        <input
                          type="checkbox"
                          checked={selected.includes(permission.id)}
                          onChange={event => onTogglePermission(permission.id, event.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        {permission.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (!token || !currentUser) {
    return (
      <div className="min-h-screen bg-[#f7f7f2] text-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 items-center">
          <section className="hidden lg:block">
            <img src={credenciaLogo} alt="CREDENCIA" className="h-16 w-auto object-contain mb-6" />
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 font-display max-w-xl">
              Credenciamento de eventos sem ruido.
            </h1>
            <p className="mt-4 text-base text-slate-600 max-w-lg leading-relaxed">
              Controle participantes, check-ins, acessos e impressoes em uma operação clara para a equipe de recepcao.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 max-w-xl">
              <div className="border border-slate-200 bg-white rounded-lg p-4">
                <div className="text-sm font-bold text-slate-950">Check-in</div>
                <div className="text-xs text-slate-500 mt-1">Busca, leitura e presenca.</div>
              </div>
              <div className="border border-slate-200 bg-white rounded-lg p-4">
                <div className="text-sm font-bold text-slate-950">Acesso</div>
                <div className="text-xs text-slate-500 mt-1">Areas, perfis e logs.</div>
              </div>
              <div className="border border-slate-200 bg-white rounded-lg p-4">
                <div className="text-sm font-bold text-slate-950">Relatórios</div>
                <div className="text-xs text-slate-500 mt-1">Exportacao e auditoria.</div>
              </div>
            </div>
          </section>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 sm:p-8">
            <div className="mb-7">
              <img src={credenciaLogo} alt="CREDENCIA" className="h-12 w-auto object-contain mb-5 lg:hidden" />
              <h2 className="text-xl font-bold text-slate-950 font-display">
                {isRegisterMode ? 'Criar acesso' : 'Entrar no sistema'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {isRegisterMode ? 'Cadastre um operador para usar o sistema.' : 'Use seu e-mail e senha para acessar a operação.'}
              </p>
            </div>

            {loginMethod === 'pin' && !isRegisterMode ? (
              <div className="space-y-5">
                <div className="flex justify-center gap-2 select-none">
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const val = pinInput[idx];
                    const active = pinInput.length === idx;
                    return (
                      <div
                        key={idx}
                        className={`w-10 h-12 rounded-md border flex items-center justify-center font-bold text-xl transition ${
                          active
                            ? 'border-[#1D4ED8] bg-slate-50 text-[#1D4ED8]'
                            : val
                              ? 'border-slate-300 bg-slate-100 text-slate-700'
                              : 'border-slate-200 bg-white text-slate-300'
                        }`}
                      >
                        {authLoading ? <div className="w-2 h-2 rounded-full bg-[#1D4ED8] animate-ping" /> : val ? '*' : ''}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        if (pinInput.length < 6 && !authLoading) {
                          setPinInput(prev => prev + num);
                        }
                      }}
                      className="h-12 bg-white border border-slate-200 rounded-md font-semibold text-slate-900 hover:bg-slate-50 active:scale-98 transition cursor-pointer select-none"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPinInput('')}
                    className="h-12 bg-white border border-slate-200 text-slate-600 rounded-md text-xs font-semibold hover:bg-slate-50 transition cursor-pointer select-none"
                  >
                    Limpar
                  </button>
                  <button
                    key={0}
                    type="button"
                    onClick={() => {
                      if (pinInput.length < 6 && !authLoading) {
                        setPinInput(prev => prev + '0');
                      }
                    }}
                    className="h-12 bg-white border border-slate-200 rounded-md font-semibold text-slate-900 hover:bg-slate-50 active:scale-98 transition cursor-pointer select-none"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => setPinInput(prev => prev.slice(0, -1))}
                    className="h-12 bg-white border border-slate-200 text-slate-600 rounded-md text-xs font-semibold hover:bg-slate-50 transition cursor-pointer select-none"
                  >
                    Apagar
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => { setLoginMethod('email'); setPinInput(''); }}
                  className="w-full py-2.5 text-sm font-semibold text-slate-600 hover:text-[#1D4ED8] transition cursor-pointer"
                >
                  Entrar com e-mail e senha
                </button>
              </div>
            ) : (
              <form onSubmit={isRegisterMode ? handleSignup : handleLogin} className="space-y-4">
                {isRegisterMode && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Nome completo
                      </label>
                      <input
                        type="text"
                        value={registerNameInput}
                        onChange={e => setRegisterNameInput(e.target.value)}
                        placeholder="Nome do operador"
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Organização ou empresa
                      </label>
                      <input
                        type="text"
                        value={registerOrgInput}
                        onChange={e => setRegisterOrgInput(e.target.value)}
                        placeholder="Nome da organizacao"
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition placeholder-slate-400"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="email@empresa.com"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Senha
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    placeholder="Senha"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition placeholder-slate-400"
                  />
                </div>

                {isRegisterMode && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Nível de acesso
                    </label>
                    <select
                      value={registerRoleInput}
                      onChange={e => setRegisterRoleInput(e.target.value as UserRole)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition cursor-pointer"
                    >
                      <option value="admin">Administrador</option>
                      <option value="operator">Operador</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 px-4 bg-[#1D4ED8] hover:bg-[#173FAE] disabled:bg-slate-300 text-white rounded-md text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
                >
                  {authLoading ? (
                    <>
                      <RefreshCw className="animate-spin" size={14} />
                      <span>Entrando...</span>
                    </>
                  ) : (
                    <>
                      <span>{isRegisterMode ? 'Criar acesso' : 'Entrar'}</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            )}

            {!isRegisterMode && loginMethod === 'email' && (
              <button
                type="button"
                onClick={() => { setLoginMethod('pin'); setPinInput(''); }}
                className="mt-4 w-full py-2.5 border border-slate-200 rounded-md text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition"
              >
                Entrar com PIN
              </button>
            )}

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setLoginMethod('email');
                  setEmailInput(isRegisterMode ? 'admin@credencia.com' : '');
                  setPasswordInput(isRegisterMode ? 'admin123' : '');
                }}
                className="text-sm text-[#1D4ED8] hover:text-[#0F172A] font-semibold focus:outline-none transition cursor-pointer select-none"
              >
                {isRegisterMode ? 'Voltar para login' : 'Criar acesso administrativo'}
              </button>
            </div>
          </div>
        </div>

        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`px-4 py-3.5 rounded-md shadow-xl flex items-center gap-3 text-sm font-medium border bg-white animate-slide-in duration-300 ${
                t.type === 'success' ? 'border-emerald-200 text-emerald-900' :
                t.type === 'error' ? 'border-rose-200 text-rose-900' :
                'border-blue-200 text-blue-900'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${t.type === 'success' ? 'bg-emerald-500' : t.type === 'error' ? 'bg-rose-500' : 'bg-blue-500'}`} />
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const roleText = (() => {
    const role = String(currentUser?.role || '').toUpperCase();
    if (role === 'ADMIN' || currentUser?.role === 'admin') return 'Administrador';
    if (role === 'SUPERVISOR') return 'Operador Nível 1';
    if (role === 'CHECKIN_CADASTRO') return 'Operador Nível 2';
    if (role === 'CHECKIN' || role === 'ATENDENTE' || role === 'OPERATOR' || currentUser?.role === 'operator') return 'Operador Nível 3';
    return 'Operador';
  })();

  const eventHasAccessControl = currentEvent?.enableAccessControl !== false;
  const eventHasCloakroom = currentEvent?.enableCloakroom === true;
  const eventHasScanner = currentEvent?.enableScanner !== false;
  const eventUserRoleLabels: Record<EventUserRole, string> = {
    ADMIN: 'Administrador do evento',
    CHECKIN_CADASTRO: 'Check-in + Cadastro',
    CHECKIN: 'Check-in',
    RELATORIO: 'Relatório'
  };

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ElementType }> = [
    ...(isUserAdmin ? [{ id: 'dashboard' as const, label: 'Painel Geral', icon: BarChart3 }] : []),
    ...(isUserAdmin ? [{ id: 'eventos' as const, label: 'Eventos', icon: Calendar }] : []),
    ...(canManageOperators ? [{ id: 'usuarios' as const, label: 'Operadores', icon: Users }] : []),
    ...(canManageParticipants || isUserAdmin ? [{ id: 'participantes' as const, label: 'Participantes', icon: Users }] : []),
    ...(isUserAdmin ? [{ id: 'campos' as const, label: 'Campos de Cadastro', icon: FileText }] : []),
    { id: 'checkin' as const, label: 'Check-in', icon: QrCode },
    ...(isUserAdmin ? [{ id: 'areas' as const, label: 'Salas e Acessos', icon: ShieldCheck }] : []),
    ...(isUserAdmin ? [{ id: 'scanner' as const, label: 'Scan', icon: Camera }] : []),
    ...(isUserAdmin ? [{ id: 'atividades' as const, label: 'Atividades', icon: BookOpen }] : []),
    { id: 'presenca-atividade' as const, label: 'Presença em Atividade', icon: ClipboardCheck },
    ...(canIssueCertificates ? [{ id: 'certificados' as const, label: 'Certificados', icon: Award }] : []),
    ...(isUserAdmin ? [{ id: 'chapelaria' as const, label: 'Chapelaria', icon: FolderLock }] : []),
    ...(canViewReports ? [{ id: 'relatorios' as const, label: 'Relatórios', icon: Download }] : []),
    ...(isUserAdmin ? [{ id: 'impressao' as const, label: 'Impressão de Etiquetas', icon: Printer }] : []),
  ];

  const secondaryNavItems: Array<{ id: ActiveTab; label: string; icon: React.ElementType }> = [];

  const isMoreActive = secondaryNavItems.some(item => item.id === activeTab);
  const isStandaloneCheckin = window.location.pathname === '/checkin';
  const isCheckinOnlyOperator = !!currentUser && !isUserAdmin && !canCreateParticipants && !canViewReports;
  const shouldUseFullscreenCheckin = activeTab === 'checkin' && (isStandaloneCheckin || isCheckinOnlyOperator);
  const activeActivities = activities.filter(activity => activity.active !== false);
  const selectedActivity = activities.find(activity => activity.id === activityAttendanceActivityId) || null;
  const selectedActivityAttendances = activityAttendances.filter(att => att.activityId === activityAttendanceActivityId);
  const certificateParticipant = certificateLookup?.participant;
  const certificateEvent = certificateLookup?.event || currentEvent;
  const certificateActivity = activeCertificate?.activity
    || certificateLookup?.attendedActivities.find(activity => activity.id === activeCertificate?.certificate.activityId);
  const selectedCertificateElement = certificateTemplate.elements.find(element => element.id === selectedCertificateElementId) || null;
  const certificatePreviewParticipant = certificateParticipant || participants[0] || ({
    id: 'preview',
    eventId: selectedEventId,
    name: 'Nome do participante',
    email: '',
    cpf: '00000000000',
    category: 'Participante',
    company: '',
    ticketCode: 'PREVIEW',
    checkedIn: false,
    createdAt: new Date().toISOString()
  } as Participant);
  const certificatePreviewEvent = certificateEvent || currentEvent || ({
    id: selectedEventId || 'preview',
    organizationId: currentUser?.organizationId || 'org1',
    name: 'Nome do evento',
    date: new Date().toISOString(),
    location: '',
    capacity: 0,
    createdAt: new Date().toISOString()
  } as Event);
  const certificatePreviewCertificate = activeCertificate?.certificate || ({
    id: 'preview',
    eventId: selectedEventId || '',
    participantId: certificatePreviewParticipant.id,
    type: 'general',
    totalHours: certificateLookup?.totalHours || 0,
    certificateCode: 'CERT-2026-000001',
    issuedAt: new Date().toISOString(),
    issuedByUserId: currentUser?.id || ''
  } as Certificate);
  const certificateDynamicPreview = activeCertificate && certificateParticipant && certificateEvent
    ? (certificateTemplate.elements || DEFAULT_CERTIFICATE_TEMPLATE.elements)
        .slice()
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(element => ({
          ...element,
          value: replaceCertificatePlaceholders(element.placeholder, certificateParticipant, certificateEvent, activeCertificate.certificate, certificateActivity)
        }))
    : [];
  const activityParticipantSuggestions = (() => {
    const query = normalizeParticipantSearch(activityAttendanceSearch);
    if (query.length < 3) return [];
    if (participants.some(participant => normalizeParticipantSearch(participant.name) === query || normalizeParticipantSearch(participant.badgeName || '') === query)) return [];
    return participants
      .filter(participant => getParticipantSearchScore(participant, query) < 99)
      .sort((a, b) => {
        const scoreDiff = getParticipantSearchScore(a, query) - getParticipantSearchScore(b, query);
        if (scoreDiff !== 0) return scoreDiff;
        return (a.badgeName || a.name).localeCompare(b.badgeName || b.name, 'pt-BR');
      })
      .slice(0, 8);
  })();
  const certificateParticipantSuggestions = (() => {
    const query = normalizeParticipantSearch(certificateSearch);
    if (query.length < 3) return [];
    if (participants.some(participant => normalizeParticipantSearch(participant.name) === query || normalizeParticipantSearch(participant.badgeName || '') === query)) return [];
    return participants
      .filter(participant => getParticipantSearchScore(participant, query) < 99)
      .sort((a, b) => {
        const scoreDiff = getParticipantSearchScore(a, query) - getParticipantSearchScore(b, query);
        if (scoreDiff !== 0) return scoreDiff;
        return (a.badgeName || a.name).localeCompare(b.badgeName || b.name, 'pt-BR');
      })
      .slice(0, 8);
  })();

  return (
    <div className={`min-h-screen text-slate-900 flex flex-col overflow-hidden ${isDarkTheme ? 'theme-dark bg-[#0B1120]' : 'bg-[#f7f7f2]'}`}>
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 no-print">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-md shadow-lg flex items-center gap-3 text-sm font-medium border bg-white select-none ${
              t.type === 'success' ? 'border-emerald-200 text-emerald-900' :
              t.type === 'error' ? 'border-rose-200 text-rose-900' :
              'border-blue-200 text-blue-900'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${
              t.type === 'success' ? 'bg-emerald-500' :
              t.type === 'error' ? 'bg-rose-500' :
              'bg-blue-500'
            }`} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      <header className={`${shouldUseFullscreenCheckin ? 'hidden' : 'bg-white border-b border-slate-200 no-print shrink-0'}`}>
        <div className="px-5 lg:px-8 py-4 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={() => isUserAdmin ? setActiveTab('dashboard') : setActiveTab('checkin')}
                className="flex items-center gap-2 shrink-0 cursor-pointer"
                title="Ir para o inicio"
              >
                <div className="text-left">
                  <img src={credenciaLogo} alt="CREDENCIA" className="h-10 w-auto object-contain" />
                </div>
              </button>

            </div>

            <div className="flex items-center justify-between lg:justify-end gap-3">
              {isUserAdmin && (
                <button
                  onClick={() => {
                    setEventForm({ id: '', name: '', date: '', location: '', capacity: 200, enableAccessControl: true, enableCloakroom: false, enableScanner: true });
                    setIsEventModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-[#1D4ED8] hover:bg-[#173FAE] text-white rounded-md transition cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Novo evento</span>
                </button>
              )}

              <button
                onClick={() => setIsDarkTheme(prev => !prev)}
                className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title={isDarkTheme ? 'Usar tema claro' : 'Usar tema escuro'}
              >
                {isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <button
                onClick={() => {
                  setProfileForm({
                    name: currentUser?.name || '',
                    email: currentUser?.email || '',
                    password: ''
                  });
                  setIsProfileModalOpen(true);
                }}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                  {currentUser?.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-900 leading-none max-w-[150px] truncate">{currentUser?.name}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{roleText}</div>
                </div>
              </button>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer text-sm font-semibold"
                title="Sair"
              >
                <LogOut size={15} />
                <span>Sair</span>
              </button>
            </div>
          </div>

          <nav className="relative flex flex-wrap gap-1 pb-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setIsMoreMenuOpen(false);
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-[#0F172A] text-white'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {secondaryNavItems.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setIsMoreMenuOpen(prev => !prev)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
                    isMoreActive || isMoreMenuOpen
                      ? 'bg-[#0F172A] text-white'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                >
                  <MoreHorizontal size={15} />
                  <span>Mais</span>
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute left-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl p-1.5 z-50">
                    {secondaryNavItems.map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id as any);
                            setIsMoreMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold text-left transition cursor-pointer ${
                            isActive
                              ? 'bg-slate-950 text-white'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                          }`}
                        >
                          <Icon size={15} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-8 border-t border-slate-100 pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 font-display">Vínculos por Evento</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Defina quais usuários participam de cada evento e qual permissão terão naquele evento.
                      </p>
                    </div>

                    <form onSubmit={handleSaveEventUser} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-2 w-full lg:max-w-5xl">
                      <select
                        value={eventUserForm.eventId}
                        onChange={e => {
                          const eventId = e.target.value;
                          setEventUserForm(prev => ({ ...prev, eventId }));
                          loadEventUsers(eventId);
                        }}
                        className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="">Selecione o evento</option>
                        {events.map(event => (
                          <option key={event.id} value={event.id}>{event.name}</option>
                        ))}
                      </select>

                      <select
                        value={eventUserForm.userId}
                        onChange={e => setEventUserForm(prev => ({ ...prev, userId: e.target.value }))}
                        className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="">Selecione o usuário</option>
                        {usersList.map(user => (
                          <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                      </select>

                      <select
                        value={eventUserForm.role}
                        onChange={e => setEventUserForm(prev => ({ ...prev, role: e.target.value as EventUserRole }))}
                        className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        {(Object.keys(eventUserRoleLabels) as EventUserRole[]).map(role => (
                          <option key={role} value={role}>{eventUserRoleLabels[role]}</option>
                        ))}
                      </select>

                      <select
                        defaultValue=""
                        onChange={e => {
                          applyEventUserPermissionPreset(e.target.value);
                          e.target.value = '';
                        }}
                        className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="">Aplicar perfil</option>
                        {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
                          <option key={key} value={key}>{preset.label}</option>
                        ))}
                      </select>

                      <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={eventUserForm.active}
                          onChange={e => setEventUserForm(prev => ({ ...prev, active: e.target.checked }))}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-100"
                        />
                        <span>Ativo</span>
                      </label>

                      <button
                        type="submit"
                        className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Vincular
                      </button>
                    </form>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Permissões do vínculo</label>
                        <input
                          type="search"
                          value={eventPermissionSearch}
                          onChange={e => setEventPermissionSearch(e.target.value)}
                          placeholder="Buscar permissão para este evento"
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setEventUserForm(prev => ({ ...prev, permissions: ALL_PERMISSION_IDS }))}
                        className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Marcar todas
                      </button>
                      <button
                        type="button"
                        onClick={() => setEventUserForm(prev => ({ ...prev, permissions: [] }))}
                        className="px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Desmarcar todas
                      </button>
                    </div>

                    {renderPermissionAccordion({
                      selected: eventUserForm.permissions,
                      search: eventPermissionSearch,
                      openGroups: openEventPermissionGroups,
                      onToggleOpen: groupId => setOpenEventPermissionGroups(prev => ({ ...prev, [groupId]: !prev[groupId] })),
                      onTogglePermission: toggleEventUserFormPermission,
                      onToggleGroup: toggleEventUserFormPermissionGroup
                    })}
                  </div>

                  <div className="mt-4 overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuário</th>
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Permissão no Evento</th>
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eventUserForm.eventId && eventUsers.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-xs font-semibold text-slate-400">
                              Nenhum usuário vinculado a este evento.
                            </td>
                          </tr>
                        ) : !eventUserForm.eventId ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-xs font-semibold text-slate-400">
                              Selecione um evento para visualizar os vínculos.
                            </td>
                          </tr>
                        ) : (
                          eventUsers.map(link => {
                            const linkedUser = usersList.find(user => user.id === link.userId);
                            return (
                              <tr key={link.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="p-3 text-sm font-semibold text-slate-800">
                                  {linkedUser?.name || 'Usuário removido'}
                                </td>
                                <td className="p-3 text-xs text-slate-600">
                                  <div className="font-semibold">{eventUserRoleLabels[link.role] || link.role}</div>
                                  <div className="text-[11px] text-slate-400">{normalizePermissions(link.permissions?.length ? link.permissions : legacyPermissionsForRole(link.role)).length} permissões</div>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                    link.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {link.active ? 'Ativo' : 'Inativo'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEventUserForm({
                                        eventId: link.eventId,
                                        userId: link.userId,
                                        role: link.role,
                                        permissions: normalizePermissions(link.permissions?.length ? link.permissions : legacyPermissionsForRole(link.role)),
                                        active: link.active
                                      })}
                                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 border border-blue-100 text-xs font-bold transition cursor-pointer"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleEventUser(link)}
                                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer"
                                    >
                                      {link.active ? 'Desativar' : 'Ativar'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteEventUser(link)}
                                      className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-600 border border-rose-200 transition cursor-pointer"
                                      title="Remover vínculo"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-print">
        {/* DETECT AN EMPTY EVENT STATE */}
        {events.length === 0 ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center bg-[#f7f7f2]">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
              <Calendar size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 font-display mb-2">Primeiro Acesso: Crie seu Primeiro Evento</h2>
            <p className="text-slate-500 max-w-md mb-6">
              Para liberar o dashboard de monitoramento em tempo real, credenciamento via QR Code e chapelaria, inicie configurando as informações do seu evento.
            </p>
            <button
              onClick={() => {
                setEventForm({ id: '', name: '', date: '', location: '', capacity: 200, enableAccessControl: true, enableCloakroom: false, enableScanner: true });
                setIsEventModalOpen(true);
              }}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/10 transition"
            >
              Criar Evento Agora
            </button>
          </div>
        ) : loadingMain ? (
          <div className="flex-grow flex flex-col items-center justify-center gap-3 bg-[#f7f7f2]">
            <RefreshCw className="animate-spin text-blue-500" size={32} />
            <p className="text-slate-500 font-medium text-sm">Carregando painel em tempo real...</p>
          </div>
        ) : (
          <div className={`flex-1 overflow-y-auto ${activeTab === 'checkin' ? (isStandaloneCheckin ? 'p-0 bg-white' : 'p-0 bg-white') : 'p-8 bg-[#f7f7f2]'}`}>
            
            {/* --- TAB 1: DASHBOARD --- */}
            {activeTab === 'dashboard' && (
              <Dashboard
                currentUser={currentUser}
                selectedEventId={selectedEventId}
                onSelectEvent={(eventId) => {
                  persistSelectedEvent(eventId);
                }}
                onNavigate={(tab) => setActiveTab(tab)}
                onLogout={handleLogout}
                token={token}
              />
            )}

            {activeTab === 'evento-dashboard' && currentEvent && (
              <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Evento em operação</p>
                    <h1 className="text-2xl font-bold text-slate-950 font-display mt-1">{currentEvent.name}</h1>
                    <p className="text-sm text-slate-500 mt-2 max-w-2xl">
                      Painel limpo para acompanhar e operar somente os recursos habilitados neste evento.
                    </p>
                  </div>
                  {isUserAdmin && (
                    <button
                      onClick={() => editEvent(currentEvent)}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition cursor-pointer"
                    >
                      <Settings size={15} />
                      <span>Configurar evento</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatsCard
                    title="Inscritos"
                    value={stats?.totalRegistered ?? participants.length}
                    iconName="Users"
                    description={`Capacidade: ${currentEvent.capacity}`}
                    trend={{ text: 'Participantes', type: 'info' }}
                    colorTheme="emerald"
                    onClick={() => setActiveTab('participantes')}
                  />
                  <StatsCard
                    title="Check-ins"
                    value={stats?.totalCheckedIn ?? participants.filter(p => p.checkedIn).length}
                    iconName="UserCheck"
                    description={`${stats?.totalWaiting ?? participants.filter(p => !p.checkedIn).length} pendentes`}
                    trend={{ text: 'Operação', type: 'success' }}
                    colorTheme="blue"
                    onClick={() => setActiveTab('checkin')}
                  />
                  <StatsCard
                    title="Salas"
                    value={eventHasAccessControl ? availableAreas.length : 'Inativo'}
                    iconName="ShieldCheck"
                    description={eventHasAccessControl ? 'Áreas configuradas' : 'Módulo desligado'}
                    trend={{ text: eventHasAccessControl ? 'Acessos' : 'Opcional', type: eventHasAccessControl ? 'success' : 'warning' }}
                    colorTheme="purple"
                    onClick={eventHasAccessControl ? () => setActiveTab('areas') : undefined}
                  />
                  <StatsCard
                    title="Chapelaria"
                    value={eventHasCloakroom ? cloakroom.filter(c => c.status === 'guardado').length : 'Inativo'}
                    iconName="FolderLock"
                    description={eventHasCloakroom ? 'Itens guardados agora' : 'Módulo desligado'}
                    trend={{ text: eventHasCloakroom ? 'Ativa' : 'Opcional', type: eventHasCloakroom ? 'success' : 'warning' }}
                    colorTheme="amber"
                    onClick={eventHasCloakroom ? () => setActiveTab('chapelaria') : undefined}
                  />
                </div>

                <div className="bg-white rounded-lg border border-slate-200 p-5">
                  <h2 className="text-sm font-bold text-slate-950 mb-4">Fluxo do evento</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button onClick={() => setActiveTab('participantes')} className="text-left p-4 rounded-lg border border-slate-200 hover:border-slate-400 bg-white transition cursor-pointer">
                      <Users size={18} className="text-slate-500 mb-2" />
                      <div className="font-bold text-slate-900 text-sm">Participantes</div>
                      <div className="text-xs text-slate-500 mt-1">Cadastro, importação e credenciais.</div>
                    </button>
                    <button onClick={() => setActiveTab('checkin')} className="text-left p-4 rounded-lg border border-slate-200 hover:border-slate-400 bg-white transition cursor-pointer">
                      <QrCode size={18} className="text-slate-500 mb-2" />
                      <div className="font-bold text-slate-900 text-sm">Check-in</div>
                      <div className="text-xs text-slate-500 mt-1">Busca rápida e entrada do participante.</div>
                    </button>
                    {eventHasAccessControl && (
                      <button onClick={() => setActiveTab('areas')} className="text-left p-4 rounded-lg border border-slate-200 hover:border-slate-400 bg-white transition cursor-pointer">
                        <ShieldCheck size={18} className="text-slate-500 mb-2" />
                        <div className="font-bold text-slate-900 text-sm">Salas e acessos</div>
                        <div className="text-xs text-slate-500 mt-1">Setores, perfis e validação por área.</div>
                      </button>
                    )}
                    {eventHasCloakroom && (
                      <button onClick={() => setActiveTab('chapelaria')} className="text-left p-4 rounded-lg border border-slate-200 hover:border-slate-400 bg-white transition cursor-pointer">
                        <FolderLock size={18} className="text-slate-500 mb-2" />
                        <div className="font-bold text-slate-900 text-sm">Chapelaria</div>
                        <div className="text-xs text-slate-500 mt-1">Entrada e retirada de pertences.</div>
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'eventos-ativos' && (
              <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Eventos ativos</p>
                    <h1 className="text-2xl font-bold text-slate-950 font-display mt-1">Escolha o evento da operação</h1>
                    <p className="text-sm text-slate-500 mt-2 max-w-2xl">
                      O evento selecionado controla o painel, os participantes, o check-in, o scanner e os acessos.
                    </p>
                  </div>
                  {isUserAdmin && (
                    <button
                      onClick={() => {
                        setEventForm({ id: '', name: '', date: '', location: '', capacity: 200, enableAccessControl: true, enableCloakroom: false, enableScanner: true });
                        setIsEventModalOpen(true);
                      }}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-[#1D4ED8] hover:bg-[#173FAE] text-white text-sm font-semibold transition cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>Novo evento</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {events.map(ev => {
                    const isSelected = ev.id === selectedEventId;
                    const eventParticipants = participants.filter(p => p.eventId === ev.id);
                    const checked = eventParticipants.filter(p => p.checkedIn).length;
                    const hasLoadedStats = isSelected && eventParticipants.length > 0;
                    const percent = hasLoadedStats ? Math.round((checked / eventParticipants.length) * 100) : 0;
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => {
                          persistSelectedEvent(ev.id, ev.currentUserRole);
                          setActiveTab(isUserAdmin ? 'evento-dashboard' : 'checkin');
                          addToast(`Evento ativo: ${ev.name}`, 'success');
                        }}
                        className={`text-left bg-white rounded-lg border p-5 shadow-sm transition cursor-pointer hover:border-slate-400 hover:shadow-md ${
                          isSelected ? 'border-[#1D4ED8] ring-2 ring-[#1D4ED8]/10' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
                              isSelected ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]' : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              {isSelected ? 'Selecionado' : 'Disponível'}
                            </span>
                            <h2 className="text-base font-bold text-slate-950 mt-3 line-clamp-2">{ev.name}</h2>
                          </div>
                          <Calendar size={18} className={isSelected ? 'text-[#1D4ED8] shrink-0' : 'text-slate-400 shrink-0'} />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Data</p>
                            <p className="font-semibold text-slate-900 mt-1">{ev.date}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Capacidade</p>
                            <p className="font-semibold text-slate-900 mt-1">{ev.capacity}</p>
                          </div>
                        </div>

                        <p className="mt-3 text-sm text-slate-500 truncate">{ev.location}</p>

                        <div className="mt-5">
                          <div className="flex justify-between text-xs font-semibold text-slate-500 mb-2">
                            <span>Check-ins</span>
                            <span>{hasLoadedStats ? `${checked}/${eventParticipants.length} (${percent}%)` : 'Carrega ao selecionar'}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#1D4ED8] rounded-full transition-all" style={{ width: `${percent}%` }} />
                          </div>
                        </div>

                        <div className="mt-5 flex items-center gap-2">
                          <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-slate-950 text-white text-xs font-semibold">
                            Usar este evento
                          </span>
                          {isUserAdmin && (
                            <span
                              onClick={(event) => {
                                event.stopPropagation();
                                editEvent(ev);
                              }}
                              className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                            >
                              Editar
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* --- DISABLED OLD LOGIC TO PRESERVE COMPILATION AND MATCH --- */}
            {false && stats && (
              <div className="space-y-6">
                
                {/* 4 Cards das Métricas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  
                  <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 flex flex-col gap-2 relative overflow-hidden group">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total de Inscritos</span>
                    <div className="text-3.5xl font-bold text-slate-900 tracking-tight font-display">{stats.totalRegistered}</div>
                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                      <Users size={14} />
                      <span>{stats.capacity} Limite de Capacidade</span>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 flex flex-col gap-2 relative">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Check-ins Realizados</span>
                    <div className="text-3.5xl font-bold text-slate-900 tracking-tight font-display">{stats.totalCheckedIn}</div>
                    <div className="w-full bg-slate-100 h-2 rounded-full mt-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${stats.totalRegistered > 0 ? (stats.totalCheckedIn / stats.totalRegistered) * 105 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-slate-400 mt-1">
                      {stats.totalRegistered > 0 ? Math.round((stats.totalCheckedIn / stats.totalRegistered) * 100) : 0}% concluído
                    </span>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 flex flex-col gap-2">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Aguardando Credenciamento</span>
                    <div className="text-3.5xl font-bold text-slate-900 tracking-tight font-display">{stats.totalWaiting}</div>
                    <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                      <Clock size={14} className="text-slate-400 shrink-0" />
                      <span>Disponíveis para check-in imediato</span>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 flex flex-col gap-2">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Ativos na Chapelaria</span>
                    <div className="text-3.5xl font-bold text-[#0f172a] tracking-tight font-display">
                      {cloakroom.filter(c => c.status === 'guardado').length}
                    </div>
                    <div className="flex items-center gap-1 text-amber-700 text-xs font-semibold bg-amber-50 rounded px-2 py-0.5 w-fit">
                      <Tag size={12} />
                      <span>{cloakroom.filter(c => c.status === 'retirado').length} entregues hoje</span>
                </div>
                </div>

              </div>

                {/* Gráfico de Horários e Logs Recentes de Check-in */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Fluxo por Horário (SVG / CSS Custom Bar Chart altamente customizado) */}
                  <div className="lg:col-span-8 bg-white rounded-2xl shadow-xs border border-slate-100 flex flex-col h-[400px]">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                      <div>
                        <h3 className="font-bold text-slate-800 font-display">Fluxo de Entrada de Credenciados</h3>
                        <p className="text-xs text-slate-500">Número de check-ins registrados por faixa horária ativa</p>
                      </div>
                      <span className="px-3 py-1 bg-white text-blue-600 text-xs font-semibold border border-blue-100 rounded-full">
                        Hoje
                      </span>
                    </div>

                    <div className="flex-1 px-8 py-6 flex items-end justify-between gap-3 overflow-hidden">
                      {stats.hourlyCheckins.map((entry, index) => {
                        const maxCount = Math.max(...stats.hourlyCheckins.map(i => i.count), 1);
                        const percentHeight = (entry.count / maxCount) * 82; // Cap at 82% to fit label nicely
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                            <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition duration-150 bg-slate-900 text-white px-1.5 py-0.5 rounded shadow-md pointer-events-none">
                              {entry.count}
                            </span>
                            <div 
                              className={`w-full rounded-t-md transition-all duration-500 cursor-pointer ${
                                entry.count > 0 ? 'bg-blue-600 hover:bg-blue-500 shadow-xs' : 'bg-slate-100'
                              }`} 
                              style={{ height: `${percentHeight || 4}%` }}
                              title={`Check-ins às ${entry.hour}: ${entry.count}`}
                            />
                            <span className="text-[10px] text-slate-400 font-semibold font-mono whitespace-nowrap">
                              {entry.hour}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Últimos Check-ins realizados */}
                  <div className="lg:col-span-4 bg-white rounded-2xl shadow-xs border border-slate-100 flex flex-col h-[400px]">
                    <div className="p-6 border-b border-slate-100 bg-gray-50/50 rounded-t-2xl flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-800 font-display">Últimos Check-ins</h3>
                        <p className="text-xs text-slate-500">Transmissão em tempo real</p>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>

                    <div className="flex-grow overflow-y-auto p-4 space-y-3">
                      {stats.recentCheckins.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                          <UserCheck className="text-slate-300 mb-2" size={32} />
                          <p className="text-xs text-slate-500 font-medium">Nenhum scan registrado para este evento ainda.</p>
                        </div>
                      ) : (
                        stats.recentCheckins.map(p => (
                          <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-100 transition">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold tracking-tighter text-sm shrink-0">
                              {p.participantName.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{p.participantName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                  p.category === 'VIP' ? 'bg-amber-100 text-amber-800' :
                                  p.category === 'Palestrante' ? 'bg-purple-100 text-purple-800' :
                                  'bg-zinc-100 text-zinc-800'
                                }`}>
                                  {p.category}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(p.checkedInAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              </div>
                            </div>
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
                      <button 
                        onClick={() => setActiveTab('participantes')}
                        className="w-full py-2.5 bg-white border border-slate-250 text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 hover:text-blue-600 rounded-xl transition duration-150 shadow-xs cursor-pointer"
                      >
                        Ver Lista Completa
                      </button>
                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* --- TAB 2: INFORMAÇÕES DOS EVENTOS --- */}
            {activeTab === 'eventos' && (
              <EventsPage
                events={events}
                setEvents={setEvents}
                selectedEventId={selectedEventId}
                onSelectEvent={(eventId) => {
                  persistSelectedEvent(eventId);
                  setActiveTab('evento-dashboard');
                }}
                currentUser={currentUser}
                apiCall={apiCall}
                addToast={addToast}
              />
            )}

            {/* --- TAB 3: PARTICIPANTES --- */}
            {activeTab === 'participantes' && canManageParticipants && (
              <div 
                className="space-y-6 relative"
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    processUploadedFile(file);
                  }
                }}
              >
                {/* Visual Drag Over Overlay */}
                {isDragOver && (
                  <div className="absolute inset-0 bg-slate-100/90 backdrop-blur-xs border-3 border-dashed border-emerald-505 z-50 flex flex-col items-center justify-center p-8 text-center rounded-2xl animate-pulse">
                    <div className="p-4 bg-emerald-100 rounded-full text-emerald-600 mb-4 shadow-md">
                      <Upload size={40} className="animate-bounce" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Pronto para Validação!</h3>
                    <p className="text-sm text-slate-500 max-w-sm mt-1">
                      Solte seu arquivo <strong className="text-emerald-700">.xlsx, .xls ou .csv</strong> aqui para processar o preview e a validação em tempo real.
                    </p>
                  </div>
                )}
                
                {/* Cabeçalho Ativo */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 font-display">Lista de Participantes</h2>
                    <p className="text-sm text-slate-500">
                      Evento selecionado: <span className="font-semibold text-slate-700">{currentEvent?.name}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Botão Baixar Modelo */}
                    <button
                      onClick={downloadSampleExcelTemplate}
                      className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-sm transition cursor-pointer font-medium"
                      title="Baixar planilha modelo recomendada"
                    >
                      <Download size={15} />
                      <span className="hidden sm:inline">Modelo Excel</span>
                    </button>

                    {canCreateParticipants && (
                      <label className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold transition cursor-pointer">
                        <Upload size={15} />
                        <span>Importar Excel / CSV</span>
                        <input
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          onChange={handleExcelUpload}
                          className="hidden"
                        />
                      </label>
                    )}

                    {/* Novo participante manual */}
                    {canCreateParticipants && (
                      <button
                        onClick={() => {
                          setParticipantForm({ id: '', name: '', email: '', cpf: '', category: 'Participante', company: '', allowedAreaIds: [], allowedAreas: [] });
                          setIsParticipantModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
                      >
                        <Plus size={16} />
                        <span>Adicionar</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filtros e Barra de Pesquisa */}
                <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                  {/* Barra de Busca Geral */}
                  <div className="relative w-full md:w-80">
                    <input
                      type="text"
                      placeholder="Pesquisar por nome, CPF ou e-mail..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-100 hover:bg-slate-100/70 border-none rounded-xl text-sm text-slate-705 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400 placeholder:text-xs"
                    />
                    <Search size={16} className="text-slate-400 absolute left-3 top-2.5" />
                  </div>

                  {/* Filtro Dropdown */}
                  <div className="flex items-center gap-3 w-full md:w-auto self-end md:self-auto">
                    
                    <select
                      value={selectedCategoryFilter}
                      onChange={e => setSelectedCategoryFilter(e.target.value)}
                      className="text-xs bg-slate-100 border-none rounded-xl px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-full md:w-auto"
                    >
                      <option value="all">Filtro: Todos as Categorias</option>
                      <option value="VIP">VIP</option>
                      <option value="Palestrante">Palestrante</option>
                      <option value="Expositor">Expositor</option>
                      <option value="Participante">Participante</option>
                      <option value="Staff">Staff</option>
                    </select>

                    <select
                      value={selectedPresenceFilter}
                      onChange={e => setSelectedPresenceFilter(e.target.value as any)}
                      className="text-xs bg-slate-100 border-none rounded-xl px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-full md:w-auto"
                    >
                      <option value="all">Presença: Todos</option>
                      <option value="present">Credenciado / Presente</option>
                      <option value="absent">Aguardando / Ausente</option>
                    </select>

                  </div>
                </div>

                {/* Tabela dos Participantes */}
                <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Participante</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Identidade / CPF</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Empresa</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Categoria</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status Presença</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center no-print">Ações e Credencial</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredParticipantsList.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-12 text-center text-slate-400">
                              <Info className="mx-auto text-slate-300 mb-2" size={32} />
                              <p className="font-semibold text-slate-500">Nenhum participante localizado.</p>
                              <p className="text-xs mt-1">Refine o termo buscado ou realize novos cadastros para este evento.</p>
                            </td>
                          </tr>
                        ) : (
                          filteredParticipantsList.map(p => (
                            <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                              
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold select-none text-xs">
                                    {p.name.substring(0,2).toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-slate-800 text-sm leading-tight">{p.name}</h4>
                                    <span className="text-xs font-mono text-slate-500 select-all">{p.email}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="p-4">
                                <p className="text-slate-700 font-mono text-xs select-all">
                                  {p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-slate-400 font-mono select-all">Ref: {p.ticketCode}</span>
                                  <button
                                    onClick={() => setSelectedQrParticipant(p)}
                                    className="p-1 text-slate-600 hover:bg-blue-50 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition cursor-pointer"
                                    title="Visualizar QR Code Individual"
                                  >
                                    <QrCode size={10} />
                                  </button>
                                </div>
                              </td>

                              <td className="p-4">
                                <p className="text-slate-700 text-xs font-medium max-w-[150px] truncate select-all">
                                  {p.company || <span className="text-slate-350 italic">Não informada</span>}
                                </p>
                              </td>

                              <td className="p-4 align-middle text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_TAGS[p.category].bg}`}>
                                  {p.category}
                                </span>
                              </td>

                              <td className="p-4 align-middle text-center">
                                <div className="flex flex-col items-center justify-center">
                                  {p.checkedIn ? (
                                    <>
                                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 select-none">
                                        <Check size={12} strokeWidth={3} />
                                        <span>Presente</span>
                                      </span>
                                      <span className="text-[9px] text-slate-400 mt-1 select-none font-mono">
                                        Entrou {new Date(p.checkedInAt!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="inline-block text-xs text-slate-500 font-medium px-2.5 py-0.5 rounded-full bg-slate-100 select-none">
                                      Aguardando
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="p-4 align-middle text-center no-print">
                                <div className="flex items-center justify-center gap-2">
                                  
                                  <button
                                    onClick={() => handleToggleCheckin(p)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition duration-200 cursor-pointer select-none ${
                                      p.checkedIn 
                                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' 
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    }`}
                                  >
                                    {p.checkedIn ? 'Desfazer' : 'Dar Presença'}
                                  </button>

                                  <button
                                    onClick={() => setActiveBadgeParticipant(p)}
                                    className="p-1.5 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition"
                                    title="Gerar e Imprimir Crachá"
                                  >
                                    <Printer size={15} />
                                  </button>

                                  <button
                                    onClick={() => editParticipant(p)}
                                    className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-lg transition"
                                    title="Editar Dados"
                                  >
                                    <Edit size={15} />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteParticipant(p.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition"
                                    title="Remover"
                                  >
                                    <Trash2 size={15} />
                                  </button>

                                </div>
                              </td>

                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* --- TAB 4: CHECK-IN RÁPIDO / SCANNER SIMULATOR --- */}
            {activeTab === 'checkin' && (
              <CheckinPage
                events={events}
                selectedEventId={selectedEventId}
                onSelectEvent={(eventId) => {
                  persistSelectedEvent(eventId);
                }}
                apiCall={apiCall}
                addToast={addToast}
                participants={participants}
                setParticipants={setParticipants}
                currentUser={currentUser}
                canCreateParticipants={canCreateParticipants}
                canConfigureCheckinScreen={isUserAdmin}
                onPrintBadge={(participant) => setActiveBadgeParticipant(participant)}
                onUpdateEvent={(updated) => setEvents(prev => prev.map(ev => ev.id === updated.id ? updated : ev))}
                onLogout={handleLogout}
              />
            )}

            {/* --- TAB NEW: WHITE-LABEL MODULAR PORTAL CHECK-IN --- */}
            {activeTab === 'checkin-modular' && (
              <CheckInModular
                events={events}
                selectedEventId={selectedEventId}
                onSelectEvent={(eventId) => {
                  persistSelectedEvent(eventId);
                }}
                apiCall={apiCall}
                addToast={addToast}
                participants={participants}
                setParticipants={setParticipants}
                currentUser={currentUser}
                canCreateParticipants={canCreateParticipants}
                onPrintBadge={(participant) => setActiveBadgeParticipant(participant)}
              />
            )}

            {/* --- TAB 10: ACCESS CONTROL SCAN --- */}
            {activeTab === 'scanner' && (
              <ScanAccessControlPage
                currentEvent={currentEvent}
                currentUser={currentUser}
                apiCall={apiCall}
                addToast={addToast}
              />
            )}

            {/* --- TAB 12: AREA SPECIFIC ACCESS PORTAL CONTROLLER --- */}
            {activeTab === 'areas' && (
              <AreaAccessControl
                currentEvent={currentEvent}
                currentUser={currentUser}
                apiCall={apiCall}
                addToast={addToast}
              />
            )}

            {activeTab === 'atividades' && isUserAdmin && (
              <div className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Atividades</p>
                    <h2 className="text-2xl font-black text-slate-950 font-display">Atividades e palestras</h2>
                    <p className="text-sm text-slate-500 mt-1">Cadastre a agenda do evento ativo e controle quais atividades recebem presença.</p>
                  </div>
                  <button
                    onClick={resetActivityForm}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-950 text-white text-sm font-bold hover:bg-slate-800 transition"
                  >
                    <Plus size={16} />
                    Nova atividade
                  </button>
                </div>

                {!selectedEventId ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">
                    Selecione um evento ativo para gerenciar atividades.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
                    <form onSubmit={handleSaveActivity} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                      <div>
                        <h3 className="text-base font-black text-slate-900">{activityForm.id ? 'Editar atividade' : 'Nova atividade'}</h3>
                        <p className="text-xs text-slate-500 mt-1">Apenas administradores podem criar ou alterar atividades.</p>
                      </div>
                      <label className="block text-xs font-bold uppercase text-slate-500">
                        Título
                        <input value={activityForm.title} onChange={e => setActivityForm(prev => ({ ...prev, title: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case text-slate-900" placeholder="Inteligência Artificial nos Eventos" />
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block text-xs font-bold uppercase text-slate-500">
                          Sala
                          <input value={activityForm.roomName} onChange={e => setActivityForm(prev => ({ ...prev, roomName: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case text-slate-900" placeholder="Auditório 1" />
                        </label>
                        <label className="block text-xs font-bold uppercase text-slate-500">
                          Palestrante
                          <input value={activityForm.speakerName} onChange={e => setActivityForm(prev => ({ ...prev, speakerName: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case text-slate-900" placeholder="João Silva" />
                        </label>
                      </div>
                      <label className="block text-xs font-bold uppercase text-slate-500">
                        Data
                        <input type="date" value={activityForm.date} onChange={e => setActivityForm(prev => ({ ...prev, date: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case text-slate-900" />
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        <label className="block text-xs font-bold uppercase text-slate-500">
                          Início
                          <input type="time" value={activityForm.startTime} onChange={e => setActivityForm(prev => ({ ...prev, startTime: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case text-slate-900" />
                        </label>
                        <label className="block text-xs font-bold uppercase text-slate-500">
                          Fim
                          <input type="time" value={activityForm.endTime} onChange={e => setActivityForm(prev => ({ ...prev, endTime: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case text-slate-900" />
                        </label>
                        <label className="block text-xs font-bold uppercase text-slate-500">
                          Carga
                          <input type="number" min="0" step="0.5" value={activityForm.workloadHours} onChange={e => setActivityForm(prev => ({ ...prev, workloadHours: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case text-slate-900" />
                        </label>
                      </div>
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm font-bold text-slate-700">
                        <input type="checkbox" checked={activityForm.active} onChange={e => setActivityForm(prev => ({ ...prev, active: e.target.checked }))} />
                        Atividade ativa
                      </label>
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 transition">
                          {activityForm.id ? 'Salvar alterações' : 'Criar atividade'}
                        </button>
                        {activityForm.id && (
                          <button type="button" onClick={resetActivityForm} className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">
                            Cancelar
                          </button>
                        )}
                      </div>
                    </form>

                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-black text-slate-900">Atividades do evento</h3>
                          <p className="text-xs text-slate-500">{activities.length} atividade(s) cadastrada(s)</p>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                              <th className="text-left p-4">Atividade</th>
                              <th className="text-left p-4">Data e horário</th>
                              <th className="text-left p-4">Carga</th>
                              <th className="text-center p-4">Status</th>
                              <th className="text-right p-4">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activities.length === 0 ? (
                              <tr><td colSpan={5} className="p-8 text-center text-slate-500 font-semibold">Nenhuma atividade cadastrada.</td></tr>
                            ) : activities.map(activity => (
                              <tr key={activity.id} className="border-t border-slate-100">
                                <td className="p-4">
                                  <p className="font-black text-slate-900">{fixMojibake(activity.title)}</p>
                                  <p className="text-xs text-slate-500">{fixMojibake(activity.roomName)}{activity.speakerName ? ` - ${fixMojibake(activity.speakerName)}` : ''}</p>
                                </td>
                                <td className="p-4 text-slate-700">
                                  {activity.date ? new Date(`${activity.date}T00:00:00`).toLocaleDateString('pt-BR') : '-'} às {activity.startTime} - {activity.endTime}
                                </td>
                                <td className="p-4 font-semibold text-slate-700">{activity.workloadHours || 0}h</td>
                                <td className="p-4 text-center">
                                  <button
                                    onClick={() => handleToggleActivity(activity)}
                                    className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${activity.active === false ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}
                                  >
                                    {activity.active === false ? 'Inativa' : 'Ativa'}
                                  </button>
                                </td>
                                <td className="p-4">
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => editActivity(activity)} className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200" title="Editar">
                                      <Edit size={15} />
                                    </button>
                                    <button onClick={() => handleDeleteActivity(activity.id)} className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100" title="Excluir">
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'presenca-atividade' && (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Presença em Atividade</p>
                  <h2 className="text-2xl font-black text-slate-950 font-display">Registro operacional de presença</h2>
                  <p className="text-sm text-slate-500 mt-1">Selecione a atividade e leia o QR Code ou busque por nome/CPF.</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
                  <form onSubmit={handleSubmitActivityAttendance} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                    <label className="block text-xs font-bold uppercase text-slate-500">
                      Atividade
                      <select value={activityAttendanceActivityId} onChange={e => { setActivityAttendanceActivityId(e.target.value); setActivityAttendanceFeedback(null); }} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-base normal-case text-slate-900">
                        <option value="">Selecione uma atividade</option>
                        {activeActivities.map(activity => (
                          <option key={activity.id} value={activity.id}>
                            {fixMojibake(activity.title)} - {fixMojibake(activity.roomName)} - {activity.startTime}
                          </option>
                        ))}
                      </select>
                    </label>

                    {selectedActivity && (
                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-lg font-black text-blue-950">{fixMojibake(selectedActivity.title)}</p>
                        <p className="text-sm text-blue-800 mt-1">{fixMojibake(selectedActivity.roomName)}{selectedActivity.speakerName ? ` - ${fixMojibake(selectedActivity.speakerName)}` : ''}</p>
                        <p className="text-xs font-bold text-blue-700 mt-2">{selectedActivity.date} | {selectedActivity.startTime} - {selectedActivity.endTime} | {selectedActivity.workloadHours || 0}h</p>
                      </div>
                    )}

                    <label className="block text-xs font-bold uppercase text-slate-500">
                      Nome, CPF ou QR Code
                      <div className="relative mt-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
                        <input
                          autoFocus
                          value={activityAttendanceSearch}
                          onChange={e => { setActivityAttendanceSearch(e.target.value); setActivityAttendanceFeedback(null); }}
                          placeholder="Ler QR Code ou buscar participante"
                          className="w-full rounded-xl border border-slate-200 py-4 pl-12 pr-4 text-lg font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {activityParticipantSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                            {activityParticipantSuggestions.map(participant => (
                              <button
                                key={participant.id}
                                type="button"
                                onClick={() => {
                                  setActivityAttendanceSearch(participant.name);
                                  setActivityAttendanceFeedback(null);
                                }}
                                className="w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-blue-50 transition"
                              >
                                <p className="text-base font-black text-slate-900">{participant.badgeName || participant.name}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>

                    <button type="submit" className="w-full rounded-xl bg-blue-600 px-4 py-4 text-base font-black text-white hover:bg-blue-700 transition">
                      Registrar presença
                    </button>

                    {activityAttendanceFeedback && (
                      <div className={`rounded-xl border p-5 text-center ${
                        activityAttendanceFeedback.type === 'success'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                          : activityAttendanceFeedback.type === 'warning'
                            ? 'border-amber-200 bg-amber-50 text-amber-900'
                            : 'border-rose-200 bg-rose-50 text-rose-900'
                      }`}>
                        <p className="text-xl font-black">{activityAttendanceFeedback.type === 'success' ? '✔' : activityAttendanceFeedback.type === 'warning' ? '⚠' : '✕'} {activityAttendanceFeedback.title}</p>
                        <p className="text-sm font-semibold mt-2">{activityAttendanceFeedback.message}</p>
                      </div>
                    )}
                  </form>

                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <h3 className="font-black text-slate-900">Presenças registradas</h3>
                        <p className="text-xs text-slate-500">{selectedActivityAttendances.length} registro(s) nesta atividade</p>
                      </div>
                      <ClipboardCheck className="text-slate-400" size={22} />
                    </div>
                    <div className="space-y-2 max-h-[520px] overflow-y-auto">
                      {!activityAttendanceActivityId ? (
                        <p className="rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-500">Selecione uma atividade.</p>
                      ) : selectedActivityAttendances.length === 0 ? (
                        <p className="rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-500">Nenhuma presença registrada ainda.</p>
                      ) : selectedActivityAttendances.map(att => (
                        <div key={att.id} className="rounded-lg border border-slate-100 p-3">
                          <p className="text-sm font-black text-slate-900">{att.participantName}</p>
                          <p className="text-xs text-slate-500">{att.participantCpf || '-'} | {new Date(att.checkedAt).toLocaleString('pt-BR')}</p>
                          <p className="text-[11px] text-slate-400 mt-1">Operador: {att.operatorName || 'Operador'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'certificados' && canIssueCertificates && (
              <div className="space-y-6">
                <div className="no-print">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Certificados</p>
                  <h2 className="text-2xl font-black text-slate-950 font-display">Emissão de certificados</h2>
                  <p className="text-sm text-slate-500 mt-1">Busque um participante e emita certificados com base nas presenças registradas em atividades.</p>
                </div>

                {isUserAdmin && (
                  <div className="no-print rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Template de Certificado</p>
                        <h3 className="text-lg font-black text-slate-950">Configuração por evento</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Configure a base visual do certificado. O editor visual ficará preparado para uma próxima etapa.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={saveCertificateTemplate}
                        disabled={savingCertificateTemplate}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-300 transition"
                      >
                        <Check size={16} />
                        {savingCertificateTemplate ? 'Salvando...' : 'Salvar template'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="block text-xs font-bold uppercase text-slate-500">
                        Nome do template
                        <input
                          value={certificateTemplate.name}
                          onChange={e => setCertificateTemplate(prev => ({ ...prev, name: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </label>
                      <label className="block text-xs font-bold uppercase text-slate-500">
                        Orientação
                        <select
                          value={certificateTemplate.orientation}
                          onChange={e => setCertificateTemplate(prev => ({ ...prev, orientation: e.target.value as CertificateTemplate['orientation'] }))}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="landscape">Paisagem</option>
                          <option value="portrait">Retrato</option>
                        </select>
                      </label>
                      <label className="block text-xs font-bold uppercase text-slate-500">
                        Tamanho
                        <select
                          value={certificateTemplate.pageSize}
                          onChange={e => setCertificateTemplate(prev => ({ ...prev, pageSize: e.target.value as CertificateTemplate['pageSize'] }))}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="A4">A4</option>
                          <option value="A5">A5</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase text-slate-500">Logo</label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            value={certificateTemplate.logoUrl}
                            onChange={e => setCertificateTemplate(prev => ({ ...prev, logoUrl: e.target.value }))}
                            placeholder="URL da logo"
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 transition">
                            <Upload size={15} />
                            Upload
                            <input
                              type="file"
                              accept={REPORT_IMAGE_ACCEPT}
                              className="hidden"
                              onChange={event => {
                                handleCertificateTemplateImageUpload(event.target.files?.[0], 'logoUrl');
                                event.currentTarget.value = '';
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase text-slate-500">Imagem de fundo</label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            value={certificateTemplate.backgroundImageUrl}
                            onChange={e => setCertificateTemplate(prev => ({ ...prev, backgroundImageUrl: e.target.value }))}
                            placeholder="URL do fundo"
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 transition">
                            <Upload size={15} />
                            Upload
                            <input
                              type="file"
                              accept={REPORT_IMAGE_ACCEPT}
                              className="hidden"
                              onChange={event => {
                                handleCertificateTemplateImageUpload(event.target.files?.[0], 'backgroundImageUrl');
                                event.currentTarget.value = '';
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase text-slate-500">Placeholders disponíveis</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {DEFAULT_CERTIFICATE_TEMPLATE.elements.map(element => (
                          <span key={element.id} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-mono font-bold text-slate-600 border border-slate-200">
                            {element.placeholder}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] text-slate-400">Formatos de imagem suportados: {REPORT_IMAGE_FORMATS}. Tamanho máximo: 2 MB.</p>
                    </div>
                  </div>
                )}

                {isUserAdmin && (
                  <div className="no-print grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
                      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Editor visual</p>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={duplicateCertificateTemplate} className="rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-700 border border-slate-200">Duplicar</button>
                          <button type="button" onClick={restoreDefaultCertificateTemplate} className="rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-700 border border-slate-200">Restaurar padrão</button>
                          <button type="button" onClick={printCertificate} disabled={!activeCertificate} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:bg-slate-300">Imprimir teste</button>
                        </div>
                      </div>

                      <div
                        ref={certificateCanvasRef}
                        onMouseDown={() => setSelectedCertificateElementId('')}
                        className={`relative mx-auto overflow-hidden rounded-lg border border-slate-300 bg-white shadow-inner ${certificateTemplate.orientation === 'portrait' ? 'aspect-[0.707/1] max-w-[520px]' : 'aspect-[1.414/1] w-full max-w-[900px]'}`}
                        style={certificateTemplate.backgroundImageUrl ? { backgroundImage: `url(${certificateTemplate.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                      >
                        <div className="absolute inset-0 bg-white/75" />
                        {certificateTemplate.elements.map((element, index) => {
                          const normalized = getCertificateElementDefaults(element, index);
                          const isSelected = normalized.id === selectedCertificateElementId;
                          const value = normalized.type === 'image'
                            ? ''
                            : replaceCertificatePlaceholders(normalized.placeholder || normalized.text || '', certificatePreviewParticipant, certificatePreviewEvent, certificatePreviewCertificate, certificateActivity);
                          return (
                            <div
                              key={normalized.id}
                              onMouseDown={event => handleCertificateElementPointerDown(event, normalized, 'move')}
                              className={`absolute cursor-move rounded border-2 bg-white/20 px-1 py-0.5 ${isSelected ? 'border-blue-500 shadow-lg' : 'border-transparent hover:border-blue-300'}`}
                              style={{
                                left: `${normalized.x}%`,
                                top: `${normalized.y}%`,
                                width: `${normalized.width}%`,
                                height: `${normalized.height}%`,
                                color: normalized.color,
                                fontFamily: normalized.fontFamily,
                                fontSize: `${Math.max(8, Math.min(normalized.fontSize || 14, 34))}px`,
                                fontWeight: normalized.bold ? 900 : 500,
                                fontStyle: normalized.italic ? 'italic' : 'normal',
                                textAlign: normalized.align,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: normalized.align === 'left' ? 'flex-start' : normalized.align === 'right' ? 'flex-end' : 'center'
                              }}
                            >
                              {normalized.type === 'image'
                                ? (normalized.imageUrl ? <img src={normalized.imageUrl} alt={normalized.label} className="h-full w-full object-contain" /> : <span className="text-xs text-slate-400">Imagem</span>)
                                : <span className="line-clamp-2">{value}</span>}
                              {isSelected && (
                                <button
                                  type="button"
                                  onMouseDown={event => handleCertificateElementPointerDown(event, normalized, 'resize')}
                                  className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full border border-white bg-blue-600"
                                  title="Redimensionar"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {CERTIFICATE_ELEMENT_PRESETS.map(preset => (
                          <button key={preset.label} type="button" onClick={() => addCertificateElement(preset)} className="rounded-lg bg-white px-3 py-2 text-[11px] font-black text-slate-700 border border-slate-200 hover:bg-blue-50">+ {preset.label}</button>
                        ))}
                        <button type="button" onClick={() => addCertificateElement({ label: 'Logo', placeholder: '' }, 'image')} className="rounded-lg bg-white px-3 py-2 text-[11px] font-black text-slate-700 border border-slate-200 hover:bg-blue-50">+ Logo</button>
                        <button type="button" onClick={() => addCertificateElement({ label: 'Assinatura', placeholder: '' }, 'image')} className="rounded-lg bg-white px-3 py-2 text-[11px] font-black text-slate-700 border border-slate-200 hover:bg-blue-50">+ Assinatura</button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">Painel lateral</p>
                      {!selectedCertificateElement ? (
                        <p className="mt-3 rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-500">Selecione um elemento no certificado para editar.</p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          <label className="block text-xs font-bold uppercase text-slate-500">
                            Elemento
                            <input value={selectedCertificateElement.label} onChange={e => updateCertificateElement(selectedCertificateElement.id, { label: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900" />
                          </label>
                          {selectedCertificateElement.type === 'text' ? (
                            <label className="block text-xs font-bold uppercase text-slate-500">
                              Texto / Placeholder
                              <textarea value={selectedCertificateElement.placeholder} onChange={e => updateCertificateElement(selectedCertificateElement.id, { placeholder: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900" />
                            </label>
                          ) : (
                            <label className="block text-xs font-bold uppercase text-slate-500">
                              URL da imagem
                              <input value={selectedCertificateElement.imageUrl || ''} onChange={e => updateCertificateElement(selectedCertificateElement.id, { imageUrl: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900" />
                            </label>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              ['X', 'x'], ['Y', 'y'], ['Largura', 'width'], ['Altura', 'height']
                            ].map(([label, key]) => (
                              <label key={key} className="block text-xs font-bold uppercase text-slate-500">
                                {label}
                                <input type="number" value={(selectedCertificateElement as any)[key] || 0} onChange={e => updateCertificateElement(selectedCertificateElement.id, { [key]: Number(e.target.value) } as any)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900" />
                              </label>
                            ))}
                          </div>
                          {selectedCertificateElement.type === 'text' && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <label className="block text-xs font-bold uppercase text-slate-500">
                                  Fonte
                                  <select value={selectedCertificateElement.fontFamily || 'Arial'} onChange={e => updateCertificateElement(selectedCertificateElement.id, { fontFamily: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900">
                                    <option>Arial</option>
                                    <option>Georgia</option>
                                    <option>Times New Roman</option>
                                    <option>Verdana</option>
                                  </select>
                                </label>
                                <label className="block text-xs font-bold uppercase text-slate-500">
                                  Tamanho
                                  <input type="number" value={selectedCertificateElement.fontSize || 14} onChange={e => updateCertificateElement(selectedCertificateElement.id, { fontSize: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900" />
                                </label>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <label className="block text-xs font-bold uppercase text-slate-500">
                                  Cor
                                  <input type="color" value={selectedCertificateElement.color || '#0f172a'} onChange={e => updateCertificateElement(selectedCertificateElement.id, { color: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200" />
                                </label>
                                <label className="block text-xs font-bold uppercase text-slate-500">
                                  Alinhamento
                                  <select value={selectedCertificateElement.align || 'center'} onChange={e => updateCertificateElement(selectedCertificateElement.id, { align: e.target.value as any })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900">
                                    <option value="left">Esquerda</option>
                                    <option value="center">Centro</option>
                                    <option value="right">Direita</option>
                                  </select>
                                </label>
                              </div>
                              <div className="flex gap-2">
                                <label className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
                                  <input type="checkbox" checked={selectedCertificateElement.bold === true} onChange={e => updateCertificateElement(selectedCertificateElement.id, { bold: e.target.checked })} />
                                  Negrito
                                </label>
                                <label className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
                                  <input type="checkbox" checked={selectedCertificateElement.italic === true} onChange={e => updateCertificateElement(selectedCertificateElement.id, { italic: e.target.checked })} />
                                  Itálico
                                </label>
                              </div>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setCertificateTemplate(prev => ({ ...prev, elements: prev.elements.filter(element => element.id !== selectedCertificateElement.id) }));
                              setSelectedCertificateElementId('');
                            }}
                            className="w-full rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100"
                          >
                            Remover elemento
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-[430px_1fr] gap-6">
                  <div className="space-y-5 no-print">
                    <form onSubmit={handleSearchCertificateParticipant} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                      <label className="block text-xs font-bold uppercase text-slate-500">
                        Buscar participante
                        <div className="relative mt-1">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                          <input
                            value={certificateSearch}
                            onChange={e => {
                              setCertificateSearch(e.target.value);
                              setCertificateFeedback(null);
                            }}
                            placeholder="Nome, CPF ou QR Code"
                            className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-base font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {certificateParticipantSuggestions.length > 0 && (
                            <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                              {certificateParticipantSuggestions.map(participant => (
                                <button
                                  key={participant.id}
                                  type="button"
                                  onClick={() => {
                                    setCertificateSearch(participant.name);
                                    setCertificateFeedback(null);
                                    void loadCertificateParticipant(participant.name);
                                  }}
                                  className="w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-blue-50 transition"
                                >
                                  <p className="text-base font-black text-slate-900">{participant.badgeName || participant.name}</p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </label>
                      <button type="submit" className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 transition">
                        Buscar
                      </button>
                    </form>

                    {certificateFeedback && (
                      <div className={`rounded-xl border p-4 text-sm font-bold ${
                        certificateFeedback.type === 'success'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                          : certificateFeedback.type === 'warning'
                            ? 'border-amber-200 bg-amber-50 text-amber-900'
                            : 'border-rose-200 bg-rose-50 text-rose-900'
                      }`}>
                        {certificateFeedback.message}
                      </div>
                    )}

                    {certificateLookup && (
                      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                        <div>
                          <p className="text-xs font-black uppercase text-slate-400">Participante</p>
                          <h3 className="text-xl font-black text-slate-950">{certificateLookup.participant.name}</h3>
                          <p className="text-sm text-slate-500">{certificateLookup.participant.cpf || '-'} | {certificateLookup.event.name}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-slate-50 p-3">
                            <p className="text-xs font-bold text-slate-500">Atividades</p>
                            <p className="text-2xl font-black text-slate-950">{certificateLookup.attendedActivities.length}</p>
                          </div>
                          <div className="rounded-lg bg-slate-50 p-3">
                            <p className="text-xs font-bold text-slate-500">Carga total</p>
                            <p className="text-2xl font-black text-slate-950">{certificateLookup.totalHours}h</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleIssueCertificate('general')}
                          disabled={certificateLookup.attendedActivities.length === 0}
                          className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
                        >
                          Emitir certificado geral
                        </button>

                        <div>
                          <p className="mb-2 text-xs font-black uppercase text-slate-400">Atividades frequentadas</p>
                          <div className="space-y-2 max-h-[320px] overflow-y-auto">
                            {certificateLookup.attendedActivities.length === 0 ? (
                              <p className="rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-900">Participante não possui presença registrada.</p>
                            ) : certificateLookup.attendedActivities.map(activity => (
                              <div key={activity.id} className="rounded-lg border border-slate-100 p-3">
                                <p className="text-sm font-black text-slate-900">{fixMojibake(activity.title)}</p>
                                <p className="text-xs text-slate-500">{fixMojibake(activity.roomName)} | {fixMojibake(activity.speakerName || 'Palestrante não informado')}</p>
                                <div className="mt-3 flex items-center justify-between gap-3">
                                  <span className="text-xs font-bold text-slate-600">{activity.workloadHours || 0}h</span>
                                  <button
                                    type="button"
                                    onClick={() => handleIssueCertificate('activity', activity.id)}
                                    className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100 transition"
                                  >
                                    Emitir individual
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    {!activeCertificate || !certificateParticipant || !certificateEvent ? (
                      <div className="flex min-h-[520px] flex-col items-center justify-center text-center text-slate-400 no-print">
                        <Award size={44} />
                        <p className="mt-3 text-sm font-bold">A prévia do certificado aparecerá aqui após a emissão.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3 no-print">
                          <div>
                            <p className="text-xs font-black uppercase text-slate-400">Prévia</p>
                            <p className="text-sm font-bold text-slate-700">{activeCertificate.certificate.certificateCode}</p>
                          </div>
                          <button
                            type="button"
                            onClick={printCertificate}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700 transition"
                          >
                            <Printer size={16} />
                            Imprimir
                          </button>
                        </div>

                        <div
                          className={`certificate-print-area relative overflow-hidden rounded-xl border-[10px] border-slate-100 bg-white px-8 py-12 text-center shadow-inner min-h-[520px] flex flex-col justify-center ${certificateTemplate.orientation === 'portrait' ? 'max-w-[560px] mx-auto' : ''}`}
                          style={certificateTemplate.backgroundImageUrl ? {
                            backgroundImage: `url(${certificateTemplate.backgroundImageUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          } : undefined}
                        >
                          <div className="absolute inset-0 bg-white/80" />
                          {certificateTemplate.elements.map((element, index) => {
                            const normalized = getCertificateElementDefaults(element, index);
                            const value = normalized.type === 'image'
                              ? ''
                              : replaceCertificatePlaceholders(normalized.placeholder || normalized.text || '', certificateParticipant, certificateEvent, activeCertificate.certificate, certificateActivity);
                            return (
                              <div
                                key={normalized.id}
                                className="absolute z-20 flex items-center overflow-hidden leading-tight"
                                style={{
                                  left: `${normalized.x}%`,
                                  top: `${normalized.y}%`,
                                  width: `${normalized.width}%`,
                                  height: `${normalized.height}%`,
                                  color: normalized.color,
                                  fontFamily: normalized.fontFamily,
                                  fontSize: `${Math.max(8, Math.min(normalized.fontSize || 14, 34))}px`,
                                  fontWeight: normalized.bold ? 900 : 500,
                                  fontStyle: normalized.italic ? 'italic' : 'normal',
                                  textAlign: normalized.align,
                                  justifyContent: normalized.align === 'left' ? 'flex-start' : normalized.align === 'right' ? 'flex-end' : 'center'
                                }}
                              >
                                {normalized.type === 'image'
                                  ? (normalized.imageUrl ? <img src={normalized.imageUrl} alt={normalized.label} className="h-full w-full object-contain" /> : null)
                                  : <span>{value}</span>}
                              </div>
                            );
                          })}
                          <div className={`${certificateTemplate.elements.length > 0 ? 'hidden' : 'relative z-10'}`}>
                          {certificateTemplate.logoUrl && (
                            <img src={certificateTemplate.logoUrl} alt="Logo do certificado" className="mx-auto mb-5 max-h-20 max-w-[220px] object-contain" />
                          )}
                          <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">Certificado</p>
                          <h1 className="mt-5 text-4xl font-black text-slate-950 font-display">{certificateTemplate.name || 'CREDENCIA'}</h1>
                          <div className="mx-auto my-8 h-px w-28 bg-slate-300" />

                          {activeCertificate.certificate.type === 'activity' && certificateActivity ? (
                            <div className="space-y-4 text-slate-800">
                              <p className="text-xl leading-relaxed">Certificamos que <b>{certificateParticipant.name}</b></p>
                              <p className="text-xl leading-relaxed">participou da atividade</p>
                              <p className="text-3xl font-black text-slate-950">{fixMojibake(certificateActivity.title)}</p>
                              <p className="text-xl leading-relaxed">ministrada por</p>
                              <p className="text-2xl font-black text-slate-950">{fixMojibake(certificateActivity.speakerName || 'Palestrante não informado')}</p>
                              <p className="text-xl leading-relaxed">com carga horária de</p>
                              <p className="text-3xl font-black text-slate-950">{activeCertificate.certificate.totalHours} horas.</p>
                            </div>
                          ) : (
                            <div className="space-y-4 text-slate-800">
                              <p className="text-xl leading-relaxed">Certificamos que <b>{certificateParticipant.name}</b></p>
                              <p className="text-xl leading-relaxed">participou do evento</p>
                              <p className="text-3xl font-black text-slate-950">{certificateEvent.name}</p>
                              <p className="text-xl leading-relaxed">com carga horária total de</p>
                              <p className="text-3xl font-black text-slate-950">{activeCertificate.certificate.totalHours} horas.</p>
                            </div>
                          )}

                          <div className="mt-12 grid grid-cols-1 gap-2 text-xs font-bold text-slate-500">
                            <p>Código: {activeCertificate.certificate.certificateCode}</p>
                            <p>Emitido em {new Date(activeCertificate.certificate.issuedAt).toLocaleString('pt-BR')}</p>
                          </div>
                          <div className="mt-8 grid grid-cols-1 gap-1 text-sm font-bold text-slate-600">
                            {certificateDynamicPreview.map(element => (
                              <p key={element.id} style={{ fontSize: `${Math.max(Math.min(element.fontSize || 14, 22), 10)}px` }}>
                                {element.value}
                              </p>
                            ))}
                          </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB 5: CHAPELARIA (CLOAKROOM) --- */}
            {activeTab === 'chapelaria' && (
              <div className="space-y-6">
                
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 font-display">Controle Integrado de Chapelaria</h2>
                    <p className="text-sm text-slate-500">
                      Entrada automatizada de pertences sob etiquetas numéricas sequenciais. Evento ativo: <b>{currentEvent?.name}</b>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCloakroomForm({ participantId: '', participantName: '', itemDescription: '' });
                      setIsCloakroomModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Guardar Pertence</span>
                  </button>
                </div>

                <div className={`grid ${isUserAdmin ? 'grid-cols-4' : 'grid-cols-3'} gap-2 bg-white border border-slate-200 rounded-lg p-1`}>
                  {[
                    { id: 'store' as const, label: 'Guardar Pertences' },
                    { id: 'return' as const, label: 'Retirar Pertences' },
                    { id: 'history' as const, label: 'Histórico' },
                    ...(isUserAdmin ? [{ id: 'settings' as const, label: 'Etiqueta' }] : [])
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setCloakroomTab(tab.id)}
                      className={`px-3 py-2 rounded-md text-xs font-bold transition cursor-pointer ${
                        cloakroomTab === tab.id ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {cloakroomTab === 'store' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr_0.85fr] gap-5 items-start">
                    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                      <h3 className="text-lg font-black text-slate-950">Participante</h3>
                      <div className="relative mt-4">
                        <Search size={22} className="absolute left-4 top-4 text-slate-400" />
                        <input
                          ref={cloakroomSearchInputRef}
                          autoFocus
                          value={cloakroomSearch}
                          onChange={event => {
                            setCloakroomSearch(event.target.value);
                            setCloakroomSelectedParticipant(null);
                            setCloakroomSuccess(null);
                          }}
                          placeholder="Buscar participante por nome, CPF ou QR Code"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-lg font-bold text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        />
                      </div>

                      {!cloakroomSelectedParticipant && cloakroomParticipantResults.length > 0 && (
                        <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                          {cloakroomParticipantResults.map(participant => (
                            <button
                              key={participant.id}
                              onClick={() => {
                                setCloakroomSelectedParticipant(participant);
                                setCloakroomSearch(participant.name);
                              }}
                              className="w-full text-left p-4 hover:bg-blue-50 border-b last:border-b-0 border-slate-100 transition cursor-pointer"
                            >
                              <div className="font-black text-slate-950 text-base">{participant.name}</div>
                              <div className="text-xs text-slate-500 mt-1">
                                {participant.category}{participant.company ? ` • ${participant.company}` : ''} • {participant.ticketCode}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {cloakroomSelectedParticipant ? (
                        <div className="mt-4 rounded-xl border-2 border-blue-200 bg-blue-50 p-5 shadow-xs">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs font-black uppercase tracking-wider text-blue-700">Selecionado</div>
                              <div className="font-black text-slate-950 text-xl mt-1 leading-tight">{cloakroomSelectedParticipant.name}</div>
                            </div>
                            <CheckCircle2 size={24} className="text-blue-600 shrink-0" />
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-5">
                      <div>
                        <h3 className="text-lg font-black text-slate-950">Volumes</h3>
                        <div className="mt-4 flex items-center justify-center gap-4 rounded-xl bg-slate-50 border border-slate-200 p-4">
                          <button
                            type="button"
                            onClick={() => setCloakroomVolumeCount(value => Math.max(1, value - 1))}
                            className="w-14 h-14 rounded-xl bg-white border border-slate-200 text-3xl font-black text-slate-800 hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer"
                            aria-label="Diminuir volumes"
                          >
                            -
                          </button>
                          <div className="min-w-24 text-center">
                            <div className="text-5xl font-black text-slate-950 leading-none">{cloakroomVolumeCount}</div>
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">volume{cloakroomVolumeCount > 1 ? 's' : ''}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCloakroomVolumeCount(value => Math.min(5, value + 1))}
                            className="w-14 h-14 rounded-xl bg-blue-600 text-white text-3xl font-black hover:bg-blue-500 transition cursor-pointer"
                            aria-label="Aumentar volumes"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-slate-950">Observações</h3>
                        <textarea
                          value={cloakroomDescription}
                          onChange={event => setCloakroomDescription(event.target.value)}
                          placeholder="Mochila preta, casaco azul, mala de bordo..."
                          rows={5}
                          className="w-full mt-3 px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 resize-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-slate-950 text-white rounded-lg p-5 shadow-xs">
                        <p className="text-xs font-black uppercase tracking-wider text-blue-200">Resumo da impressão</p>
                        <div className="mt-4 rounded-xl bg-white/8 border border-white/10 p-4">
                          <div className="flex items-center justify-between py-2 text-lg"><span>Volume(s)</span><b>{cloakroomVolumeCount}</b></div>
                          <div className="flex items-center justify-between py-2 text-lg"><span>Etiqueta principal</span><b>1</b></div>
                          <div className="flex items-center justify-between py-2 text-lg"><span>Etiquetas de volume</span><b>{cloakroomVolumeCount}</b></div>
                          <div className="mt-2 pt-4 border-t border-white/20 flex items-center justify-between text-2xl font-black">
                            <span>Total de etiquetas</span>
                            <b>{1 + cloakroomVolumeCount}</b>
                          </div>
                        </div>

                        <div className="mt-4 rounded-xl bg-blue-500/15 border border-blue-300/20 p-4">
                          <span className="block text-xs font-black uppercase tracking-wider text-blue-100">Próximo Ticket</span>
                          <b className="block text-4xl font-black font-mono text-white mt-1">{nextCloakroomTicket}</b>
                        </div>

                        <button
                          onClick={handleOperationalCloakroomSave}
                          disabled={!cloakroomSelectedParticipant}
                          className="mt-5 w-full px-4 py-5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-500 text-white text-base font-black transition cursor-pointer disabled:cursor-not-allowed"
                        >
                          GUARDAR PERTENCES
                        </button>
                      </div>

                      {cloakroomSuccess && (
                        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-5 shadow-xs">
                          <div className="flex items-center gap-2 text-emerald-800 font-black text-lg">
                            <CheckCircle2 size={24} />
                            <span>REGISTRO CONCLUÍDO</span>
                          </div>
                          <div className="mt-4 text-sm text-slate-700">
                            <span className="block text-xs font-black uppercase tracking-wider text-slate-500">Ticket</span>
                            <b className="block font-mono text-3xl text-slate-950 mt-1">{cloakroomSuccess.tagNumber}</b>
                            <p className="mt-4 font-bold text-slate-800">Volumes</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {(cloakroomSuccess.volumeTags || []).map(tag => (
                                <span key={tag} className="px-3 py-1.5 bg-white border border-emerald-200 rounded-lg font-mono text-sm font-black text-emerald-800">{tag}</span>
                              ))}
                            </div>
                            <p className="mt-4 text-emerald-700 font-black">Impressão realizada com sucesso</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {false && cloakroomTab === 'store' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-5">
                    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5 shadow-xs">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Passo 1</p>
                        <h3 className="text-lg font-bold text-slate-900 mt-1">Localizar participante</h3>
                        <div className="relative mt-3">
                          <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
                          <input
                            value={cloakroomSearch}
                            onChange={event => {
                              setCloakroomSearch(event.target.value);
                              setCloakroomSelectedParticipant(null);
                              setCloakroomSuccess(null);
                            }}
                            placeholder="Buscar por nome, CPF ou QR Code"
                            className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-lg text-base font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        {!cloakroomSelectedParticipant && cloakroomParticipantResults.length > 0 && (
                          <div className="mt-3 border border-slate-100 rounded-lg overflow-hidden">
                            {cloakroomParticipantResults.map(participant => (
                              <button
                                key={participant.id}
                                onClick={() => {
                                  setCloakroomSelectedParticipant(participant);
                                  setCloakroomSearch(participant.name);
                                }}
                                className="w-full text-left p-3 hover:bg-blue-50 border-b last:border-b-0 border-slate-100 transition cursor-pointer"
                              >
                                <div className="font-bold text-slate-900 text-sm">{participant.name}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{participant.category}{participant.company ? ` • ${participant.company}` : ''} • {participant.ticketCode}</div>
                              </button>
                            ))}
                          </div>
                        )}
                        {cloakroomSelectedParticipant && (
                          <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
                            <div className="font-black text-slate-950">{cloakroomSelectedParticipant.name}</div>
                            <div className="text-sm text-slate-600 mt-1">{cloakroomSelectedParticipant.category}{cloakroomSelectedParticipant.company ? ` • ${cloakroomSelectedParticipant.company}` : ''}</div>
                            <div className="text-xs font-mono text-blue-700 mt-2">Código: {cloakroomSelectedParticipant.ticketCode}</div>
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Passo 2</p>
                        <h3 className="text-lg font-bold text-slate-900 mt-1">Quantidade de volumes</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {[1, 2, 3, 4, 5].map(volume => (
                            <button key={volume} onClick={() => setCloakroomVolumeCount(volume)} className={`px-4 py-3 rounded-lg text-sm font-bold border transition cursor-pointer ${cloakroomVolumeCount === volume ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'}`}>
                              {volume} volume{volume > 1 ? 's' : ''}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Passo 3</p>
                        <h3 className="text-lg font-bold text-slate-900 mt-1">Descrição dos volumes</h3>
                        <textarea value={cloakroomDescription} onChange={event => setCloakroomDescription(event.target.value)} placeholder="Mochila preta, casaco azul, mala de bordo..." rows={3} className="w-full mt-3 px-3 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-slate-950 text-white rounded-lg p-5 shadow-xs">
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-200">Resumo da impressão</p>
                        <div className="mt-4 space-y-3 text-sm">
                          <div className="flex justify-between"><span>Volume(s)</span><b>{cloakroomVolumeCount}</b></div>
                          <div className="flex justify-between"><span>Etiqueta principal</span><b>1</b></div>
                          <div className="flex justify-between"><span>Etiquetas de volume</span><b>{cloakroomVolumeCount}</b></div>
                          <div className="pt-3 border-t border-white/20 flex justify-between text-lg"><span>Total</span><b>{1 + cloakroomVolumeCount}</b></div>
                        </div>
                        <button onClick={handleOperationalCloakroomSave} disabled={!cloakroomSelectedParticipant} className="mt-5 w-full px-4 py-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-500 text-white text-sm font-black transition cursor-pointer disabled:cursor-not-allowed">GUARDAR PERTENCES</button>
                      </div>

                      {cloakroomSuccess && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
                          <div className="flex items-center gap-2 text-emerald-800 font-black"><CheckCircle2 size={20} /><span>Pertences registrados com sucesso</span></div>
                          <div className="mt-4 text-sm text-slate-700">
                            <p>Número: <b className="font-mono text-slate-950">{cloakroomSuccess.tagNumber}</b></p>
                            <p className="mt-2">Volumes:</p>
                            <div className="flex flex-wrap gap-2 mt-2">{(cloakroomSuccess.volumeTags || []).map(tag => <span key={tag} className="px-2.5 py-1 bg-white border border-emerald-200 rounded font-mono text-xs font-bold">{tag}</span>)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {cloakroomTab === 'return' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-5">
                    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                      <h3 className="text-lg font-bold text-slate-900">Retirar pertences</h3>
                      <div className="relative mt-4">
                        <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
                        <input value={cloakroomReturnSearch} onChange={event => { setCloakroomReturnSearch(event.target.value); setCloakroomReturnItem(null); setCloakroomReturnSuccess(null); }} placeholder="Buscar por etiqueta, nome, CPF ou QR Code" className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-lg text-base font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500" />
                      </div>
                      {cloakroomReturnResults.length > 0 && (
                        <div className="mt-3 border border-slate-100 rounded-lg overflow-hidden">
                          {cloakroomReturnResults.map(item => (
                            <button key={item.id} onClick={() => { setCloakroomReturnItem(item); setCloakroomReturnSearch(String(item.tagNumber)); }} className="w-full text-left p-3 hover:bg-amber-50 border-b last:border-b-0 border-slate-100 transition cursor-pointer">
                              <div className="flex items-center justify-between gap-3"><span className="font-mono font-black text-amber-700">#{item.tagNumber}</span><span className="text-xs text-slate-500">{item.volumeCount || 1} volume(s)</span></div>
                              <div className="font-bold text-slate-900 text-sm mt-1">{item.participantName}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{item.itemDescription || 'Sem descrição'}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      {cloakroomReturnItem ? (
                        <div className="bg-white border border-amber-200 rounded-lg p-5 shadow-xs">
                          <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Item localizado</p>
                          <h3 className="text-xl font-black text-slate-950 mt-1">#{cloakroomReturnItem.tagNumber}</h3>
                          <div className="mt-4 space-y-2 text-sm text-slate-700">
                            <p><b>Participante:</b> {cloakroomReturnItem.participantName}</p>
                            <p><b>Volumes:</b> {cloakroomReturnItem.volumeCount || 1}</p>
                            <p><b>Descrição:</b> {cloakroomReturnItem.itemDescription || '-'}</p>
                            <p><b>Entrada:</b> {new Date(cloakroomReturnItem.registeredAt).toLocaleString('pt-BR')}</p>
                            <p><b>Operador entrada:</b> {cloakroomReturnItem.registeredByName || '-'}</p>
                          </div>
                          <button onClick={() => handleWithdrawCloakroomItem(cloakroomReturnItem.id, cloakroomReturnItem.tagNumber, true)} className="mt-5 w-full px-4 py-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-black transition cursor-pointer">ENTREGAR PERTENCES</button>
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400"><FolderLock className="mx-auto mb-3" size={32} /><p className="font-semibold">Busque uma etiqueta para entrega.</p></div>
                      )}
                      {cloakroomReturnSuccess && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 text-emerald-800 font-black flex items-center gap-2"><CheckCircle2 size={20} /><span>Entrega concluída: #{cloakroomReturnSuccess.tagNumber}</span></div>}
                    </div>
                  </div>
                )}

                {cloakroomTab === 'history' && (
                  <>

                <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Histórico da chapelaria</h3>
                    <p className="text-xs text-slate-500">{filteredCloakroomHistory.length} registros encontrados.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select value={cloakroomHistoryFilter} onChange={event => setCloakroomHistoryFilter(event.target.value as any)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                      <option value="all">Todos</option>
                      <option value="guardado">Guardados</option>
                      <option value="retirado">Retirados</option>
                    </select>
                    <input value={cloakroomHistorySearch} onChange={event => setCloakroomHistorySearch(event.target.value)} placeholder="Nome, CPF ou ticket" className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </div>

                {/* Grid de Itens Atuais */}
                <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Nº Etiqueta</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Especificação do Item</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dono / Participante</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Registro / Entrada</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center no-print">Operações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCloakroomHistory.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-12 text-center text-slate-400">
                              <FolderLock className="mx-auto text-slate-300 mb-2" size={32} />
                              <p className="font-semibold text-slate-500">Chapelaria sem volumes no evento.</p>
                              <p className="text-xs mt-1">Gere novos números sequenciais para pertences de integrantes acima.</p>
                            </td>
                          </tr>
                        ) : (
                          filteredCloakroomHistory.map(item => (
                            <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                              
                              <td className="p-4 text-center align-middle">
                                <span className="inline-flex items-center justify-center font-mono font-bold text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-100">
                                  #{item.tagNumber}
                                </span>
                              </td>

                              <td className="p-4 font-medium text-slate-800 text-sm">
                                {item.itemDescription}
                              </td>

                              <td className="p-4 text-slate-600 text-xs">
                                <p className="font-bold text-slate-850">{item.participantName}</p>
                              </td>

                              <td className="p-4 align-middle text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  item.status === 'guardado' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {item.status === 'guardado' ? 'Com a Organização' : 'Retirado / Devolvido'}
                                </span>
                              </td>

                              <td className="p-4 text-center align-middle text-xs font-mono text-slate-400">
                                {new Date(item.registeredAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                {item.returnedAt && (
                                  <div className="text-[10px] text-zinc-500 mt-0.5">
                                    Devolvido: {new Date(item.returnedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </td>

                              <td className="p-4 align-middle text-center no-print">
                                <div className="flex items-center justify-center gap-2">
                                  {item.status === 'guardado' ? (
                                    <button
                                      onClick={() => handleWithdrawCloakroomItem(item.id, item.tagNumber)}
                                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer select-none transition"
                                    >
                                      Dar Baixa / Devolver
                                    </button>
                                  ) : (
                                    <span className="text-slate-400 font-medium text-xs flex items-center gap-1">
                                      <Check size={14} className="text-emerald-500" />
                                      <span>Concluído</span>
                                    </span>
                                  )}

                                  {currentUser?.role === 'admin' && (
                                    <button
                                      onClick={() => handleDeleteCloakroomItem(item.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition"
                                      title="Limpar Registro"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>

                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                  </>
                )}

                {cloakroomTab === 'settings' && isUserAdmin && (
                  <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.8fr] gap-5">
                    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Configuração da etiqueta</p>
                          <h3 className="text-lg font-bold text-slate-900 mt-1">Informações impressas na Chapelaria</h3>
                          <p className="text-sm text-slate-500 mt-1">
                            Escolha quais dados aparecem nas etiquetas principal e de volume. Esta configuração vale para o evento atual.
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">Admin</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                        {[
                          { key: 'showEventName' as const, label: 'Nome do evento' },
                          { key: 'showLabelType' as const, label: 'Tipo da etiqueta' },
                          { key: 'showTicketNumber' as const, label: 'Número / ticket' },
                          { key: 'showParticipantName' as const, label: 'Nome do participante' },
                          { key: 'showDescription' as const, label: 'Descrição dos volumes' },
                          { key: 'showVolumeCount' as const, label: 'Quantidade de volumes' },
                          { key: 'showDateTime' as const, label: 'Data e hora de entrada' },
                          { key: 'showOperator' as const, label: 'Operador de entrada' }
                        ].map(option => (
                          <label key={option.key} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 cursor-pointer hover:border-blue-200 hover:bg-blue-50/60 transition">
                            <input
                              type="checkbox"
                              checked={cloakroomLabelConfig[option.key]}
                              onChange={event => setCloakroomLabelConfig(prev => ({ ...prev, [option.key]: event.target.checked }))}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>

                      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div>
                          <h4 className="text-sm font-black text-slate-900">Ordem e fonte das linhas</h4>
                          <p className="text-xs text-slate-500 mt-1">Use subir/descer para alterar a ordem e ajuste o tamanho da fonte de cada linha.</p>
                        </div>
                        <div className="mt-3 space-y-2">
                          {getCloakroomLabelOrder().map((key, index, order) => {
                            const option = cloakroomLabelLineOptions.find(item => item.key === key);
                            if (!option) return null;
                            const isVisible = cloakroomLabelConfig[option.showKey];
                            return (
                              <div key={key} className={`grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_120px_96px] gap-2 items-center rounded-lg border px-3 py-2 ${isVisible ? 'bg-white border-slate-200' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
                                <div>
                                  <div className="text-sm font-bold text-slate-800">{option.label}</div>
                                  <div className="text-[11px] text-slate-500">{isVisible ? `Linha ${index + 1}` : 'Oculta'}</div>
                                </div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                  <span>Fonte</span>
                                  <input
                                    type="number"
                                    min={8}
                                    max={48}
                                    value={getCloakroomLabelFontSize(key)}
                                    onChange={event => setCloakroomLabelConfig(prev => ({
                                      ...prev,
                                      fontSizes: {
                                        ...(prev.fontSizes || {}),
                                        [key]: Number(event.target.value)
                                      }
                                    }))}
                                    className="w-16 px-2 py-1.5 rounded border border-slate-200 text-sm font-bold text-slate-900"
                                  />
                                </label>
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() => setCloakroomLabelConfig(prev => {
                                      const nextOrder = getCloakroomLabelOrder(prev);
                                      [nextOrder[index - 1], nextOrder[index]] = [nextOrder[index], nextOrder[index - 1]];
                                      return { ...prev, lineOrder: nextOrder };
                                    })}
                                    className="w-8 h-8 rounded border border-slate-200 bg-white disabled:opacity-35 text-slate-700 font-black"
                                    title="Subir linha"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    disabled={index === order.length - 1}
                                    onClick={() => setCloakroomLabelConfig(prev => {
                                      const nextOrder = getCloakroomLabelOrder(prev);
                                      [nextOrder[index], nextOrder[index + 1]] = [nextOrder[index + 1], nextOrder[index]];
                                      return { ...prev, lineOrder: nextOrder };
                                    })}
                                    className="w-8 h-8 rounded border border-slate-200 bg-white disabled:opacity-35 text-slate-700 font-black"
                                    title="Descer linha"
                                  >
                                    ↓
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 mt-5">
                        <button
                          type="button"
                          onClick={handleSaveCloakroomLabelConfig}
                          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-black transition cursor-pointer"
                        >
                          <CheckCircle2 size={17} />
                          <span>Salvar configuração</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCloakroomLabelConfig(DEFAULT_CLOAKROOM_LABEL_CONFIG)}
                          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition cursor-pointer"
                        >
                          <RefreshCw size={16} />
                          <span>Restaurar padrão</span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-950 text-white rounded-lg p-5 shadow-xs">
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-200">Prévia da etiqueta</p>
                      <div className="mt-4 bg-white text-black rounded-md p-4 min-h-[160px] flex flex-col justify-center gap-1">
                        {getCloakroomLabelOrder().map(key => {
                          const option = cloakroomLabelLineOptions.find(item => item.key === key);
                          if (!option || !cloakroomLabelConfig[option.showKey]) return null;
                          const previewItem = {
                            id: 'preview',
                            eventId: currentEvent?.id || '',
                            participantName: 'Nome do Participante',
                            itemDescription: 'Mochila preta, casaco azul',
                            tagNumber: 1520,
                            volumeCount: 2,
                            volumeTags: ['1520-1', '1520-2'],
                            registeredAt: new Date().toISOString(),
                            registeredByName: currentUser?.name || 'Operador',
                            status: 'guardado'
                          } as CloakroomItem;
                          const value = getCloakroomLabelLineValue(key, previewItem, {
                            title: 'CHAPELARIA',
                            tag: '1520',
                            detail: '2 volume(s)'
                          });
                          if (!value) return null;
                          return (
                            <div
                              key={key}
                              className={`text-center leading-tight ${key === 'ticketNumber' ? 'font-black font-mono' : key === 'description' ? 'font-medium' : 'font-bold'}`}
                              style={{ fontSize: `${getCloakroomLabelFontSize(key)}px`, whiteSpace: 'pre-line' }}
                            >
                              {value}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {false && <div className="bg-slate-950 text-white rounded-lg p-5 shadow-xs">
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-200">Prévia da etiqueta</p>
                      <div className="mt-4 bg-white text-black rounded-md p-4 min-h-[160px] flex flex-col justify-between">
                        {(cloakroomLabelConfig.showLabelType || cloakroomLabelConfig.showEventName) && (
                          <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-wider">
                            <b>{cloakroomLabelConfig.showLabelType ? 'CHAPELARIA' : ''}</b>
                            <span>{cloakroomLabelConfig.showEventName ? currentEvent?.name || 'Evento' : ''}</span>
                          </div>
                        )}
                        {cloakroomLabelConfig.showTicketNumber && (
                          <div className="text-center text-4xl font-black font-mono leading-none">1520</div>
                        )}
                        {cloakroomLabelConfig.showParticipantName && (
                          <div className="text-center text-lg font-black leading-tight">Nome do Participante</div>
                        )}
                        {cloakroomLabelConfig.showDescription && (
                          <div className="text-center text-xs">Mochila preta, casaco azul</div>
                        )}
                        {(cloakroomLabelConfig.showVolumeCount || cloakroomLabelConfig.showOperator || cloakroomLabelConfig.showDateTime) && (
                          <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider">
                            <span>{cloakroomLabelConfig.showVolumeCount ? '2 volume(s)' : ''}</span>
                            <span>
                              {[
                                cloakroomLabelConfig.showOperator ? currentUser?.name || 'Operador' : '',
                                cloakroomLabelConfig.showDateTime ? new Date().toLocaleString('pt-BR') : ''
                              ].filter(Boolean).join(' • ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>}
                  </div>
                )}

              </div>
            )}

            {/* --- TAB 6: RELATÓRIOS --- */}
            {activeTab === 'relatorios' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      {reportBrandConfig.showLogo && reportBrandConfig.logoUrl && (
                        <img src={reportBrandConfig.logoUrl} alt="Logo do relatório" className="h-12 max-w-[160px] object-contain rounded bg-white border border-slate-100 p-1" />
                      )}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Relatórios</p>
                        <h2 className="text-2xl font-bold text-slate-900 font-display mt-1">Dashboard de credenciamento</h2>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                      Acompanhe presença, categorias e horários do evento atual sem alterar as exportações existentes.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                    <button
                      onClick={() => exportParticipantsToExcelWithFilter(false, reportParticipants, 'Relatorio_Filtrado')}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <Download size={15} />
                      <span>Baixar planilha geral</span>
                    </button>
                    <button
                      onClick={() => exportParticipantsToExcelWithFilter(true, reportParticipants, 'Presentes_Filtrado')}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <CheckCircle2 size={15} />
                      <span>Baixar presentes</span>
                    </button>
                    <button
                      onClick={triggerPrintableReport}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <Printer size={15} />
                      <span>Imprimir relatório</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {[
                    { title: 'Total de participantes', value: reportSummary.total, icon: Users, color: 'bg-blue-50 text-blue-700 border-blue-100' },
                    { title: 'Check-ins realizados', value: reportSummary.checkedIn, icon: UserCheck, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                    { title: 'Participantes pendentes', value: reportSummary.pending, icon: Clock, color: 'bg-amber-50 text-amber-700 border-amber-100' },
                    { title: 'Percentual de presença', value: `${reportSummary.attendanceRate}%`, icon: BarChart3, color: 'bg-violet-50 text-violet-700 border-violet-100' }
                  ].map(card => {
                    const Icon = card.icon;
                    return (
                      <div key={card.title} className={`bg-white border rounded-lg p-5 shadow-xs ${card.color}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider opacity-75">{card.title}</p>
                            <p className="text-3xl font-black text-slate-950 mt-2">{card.value}</p>
                          </div>
                          <div className="w-10 h-10 rounded-lg bg-white/75 flex items-center justify-center shrink-0">
                            <Icon size={20} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Evento atual</label>
                      <select
                        value={selectedEventId}
                        disabled
                        className="w-full px-3 py-3 bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700"
                      >
                        <option>{currentEvent?.name || 'Evento não selecionado'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Categoria</label>
                      <select
                        value={selectedCategoryFilter}
                        onChange={e => setSelectedCategoryFilter(e.target.value)}
                        className="w-full px-3 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">Todas as categorias</option>
                        <option value="VIP">VIP</option>
                        <option value="Palestrante">Palestrante</option>
                        <option value="Expositor">Expositor</option>
                        <option value="Participante">Participante</option>
                        <option value="Staff">Staff</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Status</label>
                      <select
                        value={selectedPresenceFilter}
                        onChange={e => setSelectedPresenceFilter(e.target.value as any)}
                        className="w-full px-3 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">Todos</option>
                        <option value="present">Credenciados</option>
                        <option value="absent">Pendentes</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Busca</label>
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Nome ou CPF"
                          className="w-full pl-9 pr-3 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                        <FileText size={17} className="text-slate-500" />
                        <span>Identidade visual do relatório</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Configure uma logo no topo e uma marca d'água para a versão impressa do relatório.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReportBrandConfig(DEFAULT_REPORT_BRAND_CONFIG)}
                      className="self-start px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      Limpar marca
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={reportBrandConfig.showLogo}
                          onChange={event => setReportBrandConfig(prev => ({ ...prev, showLogo: event.target.checked }))}
                          className="rounded border-slate-300"
                        />
                        Exibir logo no topo
                      </label>
                      <input
                        type="url"
                        value={reportBrandConfig.logoUrl}
                        onChange={event => setReportBrandConfig(prev => ({ ...prev, logoUrl: event.target.value }))}
                        placeholder="URL da logo superior"
                        className="w-full px-3 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <label className="flex items-center justify-center gap-2 w-full px-3 py-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg text-sm font-bold text-slate-700 cursor-pointer transition">
                        <Upload size={16} />
                        <span>Fazer upload da logo</span>
                        <input
                          type="file"
                          accept={REPORT_IMAGE_ACCEPT}
                          onChange={event => {
                            handleReportImageUpload(event.target.files?.[0], 'logoUrl');
                            event.currentTarget.value = '';
                          }}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[11px] text-slate-400">Formatos suportados: {REPORT_IMAGE_FORMATS}. Tamanho máximo: 2 MB.</p>
                      {reportBrandConfig.showLogo && reportBrandConfig.logoUrl && (
                        <div className="h-16 border border-slate-100 rounded-lg bg-slate-50 flex items-center justify-center p-2">
                          <img src={reportBrandConfig.logoUrl} alt="Prévia da logo do relatório" className="max-h-full max-w-full object-contain" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={reportBrandConfig.showWatermark}
                          onChange={event => setReportBrandConfig(prev => ({ ...prev, showWatermark: event.target.checked }))}
                          className="rounded border-slate-300"
                        />
                        Exibir marca d'água na impressão
                      </label>
                      <input
                        type="url"
                        value={reportBrandConfig.watermarkUrl}
                        onChange={event => setReportBrandConfig(prev => ({ ...prev, watermarkUrl: event.target.value }))}
                        placeholder="URL da imagem da marca d'água"
                        className="w-full px-3 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <label className="flex items-center justify-center gap-2 w-full px-3 py-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg text-sm font-bold text-slate-700 cursor-pointer transition">
                        <Upload size={16} />
                        <span>Fazer upload da marca d'água</span>
                        <input
                          type="file"
                          accept={REPORT_IMAGE_ACCEPT}
                          onChange={event => {
                            handleReportImageUpload(event.target.files?.[0], 'watermarkUrl');
                            event.currentTarget.value = '';
                          }}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[11px] text-slate-400">Formatos suportados: {REPORT_IMAGE_FORMATS}. Tamanho máximo: 2 MB.</p>
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          <span>Opacidade</span>
                          <span>{Math.round(reportBrandConfig.watermarkOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.10"
                          max="0.45"
                          step="0.01"
                          value={reportBrandConfig.watermarkOpacity}
                          onChange={event => setReportBrandConfig(prev => ({ ...prev, watermarkOpacity: Number(event.target.value) }))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                  <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-3 mb-5">
                      <h3 className="text-sm font-bold text-slate-900 font-display">Check-ins por horário</h3>
                      <History size={17} className="text-slate-400" />
                    </div>
                    <div className="space-y-3">
                      {reportCheckinsByHour.length === 0 ? (
                        <p className="text-sm text-slate-400 py-8 text-center">Nenhum check-in nos filtros atuais.</p>
                      ) : (
                        reportCheckinsByHour.map(item => {
                          const max = Math.max(...reportCheckinsByHour.map(row => row.count), 1);
                          return (
                            <div key={item.label} className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                                <span>{item.label}</span>
                                <span>{item.count}</span>
                              </div>
                              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.max((item.count / max) * 100, 6)}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-3 mb-5">
                      <h3 className="text-sm font-bold text-slate-900 font-display">Participantes por categoria</h3>
                      <Tag size={17} className="text-slate-400" />
                    </div>
                    <div className="space-y-3">
                      {reportParticipantsByCategory.length === 0 ? (
                        <p className="text-sm text-slate-400 py-8 text-center">Nenhuma categoria encontrada.</p>
                      ) : (
                        reportParticipantsByCategory.map(item => {
                          const max = Math.max(...reportParticipantsByCategory.map(row => row.count), 1);
                          return (
                            <div key={item.label} className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                                <span>{item.label}</span>
                                <span>{item.count}</span>
                              </div>
                              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.max((item.count / max) * 100, 6)}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-3 mb-5">
                      <h3 className="text-sm font-bold text-slate-900 font-display">Presentes x Ausentes</h3>
                      <BarChart3 size={17} className="text-slate-400" />
                    </div>
                    <div className="space-y-4">
                      <div className="h-5 bg-slate-100 rounded-full overflow-hidden flex">
                        {reportPresenceBreakdown.map(item => (
                          <div
                            key={item.label}
                            className={`${item.color} h-full`}
                            style={{ width: `${reportSummary.total > 0 ? (item.count / reportSummary.total) * 100 : 0}%` }}
                          />
                        ))}
                      </div>
                      {reportPresenceBreakdown.map(item => (
                        <div key={item.label} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                            <span className="font-semibold text-slate-700">{item.label}</span>
                          </div>
                          <span className="font-bold text-slate-950">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {currentEvent?.enableAccessControl !== false && (
                  <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                          <ShieldCheck size={17} className="text-slate-500" />
                          <span>Acessos por sala</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Exibe liberações e negações registradas pelo controle de acesso do evento.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold">
                        <span className="inline-flex items-center gap-1.5 text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-500" />Liberados</span>
                        <span className="inline-flex items-center gap-1.5 text-rose-700"><span className="w-2 h-2 rounded-full bg-rose-500" />Negados</span>
                      </div>
                    </div>

                    {reportAreaAccessSummary.length === 0 ? (
                      <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50">
                        <ShieldAlert className="mx-auto text-slate-300 mb-2" size={28} />
                        <p className="text-sm font-semibold text-slate-500">Nenhum acesso por sala registrado nos filtros atuais.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {reportAreaAccessSummary.map(item => {
                          const max = Math.max(...reportAreaAccessSummary.map(row => row.total), 1);
                          return (
                            <div key={item.areaId} className="border border-slate-100 rounded-lg p-4 bg-slate-50/60">
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <span className="font-bold text-slate-800 text-sm">{item.areaName}</span>
                                <span className="text-xs font-black text-slate-500">{item.total} leituras</span>
                              </div>
                              <div className="h-3 bg-white rounded-full overflow-hidden flex border border-slate-100">
                                <div className="h-full bg-emerald-500" style={{ width: `${Math.max((item.allowed / max) * 100, item.allowed > 0 ? 5 : 0)}%` }} />
                                <div className="h-full bg-rose-500" style={{ width: `${Math.max((item.denied / max) * 100, item.denied > 0 ? 5 : 0)}%` }} />
                              </div>
                              <div className="flex items-center justify-between text-xs text-slate-600 mt-2">
                                <span>{item.allowed} liberados</span>
                                <span>{item.denied} negados</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                        <Award size={17} className="text-slate-500" />
                        <span>Relatório de Certificados</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Participantes com certificados emitidos nos filtros atuais.
                      </p>
                    </div>
                    <p className="text-xs font-bold text-slate-500">
                      {reportCertificates.length} certificado(s) emitido(s)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-5">
                    {[
                      { title: 'Certificados', value: reportCertificateSummary.total, icon: Award, color: 'bg-blue-50 text-blue-700 border-blue-100' },
                      { title: 'Participantes', value: reportCertificateSummary.participantCount, icon: Users, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                      { title: 'Gerais', value: reportCertificateSummary.general, icon: FileText, color: 'bg-slate-50 text-slate-700 border-slate-100' },
                      { title: 'Por atividade', value: reportCertificateSummary.activity, icon: BookOpen, color: 'bg-violet-50 text-violet-700 border-violet-100' },
                      { title: 'Horas somadas', value: `${reportCertificateSummary.totalHours}h`, icon: Clock, color: 'bg-amber-50 text-amber-700 border-amber-100' }
                    ].map(card => {
                      const Icon = card.icon;
                      return (
                        <div key={card.title} className={`rounded-lg border p-4 ${card.color}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider opacity-80">{card.title}</p>
                              <p className="text-2xl font-black mt-1">{card.value}</p>
                            </div>
                            <Icon size={22} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="overflow-x-auto border border-slate-100 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="text-left p-3">Código</th>
                          <th className="text-left p-3">Participante</th>
                          <th className="text-left p-3">Tipo</th>
                          <th className="text-left p-3">Atividade</th>
                          <th className="text-left p-3">Horas</th>
                          <th className="text-left p-3">Emissão</th>
                          <th className="text-left p-3">Operador</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportCertificates.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-500 font-semibold">
                              Nenhum certificado emitido para os participantes filtrados.
                            </td>
                          </tr>
                        ) : (
                          reportCertificates.map(certificate => (
                            <tr key={certificate.id} className="border-t border-slate-100">
                              <td className="p-3 font-mono text-xs font-bold text-slate-700">{certificate.certificateCode}</td>
                              <td className="p-3">
                                <p className="font-bold text-slate-900">{certificate.participantName}</p>
                                <p className="text-xs text-slate-500">{certificate.participantCpf || '-'}</p>
                              </td>
                              <td className="p-3">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${certificate.type === 'general' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'}`}>
                                  {certificate.type === 'general' ? 'Geral' : 'Atividade'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-700">{certificate.type === 'activity' ? fixMojibake(certificate.activityTitle || '-') : '-'}</td>
                              <td className="p-3 font-black text-slate-900">{certificate.totalHours}h</td>
                              <td className="p-3 text-slate-600">{new Date(certificate.issuedAt).toLocaleString('pt-BR')}</td>
                              <td className="p-3 text-slate-600">{certificate.operatorName || 'Operador'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                        <FolderLock size={17} className="text-slate-500" />
                        <span>Relatório da Chapelaria</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Entradas, devoluções e volumes registrados na chapelaria do evento atual.
                      </p>
                    </div>
                    <p className="text-xs font-bold text-slate-500">
                      {reportCloakroomItems.length} registro(s) nos filtros atuais
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-5">
                    {[
                      { title: 'Tickets', value: reportCloakroomSummary.totalTickets, icon: Tag, color: 'bg-blue-50 text-blue-700 border-blue-100' },
                      { title: 'Guardados', value: reportCloakroomSummary.stored, icon: FolderLock, color: 'bg-amber-50 text-amber-700 border-amber-100' },
                      { title: 'Retirados', value: reportCloakroomSummary.returned, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                      { title: 'Volumes totais', value: reportCloakroomSummary.totalVolumes, icon: BarChart3, color: 'bg-slate-50 text-slate-700 border-slate-100' },
                      { title: 'Volumes em guarda', value: reportCloakroomSummary.storedVolumes, icon: Clock, color: 'bg-rose-50 text-rose-700 border-rose-100' }
                    ].map(card => {
                      const Icon = card.icon;
                      return (
                        <div key={card.title} className={`border rounded-lg p-4 ${card.color}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider opacity-75">{card.title}</p>
                              <p className="text-2xl font-black text-slate-950 mt-1">{card.value}</p>
                            </div>
                            <div className="w-9 h-9 rounded-lg bg-white/80 flex items-center justify-center shrink-0">
                              <Icon size={18} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="overflow-x-auto border border-slate-100 rounded-lg">
                    <table className="w-full text-left border-collapse min-w-[1050px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket</th>
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Participante</th>
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Volumes</th>
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Entrada</th>
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Operador entrada</th>
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Devolução</th>
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Operador retirada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportCloakroomItems.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-10 text-center text-slate-400">
                              <FolderLock className="mx-auto text-slate-300 mb-2" size={30} />
                              <p className="font-semibold text-slate-500">Nenhuma movimentação de chapelaria nos filtros atuais.</p>
                            </td>
                          </tr>
                        ) : (
                          reportCloakroomItems.map(item => (
                            <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition">
                              <td className="p-3 font-mono text-xs font-black text-slate-800">#{item.tagNumber}</td>
                              <td className="p-3">
                                <div className="font-bold text-slate-800 text-sm">{item.participantName}</div>
                                {item.volumeTags && item.volumeTags.length > 0 && (
                                  <div className="text-[11px] text-slate-400 font-mono mt-1">{item.volumeTags.join(', ')}</div>
                                )}
                              </td>
                              <td className="p-3 text-sm font-bold text-slate-700">{item.volumeCount || 1}</td>
                              <td className="p-3 text-xs text-slate-600 max-w-[220px]">{item.itemDescription || '-'}</td>
                              <td className="p-3">
                                {item.status === 'retirado' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                                    <CheckCircle2 size={12} />
                                    Retirado
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                                    <Clock size={12} />
                                    Guardado
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-mono text-xs text-slate-700">{new Date(item.registeredAt).toLocaleString('pt-BR')}</td>
                              <td className="p-3 text-xs text-slate-600">{item.registeredByName || '-'}</td>
                              <td className="p-3 font-mono text-xs text-slate-700">{item.returnedAt ? new Date(item.returnedAt).toLocaleString('pt-BR') : '-'}</td>
                              <td className="p-3 text-xs text-slate-600">{item.returnedByName || '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-display">Tabela do relatório</h3>
                      <p className="text-xs text-slate-500">{reportParticipants.length} registros nos filtros atuais.</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1080px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">CPF</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Horário do check-in</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acessos por sala</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Certificados</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Operador responsável</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportParticipants.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-12 text-center text-slate-400">
                              <Info className="mx-auto text-slate-300 mb-2" size={32} />
                              <p className="font-semibold text-slate-500">Nenhum participante nos filtros atuais.</p>
                            </td>
                          </tr>
                        ) : (
                          reportParticipants.map(p => {
                            const areaAccess = reportParticipantAreaAccess.find(item => item.participantId === p.id);
                            const participantCertificates = reportCertificates.filter(certificate => certificate.participantId === p.id);
                            return (
                            <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition">
                              <td className="p-4">
                                <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                                <div className="text-xs text-slate-400">{p.email || 'E-mail não informado'}</div>
                              </td>
                              <td className="p-4 font-mono text-xs text-slate-700">{p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</td>
                              <td className="p-4">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${CATEGORY_TAGS[p.category].bg}`}>
                                  {p.category}
                                </span>
                              </td>
                              <td className="p-4">
                                {p.checkedIn ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                                    <Check size={12} strokeWidth={3} />
                                    Credenciado
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                                    <Clock size={12} />
                                    Pendente
                                  </span>
                                )}
                              </td>
                              <td className="p-4 font-mono text-xs text-slate-700">
                                {p.checkedInAt ? new Date(p.checkedInAt).toLocaleString('pt-BR') : '-'}
                              </td>
                              <td className="p-4 text-xs text-slate-600">
                                {areaAccess && areaAccess.total > 0 ? (
                                  <div className="space-y-1">
                                    <div className="font-semibold text-slate-800">
                                      {areaAccess.allowedAreaNames.length > 0 ? areaAccess.allowedAreaNames.join(', ') : 'Sem liberação'}
                                    </div>
                                    {areaAccess.deniedCount > 0 && (
                                      <div className="text-rose-600 font-semibold">{areaAccess.deniedCount} negado(s)</div>
                                    )}
                                  </div>
                                ) : '-'}
                              </td>
                              <td className="p-4 text-xs text-slate-600">
                                {participantCertificates.length === 0 ? '-' : (
                                  <div className="space-y-1">
                                    <div className="font-black text-slate-900">{participantCertificates.length} emitido(s)</div>
                                    <div className="font-mono text-[10px] text-slate-500">
                                      {participantCertificates.map(certificate => certificate.certificateCode).join(', ')}
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="p-4 text-xs text-slate-600">
                                {getReportCheckinOperator(p)}
                              </td>
                            </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB 7: CONFIGURAÇÃO DE ETIQUETAS DE CRACHÁ --- */}
            {activeTab === 'impressao' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Impressão de Etiquetas</p>
                  <h2 className="text-xl font-bold text-slate-800 font-display mt-1">Configuração de etiquetas e crachás</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Configure o modelo de impressão, fontes, campos exibidos e layout das credenciais do evento.
                  </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6">
                  <LabelConfigTab
                    participants={participants}
                    currentEvent={currentEvent}
                    addToast={addToast}
                    apiCall={apiCall}
                    onUpdateEvent={(updated) => setEvents(prev => prev.map(ev => ev.id === updated.id ? updated : ev))}
                    onPrintBadge={(participant) => setActiveBadgeParticipant(participant)}
                  />
                </div>
              </div>
            )}

            {false && activeTab === 'etiquetas' && (
              <LabelConfigTab
                participants={participants}
                currentEvent={currentEvent}
                addToast={addToast}
                apiCall={apiCall}
                onUpdateEvent={(updated) => setEvents(prev => prev.map(ev => ev.id === updated.id ? updated : ev))}
                onPrintBadge={(participant) => setActiveBadgeParticipant(participant)}
              />
            )}

            {/* --- TAB 11: CONFIGURAÇÃO DOS CAMPOS DE CADASTRO --- */}
            {activeTab === 'campos' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Campos de Cadastro</p>
                  <h2 className="text-xl font-bold text-slate-800 font-display mt-1">Configuração dos campos de cadastro</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Defina os campos exibidos nos cadastros e formulários rápidos dos participantes.
                  </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6">
                  <FieldsConfig 
                    apiCall={apiCall}
                    addToast={addToast}
                    currentUser={currentUser}
                  />
                </div>
              </div>
            )}

            {/* --- TAB 8: GERENCIAMENTO DE USUÁRIOS DO SISTEMA --- */}
            {activeTab === 'usuarios' && (
              <div className="bg-white rounded-xl shadow-xs border border-slate-205 p-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 font-display">Operadores do Sistema</h2>
                    <p className="text-slate-500 text-xs mt-0.5">Gerencie os logins, senhas e níveis de acesso dos operadores e administradores.</p>
                  </div>
                  <button
                    onClick={() => {
                      setUserForm({
                        id: '',
                        name: '',
                        email: '',
                        password: '',
                        role: 'OPERADOR',
                        permissions: PERMISSION_PRESETS.CHECKIN.permissions,
                        eventId: selectedEventId || '',
                        eventRole: 'CHECKIN',
                        eventPermissions: PERMISSION_PRESETS.CHECKIN.permissions,
                        eventActive: true
                      });
                      setIsUserModalOpen(true);
                    }}
                    className="self-start px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/10 hover:shadow-blue-500/25 active:scale-[0.98] transition flex items-center gap-2 cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Novo Operador / Admin</span>
                  </button>
                </div>

                {isLoadingUsers ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <RefreshCw className="animate-spin mb-3 text-blue-500" size={32} />
                    <p className="font-medium text-slate-600">Carregando credenciais...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Completo</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail de Login</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Perfil</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Registro</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-12 text-center text-slate-400">
                              <Info className="mx-auto text-slate-300 mb-2" size={32} />
                              <p className="font-semibold text-slate-500">Nenhum operador listado.</p>
                            </td>
                          </tr>
                        ) : (
                          usersList.map(u => (
                            <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                              <td className="p-4 font-semibold text-slate-800 text-sm">{u.name}</td>
                              <td className="p-4 text-slate-650 text-xs font-mono">{u.email}</td>
                               <td className="p-4 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  String(u.role).toUpperCase() === 'ADMIN' ? 'bg-amber-100 text-amber-800' :
                                  String(u.role).toUpperCase() === 'SUPERVISOR' ? 'bg-purple-100 text-purple-800' :
                                  String(u.role).toUpperCase() === 'CHECKIN_CADASTRO' ? 'bg-emerald-100 text-emerald-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {String(u.role).toUpperCase() === 'ADMIN' ? 'Administrador' :
                                   String(u.role).toUpperCase() === 'SUPERVISOR' ? 'Operador Nível 1' :
                                   String(u.role).toUpperCase() === 'CHECKIN_CADASTRO' ? 'Operador Nível 2' :
                                   String(u.role).toUpperCase() === 'CHECKIN' || String(u.role).toUpperCase() === 'ATENDENTE' || u.role === 'operator' ? 'Operador Nível 3' :
                                   String(u.role)}
                                </span>
                              </td>
                              <td className="p-4 text-center text-slate-400 text-xs">
                                {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      setUserForm({
                                        id: u.id,
                                        name: u.name,
                                        email: u.email,
                                        password: '',
                                        role: u.role,
                                        permissions: normalizePermissions(u.permissions?.length ? u.permissions : legacyPermissionsForRole(u.role)),
                                        eventId: '',
                                        eventRole: 'CHECKIN',
                                        eventPermissions: PERMISSION_PRESETS.CHECKIN.permissions,
                                        eventActive: true
                                      });
                                      setIsUserModalOpen(true);
                                    }}
                                    className="p-1.5 bg-slate-50 hover:bg-slate-150 rounded-lg text-slate-550 border border-slate-200 hover:text-blue-600 transition cursor-pointer"
                                    title="Editar usuário"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u.id)}
                                    disabled={u.id === currentUser?.id}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-600 border border-rose-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                    title="Excluir código de acesso"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </main>

      {showFernandoWelcome && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4 no-print">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-7 text-center animate-fade-in">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#12e000] text-slate-950 flex items-center justify-center mb-4">
              <CheckCircle2 size={24} strokeWidth={3} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Bem-vindo</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950 font-display leading-tight">
              Vamos la, Pastor Fernando!
            </h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Pronto para criarmos o melhor e maior sistema para credenciamento de Brasilia?
            </p>
            <div className="mt-5 rounded-xl border border-slate-200 bg-[#f7f7f2] p-4">
              <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                "Tudo quanto fizerdes, fazei-o de todo o coracao, como para o Senhor e nao para homens."
              </p>
              <p className="mt-2 text-xs font-bold text-slate-500">Colossenses 3:23</p>
            </div>
            <button
              type="button"
              onClick={() => setShowFernandoWelcome(false)}
              className="mt-6 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#12e000] hover:bg-[#0fc800] text-slate-950 text-sm font-bold transition cursor-pointer shadow-sm"
            >
              Vamos nessa!
            </button>
          </div>
        </div>
      )}

      {/* --- PRINT SHADOW LOG: APENAS VISÍVEL DURANTE O PRINT REAL --- */}
      <div className="hidden print:block relative p-8 bg-white text-black min-h-screen overflow-hidden">
        {reportBrandConfig.showWatermark && reportBrandConfig.watermarkUrl && (
          <img
            src={reportBrandConfig.watermarkUrl}
            alt=""
            className="fixed left-1/2 top-1/2 z-0 w-[72vw] max-w-[760px] max-h-[82vh] -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none print:block"
            style={{ opacity: Math.max(reportBrandConfig.watermarkOpacity, 0.18) }}
          />
        )}

        <div className="relative z-10 border-b-2 border-slate-900 pb-4 mb-5 flex items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold font-display uppercase">Relatório Central de Credenciamento</h1>
            <p className="text-xs text-zinc-650">Evento: {currentEvent?.name} • Data de Impressão: {new Date().toLocaleString('pt-BR')}</p>
          </div>
          {reportBrandConfig.showLogo && reportBrandConfig.logoUrl && (
            <img
              src={reportBrandConfig.logoUrl}
              alt="Logo do relatório"
              className="max-h-16 max-w-[180px] object-contain"
            />
          )}
        </div>

        <div className="relative z-10 grid grid-cols-4 gap-3 mb-6">
          <div className="border border-zinc-300 rounded p-3">
            <p className="text-[10px] uppercase font-bold text-zinc-500">Total</p>
            <p className="text-xl font-black">{reportSummary.total}</p>
          </div>
          <div className="border border-zinc-300 rounded p-3">
            <p className="text-[10px] uppercase font-bold text-zinc-500">Credenciados</p>
            <p className="text-xl font-black">{reportSummary.checkedIn}</p>
          </div>
          <div className="border border-zinc-300 rounded p-3">
            <p className="text-[10px] uppercase font-bold text-zinc-500">Pendentes</p>
            <p className="text-xl font-black">{reportSummary.pending}</p>
          </div>
          <div className="border border-zinc-300 rounded p-3">
            <p className="text-[10px] uppercase font-bold text-zinc-500">Presença</p>
            <p className="text-xl font-black">{reportSummary.attendanceRate}%</p>
          </div>
        </div>

        <div className="relative z-10 mb-6">
          <h2 className="text-sm font-black uppercase border-b border-black pb-2 mb-3">Relatório de Certificados</h2>
          <div className="grid grid-cols-5 gap-2 mb-4">
            <div className="border border-zinc-300 rounded p-2">
              <p className="text-[9px] uppercase font-bold text-zinc-500">Certificados</p>
              <p className="text-lg font-black">{reportCertificateSummary.total}</p>
            </div>
            <div className="border border-zinc-300 rounded p-2">
              <p className="text-[9px] uppercase font-bold text-zinc-500">Participantes</p>
              <p className="text-lg font-black">{reportCertificateSummary.participantCount}</p>
            </div>
            <div className="border border-zinc-300 rounded p-2">
              <p className="text-[9px] uppercase font-bold text-zinc-500">Gerais</p>
              <p className="text-lg font-black">{reportCertificateSummary.general}</p>
            </div>
            <div className="border border-zinc-300 rounded p-2">
              <p className="text-[9px] uppercase font-bold text-zinc-500">Atividades</p>
              <p className="text-lg font-black">{reportCertificateSummary.activity}</p>
            </div>
            <div className="border border-zinc-300 rounded p-2">
              <p className="text-[9px] uppercase font-bold text-zinc-500">Horas</p>
              <p className="text-lg font-black">{reportCertificateSummary.totalHours}h</p>
            </div>
          </div>

          <table className="w-full text-left text-[10px] text-slate-950 mb-6">
            <thead>
              <tr className="border-b border-black">
                <th className="py-1">Código</th>
                <th className="py-1">Participante</th>
                <th className="py-1">Tipo</th>
                <th className="py-1">Atividade</th>
                <th className="py-1">Horas</th>
                <th className="py-1">Emissão</th>
                <th className="py-1 text-right">Operador</th>
              </tr>
            </thead>
            <tbody>
              {reportCertificates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-3 text-center text-zinc-500">Nenhum certificado emitido nos filtros atuais.</td>
                </tr>
              ) : (
                reportCertificates.map(certificate => (
                  <tr key={certificate.id} className="border-b border-zinc-200">
                    <td className="py-1 font-mono font-bold">{certificate.certificateCode}</td>
                    <td className="py-1 font-semibold">{certificate.participantName}</td>
                    <td className="py-1">{certificate.type === 'general' ? 'GERAL' : 'ATIVIDADE'}</td>
                    <td className="py-1">{certificate.type === 'activity' ? fixMojibake(certificate.activityTitle || '-') : '-'}</td>
                    <td className="py-1">{certificate.totalHours}h</td>
                    <td className="py-1 font-mono">{new Date(certificate.issuedAt).toLocaleString('pt-BR')}</td>
                    <td className="py-1 text-right">{certificate.operatorName || 'Operador'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="relative z-10 mb-6">
          <h2 className="text-sm font-black uppercase border-b border-black pb-2 mb-3">Relatório de Chapelaria</h2>
          <div className="grid grid-cols-5 gap-2 mb-4">
            <div className="border border-zinc-300 rounded p-2">
              <p className="text-[9px] uppercase font-bold text-zinc-500">Tickets</p>
              <p className="text-lg font-black">{reportCloakroomSummary.totalTickets}</p>
            </div>
            <div className="border border-zinc-300 rounded p-2">
              <p className="text-[9px] uppercase font-bold text-zinc-500">Guardados</p>
              <p className="text-lg font-black">{reportCloakroomSummary.stored}</p>
            </div>
            <div className="border border-zinc-300 rounded p-2">
              <p className="text-[9px] uppercase font-bold text-zinc-500">Retirados</p>
              <p className="text-lg font-black">{reportCloakroomSummary.returned}</p>
            </div>
            <div className="border border-zinc-300 rounded p-2">
              <p className="text-[9px] uppercase font-bold text-zinc-500">Volumes</p>
              <p className="text-lg font-black">{reportCloakroomSummary.totalVolumes}</p>
            </div>
            <div className="border border-zinc-300 rounded p-2">
              <p className="text-[9px] uppercase font-bold text-zinc-500">Em guarda</p>
              <p className="text-lg font-black">{reportCloakroomSummary.storedVolumes}</p>
            </div>
          </div>

          <table className="w-full text-left text-[10px] text-slate-950 mb-6">
            <thead>
              <tr className="border-b border-black">
                <th className="py-1">Ticket</th>
                <th className="py-1">Participante</th>
                <th className="py-1">Volumes</th>
                <th className="py-1">Status</th>
                <th className="py-1">Entrada</th>
                <th className="py-1">Op. entrada</th>
                <th className="py-1">Devolução</th>
                <th className="py-1 text-right">Op. retirada</th>
              </tr>
            </thead>
            <tbody>
              {reportCloakroomItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-3 text-center text-zinc-500">Nenhuma movimentação de chapelaria nos filtros atuais.</td>
                </tr>
              ) : (
                reportCloakroomItems.map(item => (
                  <tr key={item.id} className="border-b border-zinc-200">
                    <td className="py-1 font-mono font-bold">#{item.tagNumber}</td>
                    <td className="py-1 font-semibold">{item.participantName}</td>
                    <td className="py-1">{item.volumeCount || 1}</td>
                    <td className="py-1">{item.status === 'retirado' ? 'RETIRADO' : 'GUARDADO'}</td>
                    <td className="py-1 font-mono">{new Date(item.registeredAt).toLocaleString('pt-BR')}</td>
                    <td className="py-1">{item.registeredByName || '-'}</td>
                    <td className="py-1 font-mono">{item.returnedAt ? new Date(item.returnedAt).toLocaleString('pt-BR') : '-'}</td>
                    <td className="py-1 text-right">{item.returnedByName || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <table className="relative z-10 w-full text-left text-xs text-slate-950">
          <thead>
            <tr className="border-b border-black">
              <th className="py-2">Nome</th>
              <th className="py-2">CPF</th>
              <th className="py-2">Categoria</th>
              <th className="py-2">Status</th>
              <th className="py-2">Horário do check-in</th>
              <th className="py-2">Acessos por sala</th>
              <th className="py-2">Certificados</th>
              <th className="py-2 text-right">Operador</th>
            </tr>
          </thead>
          <tbody>
            {reportParticipants.map(p => {
              const areaAccess = reportParticipantAreaAccess.find(item => item.participantId === p.id);
              const participantCertificates = reportCertificates.filter(certificate => certificate.participantId === p.id);
              return (
                <tr key={p.id} className="border-b border-zinc-200">
                  <td className="py-2 font-semibold">{p.name}</td>
                  <td className="py-2 font-mono">{p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</td>
                  <td className="py-2">{p.category}</td>
                  <td className="py-2">{p.checkedIn ? 'CREDENCIADO' : 'PENDENTE'}</td>
                  <td className="py-2 font-mono">{p.checkedInAt ? new Date(p.checkedInAt).toLocaleString('pt-BR') : '-'}</td>
                  <td className="py-2">
                    {areaAccess && areaAccess.total > 0
                      ? `${areaAccess.allowedAreaNames.length > 0 ? areaAccess.allowedAreaNames.join(', ') : 'Sem liberação'}${areaAccess.deniedCount > 0 ? ` (${areaAccess.deniedCount} negado(s))` : ''}`
                      : '-'}
                  </td>
                  <td className="py-2 font-mono">
                    {participantCertificates.length > 0 ? participantCertificates.map(certificate => certificate.certificateCode).join(', ') : '-'}
                  </td>
                  <td className="py-2 text-right">{getReportCheckinOperator(p)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>


      {/* --- DIALOG MODALS --- */}
      
      {/* 1. MODELO EVENT MODAL (CRUD EV) */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 font-display mb-4">
              {eventForm.id ? 'Editar Informações do Evento' : 'Cadastrar Novo Evento'}
            </h3>
            
            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Título do Evento</label>
                <input
                  type="text"
                  required
                  value={eventForm.name}
                  onChange={e => setEventForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Summit Tecnologia Nordeste 2026"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-8 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Data de Realização</label>
                <input
                  type="date"
                  required
                  value={eventForm.date}
                  onChange={e => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Local / Endereço</label>
                <input
                  type="text"
                  required
                  value={eventForm.location}
                  onChange={e => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Ex: Av. Beira Mar, 102 - Fortaleza"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Capacidade de Pessoas</label>
                <input
                  type="number"
                  min="5"
                  required
                  value={eventForm.capacity}
                  onChange={e => setEventForm(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase">Módulos do evento</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventForm.enableAccessControl}
                      onChange={e => setEventForm(prev => ({ ...prev, enableAccessControl: e.target.checked }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Salas e acessos
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventForm.enableCloakroom}
                      onChange={e => setEventForm(prev => ({ ...prev, enableCloakroom: e.target.checked }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Chapelaria
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventForm.enableScanner}
                      onChange={e => setEventForm(prev => ({ ...prev, enableScanner: e.target.checked }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Scanner QR
                  </label>
                </div>
              </div>
<div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  Salvar Evento
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* 2. PARTICIPANT MODAL */}
      {isParticipantModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 font-display mb-4">
              {participantForm.id ? 'Editar Participante' : 'Adicionar Participante Manual'}
            </h3>
            
            <form onSubmit={handleSaveParticipant} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={participantForm.name}
                  onChange={e => setParticipantForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Mariana Albuquerque de Barros"
                  className="w-full px-3 py-3.2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-88 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={participantForm.email}
                  onChange={e => setParticipantForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="mariana@exemplo.com"
                  className="w-full px-3 py-3.2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">CPF (Opcional - apenas números)</label>
                <input
                  type="text"
                  maxLength={11}
                  value={participantForm.cpf}
                  onChange={e => setParticipantForm(prev => ({ ...prev, cpf: e.target.value.replace(/\D/g, '') }))}
                  placeholder="Ex: 34567890123"
                  className="w-full px-3 py-3.2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Empresa (Opcional)</label>
                <input
                  type="text"
                  value={participantForm.company || ''}
                  onChange={e => setParticipantForm(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Ex: Nome da Empresa ou Órgão"
                  className="w-full px-3 py-3.2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Categoria de Acesso</label>
                <select
                  value={participantForm.category}
                  onChange={e => setParticipantForm(prev => ({ ...prev, category: e.target.value as ParticipantCategory }))}
                  className="w-full px-3 py-3.2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm lg:mb-4 mb-2"
                >
                  <option value="Participante">Participante Geral</option>
                  <option value="VIP">Convidado VIP</option>
                  <option value="Palestrante">Palestrante</option>
                  <option value="Expositor">Expositor Credenciado</option>
                  <option value="Staff">Membro de Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Áreas Autorizadas (Controle de Acesso)</label>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {availableAreas.length === 0 ? (
                    <div className="col-span-3 text-xs text-slate-400 py-1.5 text-center">
                      Nenhuma área configurada para este evento.
                    </div>
                  ) : (
                    availableAreas.map(arr => {
                      const isActive = arr.active !== false && arr.isActive !== false && arr.is_active !== false;
                      const selectedAreas = participantForm.allowedAreaIds || participantForm.allowedAreas || [];
                      const checked = selectedAreas.includes(arr.id);
                      return (
                        <label key={arr.id} className={`flex items-center gap-2 cursor-pointer p-1 rounded-sm hover:bg-slate-100 transition text-xs font-medium text-slate-700 ${!isActive ? 'opacity-50' : ''}`} title={!isActive ? 'Área Inativa' : ''}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const current = participantForm.allowedAreaIds || participantForm.allowedAreas || [];
                              const updated = checked
                                ? current.filter(aid => aid !== arr.id)
                                : [...current, arr.id];
                              setParticipantForm(prev => ({ ...prev, allowedAreaIds: updated, allowedAreas: updated }));
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                          <span>{arr.name} {!isActive && '(Inativa)'}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {participantForm.id ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleDeleteParticipant(participantForm.id);
                      setIsParticipantModalOpen(false);
                    }}
                    className="px-3.5 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    title="Remover participante permanentemente"
                  >
                    <Trash2 size={13} />
                    <span>Excluir</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsParticipantModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
                  >
                    Prestar Cadastro
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* 3. CLOAKROOM ITEM MODAL */}
      {isCloakroomModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 font-display mb-4">
              Registrar Entrada na Chapelaria
            </h3>
            
            <form onSubmit={handleSaveCloakroomItem} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nome do Proprietário / Detentor</label>
                <input
                  type="text"
                  required
                  value={cloakroomForm.participantName}
                  onChange={e => setCloakroomForm(prev => ({ ...prev, participantName: e.target.value }))}
                  placeholder="Ex: Roberta Mendes ou Número do CPF"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-88 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Especificações do Pertence</label>
                <textarea
                  required
                  value={cloakroomForm.itemDescription}
                  onChange={e => setCloakroomForm(prev => ({ ...prev, itemDescription: e.target.value }))}
                  placeholder="Ex: Notebook Asus Preto + Sacola Grande da Loja"
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCloakroomModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium transition cursor-pointer"
                >
                  Retroceder
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  Gerar Etiqueta Sequencial
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* 4. IMPRESSÃO DE CRACHÁ / CREDENCIAL MODAL OVERLAY */}
      {pendingCloakroomReturn && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 p-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle size={28} />
            </div>
            <h3 className="mt-4 text-xl font-black text-slate-950">Confirmar devolução</h3>
            <p className="mt-2 text-sm text-slate-600">
              Deseja confirmar a devolução do item etiqueta
              <b className="font-mono text-slate-950"> #{pendingCloakroomReturn.tagNumber}</b>?
            </p>
            {pendingCloakroomReturn.participantName && (
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3 text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Participante</p>
                <p className="text-sm font-black text-slate-900 mt-1">{pendingCloakroomReturn.participantName}</p>
                {pendingCloakroomReturn.itemDescription && (
                  <p className="text-xs text-slate-500 mt-1">{pendingCloakroomReturn.itemDescription}</p>
                )}
              </div>
            )}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingCloakroomReturn(null)}
                className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-black transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleWithdrawCloakroomItem(pendingCloakroomReturn.id, pendingCloakroomReturn.tagNumber, true)}
                className="px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-black transition cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {activeBadgeParticipant && currentEvent && (
        <PrintCredential
          participant={activeBadgeParticipant}
          event={currentEvent}
          onClose={() => setActiveBadgeParticipant(null)}
          autoPrint={true}
        />
      )}

      {/* 6. INDIVIDUAL PARTICIPANT QR CODE DIALOG MODAL */}
      {selectedQrParticipant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 relative overflow-hidden border border-slate-100">
            <button
              onClick={() => setSelectedQrParticipant(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X size={16} />
            </button>
            
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                <QrCode size={24} />
              </div>

              <div>
                <span className="text-[9px] bg-slate-900 text-white font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                  {selectedQrParticipant.category}
                </span>
                <h3 className="text-sm font-extrabold text-slate-800 font-display mt-2 truncate">
                  {selectedQrParticipant.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium truncate font-sans">{selectedQrParticipant.email}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-center">
                <UserQRCode value={selectedQrParticipant.id} size={150} />
              </div>

              <div className="space-y-1 text-left bg-slate-50 p-3 rounded-lg text-[11px] text-slate-600">
                <p>• <b>CPF:</b> <span className="font-mono">{selectedQrParticipant.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</span></p>
                <p>• <b>Ticket:</b> <span className="font-mono">{selectedQrParticipant.ticketCode}</span></p>
                <p>• <b>ID:</b> <span className="font-mono">{selectedQrParticipant.id}</span></p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => {
                    setActiveBadgeParticipant(selectedQrParticipant);
                    setSelectedQrParticipant(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Imprimir Crachá</span>
                </button>
                <button
                  onClick={() => setSelectedQrParticipant(null)}
                  className="px-4 py-2 bg-slate-105 hover:bg-slate-200 text-slate-750 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MEU PERFIL E ALTERAÇÃO DE SENHA MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800 font-display mb-2 flex items-center gap-2">
              <Settings className="text-blue-500 animate-spin-slow" size={20} />
              <span>Meu Perfil e Credenciais</span>
            </h3>
            <p className="text-slate-500 text-xs mb-4">Atualize suas credenciais e altere sua senha de acesso ao sistema.</p>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {currentUser && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
                    Seu QR Code de Operador
                  </span>
                  <UserQRCode value={currentUser.id} size={110} />
                  <span className="text-[9px] font-mono text-slate-500 select-all">
                    Ref: {currentUser.id}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Seu nome"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">E-mail de Login</label>
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={e => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Seu e-mail"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nova Senha (Deixe em branco para manter)</label>
                <input
                  type="password"
                  value={profileForm.password}
                  onChange={e => setProfileForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  Atualizar Dados
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. GERENCIAMENTO DE OPERADORES/ADMINISTRADORES MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl p-6 max-h-[92vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800 font-display mb-1">
              {userForm.id ? 'Editar Dados do Operador' : 'Adicionar Novo Operador'}
            </h3>
            <p className="text-slate-500 text-xs mb-4">
              {userForm.id ? 'Modifique os dados ou redefina a senha do operador.' : 'Cadastre um novo login e senha segura de acesso.'}
            </p>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={e => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do operador"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">E-mail de Acesso</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  {userForm.id ? 'Nova Senha (deixe em branco para manter)' : 'Senha de Login'}
                </label>
                <input
                  type="password"
                  required={!userForm.id}
                  value={userForm.password}
                  onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Perfil Base</label>
                <select
                  value={userForm.role}
                  onChange={e => setUserForm(prev => ({ ...prev, role: e.target.value as UserRole }))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
                >
                  <option value="ADMIN">Administrador</option>
                  <option value="OPERADOR">Operador</option>
                  <option value="VISUALIZADOR">Visualizador</option>
                </select>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_auto_auto] gap-3 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Aplicar Perfil</label>
                    <select
                      defaultValue=""
                      onChange={e => {
                        applyUserPermissionPreset(e.target.value);
                        e.target.value = '';
                      }}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">Selecionar perfil</option>
                      {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
                        <option key={key} value={key}>{preset.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pesquisar permissão</label>
                    <input
                      type="search"
                      value={permissionSearch}
                      onChange={e => setPermissionSearch(e.target.value)}
                      placeholder="Buscar por módulo ou permissão"
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setUserForm(prev => ({ ...prev, permissions: ALL_PERMISSION_IDS }))}
                    className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Marcar todas
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserForm(prev => ({ ...prev, permissions: [] }))}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Desmarcar todas
                  </button>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-blue-600" />
                    Permissões do Sistema
                  </h4>
                  {renderPermissionAccordion({
                    selected: userForm.permissions,
                    search: permissionSearch,
                    openGroups: openPermissionGroups,
                    onToggleOpen: groupId => setOpenPermissionGroups(prev => ({ ...prev, [groupId]: !prev[groupId] })),
                    onTogglePermission: toggleUserPermission,
                    onToggleGroup: toggleUserPermissionGroup
                  })}
                </div>
              </div>

              
              {!userForm.id && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Vincular ao Evento</label>
                    <select
                      value={userForm.eventId}
                      onChange={e => setUserForm(prev => ({ ...prev, eventId: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">Criar sem vínculo agora</option>
                      {events.map(event => (
                        <option key={event.id} value={event.id}>{event.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Permissão no Evento</label>
                    <select
                      value={userForm.eventRole}
                      onChange={e => setUserForm(prev => ({ ...prev, eventRole: e.target.value as EventUserRole }))}
                      disabled={!userForm.eventId}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {(Object.keys(eventUserRoleLabels) as EventUserRole[]).map(role => (
                        <option key={role} value={role}>{eventUserRoleLabels[role]}</option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={userForm.eventActive}
                      onChange={e => setUserForm(prev => ({ ...prev, eventActive: e.target.checked }))}
                      disabled={!userForm.eventId}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                    Vínculo ativo neste evento
                  </label>

                  {userForm.eventId && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-end">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pesquisar permissão do evento</label>
                          <input
                            type="search"
                            value={eventPermissionSearch}
                            onChange={e => setEventPermissionSearch(e.target.value)}
                            placeholder="Buscar permissão neste evento"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setUserForm(prev => ({ ...prev, eventPermissions: ALL_PERMISSION_IDS }))}
                          className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
                        >
                          Marcar todas
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserForm(prev => ({ ...prev, eventPermissions: [] }))}
                          className="px-3 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                        >
                          Desmarcar todas
                        </button>
                      </div>

                      {renderPermissionAccordion({
                        selected: userForm.eventPermissions,
                        search: eventPermissionSearch,
                        openGroups: openEventPermissionGroups,
                        onToggleOpen: groupId => setOpenEventPermissionGroups(prev => ({ ...prev, [groupId]: !prev[groupId] })),
                        onTogglePermission: toggleEventPermission,
                        onToggleGroup: toggleEventPermissionGroup
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">


                <button


                  type="button"


                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  Salvar Operador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. IMPORT WIZARD MODAL */}
      {isImportPreviewModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in animate-duration-200">
          <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 font-display flex items-center gap-2">
                  <FileText className="text-emerald-600" size={22} />
                  <span>Assistente de Importacao de Participantes</span>
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Arquivo carregado: <strong className="text-slate-700">{importFileName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportPreviewModalOpen(false);
                  resetImportWizard();
                }}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-3 bg-white border-b border-slate-100">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { step: 1, label: 'Arquivo' },
                  { step: 2, label: 'Mapear' },
                  { step: 3, label: 'Ordenar' },
                  { step: 4, label: 'Validar' },
                  { step: 5, label: 'Importar' }
                ].map(item => (
                  <div
                    key={item.step}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border ${
                      importStep >= item.step
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <span className="font-mono mr-1">{item.step}</span>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
              {importStep === 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Mapear colunas</h4>
                        <p className="text-xs text-slate-500">{importRawRows.length} linhas encontradas. A ordem da planilha nao importa.</p>
                      </div>
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-white rounded-lg text-xs font-semibold cursor-pointer transition">
                        <Upload size={14} />
                        <span>Trocar arquivo</span>
                        <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} className="hidden" />
                      </label>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[52vh] overflow-y-auto">
                      {importHeaders.map(header => (
                        <div key={header} className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-3 p-3 items-center">
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{header}</div>
                            <div className="text-xs text-slate-400 truncate">
                              Exemplo: {String(importRawRows[0]?.[header] ?? '-')}
                            </div>
                          </div>
                          <select
                            value={importColumnMapping[header] || 'ignore'}
                            onChange={(e) => setImportColumnMapping(prev => ({
                              ...prev,
                              [header]: e.target.value as ImportTargetField
                            }))}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                          >
                            {IMPORT_TARGET_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                      <h4 className="font-bold text-slate-800 text-sm mb-3">Modelos de importacao</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {importTemplates.filter(tpl => tpl.global || tpl.eventId === selectedEventId).length === 0 ? (
                          <p className="text-xs text-slate-400">Nenhum modelo salvo para usar neste evento.</p>
                        ) : (
                          importTemplates.filter(tpl => tpl.global || tpl.eventId === selectedEventId).map(tpl => (
                            <div key={tpl.id} className="p-2 border border-slate-100 rounded-lg bg-slate-50">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-700 truncate">{tpl.name}</div>
                                  <div className="text-[11px] text-slate-400">{tpl.global ? 'Global' : 'Evento atual'}</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => applyImportTemplate(tpl)}
                                  className="px-2 py-1 text-[11px] font-bold rounded-md bg-emerald-600 text-white hover:bg-emerald-500"
                                >
                                  Usar
                                </button>
                              </div>
                              <div className="flex gap-1 mt-2">
                                <button type="button" onClick={() => applyImportTemplate(tpl, true)} className="px-2 py-1 text-[11px] rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">Editar</button>
                                <button type="button" onClick={() => duplicateImportTemplate(tpl)} className="px-2 py-1 text-[11px] rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">Duplicar</button>
                                <button type="button" onClick={() => deleteImportTemplate(tpl.id)} className="px-2 py-1 text-[11px] rounded-md bg-white border border-rose-100 text-rose-600 hover:bg-rose-50">Excluir</button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                      <h4 className="font-bold text-slate-800 text-sm mb-3">{editingImportTemplateId ? 'Editar modelo' : 'Salvar modelo'}</h4>
                      <input
                        type="text"
                        value={importTemplateName}
                        onChange={(e) => setImportTemplateName(e.target.value)}
                        placeholder="Nome do modelo"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      />
                      <label className="flex items-center gap-2 text-xs text-slate-600 mb-3">
                        <input
                          type="checkbox"
                          checked={importTemplateGlobal}
                          onChange={(e) => setImportTemplateGlobal(e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        Disponivel para todos os eventos
                      </label>
                      <button
                        type="button"
                        onClick={saveImportTemplate}
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 text-sm font-bold"
                      >
                        {editingImportTemplateId ? 'Salvar alteracoes' : 'Salvar modelo'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {importStep === 3 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <h4 className="font-bold text-slate-800 text-sm">Ordenar campos do preview</h4>
                    <p className="text-xs text-slate-500">Essa ordem vale apenas para esta importacao.</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {importFieldOrder.filter(field => field !== 'ignore' && importHeaders.some(header => importColumnMapping[header] === field)).map((field, index, visibleFields) => (
                      <div key={field} className="flex items-center justify-between gap-3 p-3">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 text-xs font-mono flex items-center justify-center">{index + 1}</span>
                          <div>
                            <div className="text-sm font-bold text-slate-800">{IMPORT_TARGET_OPTIONS.find(opt => opt.value === field)?.label || field}</div>
                            <div className="text-xs text-slate-400">
                              Colunas: {importHeaders.filter(header => importColumnMapping[header] === field).join(', ')}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button type="button" disabled={index === 0} onClick={() => moveImportField(field, -1)} className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40">↑</button>
                          <button type="button" disabled={index === visibleFields.length - 1} onClick={() => moveImportField(field, 1)} className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40">↓</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importStep === 4 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-xs">
                      <span className="text-xs text-slate-400 font-medium block">Total de Linhas</span>
                      <span className="text-xl font-bold text-slate-800">{importRows.length}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-xs text-emerald-600/70 font-medium block">Validas</span>
                        <span className="text-xl font-bold text-emerald-600">{importRows.filter(r => r.isValid).length}</span>
                      </div>
                      <CheckCircle2 className="text-emerald-500" size={24} />
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-rose-100 shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-xs text-rose-600/70 font-medium block">Com Erros</span>
                        <span className="text-xl font-bold text-rose-600">{importRows.filter(r => !r.isValid).length}</span>
                      </div>
                      <XCircle className="text-rose-500" size={24} />
                    </div>
                    <div className="flex items-center">
                      {importRows.some(r => !r.isValid) ? (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-xl text-xs flex gap-2 w-full">
                          <AlertTriangle className="text-amber-500 shrink-0" size={16} />
                          <span>Corrija os erros antes de importar.</span>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs flex gap-2 w-full">
                          <Sparkles className="text-emerald-500 shrink-0" size={16} />
                          <span>Linhas prontas para importacao.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="max-h-[45vh] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                          <tr>
                            <th className="py-3 px-4 w-12 text-center">#</th>
                            {importFieldOrder.filter(field => field !== 'ignore' && importHeaders.some(header => importColumnMapping[header] === field)).map(field => (
                              <th key={field} className="py-3 px-4">{IMPORT_TARGET_OPTIONS.find(opt => opt.value === field)?.label || field}</th>
                            ))}
                            <th className="py-3 px-4">Status & Diagnostico</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {importRows.map((row) => {
                            const rowBgClass = row.isValid
                              ? 'bg-emerald-50/20 hover:bg-emerald-50/45 text-slate-800 transition'
                              : 'bg-rose-50/20 hover:bg-rose-50/45 text-slate-800 transition';
                            const previewValues: Record<ImportTargetField, React.ReactNode> = {
                              name: row.nome || <span className="text-rose-400 italic font-normal">Ausente</span>,
                              cpf: row.cpf || <span className="text-slate-400 italic">Vazio</span>,
                              email: row.email || <span className="text-slate-400 italic">Vazio</span>,
                              company: row.company || <span className="text-slate-400 italic">Vazio</span>,
                              category: row.category || <span className="text-slate-400 italic">Vazio</span>,
                              ticketCode: row.ticketCode || <span className="text-slate-400 italic">Gerar novo</span>,
                              areas: row.resolvedAreaNames?.length ? row.resolvedAreaNames.join(', ') : (row.areasText || <span className="text-slate-400 italic">Padrao</span>),
                              profile: row.profile || <span className="text-slate-400 italic">Nenhum</span>,
                              ignore: ''
                            };

                            return (
                              <tr key={row.rowNumber} className={rowBgClass}>
                                <td className="py-3 px-4 text-center font-mono text-xs text-slate-400">{row.rowNumber}</td>
                                {importFieldOrder.filter(field => field !== 'ignore' && importHeaders.some(header => importColumnMapping[header] === field)).map(field => (
                                  <td key={field} className="py-3 px-4 text-xs text-slate-700">{previewValues[field]}</td>
                                ))}
                                <td className="py-3 px-4">
                                  {row.isValid ? (
                                    <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                                      <Check className="text-emerald-500" size={14} />
                                      <span>Valido</span>
                                    </div>
                                  ) : (
                                    <div className="space-y-0.5 text-xs">
                                      {row.errors.map((err: string, i: number) => (
                                        <div key={i} className="flex items-center gap-1.5 text-rose-600 font-semibold">
                                          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0"></span>
                                          <span>{err}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsImportPreviewModalOpen(false);
                  resetImportWizard();
                }}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2">
                {importStep > 2 && importStep < 5 && (
                  <button
                    type="button"
                    onClick={() => setImportStep(prev => (prev === 4 ? 3 : 2))}
                    className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold transition cursor-pointer"
                  >
                    Voltar
                  </button>
                )}

                {importStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (importStep === 2) {
                        if (!Object.values(importColumnMapping).includes('name')) {
                          addToast('Mapeie uma coluna como Nome antes de continuar.', 'error');
                          return;
                        }
                        setImportStep(3);
                        return;
                      }
                      buildImportPreviewRows();
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-sm bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                  >
                    <span>Continuar</span>
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={importRows.some(row => !row.isValid) || importRows.length === 0 || isImportingInProgress}
                    onClick={() => {
                      setImportStep(5);
                      confirmBatchImport();
                    }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-sm ${
                      importRows.some(row => !row.isValid) || importRows.length === 0 || isImportingInProgress
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-550/10 cursor-pointer'
                    }`}
                  >
                    {isImportingInProgress ? (
                      <>
                        <RefreshCw className="animate-spin" size={16} />
                        <span>Processando Importacao...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Confirmar Importacao de {importRows.length} Linhas</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
