import type React from 'react';

// Definition of types for the Accreditation & Check-in System

export type UserRole = 'ADMIN' | 'OPERADOR' | 'VISUALIZADOR' | 'CHECKIN' | 'CHECKIN_CADASTRO' | 'admin' | 'operator' | 'SUPERVISOR' | 'ATENDENTE';
export type EventUserRole = 'ADMIN' | 'CHECKIN_CADASTRO' | 'CHECKIN' | 'RELATORIO';

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  pin?: string;
  permissions?: string[];
  organizationId: string;
}

export interface EventUser {
  id: string;
  eventId: string;
  userId: string;
  role: EventUserRole;
  active: boolean;
  permissions?: string[];
}

export interface CheckinScreenConfig {
  showLogo: boolean;
  logoUrl: string;
  showEventName: boolean;
  backgroundColor: string;
  backgroundImageUrl: string;
  darkOverlay: boolean;
  primaryColor: string;
  successColor: string;
  errorColor: string;
  searchPlaceholder: string;
  resetDelaySeconds: number;
}

export interface CloakroomLabelConfig {
  showEventName: boolean;
  showLabelType: boolean;
  showTicketNumber: boolean;
  showParticipantName: boolean;
  showDescription: boolean;
  showVolumeCount: boolean;
  showDateTime: boolean;
  showOperator: boolean;
  lineOrder?: Array<'participantName' | 'description' | 'ticketNumber' | 'volumeCount' | 'eventName' | 'labelType' | 'dateTime' | 'operator'>;
  fontSizes?: Partial<Record<'participantName' | 'description' | 'ticketNumber' | 'volumeCount' | 'eventName' | 'labelType' | 'dateTime' | 'operator', number>>;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  date: string;
  location: string;
  capacity: number;
  createdAt: string;
  credentialType?: 'label' | 'badge';
  credentialSize?: '9x4' | '8x4' | '8x5' | 'A6' | 'A7';
  showQRCode?: boolean;
  enableAccessControl?: boolean;
  enableCloakroom?: boolean;
  enableScanner?: boolean;
  layoutConfig?: any;
  checkinScreenConfig?: CheckinScreenConfig;
  cloakroomLabelConfig?: CloakroomLabelConfig;
  organizationId: string;
  eventMode?: EventMode;
  currentUserRole?: EventUserRole | UserRole;
  currentUserPermissions?: string[];
}

export type EventMode = 'PREPARACAO' | 'TESTE' | 'OFICIAL' | 'ENCERRADO';
export type RecordOrigin = 'TESTE' | 'OFICIAL';
export type TestRecordStatus = 'ATIVO' | 'CANCELADO_TESTE';

export type ParticipantCategory = 'VIP' | 'Palestrante' | 'Expositor' | 'Participante' | 'Staff';

export type OnlineRegistrationConfigStatus = 'ABERTA' | 'PAUSADA' | 'ENCERRADA';
export type OnlineRegistrationApprovalMode = 'AUTOMATICA' | 'MANUAL';
export type OnlineRegistrationStatus = 'PENDENTE' | 'APROVADA' | 'REPROVADA' | 'CANCELADA';
export type OnlineRegistrationFieldType = 'text' | 'email' | 'tel' | 'number' | 'select' | 'checkbox';

export interface OnlineRegistrationField {
  id: string;
  key: string;
  label: string;
  type: OnlineRegistrationFieldType;
  required: boolean;
  visible: boolean;
  options?: string[];
  system?: boolean;
  order?: number;
}

export interface OnlineRegistrationConfig {
  id: string;
  eventId: string;
  enabled: boolean;
  slug: string;
  publicTitle: string;
  publicDescription: string;
  publicDate: string;
  publicLocation: string;
  bannerUrl?: string;
  maxRegistrations?: number;
  status: OnlineRegistrationConfigStatus;
  approvalMode: OnlineRegistrationApprovalMode;
  fields?: OnlineRegistrationField[];
  createdAt: string;
  updatedAt: string;
}

export interface OnlineRegistration {
  id: string;
  eventId: string;
  participantId?: string;
  name: string;
  email?: string;
  phone: string;
  company?: string;
  position?: string;
  cpf?: string;
  category?: ParticipantCategory;
  customFields?: Record<string, any>;
  status: OnlineRegistrationStatus;
  qrToken?: string;
  lgpdAccepted: boolean;
  registeredAt: string;
  approvedAt?: string;
  approvedBy?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: string;
  eventId: string;
  name: string;
  badgeName?: string;
  email: string;
  cpf: string;
  category: ParticipantCategory;
  checkedIn: boolean;
  checkedInAt?: string; // ISO String
  checkedInByUserId?: string;
  checkedInByName?: string;
  checkinOrigin?: RecordOrigin;
  checkinIsTest?: boolean;
  checkinTestStatus?: TestRecordStatus;
  ticketCode: string; // Used for QR code
  company?: string; // Company / Organization
  createdAt: string;
  printed?: boolean;
  allowedAreas?: string[];
  allowedAreaIds?: string[];
}

