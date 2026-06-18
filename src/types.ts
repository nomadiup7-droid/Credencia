// Definition of types for the Accreditation & Check-in System

export type UserRole = 'ADMIN' | 'CHECKIN' | 'CHECKIN_CADASTRO' | 'admin' | 'operator' | 'SUPERVISOR' | 'ATENDENTE';
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
  organizationId: string;
  currentUserRole?: EventUserRole | UserRole;
}

export type ParticipantCategory = 'VIP' | 'Palestrante' | 'Expositor' | 'Participante' | 'Staff';

export interface Participant {
  id: string;
  eventId: string;
  name: string;
  email: string;
  cpf: string;
  category: ParticipantCategory;
  checkedIn: boolean;
  checkedInAt?: string; // ISO String
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
  tagNumber: number; // Automatic sequential tag number
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
}

export interface CheckInLog {
  id: string;
  participantId: string;
  action: 'CHECKIN' | 'CREATE' | 'REPRINT';
  performedBy: string; // userId or Operator name/PIN
  timestamp: string;
  eventId?: string;
  organizationId?: string;
}

export type ActionLogAction =
  | 'CHECKIN'
  | 'CREATE_PARTICIPANT'
  | 'EDIT_PARTICIPANT'
  | 'REPRINT_BADGE'
  | 'ACCESS_ALLOWED'
  | 'ACCESS_DENIED';

export interface ActionLog {
  id: string;
  eventId: string;
  userId: string;
  participantId?: string;
  action: ActionLogAction;
  timestamp: string;
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
}

export interface AccessProfile {
  id: string;
  name: string;
  area_ids: string[]; // array of area IDs
  eventId?: string;
  event_id?: string;
}

