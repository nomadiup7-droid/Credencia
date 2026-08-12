import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';

export class DatabaseConflictError extends Error {
  status = 409;
  constructor(message: string, public code = 'CONFLICT', public conflictPositions: string[] = []) {
    super(message);
    this.name = 'DatabaseConflictError';
  }
}

export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConfigurationError';
  }
}
import { User, Event, Participant, CloakroomItem, UserRole, ParticipantCategory, CheckIn, CheckInLog, ParticipantField, Organization, Area, AreaAccessLog, AccessProfile, EventUser, ActionLog, Activity, ActivityAttendance, Certificate, CertificateTemplate, OnlineRegistrationConfig, OnlineRegistration } from '../src/types';

// Load environment variables early
dotenv.config();

// Extend User in the database to store password securely
export interface DBUser extends User {
  passwordHash: string;
}

interface DBSchema {
  organizations: Organization[];
  users: DBUser[];
  eventUsers?: EventUser[];
  events: Event[];
  participants: Participant[];
  cloakroom: CloakroomItem[];
  checkins?: CheckIn[];
  logs?: CheckInLog[];
  actionLogs?: ActionLog[];
  activities?: Activity[];
  activityAttendances?: ActivityAttendance[];
  certificates?: Certificate[];
  certificateTemplates?: CertificateTemplate[];
  onlineRegistrationConfigs?: OnlineRegistrationConfig[];
  onlineRegistrations?: OnlineRegistration[];
  participantFields?: ParticipantField[];
  areas?: Area[];
  areaAccessLogs?: AreaAccessLog[];
  accessProfiles?: AccessProfile[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'db.json');
const isProduction = process.env.NODE_ENV === 'production';
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const requestedDatabaseProvider = (process.env.DATABASE_PROVIDER || 'supabase').trim().toLowerCase();

if (process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SECRET_KEY) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY esta em compatibilidade legada. Prefira SUPABASE_SECRET_KEY no backend.');
}

if (!['supabase', 'local-json'].includes(requestedDatabaseProvider)) {
  throw new DatabaseConfigurationError(
    `DATABASE_PROVIDER invalido: "${requestedDatabaseProvider}". Use "supabase" ou "local-json".`
  );
}

function toConflictPositions(error: any) {
  const detail = String(error?.details || error?.detail || '').trim();
  return detail ? detail.split(',').map(value => value.trim()).filter(Boolean) : [];
}

function generateSecureQrToken() {
  return 'qr_' + randomBytes(24).toString('base64url');
}

function withParticipantQrDefaults<T extends Partial<Participant>>(participant: T): T {
  const now = new Date().toISOString();
  return {
    ...participant,
    qrToken: participant.qrToken || generateSecureQrToken(),
    qrTokenStatus: participant.qrTokenStatus || 'ATIVO',
    qrTokenVersion: participant.qrTokenVersion || 1,
    qrTokenCreatedAt: participant.qrTokenCreatedAt || now,
    credentialStatus: participant.credentialStatus || 'ATIVA',
    credentialViewCount: participant.credentialViewCount || 0
  };
}

function normalizeParticipantText(value?: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function participantIdentityKeys(participant: Partial<Participant>) {
  const keys: string[] = [];
  const cleanCpf = String(participant.cpf || '').replace(/\D/g, '');
  const email = normalizeParticipantText(participant.email);
  const ticketCode = normalizeParticipantText(participant.ticketCode);
  const qrToken = normalizeParticipantText(participant.qrToken);
  const externalId = normalizeParticipantText(participant.externalId);
  const name = normalizeParticipantText(participant.name);
  const company = normalizeParticipantText(participant.company);

  if (cleanCpf) keys.push(`cpf:${cleanCpf}`);
  if (email) keys.push(`email:${email}`);
  if (ticketCode) keys.push(`ticket:${ticketCode}`);
  if (qrToken) keys.push(`qr:${qrToken}`);
  if (externalId) keys.push(`external:${externalId}`);
  if (name && company) keys.push(`name_company:${name}|${company}`);
  else if (name) keys.push(`name:${name}`);
  return keys;
}

function normalizeSupabaseError(error: any) {
  if (!error) return error;
  if (error?.hint === 'CLOAKROOM_POSITION_CONFLICT') {
    const conflictPositions = toConflictPositions(error);
    return new DatabaseConflictError(
      `A posicao ${conflictPositions[0] || ''} acabou de ser ocupada por outro operador.`.trim(),
      'CLOAKROOM_POSITION_CONFLICT',
      conflictPositions
    );
  }
  if (error?.hint === 'CLOAKROOM_DUPLICATE_REQUEST_POSITION') {
    const conflictPositions = toConflictPositions(error);
    return new DatabaseConflictError(
      `A posicao ${conflictPositions[0] || ''} foi informada para mais de um volume.`.trim(),
      'CLOAKROOM_DUPLICATE_REQUEST_POSITION',
      conflictPositions
    );
  }
  if (error?.code === '23505') {
    return new DatabaseConflictError('Registro duplicado ou em conflito.', 'UNIQUE_CONSTRAINT_VIOLATION');
  }
  return error;
}

const fixMojibake = (value?: string) => {
  if (!value || !/[ÃÂ]/.test(value)) return value || '';
  try {
    return Buffer.from(value, 'latin1').toString('utf8');
  } catch (error) {
    return value;
  }
};

const DEFAULT_ORGANIZATIONS: Organization[] = [
  {
    id: 'org1',
    name: 'Organização Alfa',
    createdAt: new Date('2026-01-01T10:00:00Z').toISOString()
  },
  {
    id: 'org2',
    name: 'Organização Beta',
    createdAt: new Date('2026-01-01T10:00:00Z').toISOString()
  }
];

// Default Seed Data
const DEFAULT_PARTICIPANT_FIELDS: ParticipantField[] = [
  { id: 'f_name', name: 'Nome Completo', type: 'text', required: true, active: true, order: 1 },
  { id: 'f_email', name: 'E-mail de Contato', type: 'email', required: true, active: true, order: 2 },
  { id: 'f_cpf', name: 'CPF', type: 'text', required: true, active: true, order: 3 },
  { id: 'f_category', name: 'Categoria Operacional', type: 'select', required: true, active: true, options: ['Participante', 'Palestrante', 'VIP', 'Expositor', 'Staff'], order: 4 },
  { id: 'f_company', name: 'Empresa', type: 'text', required: false, active: true, order: 5 }
];

const DEFAULT_USERS: DBUser[] = [
  {
    id: 'u1',
    name: 'Administrador Principal',
    email: 'admin@credencia.com',
    role: 'ADMIN',
    pin: '1111',
    passwordHash: '$2b$12$u4ncDY.7NmAmYz2kDCOXvelqQPNAyRudvoxYCxPfn.dTCiFRn7cCa',
    organizationId: 'org1',
    createdAt: new Date('2026-01-01T10:00:00Z').toISOString()
  },
  {
    id: 'u2',
    name: 'Supervisor de Evento',
    email: 'supervisor@credencia.com',
    role: 'SUPERVISOR',
    pin: '2222',
    passwordHash: '$2b$12$NmG6CzS47uRNER9ncP71R.e.R3uFQLpccE5sVMV/t4uq.Gqw61tN.',
    organizationId: 'org1',
    createdAt: new Date('2026-01-02T11:00:00Z').toISOString()
  },
  {
    id: 'u3',
    name: 'Atendente da Recepção',
    email: 'atendente@credencia.com',
    role: 'ATENDENTE',
    pin: '3333',
    passwordHash: '$2b$12$K2RRq16D1px7Fm2Iv/4KMu7ysHTc.pFnAwTYI3rFuEazldUDvTQXO',
    organizationId: 'org1',
    createdAt: new Date('2026-01-03T12:00:00Z').toISOString()
  },
  {
    id: 'u4',
    name: 'Administrador Beta',
    email: 'admin@beta.com',
    role: 'ADMIN',
    pin: '4444',
    passwordHash: '$2b$12$LKh4mreAIgKeHrx0fSJzkeUqWRIlqcLOtTifCoakPRKlQZcOXXqA6',
    organizationId: 'org2',
    createdAt: new Date('2026-01-04T10:00:00Z').toISOString()
  }
];

const DEFAULT_EVENTS: Event[] = [
  {
    id: 'e1',
    name: 'Congresso Internacional de Tecnologia 2026',
    date: '2026-06-15',
    location: 'Centro de Convenções Anhembi, São Paulo',
    capacity: 500,
    organizationId: 'org1',
    createdAt: new Date('2026-05-01T08:00:00Z').toISOString(),
    credentialType: 'badge',
    credentialSize: 'A6',
    showQRCode: true,
    enableAccessControl: true,
    enableCloakroom: false,
    enableScanner: true
  },
  {
    id: 'e2',
    name: 'Expo Marketing Digital & Vendas',
    date: '2026-07-22',
    location: 'Expo Center Norte, São Paulo',
    capacity: 350,
    organizationId: 'org1',
    createdAt: new Date('2026-05-10T09:30:00Z').toISOString(),
    credentialType: 'label',
    credentialSize: '9x4',
    showQRCode: true,
    enableAccessControl: true,
    enableCloakroom: false,
    enableScanner: true
  },
  {
    id: 'e3',
    name: 'Simpósio Beta de Inovação',
    date: '2026-08-10',
    location: 'Centro de Convenções Rebouças, São Paulo',
    capacity: 250,
    organizationId: 'org2',
    createdAt: new Date('2026-05-12T09:30:00Z').toISOString(),
    credentialType: 'badge',
    credentialSize: 'A6',
    showQRCode: true,
    enableAccessControl: true,
    enableCloakroom: false,
    enableScanner: true
  }
];

const DEFAULT_PARTICIPANTS: Participant[] = [
  {
    id: 'p1',
    eventId: 'e1',
    name: 'Alice Silva Santos',
    email: 'alice.silva@email.com',
    cpf: '12345678901',
    category: 'Palestrante',
    checkedIn: true,
    checkedInAt: new Date('2026-06-02T13:45:00Z').toISOString(),
    ticketCode: 'TKT-E1-PAL-12345',
    createdAt: new Date('2026-05-15T12:00:00Z').toISOString()
  },
  {
    id: 'p2',
    eventId: 'e1',
    name: 'Bruno Ramos de Oliveira',
    email: 'bruno.ramos@email.com',
    cpf: '23456789012',
    category: 'VIP',
    checkedIn: true,
    checkedInAt: new Date('2026-06-02T14:15:00Z').toISOString(),
    ticketCode: 'TKT-E1-VIP-67890',
    createdAt: new Date('2026-05-16T14:30:00Z').toISOString()
  },
  {
    id: 'p3',
    eventId: 'e1',
    name: 'Carla Dias de Souza',
    email: 'carla.dias@email.com',
    cpf: '34567890123',
    category: 'Participante',
    checkedIn: false,
    ticketCode: 'TKT-E1-PRT-11223',
    createdAt: new Date('2026-05-18T09:15:00Z').toISOString()
  },
  {
    id: 'p4',
    eventId: 'e1',
    name: 'Daniel Ferraz Cruz',
    email: 'daniel.ferraz@email.com',
    cpf: '45678901234',
    category: 'Expositor',
    checkedIn: false,
    ticketCode: 'TKT-E1-EXP-44556',
    createdAt: new Date('2026-05-19T10:00:00Z').toISOString()
  },
  {
    id: 'p5',
    eventId: 'e1',
    name: 'Eduardo Pereira Lima',
    email: 'eduardo.lima@email.com',
    cpf: '56789012345',
    category: 'Staff',
    checkedIn: true,
    checkedInAt: new Date('2026-06-02T08:30:00Z').toISOString(),
    ticketCode: 'TKT-E1-STF-99887',
    createdAt: new Date('2026-05-20T11:20:00Z').toISOString()
  },
  {
    id: 'p6',
    eventId: 'e2',
    name: 'Fernanda Albuquerque Mendes',
    email: 'fernanda.albu@email.com',
    cpf: '67890123456',
    category: 'VIP',
    checkedIn: false,
    ticketCode: 'TKT-E2-VIP-33445',
    createdAt: new Date('2026-05-21T15:00:00Z').toISOString()
  }
];

const DEFAULT_CLOAKROOM: CloakroomItem[] = [
  {
    id: 'c1',
    eventId: 'e1',
    participantId: 'p1',
    participantName: 'Alice Silva Santos',
    itemDescription: 'Mochila preta com notebook',
    tagNumber: 101,
    volumeCount: 1,
    volumeTags: ['101-1'],
    status: 'guardado',
    registeredAt: new Date('2026-06-02T13:48:00Z').toISOString()
  },
  {
    id: 'c2',
    eventId: 'e1',
    participantId: 'p2',
    participantName: 'Bruno Ramos de Oliveira',
    itemDescription: 'Casaco cinza de lã',
    tagNumber: 102,
    volumeCount: 1,
    volumeTags: ['102-1'],
    status: 'retirado',
    registeredAt: new Date('2026-06-02T14:18:00Z').toISOString(),
    returnedAt: new Date('2026-06-02T16:30:00Z').toISOString()
  }
];

// Helper functions to map camelCase <-> snake_case automatically
function toCamel(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamel);
  const newObj: any = {};
  for (const key of Object.keys(obj)) {
    let camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    
    // Custom mappings
    if (key === 'password_hash') camelKey = 'passwordHash';
    if (key === 'organization_id') camelKey = 'organizationId';
    if (key === 'event_id') camelKey = 'eventId';
    if (key === 'user_id') camelKey = 'userId';
    if (key === 'participant_id') camelKey = 'participantId';
    if (key === 'activity_id') camelKey = 'activityId';
    if (key === 'checked_in_at') camelKey = 'checkedInAt';
    if (key === 'checked_in') camelKey = 'checkedIn';
    if (key === 'ticket_code') camelKey = 'ticketCode';
    if (key === 'volume_count') camelKey = 'volumeCount';
    if (key === 'volume_tags') camelKey = 'volumeTags';
    if (key === 'tag_number') camelKey = 'tagNumber';
    if (key === 'registered_by_user_id') camelKey = 'registeredByUserId';
    if (key === 'registered_by_name') camelKey = 'registeredByName';
    if (key === 'returned_by_user_id') camelKey = 'returnedByUserId';
    if (key === 'returned_by_name') camelKey = 'returnedByName';
    if (key === 'field_order') camelKey = 'order';
    if (key === 'show_qr_code') camelKey = 'showQRCode';

    if (['layout_config', 'checkin_screen_config', 'cloakroom_label_config', 'elements', 'volumes', 'fields', 'custom_fields'].includes(key)) {
      newObj[camelKey] = obj[key];
    } else {
      newObj[camelKey] = toCamel(obj[key]);
    }
  }
  return newObj;
}