export type CloakroomStatus = 'guardado' | 'retirado';

export interface CloakroomItem {
  id: string;
  eventId: string;
  participantId?: string; // Optional if registered with no linked participant
  participantName: string;
  itemDescription: string;
  storageRackId?: string;
  storageRackName?: string;
  storageColumn?: string;
  storageRow?: string;
  storageAddress?: string;
  storageOccupiedAt?: string;
  storageReleasedAt?: string;
  storageOperatorId?: string;
  tagNumber: number; // Automatic sequential tag number
  volumeCount?: number;
  volumeTags?: string[];
  registeredByUserId?: string;
  registeredByName?: string;
  returnedByUserId?: string;
  returnedByName?: string;
  status: CloakroomStatus;
  registeredAt: string;
  returnedAt?: string;
}

export interface DashboardStats {
  totalRegistered: number;
  totalCheckedIn: number;
  totalWaiting: number;
  capacity: number;
  recentCheckins: Array<{
    id: string;
    participantName: string;
    category: ParticipantCategory;
    checkedInAt: string;
  }>;
  hourlyCheckins: Array<{
    hour: string;
    count: number;
  }>;
}

export interface LabelConfig {
  width: number;        // in mm (e.g. 80)
  height: number;       // in mm (e.g. 50)
  padding: number;      // in mm (e.g. 4)
  alignment: 'center' | 'left' | 'right';
  fontSizeName: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fontSizeMeta: 'xs' | 'sm' | 'md';
  showEvent: boolean;
  showName: boolean;
  showEmail: boolean;
  showCpf: boolean;
  showCategory: boolean;
  showTicketCode: boolean;
  showQrCode: boolean;
  qrSize: number;       // in mm or px (e.g. 35)
  qrPosition: 'left' | 'center' | 'right' | 'top' | 'bottom' | 'side-by-side';
  textSpacing?: number; // spacing between printed text fields in px
  iconStyle: 'none' | 'shield' | 'circle' | 'minimal';
  contrastMode: 'monochrome' | 'colored';
  customHeader: string; // optional custom header text
  showCompany?: boolean;
  fields?: BadgeFieldItem[];
}

export interface BadgeFieldItem {
  id: string; // 'header' | 'event' | 'category' | 'name' | 'company' | 'cpf' | 'email' | 'ticketCode'
  label: string;
  visible: boolean;
  bold: boolean;
  fontSize?: number;
}

export interface CheckIn {
  id: string;
  userId: string; // references Participant.id
  eventId: string; // references Event.id
  checkInAt: string; // ISO String
  isTest?: boolean;
  origin?: RecordOrigin;
  testStatus?: TestRecordStatus;
}

export interface CheckInLog {
  id: string;
  participantId: string;
  action: 'CHECKIN' | 'CREATE' | 'REPRINT';
  performedBy: string; // userId or Operator name/PIN
  timestamp: string;
  eventId?: string;
  organizationId?: string;
  isTest?: boolean;
  origin?: RecordOrigin;
  testStatus?: TestRecordStatus;
}

export type ActionLogAction =
  | 'CHECKIN'
  | 'CREATE_PARTICIPANT'
  | 'EDIT_PARTICIPANT'
  | 'REPRINT_BADGE'
  | 'ACCESS_ALLOWED'
  | 'ACCESS_DENIED'
  | 'CLOAKROOM_CREATE'
  | 'CLOAKROOM_RETURN'
  | 'ACTIVITY_ATTENDANCE_REGISTERED'
  | 'CERTIFICATE_ISSUED';

export interface ActionLog {
  id: string;
  eventId: string;
  userId: string;
  participantId?: string;
  activityId?: string;
  ticketNumber?: number;
  action: ActionLogAction;
  timestamp: string;
  isTest?: boolean;
  origin?: RecordOrigin;
  testStatus?: TestRecordStatus;
}

export interface Activity {
  id: string;
  eventId: string;
  title: string;
  roomName: string;
  speakerName: string;
  date: string;
  startTime: string;
  endTime: string;
  workloadHours: number;
  active: boolean;
  createdAt?: string;
}

export interface ActivityAttendance {
  id: string;
  eventId: string;
  activityId: string;
  participantId: string;
  checkedAt: string;
  checkedByUserId: string;
}

export type CertificateType = 'activity' | 'general';

