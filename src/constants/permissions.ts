import {
  Award,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FolderLock,
  Printer,
  Settings,
  ShieldCheck,
  UserCheck,
  Users
} from 'lucide-react';
import type { EventUserRole, PermissionGroupDefinition, UserRole } from '../types';

export type QuickOperatorProfileId =
  | 'checkinBasic'
  | 'checkinRegistration'
  | 'accessControl'
  | 'activityAttendance'
  | 'printing'
  | 'custom';

export interface QuickOperatorProfileDefinition {
  id: QuickOperatorProfileId;
  title: string;
  description: string;
  permissions: string[];
}

export const PERMISSION_GROUPS: PermissionGroupDefinition[] = [
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
    id: 'activityAttendance',
    title: 'Presença em Atividade',
    icon: ClipboardCheck,
    permissions: [
      { id: 'activityAttendance.view', label: 'Acessar Presença em Atividade' },
      { id: 'activityAttendance.register', label: 'Registrar presença em atividade' },
      { id: 'activityAttendance.manage', label: 'Gerenciar presenças em atividade' }
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
    title: 'Relatórios',
    icon: Download,
    permissions: [
      { id: 'reports.view', label: 'Visualizar relatórios' },
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

export const ALL_PERMISSION_IDS = PERMISSION_GROUPS.flatMap(group => group.permissions.map(permission => permission.id));

export const normalizePermissions = (permissions?: string[]) =>
  [...new Set((permissions || []).filter(permission => ALL_PERMISSION_IDS.includes(permission)))];

export const QUICK_OPERATOR_PROFILES: QuickOperatorProfileDefinition[] = [
  {
    id: 'checkinBasic',
    title: 'Check-in básico',
    description: 'Consultar participantes e realizar Check-in.',
    permissions: ['events.view', 'participants.view', 'checkin.access', 'checkin.perform', 'checkin.reprint']
  },
  {
    id: 'checkinRegistration',
    title: 'Check-in com cadastro',
    description: 'Realizar Check-in e cadastrar ou corrigir participantes durante o atendimento.',
    permissions: ['events.view', 'participants.view', 'participants.create', 'participants.edit', 'checkin.access', 'checkin.perform', 'checkin.reprint', 'checkin.createParticipant']
  },
  {
    id: 'accessControl',
    title: 'Controle de acesso',
    description: 'Ler QR Code e registrar acesso nas áreas autorizadas.',
    permissions: ['events.view', 'participants.view', 'access.scanQr', 'access.rooms', 'access.restaurants', 'access.shows']
  },
  {
    id: 'activityAttendance',
    title: 'Presença em Atividade',
    description: 'Consultar atividades e registrar a presença dos participantes.',
    permissions: ['events.view', 'participants.view', 'activityAttendance.view', 'activityAttendance.register']
  },
  {
    id: 'printing',
    title: 'Impressão',
    description: 'Imprimir e reimprimir etiquetas ou credenciais.',
    permissions: ['events.view', 'participants.view', 'print.labels', 'print.badges', 'checkin.reprint']
  },
  {
    id: 'custom',
    title: 'Personalizado',
    description: 'Escolher manualmente todas as permissões.',
    permissions: []
  }
];

export const getQuickOperatorPermissions = (profileIds: string[]) =>
  normalizePermissions(
    QUICK_OPERATOR_PROFILES
      .filter(profile => profile.id !== 'custom' && profileIds.includes(profile.id))
      .flatMap(profile => profile.permissions)
  );

export const legacyPermissionsForRole = (role?: string): string[] => {
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

export const PERMISSION_PRESETS: Record<string, { label: string; role: UserRole; eventRole: EventUserRole; permissions: string[] }> = {
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
    label: 'Relatórios',
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
    permissions: normalizePermissions(ALL_PERMISSION_IDS.filter(permission => ![
      'events.delete',
      'operators.delete',
      'settings.backup',
      'settings.integrations',
      'activityAttendance.view',
      'activityAttendance.register',
      'activityAttendance.manage'
    ].includes(permission)))
  }
};

export const formatUserRoleLabel = (role?: string) => {
  const normalized = String(role || '').toUpperCase();
  if (normalized === 'ADMIN' || role === 'admin') return 'Administrador';
  if (normalized === 'VISUALIZADOR' || normalized === 'RELATORIO') return 'Visualizador';
  return 'Operador';
};