function toSnake(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toSnake);
  const newObj: any = {};
  for (const key of Object.keys(obj)) {
    let snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    // Custom mappings
    if (key === 'passwordHash') snakeKey = 'password_hash';
    if (key === 'organizationId') snakeKey = 'organization_id';
    if (key === 'eventId') snakeKey = 'event_id';
    if (key === 'userId') snakeKey = 'user_id';
    if (key === 'participantId') snakeKey = 'participant_id';
    if (key === 'activityId') snakeKey = 'activity_id';
    if (key === 'checkedInAt') snakeKey = 'checked_in_at';
    if (key === 'checkedIn') snakeKey = 'checked_in';
    if (key === 'ticketCode') snakeKey = 'ticket_code';
    if (key === 'volumeCount') snakeKey = 'volume_count';
    if (key === 'volumeTags') snakeKey = 'volume_tags';
    if (key === 'tagNumber') snakeKey = 'tag_number';
    if (key === 'registeredByUserId') snakeKey = 'registered_by_user_id';
    if (key === 'registeredByName') snakeKey = 'registered_by_name';
    if (key === 'returnedByUserId') snakeKey = 'returned_by_user_id';
    if (key === 'returnedByName') snakeKey = 'returned_by_name';
    if (key === 'order') snakeKey = 'field_order';
    if (key === 'showQRCode') snakeKey = 'show_qr_code';

    if (['layoutConfig', 'checkinScreenConfig', 'cloakroomLabelConfig', 'elements', 'volumes', 'fields', 'customFields'].includes(key)) {
      newObj[snakeKey] = obj[key];
    } else {
      newObj[snakeKey] = toSnake(obj[key]);
    }
  }
  return newObj;
}

class Database {
  private data!: DBSchema;
  private useSupabase: boolean;
  private supabase: any;

  constructor() {
    this.useSupabase = requestedDatabaseProvider === 'supabase';
    if (this.useSupabase) {
      if (!process.env.SUPABASE_URL || !supabaseSecretKey) {
        throw new DatabaseConfigurationError(
          'DATABASE_PROVIDER=supabase exige SUPABASE_URL e SUPABASE_SECRET_KEY. SUPABASE_SERVICE_ROLE_KEY ainda e aceito apenas como compatibilidade legada.'
        );
      }
      console.log('Using Supabase Database provider');
      this.supabase = createClient(process.env.SUPABASE_URL, supabaseSecretKey);
    } else {
      if (isProduction) {
        throw new DatabaseConfigurationError(
          'DATABASE_PROVIDER=local-json nao e permitido em producao. Configure DATABASE_PROVIDER=supabase, SUPABASE_URL e SUPABASE_SECRET_KEY.'
        );
      }
      if (process.env.DATABASE_PROVIDER !== 'local-json') {
        throw new DatabaseConfigurationError(
          'Banco local db.json so pode ser usado explicitamente com DATABASE_PROVIDER=local-json em desenvolvimento.'
        );
      }
      console.log('Using Local db.json Database');
      this.data = {
        organizations: DEFAULT_ORGANIZATIONS,
        users: DEFAULT_USERS,
        eventUsers: [],
        events: DEFAULT_EVENTS,
        participants: DEFAULT_PARTICIPANTS,
        cloakroom: DEFAULT_CLOAKROOM,
        checkins: [],
        logs: [],
        actionLogs: [],
        activities: [],
        activityAttendances: [],
        certificates: [],
        certificateTemplates: [],
        onlineRegistrationConfigs: [],
        onlineRegistrations: [],
        participantFields: DEFAULT_PARTICIPANT_FIELDS,
        areas: [
          { id: 'a1', name: 'Sala', color: '#00E545', eventId: 'e1', event_id: 'e1', active: true, isActive: true, is_active: true, createdAt: new Date().toISOString(), created_at: new Date().toISOString() },
          { id: 'a2', name: 'Restaurante', color: '#F59E0B', eventId: 'e1', event_id: 'e1', active: true, isActive: true, is_active: true, createdAt: new Date().toISOString(), created_at: new Date().toISOString() },
          { id: 'a3', name: 'Shows', color: '#14B8A6', eventId: 'e1', event_id: 'e1', active: true, isActive: true, is_active: true, createdAt: new Date().toISOString(), created_at: new Date().toISOString() }
        ],
        areaAccessLogs: [],
        accessProfiles: []
      };
      this.loadLocal();
    }
  }

