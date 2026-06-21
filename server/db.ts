import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { User, Event, Participant, CloakroomItem, UserRole, ParticipantCategory, CheckIn, CheckInLog, ParticipantField, Organization, Area, AreaAccessLog, AccessProfile, EventUser, ActionLog, Activity, ActivityAttendance, Certificate } from '../src/types';

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
  participantFields?: ParticipantField[];
  areas?: Area[];
  areaAccessLogs?: AreaAccessLog[];
  accessProfiles?: AccessProfile[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'db.json');

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
    passwordHash: 'admin123',
    organizationId: 'org1',
    createdAt: new Date('2026-01-01T10:00:00Z').toISOString()
  },
  {
    id: 'u2',
    name: 'Supervisor de Evento',
    email: 'supervisor@credencia.com',
    role: 'SUPERVISOR',
    pin: '2222',
    passwordHash: 'sup123',
    organizationId: 'org1',
    createdAt: new Date('2026-01-02T11:00:00Z').toISOString()
  },
  {
    id: 'u3',
    name: 'Atendente da Recepção',
    email: 'atendente@credencia.com',
    role: 'ATENDENTE',
    pin: '3333',
    passwordHash: 'at123',
    organizationId: 'org1',
    createdAt: new Date('2026-01-03T12:00:00Z').toISOString()
  },
  {
    id: 'u4',
    name: 'Administrador Beta',
    email: 'admin@beta.com',
    role: 'ADMIN',
    pin: '4444',
    passwordHash: 'beta123',
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

class Database {
  private data: DBSchema;

  constructor() {
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
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database:', e);
    }
  }

  // --- Organizations CRUD ---
  async getOrganizations(): Promise<Organization[]> {
    return this.data.organizations || DEFAULT_ORGANIZATIONS;
  }

  async getOrganizationById(id: string): Promise<Organization | undefined> {
    return (this.data.organizations || DEFAULT_ORGANIZATIONS).find(org => org.id === id);
  }

  async createOrganization(org: Omit<Organization, 'id' | 'createdAt'>): Promise<Organization> {
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
    if (organizationId) {
      return this.data.users.filter(u => u.organizationId === organizationId);
    }
    return this.data.users;
  }

  async getUserByEmail(email: string): Promise<DBUser | undefined> {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  async getUserById(id: string): Promise<DBUser | undefined> {
    return this.data.users.find(u => u.id === id);
  }

  async createUser(user: Omit<DBUser, 'id' | 'createdAt'>): Promise<DBUser> {
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
    const user = this.data.users.find(u => u.id === id);
    if (!user) return undefined;
    Object.assign(user, updates);
    this.saveLocal();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
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
    const links = this.data.eventUsers || [];
    if (eventId) {
      return links.filter(eu => eu.eventId === eventId);
    }
    return links;
  }

  async getEventUserById(id: string): Promise<EventUser | undefined> {
    return (this.data.eventUsers || []).find(eu => eu.id === id);
  }

  async getEventUser(eventId: string, userId: string): Promise<EventUser | undefined> {
    return (this.data.eventUsers || []).find(eu => eu.eventId === eventId && eu.userId === userId);
  }

  async createEventUser(link: Omit<EventUser, 'id'>): Promise<EventUser> {
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
    const link = (this.data.eventUsers || []).find(eu => eu.id === id);
    if (!link) return undefined;
    Object.assign(link, updates);
    this.saveLocal();
    return link;
  }

  async deleteEventUser(id: string): Promise<boolean> {
    if (!this.data.eventUsers) return false;
    const index = this.data.eventUsers.findIndex(eu => eu.id === id);
    if (index === -1) return false;
    this.data.eventUsers.splice(index, 1);
    this.saveLocal();
    return true;
  }

  // --- Events CRUD ---
  async getEvents(organizationId?: string): Promise<Event[]> {
    if (organizationId) {
      return this.data.events.filter(e => e.organizationId === organizationId);
    }
    return this.data.events;
  }

  async getEventById(id: string): Promise<Event | undefined> {
    return this.data.events.find(e => e.id === id);
  }

  async createEvent(event: Omit<Event, 'id' | 'createdAt'>): Promise<Event> {
    const newEvent: Event = {
      ...event,
      id: 'e_' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    this.data.events.push(newEvent);
    this.saveLocal();
    return newEvent;
  }

  async updateEvent(id: string, updates: Partial<Omit<Event, 'id' | 'createdAt'>>): Promise<Event | undefined> {
    const event = this.data.events.find(e => e.id === id);
    if (!event) return undefined;
    Object.assign(event, updates);
    this.saveLocal();
    return event;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const index = this.data.events.findIndex(e => e.id === id);
    if (index === -1) return false;
    this.data.events.splice(index, 1);
    this.data.eventUsers = (this.data.eventUsers || []).filter(eu => eu.eventId !== id);
    this.data.actionLogs = (this.data.actionLogs || []).filter(log => log.eventId !== id);
    this.data.activities = (this.data.activities || []).filter(activity => activity.eventId !== id);
    this.data.activityAttendances = (this.data.activityAttendances || []).filter(att => att.eventId !== id);
    this.data.certificates = (this.data.certificates || []).filter(cert => cert.eventId !== id);
    this.data.participants = this.data.participants.filter(p => p.eventId !== id);
    this.data.cloakroom = this.data.cloakroom.filter(c => c.eventId !== id);
    this.saveLocal();
    return true;
  }

  // --- Participants CRUD ---
  async getParticipants(eventId?: string): Promise<Participant[]> {
    if (eventId) {
      return this.data.participants.filter(p => p.eventId === eventId);
    }
    return this.data.participants;
  }

  async getParticipantById(id: string): Promise<Participant | undefined> {
    if (!id) return undefined;
    const cleanId = id.trim().toLowerCase();
    return this.data.participants.find(p => p.id?.trim().toLowerCase() === cleanId);
  }

  async getParticipantByTicketCode(code: string): Promise<Participant | undefined> {
    if (!code) return undefined;
    const cleanCode = code.trim().toLowerCase();
    return this.data.participants.find(p => p.ticketCode?.trim().toLowerCase() === cleanCode);
  }

  async getParticipantByCpfAndEvent(cpf: string, eventId: string): Promise<Participant | undefined> {
    if (!cpf) return undefined;
    const cleanCpf = cpf.replace(/\D/g, '');
    if (!cleanCpf) return undefined;
    return this.data.participants.find(
      p => p.eventId === eventId && p.cpf.replace(/\D/g, '') === cleanCpf
    );
  }

  async createParticipant(p: Omit<Participant, 'id' | 'createdAt' | 'checkedIn' | 'checkedInAt' | 'ticketCode'> & { ticketCode?: string; checkedIn?: boolean; checkedInAt?: string }): Promise<Participant> {
    const defaultCode = 'TKT-' + p.eventId.toUpperCase() + '-' + p.category.substring(0, 3).toUpperCase() + '-' + Math.floor(10000 + Math.random() * 90000);
    const allowedAreaIds = Array.isArray(p.allowedAreaIds)
      ? p.allowedAreaIds
      : (Array.isArray(p.allowedAreas) ? p.allowedAreas : []);
    const newParticipant: Participant = {
      ...p,
      id: 'p_' + Math.random().toString(36).substring(2, 9),
      checkedIn: p.checkedIn || false,
      checkedInAt: p.checkedInAt || (p.checkedIn ? new Date().toISOString() : undefined),
      ticketCode: p.ticketCode || defaultCode,
      company: p.company || '',
      allowedAreaIds,
      allowedAreas: Array.isArray(p.allowedAreas) ? p.allowedAreas : allowedAreaIds,
      createdAt: new Date().toISOString()
    };
    this.data.participants.push(newParticipant);
    this.saveLocal();
    return newParticipant;
  }

  async createParticipantsBatch(batch: Array<Omit<Participant, 'id' | 'createdAt' | 'checkedIn' | 'checkedInAt' | 'ticketCode'>>): Promise<Participant[]> {
    const created: Participant[] = [];
    for (const item of batch) {
      const existing = await this.getParticipantByCpfAndEvent(item.cpf, item.eventId);
      if (!existing) {
        const added = await this.createParticipant(item);
        created.push(added);
      }
    }
    return created;
  }

  async updateParticipant(id: string, updates: Partial<Omit<Participant, 'id' | 'createdAt'>>): Promise<Participant | undefined> {
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
    const index = this.data.participants.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.data.participants.splice(index, 1);
    this.data.actionLogs = (this.data.actionLogs || []).filter(log => log.participantId !== id);
    this.data.activityAttendances = (this.data.activityAttendances || []).filter(att => att.participantId !== id);
    this.data.certificates = (this.data.certificates || []).filter(cert => cert.participantId !== id);
    this.saveLocal();
    return true;
  }

  async performCheckIn(id: string, checkInState: boolean): Promise<Participant | undefined> {
    const p = this.data.participants.find(p => p.id === id);
    if (!p) return undefined;
    p.checkedIn = checkInState;
    p.checkedInAt = checkInState ? new Date().toISOString() : undefined;

    if (!this.data.checkins) {
      this.data.checkins = [];
    }

    if (checkInState) {
      const exists = this.data.checkins.some(c => c.userId === id && c.eventId === p.eventId);
      if (!exists) {
        this.data.checkins.push({
          id: 'chi_' + Math.random().toString(36).substring(2, 11),
          userId: id,
          eventId: p.eventId,
          checkInAt: p.checkedInAt || new Date().toISOString()
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
    return (this.data.checkins || []).find(c => c.userId === userId && c.eventId === eventId);
  }

  async createCheckIn(userId: string, eventId: string): Promise<CheckIn> {
    if (!this.data.checkins) {
      this.data.checkins = [];
    }
    const newCheckIn: CheckIn = {
      id: 'chi_' + Math.random().toString(36).substring(2, 11),
      userId,
      eventId,
      checkInAt: new Date().toISOString()
    };
    this.data.checkins.push(newCheckIn);

    // Sync Participant model
    const p = this.data.participants.find(p => p.id === userId && p.eventId === eventId);
    if (p) {
      p.checkedIn = true;
      p.checkedInAt = newCheckIn.checkInAt;
    }

    this.saveLocal();
    return newCheckIn;
  }

  async getCheckInsByEvent(eventId: string): Promise<CheckIn[]> {
    return (this.data.checkins || []).filter(c => c.eventId === eventId);
  }

  async getCheckInsByUser(userId: string): Promise<CheckIn[]> {
    return (this.data.checkins || []).filter(c => c.userId === userId);
  }

  // --- Cloakroom (Chapelaria) CRUD ---
  async getCloakroom(eventId?: string): Promise<CloakroomItem[]> {
    if (eventId) {
      return this.data.cloakroom.filter(c => c.eventId === eventId);
    }
    return this.data.cloakroom;
  }

  async getCloakroomItemById(id: string): Promise<CloakroomItem | undefined> {
    return this.data.cloakroom.find(c => c.id === id);
  }

  async getNextTagNumber(eventId: string): Promise<number> {
    const eventItems = await this.getCloakroom(eventId);
    if (eventItems.length === 0) return 101;
    const maxTag = Math.max(...eventItems.map(i => i.tagNumber));
    return maxTag + 1;
  }

  async createCloakroomItem(item: Omit<CloakroomItem, 'id' | 'tagNumber' | 'status' | 'registeredAt' | 'returnedAt' | 'volumeTags'>): Promise<CloakroomItem> {
    const nextTag = await this.getNextTagNumber(item.eventId);
    const volumeCount = Math.max(1, Math.min(5, Number(item.volumeCount) || 1));
    const newItem: CloakroomItem = {
      ...item,
      id: 'c_' + Math.random().toString(36).substring(2, 9),
      tagNumber: nextTag,
      volumeCount,
      volumeTags: Array.from({ length: volumeCount }, (_, index) => `${nextTag}-${index + 1}`),
      status: 'guardado',
      registeredAt: new Date().toISOString()
    };
    this.data.cloakroom.push(newItem);
    this.saveLocal();
    return newItem;
  }

  async collectCloakroomItem(id: string, returnedBy?: { userId?: string; name?: string }): Promise<CloakroomItem | undefined> {
    const returnedAt = new Date().toISOString();
    const item = this.data.cloakroom.find(c => c.id === id);
    if (!item) return undefined;
    item.status = 'retirado';
    item.returnedAt = returnedAt;
    item.returnedByUserId = returnedBy?.userId;
    item.returnedByName = returnedBy?.name;
    this.saveLocal();
    return item;
  }

  async deleteCloakroomItem(id: string): Promise<boolean> {
    const index = this.data.cloakroom.findIndex(c => c.id === id);
    if (index === -1) return false;
    this.data.cloakroom.splice(index, 1);
    this.saveLocal();
    return true;
  }

  // --- PIN AUTHENTICATION & AUDIT LOGS ---
  async getUserByPin(pin: string): Promise<DBUser | undefined> {
    if (!pin) return undefined;
    return this.data.users.find(u => u.pin === pin);
  }

  async createLog(log: Omit<CheckInLog, 'id' | 'timestamp'>): Promise<CheckInLog> {
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
    let list = this.data.actionLogs || [];
    if (eventId) {
      list = list.filter(log => log.eventId === eventId);
    }
    return list;
  }

  // --- Activities & Attendance ---
  async getActivities(eventId?: string): Promise<Activity[]> {
    if (!this.data.activities) {
      this.data.activities = [];
    }
    if (eventId) {
      return this.data.activities.filter(activity => activity.eventId === eventId);
    }
    return this.data.activities;
  }

  async getActivityById(id: string): Promise<Activity | undefined> {
    return (this.data.activities || []).find(activity => activity.id === id);
  }

  async createActivity(activity: Omit<Activity, 'id' | 'createdAt'>): Promise<Activity> {
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
    return (this.data.activityAttendances || []).find(att => att.activityId === activityId && att.participantId === participantId);
  }

  async createActivityAttendance(attendance: Omit<ActivityAttendance, 'id' | 'checkedAt'>): Promise<ActivityAttendance> {
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

  async createCertificate(certificate: Omit<Certificate, 'id' | 'issuedAt' | 'certificateCode'>): Promise<Certificate> {
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

  // --- Participant Fields CRUD ---
  async getParticipantFields(): Promise<ParticipantField[]> {
    if (!this.data.participantFields) {
      this.data.participantFields = DEFAULT_PARTICIPANT_FIELDS;
    }
    return this.data.participantFields.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  async saveParticipantFields(fields: ParticipantField[]): Promise<ParticipantField[]> {
    this.data.participantFields = fields;
    this.saveLocal();
    return this.data.participantFields;
  }

  // --- Areas & Access Control ---
  async getAreas(eventId?: string): Promise<Area[]> {
    if (!this.data.areas) {
      this.data.areas = [];
    }
    if (eventId) {
      return this.data.areas.filter(a => a.eventId === eventId || a.event_id === eventId);
    }
    return this.data.areas;
  }

  async getAreaById(id: string): Promise<Area | undefined> {
    return (this.data.areas || []).find(a => a.id === id);
  }

  async createArea(areaData: { name: string; color?: string; eventId?: string; event_id?: string; active?: boolean; isActive?: boolean; is_active?: boolean }): Promise<Area> {
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
    if (!this.data.areas) return undefined;
    const index = this.data.areas.findIndex(a => a.id === id);
    if (index === -1) return undefined;

    const current = this.data.areas[index];
    const updated = {
      ...current,
      ...areaData
    };

    // Keep compatibility for event_id, is_active, created_at
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
    if (!this.data.areas) return false;
    const index = this.data.areas.findIndex(a => a.id === id);
    if (index === -1) return false;

    this.data.areas.splice(index, 1);
    this.saveLocal();
    return true;
  }

  async createAreaAccessLog(log: Omit<AreaAccessLog, 'id' | 'timestamp'>): Promise<AreaAccessLog> {
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
    return this.data.areaAccessLogs || [];
  }

  // --- AccessProfile CRUD ---
  async getAccessProfiles(eventId?: string): Promise<AccessProfile[]> {
    if (!this.data.accessProfiles) {
      this.data.accessProfiles = [];
    }
    if (eventId) {
      return this.data.accessProfiles.filter(ap => ap.eventId === eventId || ap.event_id === eventId);
    }
    return this.data.accessProfiles;
  }

  async getAccessProfileById(id: string): Promise<AccessProfile | undefined> {
    if (!this.data.accessProfiles) {
      this.data.accessProfiles = [];
    }
    return this.data.accessProfiles.find(ap => ap.id === id);
  }

  async createAccessProfile(profileData: Omit<AccessProfile, 'id'>): Promise<AccessProfile> {
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
    if (!this.data.accessProfiles) return false;
    const index = this.data.accessProfiles.findIndex(ap => ap.id === id);
    if (index === -1) return false;

    this.data.accessProfiles.splice(index, 1);
    this.saveLocal();
    return true;
  }
}

export const db = new Database();