export interface Certificate {
  id: string;
  eventId: string;
  participantId: string;
  activityId?: string;
  type: CertificateType;
  totalHours: number;
  certificateCode: string;
  issuedAt: string;
  issuedByUserId: string;
}

export type CertificateTemplateOrientation = 'landscape' | 'portrait';
export type CertificateTemplatePageSize = 'A4' | 'A5';

export interface CertificateTemplateElement {
  id: string;
  type: 'text' | 'image';
  label: string;
  placeholder: string;
  text?: string;
  imageUrl?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  order?: number;
}

export interface CertificateTemplate {
  id: string;
  eventId: string;
  name: string;
  orientation: CertificateTemplateOrientation;
  pageSize: CertificateTemplatePageSize;
  backgroundImageUrl: string;
  logoUrl: string;
  elements: CertificateTemplateElement[];
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantField {
  id: string;
  name: string; // e.g., "Cargo", "Telefone", "Alimentação"
  type: 'text' | 'number' | 'email' | 'select' | 'checkbox';
  required: boolean;
  options?: string[]; // for type 'select'
  active: boolean;
  order?: number;
}

export interface AccessArea {
  id: string;
  eventId: string;
  name: string;
  active: boolean;
}

export interface Area extends AccessArea {
  color?: string;
  event_id?: string;    // support exact match
  isActive?: boolean;   // maps to is_active
  is_active?: boolean;  // support exact match
  createdAt?: string;   // maps to created_at
  created_at?: string;  // support exact match
}

export interface AreaAccessLog {
  id: string;
  participantId: string;
  areaId: string;
  status: 'ALLOWED' | 'DENIED';
  userId: string;
  timestamp: string;
  isTest?: boolean;
  origin?: RecordOrigin;
  testStatus?: TestRecordStatus;
}

export interface AccessProfile {
  id: string;
  name: string;
  area_ids: string[]; // array of area IDs
  eventId?: string;
  event_id?: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type ImportTargetField = 'name' | 'cpf' | 'email' | 'company' | 'category' | 'ticketCode' | 'areas' | 'profile' | 'ignore';

export interface ImportTemplate {
  id: string;
  name: string;
  eventId?: string;
  global: boolean;
  mapping: Record<string, ImportTargetField>;
  fieldOrder: ImportTargetField[];
  updatedAt: string;
}

export interface PermissionDefinition {
  id: string;
  label: string;
}

export interface PermissionGroupDefinition {
  id: string;
  title: string;
  icon: React.ElementType;
  permissions: PermissionDefinition[];
}

export interface ReportAreaAccessLog {
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
  isTest?: boolean;
  origin?: RecordOrigin;
  testStatus?: TestRecordStatus;
}

export interface ReportActionLog {
  id: string;
  eventId: string;
  userId: string;
  participantId?: string;
  action: string;
  timestamp: string;
  participantName?: string;
  operatorName?: string;
  isTest?: boolean;
  origin?: RecordOrigin;
  testStatus?: TestRecordStatus;
}

export interface ActivityAttendanceView {
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

export interface CertificateActivityView extends Activity {
  checkedAt?: string;
  attendanceId?: string;
}

export interface CertificateLookupResult {
  participant: Participant;
  event: Event;
  attendedActivities: CertificateActivityView[];
  totalHours: number;
  certificates: Certificate[];
}

export interface ReportCertificate extends Certificate {
  participantName?: string;
  participantCpf?: string;
  participantCategory?: string;
  activityTitle?: string;
  activitySpeakerName?: string;
  operatorName?: string;
}

export interface ReportBrandConfig {
  showLogo: boolean;
  logoUrl: string;
  showWatermark: boolean;
  watermarkUrl: string;
  watermarkOpacity: number;
}

export type ReportOptionKey =
  | 'summaryTotal'
  | 'summaryCheckedIn'
  | 'summaryPending'
  | 'summaryAttendanceRate'
  | 'eventName'
  | 'eventDate'
  | 'eventCategory'
  | 'eventStatusFilter'
  | 'issuedAt'
  | 'checkinsByHour'
  | 'participantsByCategory'
  | 'presenceBreakdown'
  | 'areaAccess'
  | 'areaAccessDecisions'
  | 'participantName'
  | 'participantCpf'
  | 'participantEmail'
  | 'participantPhone'
  | 'participantCategory'
  | 'participantCheckinStatus'
  | 'participantCheckinTime'
  | 'participantAreaAccess';

export type ReportConfig = Record<ReportOptionKey, boolean>;

export type ActiveTab =
  | 'dashboard'
  | 'eventos-ativos'
  | 'evento-dashboard'
  | 'eventos'
  | 'participantes'
  | 'inscricoes-online'
  | 'checkin'
  | 'checkin-mobile'
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