  private loadLocal(): void {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(fileContent);
        const loadedEvents = (parsed.events || DEFAULT_EVENTS).map((e: any) => ({
          ...e,
          organizationId: e.organizationId || 'org1', // fallback to default tenant
          credentialType: e.credentialType || 'badge',
          credentialSize: e.credentialSize || 'A6',
          showQRCode: e.showQRCode !== undefined ? e.showQRCode : true,
          enableAccessControl: e.enableAccessControl !== undefined ? e.enableAccessControl : true,
          enableCloakroom: e.enableCloakroom !== undefined ? e.enableCloakroom : false,
          enableScanner: e.enableScanner !== undefined ? e.enableScanner : true
        }));
        const loadedUsers = (parsed.users || []).map((u: any) => {
          const defaultUser = DEFAULT_USERS.find(du => du.id === u.id || du.email.toLowerCase() === String(u.email || '').toLowerCase());
          return {
            ...defaultUser,
            ...u,
            pin: u.pin || defaultUser?.pin,
            organizationId: u.organizationId || defaultUser?.organizationId || 'org1' // fallback
          };
        });
        this.data = {
          organizations: parsed.organizations || DEFAULT_ORGANIZATIONS,
          users: loadedUsers,
          eventUsers: (parsed.eventUsers || []).map((eventUser: any) => ({
            ...eventUser,
            active: eventUser.active !== false
          })),
          events: loadedEvents,
          participants: (parsed.participants || DEFAULT_PARTICIPANTS).map((participant: any) => {
            const allowedAreaIds = Array.isArray(participant.allowedAreaIds)
              ? participant.allowedAreaIds
              : (Array.isArray(participant.allowedAreas) ? participant.allowedAreas : []);
            return {
              ...participant,
              allowedAreaIds,
              allowedAreas: Array.isArray(participant.allowedAreas) ? participant.allowedAreas : allowedAreaIds
            };
          }),
          cloakroom: parsed.cloakroom || DEFAULT_CLOAKROOM,
          checkins: parsed.checkins || [],
          logs: parsed.logs || [],
          actionLogs: parsed.actionLogs || [],
          activities: (parsed.activities || []).map((activity: any) => ({
            ...activity,
            title: fixMojibake(activity.title),
            roomName: fixMojibake(activity.roomName),
            speakerName: fixMojibake(activity.speakerName),
            workloadHours: Number(activity.workloadHours) || 0,
            active: activity.active !== false
          })),
          activityAttendances: parsed.activityAttendances || [],
          certificates: parsed.certificates || [],
          certificateTemplates: (parsed.certificateTemplates || []).map((template: any) => ({
            ...template,
            name: fixMojibake(template.name),
            orientation: template.orientation === 'portrait' ? 'portrait' : 'landscape',
            pageSize: template.pageSize === 'A5' ? 'A5' : 'A4',
            backgroundImageUrl: template.backgroundImageUrl || '',
            logoUrl: template.logoUrl || '',
            elements: Array.isArray(template.elements) ? template.elements : []
          })),
          onlineRegistrationConfigs: parsed.onlineRegistrationConfigs || [],
          onlineRegistrations: parsed.onlineRegistrations || [],
          participantFields: parsed.participantFields || DEFAULT_PARTICIPANT_FIELDS,
          areas: (parsed.areas || [
            { id: 'a1', name: 'Sala', color: '#00E545' },
            { id: 'a2', name: 'Restaurante', color: '#F59E0B' },
            { id: 'a3', name: 'Shows', color: '#14B8A6' }
          ]).map((area: any) => ({
            ...area,
            color: area.color || '#00E545',
            eventId: area.eventId || area.event_id || 'e1',
            event_id: area.eventId || area.event_id || 'e1',
            active: area.active !== undefined ? area.active : (area.isActive !== undefined ? area.isActive : (area.is_active !== undefined ? area.is_active : true)),
            isActive: area.active !== undefined ? area.active : (area.isActive !== undefined ? area.isActive : (area.is_active !== undefined ? area.is_active : true)),
            is_active: area.active !== undefined ? area.active : (area.isActive !== undefined ? area.isActive : (area.is_active !== undefined ? area.is_active : true)),
            createdAt: area.createdAt || area.created_at || new Date().toISOString(),
            created_at: area.createdAt || area.created_at || new Date().toISOString()
          })),
          areaAccessLogs: parsed.areaAccessLogs || [],
          accessProfiles: parsed.accessProfiles || []
        };
      } else {
        this.saveLocal();
      }
    } catch (e) {
      console.error('Error loading database, using default schema:', e);
      this.saveLocal();
    }
  }

  private saveLocal(): void {
    if (this.useSupabase) return;
    try {
      const tempPath = `${DB_FILE_PATH}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE_PATH);
    } catch (e) {
      console.error('Error saving database:', e);
    }
  }

  getProviderInfo() {
    return {
      provider: this.useSupabase ? 'supabase' : 'local-json',
      persistent: true
    };
  }

  async validateConnection(): Promise<void> {
    if (!this.useSupabase) return;
    const { error } = await this.supabase
      .from('organizations')
      .select('id', { head: true, count: 'exact' })
      .limit(1);
    if (error) {
      throw new DatabaseConfigurationError(
        `Falha ao conectar no Supabase ou validar schema esperado: ${error.message}`
      );
    }
  }

  // --- Organizations CRUD ---
  async getOrganizations(): Promise<Organization[]> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('organizations').select('*');
      if (error) throw error;
      return toCamel(data) || [];
    }
    return this.data.organizations || DEFAULT_ORGANIZATIONS;
  }

  async getOrganizationById(id: string): Promise<Organization | undefined> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('organizations').select('*').eq('id', id).single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    return (this.data.organizations || DEFAULT_ORGANIZATIONS).find(org => org.id === id);
  }

  async createOrganization(org: Omit<Organization, 'id' | 'createdAt'>): Promise<Organization> {
    if (this.useSupabase) {
      const newOrg = {
        ...org,
        id: 'org_' + Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString()
      };
      const { data, error } = await this.supabase.from('organizations').insert(toSnake(newOrg)).select().single();
      if (error) throw error;
      return toCamel(data);
    }
    if (!this.data.organizations) {
      this.data.organizations = [...DEFAULT_ORGANIZATIONS];
    }
    const newOrg: Organization = {
      ...org,
      id: 'org_' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    this.data.organizations.push(newOrg);
    this.saveLocal();
    return newOrg;
  }

  // --- Users CRUD ---
  async getUsers(organizationId?: string): Promise<DBUser[]> {
    if (this.useSupabase) {
      let query = this.supabase.from('users').select('*');
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return toCamel(data) || [];
    }
    if (organizationId) {
      return this.data.users.filter(u => u.organizationId === organizationId);
    }
    return this.data.users;
  }

  async getUserByEmail(email: string): Promise<DBUser | undefined> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('users').select('*').ilike('email', email.trim()).single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  async getUserById(id: string): Promise<DBUser | undefined> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('users').select('*').eq('id', id).single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    return this.data.users.find(u => u.id === id);
  }

  async createUser(user: Omit<DBUser, 'id' | 'createdAt'>): Promise<DBUser> {
    if (this.useSupabase) {
      const newUser = {
        ...user,
        id: 'u_' + Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString()
      };
      const { data, error } = await this.supabase.from('users').insert(toSnake(newUser)).select().single();
      if (error) throw error;
      return toCamel(data);
    }
    const newUser: DBUser = {
      ...user,
      id: 'u_' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    this.data.users.push(newUser);
    this.saveLocal();
    return newUser;
  }

  async updateUser(id: string, updates: Partial<Omit<DBUser, 'id' | 'createdAt'>>): Promise<DBUser | undefined> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('users').update(toSnake(updates)).eq('id', id).select().single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    const user = this.data.users.find(u => u.id === id);
    if (!user) return undefined;
    Object.assign(user, updates);
    this.saveLocal();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    if (this.useSupabase) {
      const { error } = await this.supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    this.data.users.splice(index, 1);
    this.data.eventUsers = (this.data.eventUsers || []).filter(eu => eu.userId !== id);
    this.data.actionLogs = (this.data.actionLogs || []).filter(log => log.userId !== id);
    this.data.activityAttendances = (this.data.activityAttendances || []).filter(att => att.checkedByUserId !== id);
    this.data.certificates = (this.data.certificates || []).filter(cert => cert.issuedByUserId !== id);
    this.saveLocal();
    return true;
  }

  // --- Event Users CRUD ---
  async getEventUsers(eventId?: string): Promise<EventUser[]> {
    if (this.useSupabase) {
      let query = this.supabase.from('event_users').select('*');
      if (eventId) {
        query = query.eq('event_id', eventId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return toCamel(data) || [];
    }
    const links = this.data.eventUsers || [];
    if (eventId) {
      return links.filter(eu => eu.eventId === eventId);
    }
    return links;
  }

  async getEventUserById(id: string): Promise<EventUser | undefined> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('event_users').select('*').eq('id', id).single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    return (this.data.eventUsers || []).find(eu => eu.id === id);
  }

  async getEventUser(eventId: string, userId: string): Promise<EventUser | undefined> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('event_users').select('*').eq('event_id', eventId).eq('user_id', userId).single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    return (this.data.eventUsers || []).find(eu => eu.eventId === eventId && eu.userId === userId);
  }

  async createEventUser(link: Omit<EventUser, 'id'>): Promise<EventUser> {
    if (this.useSupabase) {
      const newLink = {
        ...link,
        id: 'eu_' + Math.random().toString(36).substring(2, 9)
      };
      const { data, error } = await this.supabase.from('event_users').insert(toSnake(newLink)).select().single();
      if (error) throw error;
      return toCamel(data);
    }
    if (!this.data.eventUsers) {
      this.data.eventUsers = [];
    }
    const newLink: EventUser = {
      ...link,
      id: 'eu_' + Math.random().toString(36).substring(2, 9)
    };
    this.data.eventUsers.push(newLink);
    this.saveLocal();
    return newLink;
  }

  async updateEventUser(id: string, updates: Partial<Omit<EventUser, 'id' | 'eventId' | 'userId'>>): Promise<EventUser | undefined> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('event_users').update(toSnake(updates)).eq('id', id).select().single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    const link = (this.data.eventUsers || []).find(eu => eu.id === id);
    if (!link) return undefined;
    Object.assign(link, updates);
    this.saveLocal();
    return link;
  }

  async deleteEventUser(id: string): Promise<boolean> {
    if (this.useSupabase) {
      const { error } = await this.supabase.from('event_users').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    if (!this.data.eventUsers) return false;
    const index = this.data.eventUsers.findIndex(eu => eu.id === id);
    if (index === -1) return false;
    this.data.eventUsers.splice(index, 1);
    this.saveLocal();
    return true;
  }

  // --- Events CRUD ---
  async getEvents(organizationId?: string): Promise<Event[]> {
    if (this.useSupabase) {
      let query = this.supabase.from('events').select('*');
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return toCamel(data) || [];
    }
    if (organizationId) {
      return this.data.events.filter(e => e.organizationId === organizationId);
    }
    return this.data.events;
  }

  async getEventById(id: string): Promise<Event | undefined> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('events').select('*').eq('id', id).single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    return this.data.events.find(e => e.id === id);
  }

  async createEvent(event: Omit<Event, 'id' | 'createdAt'>): Promise<Event> {
    if (this.useSupabase) {
      const newEvent = {
        ...event,
        eventMode: event.eventMode || 'PREPARACAO',
        id: 'e_' + Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString()
      };
      const { data, error } = await this.supabase.from('events').insert(toSnake(newEvent)).select().single();
      if (error) throw error;
      return toCamel(data);
    }
    const newEvent: Event = {
      ...event,
      eventMode: event.eventMode || 'PREPARACAO',
      id: 'e_' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    this.data.events.push(newEvent);
    this.saveLocal();
    return newEvent;
  }

  async updateEvent(id: string, updates: Partial<Omit<Event, 'id' | 'createdAt'>>): Promise<Event | undefined> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('events').update(toSnake(updates)).eq('id', id).select().single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    const event = this.data.events.find(e => e.id === id);
    if (!event) return undefined;
    Object.assign(event, updates);
    this.saveLocal();
    return event;
  }

  async resetEventTestData(eventId: string): Promise<{ participantsReset: number; actionLogsCanceled: number; areaLogsCanceled: number; checkinsCanceled: number }> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.rpc('reset_event_test_data', { p_event_id: eventId });
      if (error) throw normalizeSupabaseError(error);
      return {
        participantsReset: Number(data?.participantsReset || data?.participants_reset || 0),
        actionLogsCanceled: Number(data?.actionLogsCanceled || data?.action_logs_canceled || 0),
        areaLogsCanceled: Number(data?.areaLogsCanceled || data?.area_logs_canceled || 0),
        checkinsCanceled: Number(data?.checkinsCanceled || data?.checkins_canceled || 0)
      };
    }

    const testPrintedParticipantIds = new Set(
      (this.data.actionLogs || [])
        .filter(log => log.eventId === eventId && log.action === 'REPRINT_BADGE' && (log.isTest === true || log.origin === 'TESTE'))
        .map(log => log.participantId)
        .filter((id): id is string => Boolean(id))
    );
    const officialPrintedParticipantIds = new Set(
      (this.data.actionLogs || [])
        .filter(log => log.eventId === eventId && log.action === 'REPRINT_BADGE' && log.isTest !== true && log.origin !== 'TESTE')
        .map(log => log.participantId)
        .filter((id): id is string => Boolean(id))
    );

    const participants = this.data.participants || [];
    let participantsReset = 0;
    participants.forEach(participant => {
      if (participant.eventId !== eventId) return;
      if (testPrintedParticipantIds.has(participant.id) && !officialPrintedParticipantIds.has(participant.id)) {
        participant.printed = false;
      }
      if (participant.checkinIsTest === true || participant.checkinOrigin === 'TESTE') {
        participant.checkedIn = false;
        participant.checkedInAt = undefined;
        participant.checkedInByUserId = undefined;
        participant.checkedInByName = undefined;
        participant.checkinOrigin = 'TESTE';
        participant.checkinIsTest = true;
        participant.checkinTestStatus = 'CANCELADO_TESTE';
        participantsReset += 1;
      }
    });

    let actionLogsCanceled = 0;
    (this.data.actionLogs || []).forEach(log => {
      if (log.eventId !== eventId) return;
      if (log.isTest === true || log.origin === 'TESTE') {
        log.testStatus = 'CANCELADO_TESTE';
        actionLogsCanceled += 1;
      }
    });
    (this.data.logs || []).forEach(log => {
      if (log.eventId !== eventId) return;
      if (log.isTest === true || log.origin === 'TESTE') {
        log.testStatus = 'CANCELADO_TESTE';
      }
    });

    let areaLogsCanceled = 0;
    const areaIds = new Set((this.data.areas || []).filter(area => (area.eventId || area.event_id) === eventId).map(area => area.id));
    (this.data.areaAccessLogs || []).forEach(log => {
      if (!areaIds.has(log.areaId)) return;
      if (log.isTest === true || log.origin === 'TESTE') {
        log.testStatus = 'CANCELADO_TESTE';
        areaLogsCanceled += 1;
      }
    });

    const beforeCheckins = (this.data.checkins || []).length;
    this.data.checkins = (this.data.checkins || []).filter(checkin => {
      if (checkin.eventId !== eventId) return true;
      return !(checkin.isTest === true || checkin.origin === 'TESTE');
    });
    const checkinsCanceled = beforeCheckins - this.data.checkins.length;

    this.saveLocal();
    return { participantsReset, actionLogsCanceled, areaLogsCanceled, checkinsCanceled };
  }

  async deleteEvent(id: string): Promise<boolean> {
    if (this.useSupabase) {
      const { error } = await this.supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    const index = this.data.events.findIndex(e => e.id === id);
    if (index === -1) return false;
    this.data.events.splice(index, 1);
    this.data.eventUsers = (this.data.eventUsers || []).filter(eu => eu.eventId !== id);
    this.data.actionLogs = (this.data.actionLogs || []).filter(log => log.eventId !== id);
    this.data.activities = (this.data.activities || []).filter(activity => activity.eventId !== id);
    this.data.activityAttendances = (this.data.activityAttendances || []).filter(att => att.eventId !== id);
    this.data.certificates = (this.data.certificates || []).filter(cert => cert.eventId !== id);
    this.data.certificateTemplates = (this.data.certificateTemplates || []).filter(template => template.eventId !== id);
    this.data.onlineRegistrationConfigs = (this.data.onlineRegistrationConfigs || []).filter(config => config.eventId !== id);
    this.data.onlineRegistrations = (this.data.onlineRegistrations || []).filter(registration => registration.eventId !== id);
    this.data.participants = this.data.participants.filter(p => p.eventId !== id);
    this.data.cloakroom = this.data.cloakroom.filter(c => c.eventId !== id);
    this.saveLocal();
    return true;
  }

  // --- Online Registrations ---
  async getOnlineRegistrationConfigs(eventId?: string): Promise<OnlineRegistrationConfig[]> {
    if (this.useSupabase) {
      let query = this.supabase.from('online_registration_configs').select('*');
      if (eventId) query = query.eq('event_id', eventId);
      const { data, error } = await query;
      if (error) throw error;
      return toCamel(data) || [];
    }
    const configs = this.data.onlineRegistrationConfigs || [];
    return eventId ? configs.filter(config => config.eventId === eventId) : configs;
  }

  async getOnlineRegistrationConfigByEvent(eventId: string): Promise<OnlineRegistrationConfig | undefined> {
    const configs = await this.getOnlineRegistrationConfigs(eventId);
    return configs[0];
  }

  async getOnlineRegistrationConfigBySlug(slug: string): Promise<OnlineRegistrationConfig | undefined> {
    const cleanSlug = String(slug || '').trim().toLowerCase();
    if (!cleanSlug) return undefined;
    if (this.useSupabase) {
      const { data, error } = await this.supabase
        .from('online_registration_configs')
        .select('*')
        .eq('slug', cleanSlug)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    return (this.data.onlineRegistrationConfigs || []).find(config => config.slug.toLowerCase() === cleanSlug);
  }

  async upsertOnlineRegistrationConfig(eventId: string, updates: Partial<Omit<OnlineRegistrationConfig, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>>): Promise<OnlineRegistrationConfig> {
    const now = new Date().toISOString();
    const cleanSlug = String(updates.slug || '').trim().toLowerCase();
    const payload = {
      ...updates,
      ...(cleanSlug ? { slug: cleanSlug } : {}),
      updatedAt: now
    };

    if (this.useSupabase) {
      const existing = await this.getOnlineRegistrationConfigByEvent(eventId);
      if (existing) {
        const { data, error } = await this.supabase
          .from('online_registration_configs')
          .update(toSnake(payload))
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return toCamel(data);
      }

      const newConfig: OnlineRegistrationConfig = {
        id: 'orc_' + Math.random().toString(36).substring(2, 10),
        eventId,
        enabled: false,
        slug: cleanSlug || `evento-${eventId}`,
        publicTitle: '',
        publicDescription: '',
        publicDate: '',
        publicLocation: '',
        bannerUrl: '',
        status: 'PAUSADA',
        approvalMode: 'MANUAL',
        createdAt: now,
        updatedAt: now,
        ...payload
      } as OnlineRegistrationConfig;
      const { data, error } = await this.supabase
        .from('online_registration_configs')
        .insert(toSnake(newConfig))
        .select()
        .single();
      if (error) throw error;
      return toCamel(data);
    }

    this.data.onlineRegistrationConfigs = this.data.onlineRegistrationConfigs || [];
    const existing = this.data.onlineRegistrationConfigs.find(config => config.eventId === eventId);
    if (existing) {
      Object.assign(existing, payload);
      this.saveLocal();
      return existing;
    }

    const newConfig: OnlineRegistrationConfig = {
      id: 'orc_' + Math.random().toString(36).substring(2, 10),
      eventId,
      enabled: false,
      slug: cleanSlug || `evento-${eventId}`,
      publicTitle: '',
      publicDescription: '',
      publicDate: '',
      publicLocation: '',
      bannerUrl: '',
      status: 'PAUSADA',
      approvalMode: 'MANUAL',
      createdAt: now,
      updatedAt: now,
      ...payload
    } as OnlineRegistrationConfig;
    this.data.onlineRegistrationConfigs.push(newConfig);
    this.saveLocal();
    return newConfig;
  }

  async getOnlineRegistrations(filters: { eventId?: string; status?: string; search?: string } = {}): Promise<OnlineRegistration[]> {
    if (this.useSupabase) {
      let query = this.supabase.from('online_registrations').select('*');
      if (filters.eventId) query = query.eq('event_id', filters.eventId);
      if (filters.status) query = query.eq('status', filters.status);
      const { data, error } = await query.order('registered_at', { ascending: false });
      if (error) throw error;
      const rows = toCamel(data) || [];
      return this.filterOnlineRegistrations(rows, filters.search);
    }
    let rows = [...(this.data.onlineRegistrations || [])];
    if (filters.eventId) rows = rows.filter(row => row.eventId === filters.eventId);
    if (filters.status) rows = rows.filter(row => row.status === filters.status);
    rows = this.filterOnlineRegistrations(rows, filters.search);
    return rows.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
  }

  private filterOnlineRegistrations(rows: OnlineRegistration[], search?: string) {
    const query = String(search || '').trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(row =>
      row.name.toLowerCase().includes(query) ||
      String(row.email || '').toLowerCase().includes(query) ||
      String(row.phone || '').toLowerCase().includes(query)
    );
  }

  async getOnlineRegistrationById(id: string): Promise<OnlineRegistration | undefined> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('online_registrations').select('*').eq('id', id).single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    return (this.data.onlineRegistrations || []).find(row => row.id === id);
  }

  async createOnlineRegistration(registration: Omit<OnlineRegistration, 'id' | 'registeredAt' | 'createdAt' | 'updatedAt'>): Promise<OnlineRegistration> {
    const now = new Date().toISOString();
    const newRegistration: OnlineRegistration = {
      ...registration,
      id: 'or_' + Math.random().toString(36).substring(2, 10),
      registeredAt: now,
      createdAt: now,
      updatedAt: now
    };
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('online_registrations').insert(toSnake(newRegistration)).select().single();
      if (error) throw error;
      return toCamel(data);
    }
    this.data.onlineRegistrations = this.data.onlineRegistrations || [];
    this.data.onlineRegistrations.push(newRegistration);
    this.saveLocal();
    return newRegistration;
  }

  async updateOnlineRegistration(id: string, updates: Partial<Omit<OnlineRegistration, 'id' | 'createdAt'>>): Promise<OnlineRegistration | undefined> {
    const payload = { ...updates, updatedAt: new Date().toISOString() };
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('online_registrations').update(toSnake(payload)).eq('id', id).select().single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    const registration = (this.data.onlineRegistrations || []).find(row => row.id === id);
    if (!registration) return undefined;
    Object.assign(registration, payload);
    this.saveLocal();
    return registration;
  }

  // --- Participants CRUD ---
  async getParticipants(eventId?: string): Promise<Participant[]> {
    if (this.useSupabase) {
      let query = this.supabase.from('participants').select('*');
      if (eventId) {
        query = query.eq('event_id', eventId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return toCamel(data) || [];
    }
    if (eventId) {
      return this.data.participants.filter(p => p.eventId === eventId);
    }
    return this.data.participants;
  }

  async getParticipantById(id: string): Promise<Participant | undefined> {
    if (!id) return undefined;
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('participants').select('*').eq('id', id.trim()).single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    const cleanId = id.trim().toLowerCase();
    return this.data.participants.find(p => p.id?.trim().toLowerCase() === cleanId);
  }

  async getParticipantByTicketCode(code: string): Promise<Participant | undefined> {
    if (!code) return undefined;
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('participants').select('*').eq('ticket_code', code.trim()).single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    const cleanCode = code.trim().toLowerCase();
    return this.data.participants.find(p => p.ticketCode?.trim().toLowerCase() === cleanCode);
  }

  async getParticipantByQrToken(token: string): Promise<Participant | undefined> {
    if (!token) return undefined;
    const cleanToken = token.trim();
    if (this.useSupabase) {
      const { data, error } = await this.supabase
        .from('participants')
        .select('*')
        .eq('qr_token', cleanToken)
        .eq('qr_token_status', 'ATIVO')
        .single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    const lower = cleanToken.toLowerCase();
    return this.data.participants.find(p =>
      p.qrToken?.trim().toLowerCase() === lower && (p.qrTokenStatus || 'ATIVO') === 'ATIVO'
    );
  }

  async getParticipantByCpfAndEvent(cpf: string, eventId: string): Promise<Participant | undefined> {
    if (!cpf) return undefined;
    const cleanCpf = cpf.replace(/\D/g, '');
    if (!cleanCpf) return undefined;
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('participants').select('*').eq('event_id', eventId);
      if (error) throw error;
      const found = data.find((p: any) => p.cpf.replace(/\D/g, '') === cleanCpf);
      return toCamel(found);
    }
    return this.data.participants.find(
      p => p.eventId === eventId && p.cpf.replace(/\D/g, '') === cleanCpf
    );
  }

  async createParticipant(p: Omit<Participant, 'id' | 'createdAt' | 'checkedIn' | 'checkedInAt' | 'ticketCode'> & { ticketCode?: string; checkedIn?: boolean; checkedInAt?: string }): Promise<Participant> {
    const defaultCode = 'TKT-' + p.eventId.toUpperCase() + '-' + p.category.substring(0, 3).toUpperCase() + '-' + Math.floor(10000 + Math.random() * 90000);
    const allowedAreaIds = Array.isArray(p.allowedAreaIds)
      ? p.allowedAreaIds
      : (Array.isArray(p.allowedAreas) ? p.allowedAreas : []);
    const baseParticipant = withParticipantQrDefaults({
      ...p,
      id: 'p_' + Math.random().toString(36).substring(2, 9),
      checkedIn: p.checkedIn || false,
      checkedInAt: p.checkedInAt || (p.checkedIn ? new Date().toISOString() : (this.useSupabase ? null : undefined)),
      ticketCode: p.ticketCode || defaultCode,
      company: p.company || '',
      phone: p.phone || '',
      position: p.position || '',
      notes: p.notes || '',
      externalId: p.externalId || '',
      customFields: p.customFields || {},
      allowedAreaIds,
      allowedAreas: Array.isArray(p.allowedAreas) ? p.allowedAreas : allowedAreaIds,
      createdAt: new Date().toISOString()
    }) as Participant;

    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('participants').insert(toSnake(baseParticipant)).select().single();
      if (error) throw error;
      return toCamel(data);
    }

    this.data.participants.push(baseParticipant);
    this.saveLocal();
    return baseParticipant;
  }

  async analyzeParticipantsBatch(batch: Array<Partial<Participant> & { eventId: string }>): Promise<{ itemsToCreate: any[]; duplicates: any[]; invalid: any[] }> {
    if (batch.length === 0) return { itemsToCreate: [], duplicates: [], invalid: [] };
    const eventId = batch[0].eventId;
    const existingParticipants = await this.getParticipants(eventId);
    const existingKeySet = new Set<string>();
    existingParticipants.forEach(participant => {
      participantIdentityKeys(participant).forEach(key => existingKeySet.add(key));
    });

    const batchKeySet = new Set<string>();
    const itemsToCreate: any[] = [];
    const duplicates: any[] = [];
    const invalid: any[] = [];

    batch.forEach((item, index) => {
      if (!String(item.name || '').trim()) {
        invalid.push({ index, reason: 'Nome obrigatorio' });
        return;
      }
      const keys = participantIdentityKeys(item);
      const existingKey = keys.find(key => existingKeySet.has(key));
      const batchKey = keys.find(key => batchKeySet.has(key));
      if (existingKey || batchKey) {
        duplicates.push({ index, name: item.name, reason: existingKey ? 'Ja cadastrado no evento' : 'Duplicado dentro do arquivo', key: existingKey || batchKey });
        return;
      }
      itemsToCreate.push(item);
      keys.forEach(key => {
        existingKeySet.add(key);
        batchKeySet.add(key);
      });
    });

    return { itemsToCreate, duplicates, invalid };
  }

  async createParticipantsBatch(batch: Array<Omit<Participant, 'id' | 'createdAt' | 'checkedIn' | 'checkedInAt' | 'ticketCode'>>): Promise<Participant[]> {
    if (batch.length === 0) return [];
    const { itemsToCreate } = await this.analyzeParticipantsBatch(batch as any);

    const buildParticipant = (item: any) => {
      const defaultCode = 'TKT-' + item.eventId.toUpperCase() + '-' + item.category.substring(0, 3).toUpperCase() + '-' + Math.floor(10000 + Math.random() * 90000);
      const allowedAreaIds = Array.isArray(item.allowedAreaIds)
        ? item.allowedAreaIds
        : (Array.isArray(item.allowedAreas) ? item.allowedAreas : []);

      return withParticipantQrDefaults({
        ...item,
        id: 'p_' + Math.random().toString(36).substring(2, 9),
        checkedIn: false,
        checkedInAt: this.useSupabase ? null : undefined,
        ticketCode: item.ticketCode || defaultCode,
        company: item.company || '',
        phone: item.phone || '',
        position: item.position || '',
        notes: item.notes || '',
        externalId: item.externalId || '',
        customFields: item.customFields || {},
        allowedAreaIds,
        allowedAreas: allowedAreaIds,
        createdAt: new Date().toISOString()
      });
    };

    const newItems = itemsToCreate.map(buildParticipant);

    if (this.useSupabase) {
      if (newItems.length > 0) {
        const { data, error } = await this.supabase
          .from('participants')
          .insert(toSnake(newItems))
          .select();
        if (error) throw error;
        return toCamel(data) || [];
      }
      return [];
    }

    const created: Participant[] = newItems as Participant[];
    if (created.length > 0) {
      this.data.participants.push(...created);
      this.saveLocal();
    }
    return created;
  }

  async ensureParticipantQrTokens(eventId: string): Promise<Participant[]> {
    const participants = await this.getParticipants(eventId);
    const missing = participants.filter(p => !p.qrToken || (p.qrTokenStatus && p.qrTokenStatus !== 'ATIVO'));
    if (missing.length === 0) return participants;

    const updated: Participant[] = [];
    for (const participant of missing) {
      const withQr = await this.updateParticipant(participant.id, withParticipantQrDefaults({ qrTokenStatus: 'ATIVO' }) as Partial<Participant>);
      if (withQr) updated.push(withQr);
    }
    return this.getParticipants(eventId);
  }

  async regenerateParticipantQrToken(id: string): Promise<Participant | undefined> {
    const current = await this.getParticipantById(id);
    if (!current) return undefined;
    return this.updateParticipant(id, {
      qrToken: generateSecureQrToken(),
      qrTokenStatus: 'ATIVO',
      qrTokenVersion: (current.qrTokenVersion || 1) + 1,
      qrTokenRegeneratedAt: new Date().toISOString(),
      qrTokenRevokedAt: new Date().toISOString()
    });
  }

  async updateParticipant(id: string, updates: Partial<Omit<Participant, 'id' | 'createdAt'>>): Promise<Participant | undefined> {
    if (this.useSupabase) {
      const mappedUpdates = toSnake(updates);
      if (updates.allowedAreaIds !== undefined) {
        mappedUpdates.allowed_area_ids = updates.allowedAreaIds;
        mappedUpdates.allowed_areas = updates.allowedAreaIds;
      } else if (updates.allowedAreas !== undefined) {
        mappedUpdates.allowed_area_ids = updates.allowedAreas;
        mappedUpdates.allowed_areas = updates.allowedAreas;
      }
      const { data, error } = await this.supabase.from('participants').update(mappedUpdates).eq('id', id).select().single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    const p = this.data.participants.find(p => p.id === id);
    if (!p) return undefined;
    const allowedAreaIds = updates.allowedAreaIds !== undefined
      ? updates.allowedAreaIds
      : updates.allowedAreas;
    Object.assign(p, updates);
    if (allowedAreaIds !== undefined) {
      p.allowedAreaIds = allowedAreaIds;
      p.allowedAreas = allowedAreaIds;
    }
    this.saveLocal();
    return p;
  }

  async deleteParticipant(id: string): Promise<boolean> {
    if (this.useSupabase) {
      const { error } = await this.supabase.from('participants').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    const index = this.data.participants.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.data.participants.splice(index, 1);
    this.data.actionLogs = (this.data.actionLogs || []).filter(log => log.participantId !== id);
    this.data.activityAttendances = (this.data.activityAttendances || []).filter(att => att.participantId !== id);
    this.data.certificates = (this.data.certificates || []).filter(cert => cert.participantId !== id);
    this.saveLocal();
    return true;
  }

  async performCheckIn(id: string, checkInState: boolean, meta: Partial<Pick<Participant, 'checkedInByUserId' | 'checkedInByName' | 'checkinOrigin' | 'checkinIsTest' | 'checkinTestStatus'>> = {}): Promise<Participant | undefined> {
    if (this.useSupabase) {
      const p = await this.getParticipantById(id);
      if (!p) return undefined;

      const checkedInAt = checkInState ? new Date().toISOString() : null;
      
      const { data, error: pError } = await this.supabase.from('participants').update({
        checked_in: checkInState,
        checked_in_at: checkedInAt,
        checked_in_by_user_id: checkInState ? meta.checkedInByUserId : null,
        checked_in_by_name: checkInState ? meta.checkedInByName : null,
        checkin_origin: checkInState ? meta.checkinOrigin : null,
        checkin_is_test: checkInState ? meta.checkinIsTest : false,
        checkin_test_status: checkInState ? meta.checkinTestStatus : null
      }).eq('id', id).select().single();
      
      if (pError) throw pError;

      if (checkInState) {
        const newCheckIn = {
          id: 'chi_' + Math.random().toString(36).substring(2, 11),
          userId: id,
          eventId: p.eventId,
          checkInAt: checkedInAt || new Date().toISOString(),
          isTest: meta.checkinIsTest === true,
          origin: meta.checkinOrigin || 'OFICIAL',
          testStatus: meta.checkinTestStatus
        };
        await this.supabase.from('checkins').insert(toSnake(newCheckIn));
      } else {
        await this.supabase.from('checkins').delete().eq('user_id', id).eq('event_id', p.eventId);
      }

      return toCamel(data);
    }
    const p = this.data.participants.find(p => p.id === id);
    if (!p) return undefined;
    p.checkedIn = checkInState;
    p.checkedInAt = checkInState ? new Date().toISOString() : undefined;
    p.checkedInByUserId = checkInState ? meta.checkedInByUserId : undefined;
    p.checkedInByName = checkInState ? meta.checkedInByName : undefined;
    p.checkinOrigin = checkInState ? (meta.checkinOrigin || 'OFICIAL') : undefined;
    p.checkinIsTest = checkInState ? meta.checkinIsTest === true : undefined;
    p.checkinTestStatus = checkInState ? meta.checkinTestStatus : undefined;

    if (!this.data.checkins) {
      this.data.checkins = [];
    }

    if (checkInState) {
      this.data.checkins = this.data.checkins.filter(c => {
        if (c.userId !== id || c.eventId !== p.eventId) return true;
        return !(c.isTest === true || c.origin === 'TESTE');
      });
      const exists = this.data.checkins.some(c => c.userId === id && c.eventId === p.eventId);
      if (!exists) {
        this.data.checkins.push({
          id: 'chi_' + Math.random().toString(36).substring(2, 11),
          userId: id,
          eventId: p.eventId,
          checkInAt: p.checkedInAt || new Date().toISOString(),
          isTest: meta.checkinIsTest === true,
          origin: meta.checkinOrigin || 'OFICIAL',
          testStatus: meta.checkinTestStatus
        });
      }
    } else {
      this.data.checkins = this.data.checkins.filter(c => !(c.userId === id && c.eventId === p.eventId));
    }

    this.saveLocal();
    return p;
  }

  // --- Check-In Direct Operations ---
  async getCheckIn(userId: string, eventId: string): Promise<CheckIn | undefined> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('checkins').select('*').eq('user_id', userId).eq('event_id', eventId).single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    return (this.data.checkins || []).find(c => c.userId === userId && c.eventId === eventId);
  }

  async createCheckIn(userId: string, eventId: string, meta: Partial<Pick<CheckIn, 'isTest' | 'origin' | 'testStatus'>> = {}): Promise<CheckIn> {
    if (this.useSupabase) {
      const newCheckIn = {
        id: 'chi_' + Math.random().toString(36).substring(2, 11),
        userId,
        eventId,
        checkInAt: new Date().toISOString(),
        isTest: meta.isTest === true,
        origin: meta.origin || 'OFICIAL',
        testStatus: meta.testStatus
      };
      
      const { data, error } = await this.supabase.from('checkins').insert(toSnake(newCheckIn)).select().single();
      if (error) throw error;

      await this.supabase.from('participants').update({
        checked_in: true,
        checked_in_at: newCheckIn.checkInAt
      }).eq('id', userId);

      return toCamel(data);
    }
    if (!this.data.checkins) {
      this.data.checkins = [];
    }
    const newCheckIn: CheckIn = {
      id: 'chi_' + Math.random().toString(36).substring(2, 11),
      userId,
      eventId,
      checkInAt: new Date().toISOString(),
      isTest: meta.isTest === true,
      origin: meta.origin || 'OFICIAL',
      testStatus: meta.testStatus
    };
    this.data.checkins = this.data.checkins.filter(c => {
      if (c.userId !== userId || c.eventId !== eventId) return true;
      return !(c.isTest === true || c.origin === 'TESTE');
    });
    this.data.checkins.push(newCheckIn);

    const p = this.data.participants.find(p => p.id === userId && p.eventId === eventId);
    if (p) {
      p.checkedIn = true;
      p.checkedInAt = newCheckIn.checkInAt;
      p.checkinOrigin = newCheckIn.origin;
      p.checkinIsTest = newCheckIn.isTest;
      p.checkinTestStatus = newCheckIn.testStatus;
    }

    this.saveLocal();
    return newCheckIn;
  }

  async getCheckInsByEvent(eventId: string): Promise<CheckIn[]> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('checkins').select('*').eq('event_id', eventId);
      if (error) throw error;
      return toCamel(data) || [];
    }
    return (this.data.checkins || []).filter(c => c.eventId === eventId);
  }

  async getCheckInsByUser(userId: string): Promise<CheckIn[]> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('checkins').select('*').eq('user_id', userId);
      if (error) throw error;
      return toCamel(data) || [];
    }
    return (this.data.checkins || []).filter(c => c.userId === userId);
  }

  // --- Cloakroom (Chapelaria) CRUD ---
  async getCloakroom(eventId?: string): Promise<CloakroomItem[]> {
    if (this.useSupabase) {
      let query = this.supabase.from('cloakroom').select('*');
      if (eventId) {
        query = query.eq('event_id', eventId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return toCamel(data) || [];
    }
    if (eventId) {
      return this.data.cloakroom.filter(c => c.eventId === eventId);
    }
    return this.data.cloakroom;
  }

  async getCloakroomItemById(id: string): Promise<CloakroomItem | undefined> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('cloakroom').select('*').eq('id', id).single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    return this.data.cloakroom.find(c => c.id === id);
  }

  async getNextTagNumber(eventId: string): Promise<number> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('cloakroom').select('tag_number').eq('event_id', eventId);
      if (error) throw error;
      if (!data || data.length === 0) return 101;
      const maxTag = Math.max(...data.map((i: any) => i.tag_number));
      return maxTag + 1;
    }
    const eventItems = await this.getCloakroom(eventId);
    if (eventItems.length === 0) return 101;
    const maxTag = Math.max(...eventItems.map(i => i.tagNumber));
    return maxTag + 1;
  }

  async createCloakroomItem(item: Omit<CloakroomItem, 'id' | 'tagNumber' | 'status' | 'registeredAt' | 'returnedAt' | 'volumeTags'>): Promise<CloakroomItem> {
    if (this.useSupabase) {
      const payload = toSnake({
        ...item,
        id: 'c_' + Math.random().toString(36).substring(2, 9),
        volumeCount: Math.max(1, Math.min(5, Number(item.volumeCount) || 1))
      });
      const { data, error } = await this.supabase.rpc('create_cloakroom_item_atomic', { p_item: payload });
      if (error) throw normalizeSupabaseError(error);
      return toCamel(data);
    }
    const nextTag = await this.getNextTagNumber(item.eventId);
    const volumeCount = Math.max(1, Math.min(5, Number(item.volumeCount) || 1));
    const volumeTags = Array.from({ length: volumeCount }, (_, index) => `${nextTag}-${index + 1}`);
    const volumes = Array.from({ length: volumeCount }, (_, index) => {
      const source = item.volumes?.[index];
      return {
        id: source?.id || `vol_${index + 1}`,
        tag: volumeTags[index],
        description: source?.description || item.itemDescription || '',
        storageRackId: source?.storageRackId || item.storageRackId,
        storageRackName: source?.storageRackName || item.storageRackName,
        storageColumn: source?.storageColumn || item.storageColumn,
        storageRow: source?.storageRow || item.storageRow,
        storageAddress: source?.storageAddress || item.storageAddress,
        storageOccupiedAt: source?.storageOccupiedAt || item.storageOccupiedAt,
        storageOperatorId: source?.storageOperatorId || item.storageOperatorId,
        positionMode: source?.positionMode || 'auto'
      };
    });
    const newItem: CloakroomItem = {
      ...item,
      itemDescription: volumes.map((volume, index) => `Volume ${index + 1}: ${volume.description || '-'}`).join('\n'),
      storageRackId: volumes[0]?.storageRackId,
      storageRackName: volumes[0]?.storageRackName,
      storageColumn: volumes[0]?.storageColumn,
      storageRow: volumes[0]?.storageRow,
      storageAddress: volumes[0]?.storageAddress,
      storageOccupiedAt: volumes[0]?.storageOccupiedAt,
      storageOperatorId: volumes[0]?.storageOperatorId,
      id: 'c_' + Math.random().toString(36).substring(2, 9),
      tagNumber: nextTag,
      volumeCount,
      volumeTags,
      volumes,
      status: 'guardado',
      registeredAt: new Date().toISOString()
    };
    this.data.cloakroom.push(newItem);
    this.saveLocal();
    return newItem;
  }

  async collectCloakroomItem(id: string, returnedBy?: { userId?: string; name?: string }): Promise<CloakroomItem | undefined> {
    if (this.useSupabase) {
      const returnedAt = new Date().toISOString();
      const updates = {
        status: 'retirado',
        returned_at: returnedAt,
        returned_by_user_id: returnedBy?.userId || null,
        returned_by_name: returnedBy?.name || null
      };
      const { data, error } = await this.supabase.from('cloakroom').update(updates).eq('id', id).select().single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    const returnedAt = new Date().toISOString();
    const item = this.data.cloakroom.find(c => c.id === id);
    if (!item) return undefined;
    item.status = 'retirado';
    item.returnedAt = returnedAt;
    item.returnedByUserId = returnedBy?.userId;
    item.returnedByName = returnedBy?.name;
    item.storageReleasedAt = returnedAt;
    this.saveLocal();
    return item;
  }

  async deleteCloakroomItem(id: string): Promise<boolean> {
    if (this.useSupabase) {
      const { error } = await this.supabase.from('cloakroom').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    const index = this.data.cloakroom.findIndex(c => c.id === id);
    if (index === -1) return false;
    this.data.cloakroom.splice(index, 1);
    this.saveLocal();
    return true;
  }

  // --- PIN AUTHENTICATION & AUDIT LOGS ---
  async getUserByPin(pin: string): Promise<DBUser | undefined> {
    if (!pin) return undefined;
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('users').select('*').eq('pin', pin).single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    return this.data.users.find(u => u.pin === pin);
  }

  async createLog(log: Omit<CheckInLog, 'id' | 'timestamp'>): Promise<CheckInLog> {
    if (this.useSupabase) {
      const newLog = {
        ...log,
        id: 'log_' + Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString()
      };
      const { data, error } = await this.supabase.from('logs').insert(toSnake(newLog)).select().single();
      if (error) throw error;
      return toCamel(data);
    }
    if (!this.data.logs) {
      this.data.logs = [];
    }
    const newLog: CheckInLog = {
      ...log,
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString()
    };
    this.data.logs.push(newLog);
    this.saveLocal();
    return newLog;
  }

  async getLogs(organizationId?: string, eventId?: string): Promise<CheckInLog[]> {
    if (this.useSupabase) {
      let query = this.supabase.from('logs').select('*');
      if (organizationId) query = query.eq('organization_id', organizationId);
      if (eventId) query = query.eq('event_id', eventId);
      const { data, error } = await query;
      if (error) throw error;
      return toCamel(data) || [];
    }
    let list = this.data.logs || [];
    if (organizationId) {
      list = list.filter(l => l.organizationId === organizationId);
    }
    if (eventId) {
      list = list.filter(l => l.eventId === eventId);
    }
    return list;
  }

  async createActionLog(log: Omit<ActionLog, 'id' | 'timestamp'>): Promise<ActionLog> {
    if (this.useSupabase) {
      const newLog = {
        ...log,
        id: 'alog_' + Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString()
      };
      const { data, error } = await this.supabase.from('action_logs').insert(toSnake(newLog)).select().single();
      if (error) throw error;
      return toCamel(data);
    }
    if (!this.data.actionLogs) {
      this.data.actionLogs = [];
    }
    const newLog: ActionLog = {
      ...log,
      id: 'alog_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString()
    };
    this.data.actionLogs.push(newLog);
    this.saveLocal();
    return newLog;
  }

  async getActionLogs(eventId?: string): Promise<ActionLog[]> {
    if (this.useSupabase) {
      let query = this.supabase.from('action_logs').select('*');
      if (eventId) query = query.eq('event_id', eventId);
      const { data, error } = await query;
      if (error) throw error;
      return toCamel(data) || [];
    }
    let list = this.data.actionLogs || [];
    if (eventId) {
      list = list.filter(log => log.eventId === eventId);
    }
    return list;
  }

  // --- Activities & Attendance ---
  async getActivities(eventId?: string): Promise<Activity[]> {
    if (this.useSupabase) {
      let query = this.supabase.from('activities').select('*');
      if (eventId) query = query.eq('event_id', eventId);
      const { data, error } = await query;
      if (error) throw error;
      return toCamel(data) || [];
    }
    if (!this.data.activities) {
      this.data.activities = [];
    }
    if (eventId) {
      return this.data.activities.filter(activity => activity.eventId === eventId);
    }
    return this.data.activities;
  }

  async getActivityById(id: string): Promise<Activity | undefined> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('activities').select('*').eq('id', id).single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    return (this.data.activities || []).find(activity => activity.id === id);
  }

  async createActivity(activity: Omit<Activity, 'id' | 'createdAt'>): Promise<Activity> {
    if (this.useSupabase) {
      const newActivity = {
        ...activity,
        title: fixMojibake(activity.title),
        roomName: fixMojibake(activity.roomName),
        speakerName: fixMojibake(activity.speakerName),
        id: 'act_' + Math.random().toString(36).substring(2, 9),
        workloadHours: Number(activity.workloadHours) || 0,
        active: activity.active !== false,
        createdAt: new Date().toISOString()
      };
      const { data, error } = await this.supabase.from('activities').insert(toSnake(newActivity)).select().single();
      if (error) throw error;
      return toCamel(data);
    }
    if (!this.data.activities) {
      this.data.activities = [];
    }
    const newActivity: Activity = {
      ...activity,
      title: fixMojibake(activity.title),
      roomName: fixMojibake(activity.roomName),
      speakerName: fixMojibake(activity.speakerName),
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      workloadHours: Number(activity.workloadHours) || 0,
      active: activity.active !== false,
      createdAt: new Date().toISOString()
    };
    this.data.activities.push(newActivity);
    this.saveLocal();
    return newActivity;
  }

  async updateActivity(id: string, updates: Partial<Omit<Activity, 'id' | 'eventId' | 'createdAt'>>): Promise<Activity | undefined> {
    if (this.useSupabase) {
      const cleanUpdates: any = { ...updates };
      if (updates.title !== undefined) cleanUpdates.title = fixMojibake(updates.title);
      if (updates.roomName !== undefined) cleanUpdates.roomName = fixMojibake(updates.roomName);
      if (updates.speakerName !== undefined) cleanUpdates.speakerName = fixMojibake(updates.speakerName);
      if (updates.workloadHours !== undefined) cleanUpdates.workloadHours = Number(updates.workloadHours) || 0;
      if (updates.active !== undefined) cleanUpdates.active = updates.active !== false;

      const { data, error } = await this.supabase.from('activities').update(toSnake(cleanUpdates)).eq('id', id).select().single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    const activity = (this.data.activities || []).find(item => item.id === id);
    if (!activity) return undefined;
    Object.assign(activity, {
      ...updates,
      ...(updates.title !== undefined ? { title: fixMojibake(updates.title) } : {}),
      ...(updates.roomName !== undefined ? { roomName: fixMojibake(updates.roomName) } : {}),
      ...(updates.speakerName !== undefined ? { speakerName: fixMojibake(updates.speakerName) } : {}),
      ...(updates.workloadHours !== undefined ? { workloadHours: Number(updates.workloadHours) || 0 } : {}),
      ...(updates.active !== undefined ? { active: updates.active !== false } : {})
    });
    this.saveLocal();
    return activity;
  }

  async deleteActivity(id: string): Promise<boolean> {
    if (this.useSupabase) {
      const { error } = await this.supabase.from('activities').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    if (!this.data.activities) return false;
    const index = this.data.activities.findIndex(activity => activity.id === id);
    if (index === -1) return false;
    this.data.activities.splice(index, 1);
    this.data.activityAttendances = (this.data.activityAttendances || []).filter(att => att.activityId !== id);
    this.data.actionLogs = (this.data.actionLogs || []).filter(log => log.activityId !== id);
    this.data.certificates = (this.data.certificates || []).filter(cert => cert.activityId !== id);
    this.saveLocal();
    return true;
  }

  async getActivityAttendances(eventId?: string, activityId?: string): Promise<ActivityAttendance[]> {
    if (this.useSupabase) {
      let query = this.supabase.from('activity_attendances').select('*');
      if (eventId) query = query.eq('event_id', eventId);
      if (activityId) query = query.eq('activity_id', activityId);
      const { data, error } = await query;
      if (error) throw error;
      return toCamel(data) || [];
    }
    if (!this.data.activityAttendances) {
      this.data.activityAttendances = [];
    }
    let list = this.data.activityAttendances;
    if (eventId) {
      list = list.filter(att => att.eventId === eventId);
    }
    if (activityId) {
      list = list.filter(att => att.activityId === activityId);
    }
    return list;
  }

  async getActivityAttendance(activityId: string, participantId: string): Promise<ActivityAttendance | undefined> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('activity_attendances').select('*').eq('activity_id', activityId).eq('participant_id', participantId).single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    return (this.data.activityAttendances || []).find(att => att.activityId === activityId && att.participantId === participantId);
  }

  async createActivityAttendance(attendance: Omit<ActivityAttendance, 'id' | 'checkedAt'>): Promise<ActivityAttendance> {
    if (this.useSupabase) {
      const existing = await this.getActivityAttendance(attendance.activityId, attendance.participantId);
      if (existing) return existing;
      const newAttendance = {
        ...attendance,
        id: 'aa_' + Math.random().toString(36).substring(2, 9),
        checkedAt: new Date().toISOString()
      };
      const { data, error } = await this.supabase.from('activity_attendances').insert(toSnake(newAttendance)).select().single();
      if (error) throw error;
      return toCamel(data);
    }
    if (!this.data.activityAttendances) {
      this.data.activityAttendances = [];
    }
    const existing = await this.getActivityAttendance(attendance.activityId, attendance.participantId);
    if (existing) return existing;
    const newAttendance: ActivityAttendance = {
      ...attendance,
      id: 'aa_' + Math.random().toString(36).substring(2, 9),
      checkedAt: new Date().toISOString()
    };
    this.data.activityAttendances.push(newAttendance);
    this.saveLocal();
    return newAttendance;
  }

  async getCertificates(eventId?: string, participantId?: string): Promise<Certificate[]> {
    if (this.useSupabase) {
      let query = this.supabase.from('certificates').select('*');
      if (eventId) query = query.eq('event_id', eventId);
      if (participantId) query = query.eq('participant_id', participantId);
      const { data, error } = await query;
      if (error) throw error;
      return toCamel(data) || [];
    }
    if (!this.data.certificates) {
      this.data.certificates = [];
    }
    let list = this.data.certificates;
    if (eventId) {
      list = list.filter(cert => cert.eventId === eventId);
    }
    if (participantId) {
      list = list.filter(cert => cert.participantId === participantId);
    }
    return list;
  }

  async getCertificateById(id: string): Promise<Certificate | undefined> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('certificates').select('*').eq('id', id).single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    return (this.data.certificates || []).find(cert => cert.id === id);
  }

  private getNextCertificateCode(): string {
    const year = new Date().getFullYear();
    const maxNumber = (this.data.certificates || []).reduce((max, cert) => {
      const match = String(cert.certificateCode || '').match(/^CERT-\d{4}-(\d+)$/);
      const value = match ? Number(match[1]) : 0;
      return Math.max(max, value);
    }, 0);
    return `CERT-${year}-${String(maxNumber + 1).padStart(6, '0')}`;
  }

  private async getNextCertificateCodeSupabase(): Promise<string> {
    const { data, error } = await this.supabase.from('certificates').select('certificate_code');
    if (error) throw error;
    const year = new Date().getFullYear();
    const maxNumber = (data || []).reduce((max: number, cert: any) => {
      const match = String(cert.certificate_code || '').match(/^CERT-\d{4}-(\d+)$/);
      const value = match ? Number(match[1]) : 0;
      return Math.max(max, value);
    }, 0);
    return `CERT-${year}-${String(maxNumber + 1).padStart(6, '0')}`;
  }

  async createCertificate(certificate: Omit<Certificate, 'id' | 'issuedAt' | 'certificateCode'>): Promise<Certificate> {
    if (this.useSupabase) {
      const nextCode = await this.getNextCertificateCodeSupabase();
      const newCertificate = {
        ...certificate,
        id: 'cert_' + Math.random().toString(36).substring(2, 9),
        certificateCode: nextCode,
        totalHours: Number(certificate.totalHours) || 0,
        issuedAt: new Date().toISOString()
      };
      const { data, error } = await this.supabase.from('certificates').insert(toSnake(newCertificate)).select().single();
      if (error) throw error;
      return toCamel(data);
    }
    if (!this.data.certificates) {
      this.data.certificates = [];
    }
    const newCertificate: Certificate = {
      ...certificate,
      id: 'cert_' + Math.random().toString(36).substring(2, 9),
      certificateCode: this.getNextCertificateCode(),
      totalHours: Number(certificate.totalHours) || 0,
      issuedAt: new Date().toISOString()
    };
    this.data.certificates.push(newCertificate);
    this.saveLocal();
    return newCertificate;
  }

  private createDefaultCertificateTemplate(eventId: string): CertificateTemplate {
    const now = new Date().toISOString();
    return {
      id: 'ctpl_' + Math.random().toString(36).substring(2, 9),
      eventId,
      name: 'Template padrão',
      orientation: 'landscape',
      pageSize: 'A4',
      backgroundImageUrl: '',
      logoUrl: '',
      elements: [
        { id: 'ctel_participant', type: 'text', label: 'Nome do participante', placeholder: '{{participant.name}}', fontSize: 30, order: 1 },
        { id: 'ctel_event', type: 'text', label: 'Nome do evento', placeholder: '{{event.name}}', fontSize: 26, order: 2 },
        { id: 'ctel_activity', type: 'text', label: 'Nome da atividade', placeholder: '{{activity.title}}', fontSize: 24, order: 3 },
        { id: 'ctel_speaker', type: 'text', label: 'Palestrante', placeholder: '{{activity.speakerName}}', fontSize: 20, order: 4 },
        { id: 'ctel_hours', type: 'text', label: 'Carga horária', placeholder: '{{certificate.totalHours}} horas', fontSize: 22, order: 5 },
        { id: 'ctel_code', type: 'text', label: 'Código do certificado', placeholder: '{{certificate.code}}', fontSize: 12, order: 6 },
        { id: 'ctel_issued', type: 'text', label: 'Data de emissão', placeholder: '{{certificate.issuedAt}}', fontSize: 12, order: 7 }
      ],
      createdAt: now,
      updatedAt: now
    };
  }

  async getCertificateTemplate(eventId: string): Promise<CertificateTemplate> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('certificate_templates').select('*').eq('event_id', eventId).single();
      if (error) {
        if (error.code === 'PGRST116') {
          const template = this.createDefaultCertificateTemplate(eventId);
          const { data: newTemplate, error: insertError } = await this.supabase.from('certificate_templates').insert(toSnake(template)).select().single();
          if (insertError) throw insertError;
          return toCamel(newTemplate);
        }
        throw error;
      }
      return toCamel(data);
    }
    if (!this.data.certificateTemplates) {
      this.data.certificateTemplates = [];
    }

    let template = this.data.certificateTemplates.find(item => item.eventId === eventId);
    if (!template) {
      template = this.createDefaultCertificateTemplate(eventId);
      this.data.certificateTemplates.push(template);
      this.saveLocal();
    }

    return template;
  }

  async saveCertificateTemplate(eventId: string, input: Partial<CertificateTemplate>): Promise<CertificateTemplate> {
    if (this.useSupabase) {
      const existing = await this.getCertificateTemplate(eventId);
      const updated = {
        ...existing,
        name: String(input.name || existing.name || 'Template padrão').trim() || 'Template padrão',
        orientation: input.orientation === 'portrait' ? 'portrait' : 'landscape',
        pageSize: input.pageSize === 'A5' ? 'A5' : 'A4',
        backgroundImageUrl: String(input.backgroundImageUrl || ''),
        logoUrl: String(input.logoUrl || ''),
        elements: Array.isArray(input.elements) && input.elements.length > 0 ? input.elements : existing.elements,
        updatedAt: new Date().toISOString()
      };
      const { data, error } = await this.supabase.from('certificate_templates').update(toSnake(updated)).eq('id', existing.id).select().single();
      if (error) throw error;
      return toCamel(data);
    }
    if (!this.data.certificateTemplates) {
      this.data.certificateTemplates = [];
    }

    const existing = await this.getCertificateTemplate(eventId);
    const updated: CertificateTemplate = {
      ...existing,
      name: String(input.name || existing.name || 'Template padrão').trim() || 'Template padrão',
      orientation: input.orientation === 'portrait' ? 'portrait' : 'landscape',
      pageSize: input.pageSize === 'A5' ? 'A5' : 'A4',
      backgroundImageUrl: String(input.backgroundImageUrl || ''),
      logoUrl: String(input.logoUrl || ''),
      elements: Array.isArray(input.elements) && input.elements.length > 0 ? input.elements : existing.elements,
      updatedAt: new Date().toISOString()
    };

    this.data.certificateTemplates = this.data.certificateTemplates.map(template =>
      template.id === existing.id ? updated : template
    );
    this.saveLocal();
    return updated;
  }

  // --- Participant Fields CRUD ---
  async getParticipantFields(): Promise<ParticipantField[]> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('participant_fields').select('*');
      if (error) throw error;
      const list = toCamel(data) || [];
      return list.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    }
    if (!this.data.participantFields) {
      this.data.participantFields = DEFAULT_PARTICIPANT_FIELDS;
    }
    return this.data.participantFields.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  async saveParticipantFields(fields: ParticipantField[]): Promise<ParticipantField[]> {
    if (this.useSupabase) {
      const mapped = fields.map(f => toSnake(f));
      const { error } = await this.supabase.from('participant_fields').upsert(mapped);
      if (error) throw error;
      return fields;
    }
    this.data.participantFields = fields;
    this.saveLocal();
    return this.data.participantFields;
  }

  // --- Areas & Access Control ---
  async getAreas(eventId?: string): Promise<Area[]> {
    if (this.useSupabase) {
      let query = this.supabase.from('areas').select('*');
      if (eventId) {
        query = query.eq('event_id', eventId);
      }
      const { data, error } = await query;
      if (error) throw error;
      
      const list = toCamel(data) || [];
      return list.map((area: any) => ({
        ...area,
        event_id: area.eventId,
        isActive: area.active,
        is_active: area.active,
        created_at: area.createdAt
      }));
    }
    if (!this.data.areas) {
      this.data.areas = [];
    }
    if (eventId) {
      return this.data.areas.filter(a => a.eventId === eventId || a.event_id === eventId);
    }
    return this.data.areas;
  }

  async getAreaById(id: string): Promise<Area | undefined> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('areas').select('*').eq('id', id).single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      const area = toCamel(data);
      return {
        ...area,
        event_id: area.eventId,
        isActive: area.active,
        is_active: area.active,
        created_at: area.createdAt
      };
    }
    return (this.data.areas || []).find(a => a.id === id);
  }

  async createArea(areaData: { name: string; color?: string; eventId?: string; event_id?: string; active?: boolean; isActive?: boolean; is_active?: boolean }): Promise<Area> {
    if (this.useSupabase) {
      const eId = areaData.eventId || areaData.event_id || 'e1';
      const active = areaData.active !== undefined ? areaData.active : (areaData.isActive !== undefined ? areaData.isActive : (areaData.is_active !== undefined ? areaData.is_active : true));
      const dateStr = new Date().toISOString();

      const newArea = {
        id: 'area_' + Math.random().toString(36).substring(2, 9),
        name: areaData.name,
        color: areaData.color || '#00E545',
        eventId: eId,
        active,
        createdAt: dateStr
      };

      const { data, error } = await this.supabase.from('areas').insert(toSnake(newArea)).select().single();
      if (error) throw error;
      
      const area = toCamel(data);
      return {
        ...area,
        event_id: area.eventId,
        isActive: area.active,
        is_active: area.active,
        created_at: area.createdAt
      };
    }
    if (!this.data.areas) {
      this.data.areas = [];
    }
    const eId = areaData.eventId || areaData.event_id || 'e1';
    const active = areaData.active !== undefined ? areaData.active : (areaData.isActive !== undefined ? areaData.isActive : (areaData.is_active !== undefined ? areaData.is_active : true));
    const dateStr = new Date().toISOString();

    const newArea: Area = {
      id: 'area_' + Math.random().toString(36).substring(2, 9),
      name: areaData.name,
      color: areaData.color || '#00E545',
      eventId: eId,
      event_id: eId,
      active,
      isActive: active,
      is_active: active,
      createdAt: dateStr,
      created_at: dateStr
    };

    this.data.areas.push(newArea);
    this.saveLocal();
    return newArea;
  }

  async updateArea(id: string, areaData: Partial<Area>): Promise<Area | undefined> {
    if (this.useSupabase) {
      const updates: any = {};
      if (areaData.name !== undefined) updates.name = areaData.name;
      if (areaData.color !== undefined) updates.color = areaData.color;
      if (areaData.eventId !== undefined || areaData.event_id !== undefined) {
        updates.event_id = areaData.eventId || areaData.event_id;
      }
      if (areaData.active !== undefined || areaData.isActive !== undefined || areaData.is_active !== undefined) {
        updates.active = areaData.active !== undefined ? areaData.active : (areaData.isActive !== undefined ? areaData.isActive : areaData.is_active);
      }

      const { data, error } = await this.supabase.from('areas').update(updates).eq('id', id).select().single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      
      const area = toCamel(data);
      return {
        ...area,
        event_id: area.eventId,
        isActive: area.active,
        is_active: area.active,
        created_at: area.createdAt
      };
    }
    if (!this.data.areas) return undefined;
    const index = this.data.areas.findIndex(a => a.id === id);
    if (index === -1) return undefined;

    const current = this.data.areas[index];
    const updated = {
      ...current,
      ...areaData
    };

    if (areaData.name !== undefined) updated.name = areaData.name;
    if (areaData.eventId !== undefined || areaData.event_id !== undefined) {
      const val = areaData.eventId || areaData.event_id;
      updated.eventId = val;
      updated.event_id = val;
    }
    if (areaData.active !== undefined || areaData.isActive !== undefined || areaData.is_active !== undefined) {
      const val = areaData.active !== undefined ? areaData.active : (areaData.isActive !== undefined ? areaData.isActive : areaData.is_active);
      updated.active = val;
      updated.isActive = val;
      updated.is_active = val;
    }

    this.data.areas[index] = updated;
    this.saveLocal();
    return updated;
  }

  async deleteArea(id: string): Promise<boolean> {
    if (this.useSupabase) {
      const { error } = await this.supabase.from('areas').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    if (!this.data.areas) return false;
    const index = this.data.areas.findIndex(a => a.id === id);
    if (index === -1) return false;

    this.data.areas.splice(index, 1);
    this.saveLocal();
    return true;
  }

  async createAreaAccessLog(log: Omit<AreaAccessLog, 'id' | 'timestamp'>): Promise<AreaAccessLog> {
    if (this.useSupabase) {
      const newLog = {
        ...log,
        id: 'alog_' + Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString()
      };
      const { data, error } = await this.supabase.from('area_access_logs').insert(toSnake(newLog)).select().single();
      if (error) throw error;
      return toCamel(data);
    }
    if (!this.data.areaAccessLogs) {
      this.data.areaAccessLogs = [];
    }
    const newLog: AreaAccessLog = {
      ...log,
      id: 'alog_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString()
    };
    this.data.areaAccessLogs.push(newLog);
    this.saveLocal();
    return newLog;
  }

  async getAreaAccessLogs(): Promise<AreaAccessLog[]> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('area_access_logs').select('*');
      if (error) throw error;
      return toCamel(data) || [];
    }
    return this.data.areaAccessLogs || [];
  }

  // --- AccessProfile CRUD ---
  async getAccessProfiles(eventId?: string): Promise<AccessProfile[]> {
    if (this.useSupabase) {
      let query = this.supabase.from('access_profiles').select('*');
      if (eventId) {
        query = query.eq('event_id', eventId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return toCamel(data) || [];
    }
    if (!this.data.accessProfiles) {
      this.data.accessProfiles = [];
    }
    if (eventId) {
      return this.data.accessProfiles.filter(ap => ap.eventId === eventId || ap.event_id === eventId);
    }
    return this.data.accessProfiles;
  }

  async getAccessProfileById(id: string): Promise<AccessProfile | undefined> {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('access_profiles').select('*').eq('id', id).single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    if (!this.data.accessProfiles) {
      this.data.accessProfiles = [];
    }
    return this.data.accessProfiles.find(ap => ap.id === id);
  }

  async createAccessProfile(profileData: Omit<AccessProfile, 'id'>): Promise<AccessProfile> {
    if (this.useSupabase) {
      const newProfile = {
        ...profileData,
        id: 'ap_' + Math.random().toString(36).substring(2, 9),
        eventId: profileData.eventId || profileData.event_id
      };
      const { data, error } = await this.supabase.from('access_profiles').insert(toSnake(newProfile)).select().single();
      if (error) throw error;
      return toCamel(data);
    }
    if (!this.data.accessProfiles) {
      this.data.accessProfiles = [];
    }
    const newProfile: AccessProfile = {
      ...profileData,
      id: 'ap_' + Math.random().toString(36).substring(2, 9),
      eventId: profileData.eventId || profileData.event_id,
      event_id: profileData.eventId || profileData.event_id
    };
    this.data.accessProfiles.push(newProfile);
    this.saveLocal();
    return newProfile;
  }

  async updateAccessProfile(id: string, profileData: Partial<AccessProfile>): Promise<AccessProfile | undefined> {
    if (this.useSupabase) {
      const updates = toSnake(profileData);
      const { data, error } = await this.supabase.from('access_profiles').update(updates).eq('id', id).select().single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return toCamel(data);
    }
    if (!this.data.accessProfiles) return undefined;
    const index = this.data.accessProfiles.findIndex(ap => ap.id === id);
    if (index === -1) return undefined;

    const current = this.data.accessProfiles[index];
    const updated = {
      ...current,
      ...profileData,
      eventId: profileData.eventId !== undefined ? profileData.eventId : (profileData.event_id !== undefined ? profileData.event_id : current.eventId),
      event_id: profileData.eventId !== undefined ? profileData.eventId : (profileData.event_id !== undefined ? profileData.event_id : current.event_id)
    };

    if (profileData.area_ids !== undefined) {
      updated.area_ids = profileData.area_ids;
    }

    this.data.accessProfiles[index] = updated;
    this.saveLocal();
    return updated;
  }

  async deleteAccessProfile(id: string): Promise<boolean> {
    if (this.useSupabase) {
      const { error } = await this.supabase.from('access_profiles').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    if (!this.data.accessProfiles) return false;
    const index = this.data.accessProfiles.findIndex(ap => ap.id === id);
    if (index === -1) return false;

    this.data.accessProfiles.splice(index, 1);
    this.saveLocal();
    return true;
  }
}

export const db = new Database();
