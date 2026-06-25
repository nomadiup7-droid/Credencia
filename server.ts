import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { UserRole, EventUserRole, ParticipantCategory, ActionLogAction, CertificateTemplate } from './src/types';
import checkInRouter from './routes/checkin';

const app = express();
const PORT = 3000;

// Enable standard body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount custom check-in router
app.use('/api/checkin', checkInRouter);

// Simple Auth Middleware
const authenticateToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.status(401).json({ error: 'Token de autenticação ausente' });
    return;
  }

  const token = authHeader.split(' ')[1]; // "Bearer [token]"
  if (!token) {
    res.status(401).json({ error: 'Token malformado' });
    return;
  }

  // Token format: "credencia-token-[userId]-[role]-[email]"
  const parts = token.split('-');
  if (parts[0] !== 'credencia' || parts[1] !== 'token' || parts.length < 5) {
    res.status(403).json({ error: 'Token inválido ou expirado' });
    return;
  }

  const userId = parts[2];
  const role = parts[3] as UserRole;
  const email = parts.slice(4).join('-');

  const user = await db.getUserById(userId);
  if (!user || user.email.toLowerCase() !== email.toLowerCase() || user.role !== role) {
    res.status(403).json({ error: 'Acesso não autorizado' });
    return;
  }

  // Attach user telemetry to request with organizationId
  (req as any).user = { 
    id: user.id, 
    name: user.name, 
    email: user.email, 
    role: user.role, 
    permissions: user.permissions || [],
    organizationId: user.organizationId || 'org1' 
  };
  next();
};

// Require Admin Role for specific routes (Allowing all authenticated organization members to access in order to view and manage everything)
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  if (!user) {
    res.status(403).json({ error: 'Não autenticado ou acesso negado' });
    return;
  }
  next();
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['CAN_CHECKIN', 'CAN_CREATE_PARTICIPANT', 'CAN_REPRINT', 'CAN_OVERRIDE_CHECKIN'],
  SUPERVISOR: ['CAN_CHECKIN', 'CAN_CREATE_PARTICIPANT', 'CAN_REPRINT', 'CAN_OVERRIDE_CHECKIN'],
  ATENDENTE: ['CAN_CHECKIN', 'CAN_REPRINT'],
  admin: ['CAN_CHECKIN', 'CAN_CREATE_PARTICIPANT', 'CAN_REPRINT', 'CAN_OVERRIDE_CHECKIN'],
  operator: ['CAN_CHECKIN', 'CAN_REPRINT'],
  CHECKIN: ['CAN_CHECKIN'],
  CHECKIN_CADASTRO: ['CAN_CHECKIN', 'CAN_CREATE_PARTICIPANT', 'CAN_REPRINT']
};

const SYSTEM_PERMISSIONS = [
  'events.view', 'events.create', 'events.edit', 'events.delete', 'events.configure',
  'participants.view', 'participants.create', 'participants.edit', 'participants.delete', 'participants.import', 'participants.export',
  'checkin.access', 'checkin.perform', 'checkin.reprint', 'checkin.createParticipant',
  'access.scanQr', 'access.rooms', 'access.restaurants', 'access.shows', 'access.manageAreas',
  'cloakroom.checkin', 'cloakroom.checkout', 'cloakroom.reprint',
  'certificates.issue', 'certificates.manageActivities', 'certificates.editTemplate',
  'print.configureLabels', 'print.configureBadges', 'print.labels', 'print.badges',
  'reports.view', 'reports.exportExcel', 'reports.exportPdf',
  'operators.create', 'operators.edit', 'operators.delete', 'operators.managePermissions',
  'settings.general', 'settings.customFields', 'settings.importTemplates', 'settings.labelConfig', 'settings.badgeConfig', 'settings.certificateTemplates', 'settings.integrations', 'settings.backup'
] as const;

const ALL_SYSTEM_PERMISSIONS = [...SYSTEM_PERMISSIONS];

const uniquePermissions = (permissions?: string[]) =>
  [...new Set((permissions || []).filter(permission => ALL_SYSTEM_PERMISSIONS.includes(permission as any)))];

const permissionsForRole = (role?: string): string[] => {
  const normalized = String(role || '').toUpperCase();
  if (normalized === 'ADMIN' || role === 'admin') return ALL_SYSTEM_PERMISSIONS;
  if (normalized === 'SUPERVISOR') {
    return uniquePermissions([
      'events.view', 'participants.view', 'participants.create', 'participants.edit', 'participants.import', 'participants.export',
      'checkin.access', 'checkin.perform', 'checkin.reprint', 'checkin.createParticipant',
      'access.scanQr', 'access.rooms', 'access.restaurants', 'access.shows', 'access.manageAreas',
      'certificates.issue', 'certificates.manageActivities',
      'reports.view', 'reports.exportExcel'
    ]);
  }
  if (normalized === 'CHECKIN_CADASTRO') {
    return uniquePermissions([
      'events.view', 'participants.view', 'participants.create', 'participants.import',
      'checkin.access', 'checkin.perform', 'checkin.reprint', 'checkin.createParticipant',
      'certificates.issue'
    ]);
  }
  if (normalized === 'RELATORIO' || normalized === 'VISUALIZADOR') {
    return uniquePermissions(['events.view', 'participants.view', 'reports.view', 'reports.exportExcel', 'reports.exportPdf']);
  }
  if (normalized === 'CHECKIN' || normalized === 'ATENDENTE' || normalized === 'OPERATOR' || normalized === 'OPERADOR') {
    return uniquePermissions(['events.view', 'participants.view', 'checkin.access', 'checkin.perform', 'checkin.reprint']);
  }
  return [];
};

const resolveEventPermissions = async (user: any, eventId?: string): Promise<string[]> => {
  const globalRole = String(user?.role || '').toUpperCase();
  if (globalRole === 'ADMIN' || user?.role === 'admin') return ALL_SYSTEM_PERMISSIONS;

  if (eventId) {
    const eventLink = await db.getEventUser(eventId, user.id);
    if (eventLink?.active) {
      return uniquePermissions(eventLink.permissions?.length ? eventLink.permissions : permissionsForRole(eventLink.role));
    }
  }

  return uniquePermissions(user?.permissions?.length ? user.permissions : permissionsForRole(user?.role));
};

const hasEventPermission = async (user: any, eventId: string | undefined, permission: string) =>
  (await resolveEventPermissions(user, eventId)).includes(permission);

const canManageUsers = async (user: any, eventId?: string) => {
  const globalRole = String(user?.role || '').toUpperCase();
  if (globalRole === 'ADMIN' || user?.role === 'admin') return true;
  return hasEventPermission(user, eventId, 'operators.managePermissions');
};

const requireUserManagementPermission = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  const eventId = req.params.eventId;

  if (!user || !(await canManageUsers(user, eventId))) {
    res.status(403).json({ error: 'Acesso negado para gerenciar operadores e permissões' });
    return;
  }

  next();
};

const verifyPermission = (permission: string) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Operador não identificado' });
      return;
    }
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    if (!permissions.includes(permission)) {
      res.status(403).json({ error: `Acesso negado. Requer permissão ${permission}` });
      return;
    }
    next();
  };
};

const writeActionLog = async (log: { eventId?: string; userId?: string; participantId?: string; activityId?: string; ticketNumber?: number; action: ActionLogAction }) => {
  try {
    if (!log.eventId || !log.userId) return;
    await db.createActionLog({
      eventId: log.eventId,
      userId: log.userId,
      ...(log.participantId ? { participantId: log.participantId } : {}),
      ...(log.activityId ? { activityId: log.activityId } : {}),
      action: log.action
    });
  } catch (error) {
    console.error('ActionLog failed:', error);
  }
};

const writeLegacyLog = async (log: any) => {
  try {
    await db.createLog(log);
  } catch (error) {
    console.error('Legacy audit log failed:', error);
  }
};

const writeAreaAccessLog = async (log: any) => {
  try {
    await db.createAreaAccessLog(log);
  } catch (error) {
    console.error('Area access log failed:', error);
  }
};

const canCreateParticipantForEvent = async (user: any, eventId: string) => {
  const globalRole = String(user?.role || '').toUpperCase();
  if (globalRole === 'ADMIN' || user?.role === 'admin') return true;
  if (await hasEventPermission(user, eventId, 'participants.create')) return true;
  if (await hasEventPermission(user, eventId, 'checkin.createParticipant')) return true;

  const activeLinks = (await db.getEventUsers())
    .filter(link => link.userId === user.id && link.active);
  const eventLink = activeLinks.find(link => link.eventId === eventId);

  if (eventLink) {
    return eventLink.role === 'ADMIN' || eventLink.role === 'CHECKIN_CADASTRO';
  }

  return activeLinks.length === 0 && globalRole === 'CHECKIN_CADASTRO';
};

const requireParticipantCreatePermission = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  const eventId = req.params.eventId;

  if (!user || !eventId || !(await canCreateParticipantForEvent(user, eventId))) {
    res.status(403).json({ error: 'Usuário sem permissão para cadastrar participantes neste evento' });
    return;
  }

  next();
};

const canIssueCertificatesForEvent = async (user: any, eventId: string) => {
  const globalRole = String(user?.role || '').toUpperCase();
  if (globalRole === 'ADMIN' || user?.role === 'admin') return true;
  if (await hasEventPermission(user, eventId, 'certificates.issue')) return true;

  const eventLink = await db.getEventUser(eventId, user.id);
  if (eventLink?.active) {
    return eventLink.role === 'ADMIN' || eventLink.role === 'CHECKIN_CADASTRO';
  }

  return globalRole === 'CHECKIN_CADASTRO';
};

const requireCertificatePermission = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  const eventId = req.params.eventId || req.body?.eventId;

  if (!user || !eventId || !(await canIssueCertificatesForEvent(user, eventId))) {
    res.status(403).json({ error: 'Usuário sem permissão para emitir certificados neste evento' });
    return;
  }

  next();
};

const requireCertificateTemplateAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  const eventId = req.params.eventId;
  const globalRole = String(user?.role || '').toUpperCase();

  if (!user || !eventId) {
    res.status(403).json({ error: 'Usuário sem permissão para configurar template de certificado' });
    return;
  }

  const event = await db.getEventById(eventId);
  if (!event || event.organizationId !== user.organizationId) {
    res.status(404).json({ error: 'Evento não encontrado ou acesso restrito' });
    return;
  }

  const eventLink = await db.getEventUser(eventId, user.id);
  const isAdmin = globalRole === 'ADMIN' || user.role === 'admin' || (eventLink?.active === true && eventLink.role === 'ADMIN');
  const canEditTemplate = isAdmin || await hasEventPermission(user, eventId, 'certificates.editTemplate');
  if (!canEditTemplate) {
    res.status(403).json({ error: 'Apenas ADMIN pode configurar template de certificado' });
    return;
  }

  next();
};

const canManageAccessAreasForEvent = async (user: any, eventId?: string) => {
  const globalRole = String(user?.role || '').toUpperCase();
  if (globalRole === 'ADMIN' || user?.role === 'admin') return true;
  if (!eventId) return false;
  if (await hasEventPermission(user, eventId, 'access.manageAreas')) return true;

  const eventLink = await db.getEventUser(eventId, user.id);
  return eventLink?.active === true && eventLink.role === 'ADMIN';
};

const requireAccessAreaAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  const bodyEventId = req.body?.eventId || req.body?.event_id;
  const area = req.params.id ? await db.getAreaById(req.params.id) : undefined;
  const eventId = area?.eventId || area?.event_id || bodyEventId;

  if (!eventId) {
    res.status(400).json({ error: 'eventId é obrigatório para gerenciar áreas' });
    return;
  }

  const event = await db.getEventById(eventId);
  if (!event || event.organizationId !== user.organizationId) {
    res.status(404).json({ error: 'Evento não encontrado ou acesso restrito' });
    return;
  }

  if (!(await canManageAccessAreasForEvent(user, eventId))) {
    res.status(403).json({ error: 'Apenas ADMIN pode gerenciar áreas de acesso' });
    return;
  }

  (req as any).accessAreaEventId = eventId;
  next();
};

const requireActivityAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  const activity = req.params.id ? await db.getActivityById(req.params.id) : undefined;
  const eventId = activity?.eventId || req.params.eventId || req.body?.eventId;

  if (!eventId) {
    res.status(400).json({ error: 'eventId é obrigatório para gerenciar atividades' });
    return;
  }

  const event = await db.getEventById(eventId);
  if (!event || event.organizationId !== user.organizationId) {
    res.status(404).json({ error: 'Evento não encontrado ou acesso restrito' });
    return;
  }

  if (!(await canManageAccessAreasForEvent(user, eventId))) {
    res.status(403).json({ error: 'Apenas ADMIN pode gerenciar atividades' });
    return;
  }

  (req as any).activityEventId = eventId;
  (req as any).activityEvent = event;
  (req as any).activityRecord = activity;
  next();
};

// --- AUTHENTICATION ENDPOINTS ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    return;
  }

  const user = await db.getUserByEmail(email);
  if (!user || user.passwordHash !== password) {
    res.status(401).json({ error: 'E-mail ou senha inválidos' });
    return;
  }

  // Get organization details if available
  const org = await db.getOrganizationById(user.organizationId || 'org1');

  // Craft a simple token for identification
  const token = `credencia-token-${user.id}-${user.role}-${user.email}`;

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: uniquePermissions(user.permissions?.length ? user.permissions : permissionsForRole(user.role)),
      organizationId: user.organizationId || 'org1',
      organizationName: org ? org.name : 'Organização'
    }
  });
});

app.post('/api/auth/login-pin', async (req, res) => {
  const { pin } = req.body;

  if (!pin) {
    res.status(400).json({ error: 'PIN é obrigatório' });
    return;
  }

  const user = await db.getUserByPin(pin);
  if (!user) {
    res.status(401).json({ error: 'PIN incorreto. Acesso negado.' });
    return;
  }

  const org = await db.getOrganizationById(user.organizationId || 'org1');
  const token = `credencia-token-${user.id}-${user.role}-${user.email}`;
  const permissions = uniquePermissions(user.permissions?.length ? user.permissions : permissionsForRole(user.role));

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions,
      organizationId: user.organizationId || 'org1',
      organizationName: org ? org.name : 'Organização'
    }
  });
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  const remoteUser = (req as any).user;
  const org = await db.getOrganizationById(remoteUser.organizationId || 'org1');
  res.json({ 
    user: {
      ...remoteUser,
      permissions: await resolveEventPermissions(remoteUser),
      organizationName: org ? org.name : 'Organização'
    } 
  });
});

// --- PUBLIC SIGNUP ENDPOINT ---
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, role, orgName } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Nome, E-mail e Senha são obrigatórios' });
    return;
  }

  const existing = await db.getUserByEmail(email);
  if (existing) {
    res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail' });
    return;
  }

  // Dynamic organization onboarding for SaaS
  let targetOrgId = 'org1';
  let finalOrgName = 'Organização Alfa';
  if (orgName && String(orgName).trim() !== '') {
    const newOrg = await db.createOrganization({ name: String(orgName).trim() });
    targetOrgId = newOrg.id;
    finalOrgName = newOrg.name;
  } else {
    const org = await db.getOrganizationById('org1');
    if (org) {
      finalOrgName = org.name;
    }
  }

  let assignedRole: UserRole = 'CHECKIN';
  if (role) {
    const roleUpper = String(role).toUpperCase();
    if (['ADMIN', 'SUPERVISOR', 'CHECKIN', 'CHECKIN_CADASTRO', 'ATENDENTE'].includes(roleUpper)) {
      assignedRole = roleUpper as UserRole;
    } else if (roleUpper === 'OPERATOR') {
      assignedRole = 'CHECKIN_CADASTRO';
    } else if (roleUpper === 'ADMINISTRADOR') {
      assignedRole = 'ADMIN';
    }
  }
  const newUser = await db.createUser({
    name,
    email,
    passwordHash: password,
    role: assignedRole,
    organizationId: targetOrgId
  });

  const token = `credencia-token-${newUser.id}-${newUser.role}-${newUser.email}`;
  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      organizationId: targetOrgId,
      organizationName: finalOrgName
    }
  });
});

// --- USER MANAGEMENT ENDPOINTS ---

// Get all users (restricted to user managers)
app.get('/api/users', authenticateToken, requireUserManagementPermission, async (req, res) => {
  try {
    const requester = (req as any).user;
    const rawUsers = await db.getUsers(requester.organizationId);
    const users = rawUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      permissions: uniquePermissions(u.permissions?.length ? u.permissions : permissionsForRole(u.role)),
      createdAt: u.createdAt
    }));
    res.json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Erro de servidor ao buscar usuários' });
  }
});

// User manager manually creates a system user
app.post('/api/users', authenticateToken, requireUserManagementPermission, async (req, res) => {
  const { name, email, password, role, permissions } = req.body;
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    return;
  }

  const existing = await db.getUserByEmail(email);
  if (existing) {
    res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail' });
    return;
  }

  const user = (req as any).user;
  const createdUser = await db.createUser({
    name,
    email,
    passwordHash: password,
    role: role as UserRole,
    permissions: uniquePermissions(Array.isArray(permissions) && permissions.length ? permissions : permissionsForRole(role)),
    organizationId: user.organizationId || 'org1'
  });

  res.status(201).json({
    id: createdUser.id,
    name: createdUser.name,
    email: createdUser.email,
    role: createdUser.role,
    permissions: uniquePermissions(createdUser.permissions?.length ? createdUser.permissions : permissionsForRole(createdUser.role)),
    createdAt: createdUser.createdAt
  });
});

// Update user details (either the user updating themselves or Admin updating anyone)
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  const requester = (req as any).user;
  const targetId = req.params.id;
  const canManageTarget = await canManageUsers(requester);

  // Authorization check: User can only update themselves, unless they can manage users.
  if (!canManageTarget && requester.id !== targetId) {
    res.status(403).json({ error: 'Acesso negado. Você só pode atualizar seus próprios dados ou login.' });
    return;
  }

  const { name, email, password, role, permissions } = req.body;
  const user = await db.getUserById(targetId);
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado' });
    return;
  }

  // If email changes, check duplicate user email
  if (email && email.toLowerCase() !== user.email.toLowerCase()) {
    const existing = await db.getUserByEmail(email);
    if (existing) {
      res.status(400).json({ error: 'E-mail em uso por outro usuário' });
      return;
    }
  }

  const updates: any = {};
  if (name) updates.name = name;
  if (email) updates.email = email;
  if (password) updates.passwordHash = password;
  // Only managers can change another user's role and permissions.
  if (role && canManageTarget) {
    updates.role = role as UserRole;
  }
  if (Array.isArray(permissions) && canManageTarget) {
    updates.permissions = uniquePermissions(permissions);
  }

  const updatedUser = await db.updateUser(targetId, updates);
  if (!updatedUser) {
    res.status(404).json({ error: 'Erro ao atualizar usuário' });
    return;
  }

  res.json({
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    permissions: uniquePermissions(updatedUser.permissions?.length ? updatedUser.permissions : permissionsForRole(updatedUser.role)),
    createdAt: updatedUser.createdAt
  });
});

// Delete user account (restricted to Admin, and users can't delete themselves)
app.delete('/api/users/:id', authenticateToken, requireUserManagementPermission, async (req, res) => {
  const requester = (req as any).user;
  const targetId = req.params.id;

  if (requester.id === targetId) {
    res.status(400).json({ error: 'Você não pode excluir sua própria conta.' });
    return;
  }

  const deleted = await db.deleteUser(targetId);
  if (!deleted) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }

  res.json({ message: 'Usuário excluído com sucesso.' });
});

// --- EVENT USER LINKS ---
const EVENT_USER_ROLES: EventUserRole[] = ['ADMIN', 'CHECKIN_CADASTRO', 'CHECKIN', 'RELATORIO'];

app.get('/api/events/:eventId/users', authenticateToken, requireUserManagementPermission, async (req, res) => {
  const user = (req as any).user;
  const event = await db.getEventById(req.params.eventId);
  if (!event || event.organizationId !== user.organizationId) {
    res.status(404).json({ error: 'Evento não encontrado' });
    return;
  }

  const links = await db.getEventUsers(req.params.eventId);
  res.json(links.map(link => ({
    ...link,
    permissions: uniquePermissions(link.permissions?.length ? link.permissions : permissionsForRole(link.role))
  })));
});

app.post('/api/events/:eventId/users', authenticateToken, requireUserManagementPermission, async (req, res) => {
  const requester = (req as any).user;
  const { userId, role, active, permissions } = req.body;
  const eventId = req.params.eventId;

  const event = await db.getEventById(eventId);
  if (!event || event.organizationId !== requester.organizationId) {
    res.status(404).json({ error: 'Evento não encontrado' });
    return;
  }

  const targetUser = await db.getUserById(userId);
  if (!targetUser || targetUser.organizationId !== requester.organizationId) {
    res.status(404).json({ error: 'Usuário não encontrado' });
    return;
  }

  if (!EVENT_USER_ROLES.includes(role)) {
    res.status(400).json({ error: 'Permissão de evento inválida' });
    return;
  }

  const existing = await db.getEventUser(eventId, userId);
  if (existing) {
    const updated = await db.updateEventUser(existing.id, {
      role,
      permissions: uniquePermissions(Array.isArray(permissions) && permissions.length ? permissions : permissionsForRole(role)),
      active: active !== false
    });
    res.json(updated);
    return;
  }

  const created = await db.createEventUser({
    eventId,
    userId,
    role,
    permissions: uniquePermissions(Array.isArray(permissions) && permissions.length ? permissions : permissionsForRole(role)),
    active: active !== false
  });
  res.status(201).json(created);
});

app.put('/api/events/:eventId/users/:linkId', authenticateToken, requireUserManagementPermission, async (req, res) => {
  const requester = (req as any).user;
  const { role, active, permissions } = req.body;
  const eventId = req.params.eventId;

  const event = await db.getEventById(eventId);
  const link = await db.getEventUserById(req.params.linkId);
  if (!event || event.organizationId !== requester.organizationId || !link || link.eventId !== eventId) {
    res.status(404).json({ error: 'Vínculo não encontrado' });
    return;
  }

  if (role && !EVENT_USER_ROLES.includes(role)) {
    res.status(400).json({ error: 'Permissão de evento inválida' });
    return;
  }

  const updated = await db.updateEventUser(link.id, {
    ...(role ? { role } : {}),
    ...(Array.isArray(permissions) ? { permissions: uniquePermissions(permissions) } : {}),
    ...(active !== undefined ? { active: Boolean(active) } : {})
  });
  res.json(updated);
});

app.delete('/api/events/:eventId/users/:linkId', authenticateToken, requireUserManagementPermission, async (req, res) => {
  const requester = (req as any).user;
  const eventId = req.params.eventId;
  const event = await db.getEventById(eventId);
  const link = await db.getEventUserById(req.params.linkId);

  if (!event || event.organizationId !== requester.organizationId || !link || link.eventId !== eventId) {
    res.status(404).json({ error: 'Vínculo não encontrado' });
    return;
  }

  await db.deleteEventUser(link.id);
  res.json({ message: 'Vínculo removido com sucesso' });
});

// --- EVENTS ENDPOINTS ---
app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const events = await db.getEvents(user.organizationId);
    const isAdmin = String(user.role || '').toUpperCase() === 'ADMIN' || user.role === 'admin';

    if (isAdmin) {
      res.json(events.map(event => ({
        ...event,
        currentUserRole: 'ADMIN',
        currentUserPermissions: ALL_SYSTEM_PERMISSIONS
      })));
      return;
    }

    const activeLinks = (await db.getEventUsers())
      .filter(link => link.userId === user.id && link.active);
    const roleByEventId = new Map(activeLinks.map(link => [link.eventId, link.role]));
    const permissionsByEventId = new Map(activeLinks.map(link => [
      link.eventId,
      uniquePermissions(link.permissions?.length ? link.permissions : permissionsForRole(link.role))
    ]));
    const linkedEvents = events
      .filter(event => roleByEventId.has(event.id))
      .map(event => ({
        ...event,
        currentUserRole: roleByEventId.get(event.id),
        currentUserPermissions: permissionsByEventId.get(event.id)
      }));

    // Preserves existing operators while event-user links are still being configured.
    res.json(linkedEvents.length > 0 ? linkedEvents : events.map(event => ({
      ...event,
      currentUserRole: user.role,
      currentUserPermissions: uniquePermissions(user.permissions?.length ? user.permissions : permissionsForRole(user.role))
    })));
  } catch (error: any) {
    console.error('Error in GET /api/events:', error);
    res.status(500).json({ error: 'Erro de servidor ao carregar eventos' });
  }
});

app.get('/api/events/:id', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const event = await db.getEventById(req.params.id);
    if (!event || event.organizationId !== user.organizationId) {
      res.status(404).json({ error: 'Evento não encontrado' });
      return;
    }
    const isAdmin = String(user.role || '').toUpperCase() === 'ADMIN' || user.role === 'admin';
    if (isAdmin) {
      res.json({ ...event, currentUserRole: 'ADMIN', currentUserPermissions: ALL_SYSTEM_PERMISSIONS });
      return;
    }

    const activeLinks = (await db.getEventUsers())
      .filter(link => link.userId === user.id && link.active);
    const eventLink = activeLinks.find(link => link.eventId === event.id);
    if (activeLinks.length > 0 && !eventLink) {
      res.status(403).json({ error: 'Usuário sem acesso a este evento' });
      return;
    }

    res.json({
      ...event,
      currentUserRole: eventLink?.role || user.role,
      currentUserPermissions: eventLink?.active
        ? uniquePermissions(eventLink.permissions?.length ? eventLink.permissions : permissionsForRole(eventLink.role))
        : uniquePermissions(user.permissions?.length ? user.permissions : permissionsForRole(user.role))
    });
  } catch (error: any) {
    console.error('Error in GET /api/events/:id:', error);
    res.status(500).json({ error: 'Erro de servidor ao obter evento' });
  }
});

app.post('/api/events', authenticateToken, requireAdmin, async (req, res) => {
  const { name, date, location, capacity, description, credentialType, credentialSize, showQRCode, enableAccessControl, enableCloakroom, enableScanner, layoutConfig, checkinScreenConfig, cloakroomLabelConfig } = req.body;
  if (!name || !date || !location || !capacity) {
    res.status(400).json({ error: 'Todos os campos do evento são obrigatórios' });
    return;
  }

  const user = (req as any).user;
  const newEvent = await db.createEvent({
    name,
    description: description || '',
    date,
    location,
    capacity: Number(capacity),
    credentialType: credentialType || 'badge',
    credentialSize: credentialSize || 'A6',
    showQRCode: showQRCode !== undefined ? Boolean(showQRCode) : true,
    enableAccessControl: enableAccessControl !== undefined ? Boolean(enableAccessControl) : true,
    enableCloakroom: enableCloakroom !== undefined ? Boolean(enableCloakroom) : false,
    enableScanner: enableScanner !== undefined ? Boolean(enableScanner) : true,
    layoutConfig: layoutConfig || null,
    checkinScreenConfig: checkinScreenConfig || undefined,
    cloakroomLabelConfig: cloakroomLabelConfig || undefined,
    organizationId: user.organizationId || 'org1'
  });
  res.status(201).json(newEvent);
});

app.put('/api/events/:id', authenticateToken, requireAdmin, async (req, res) => {
  const user = (req as any).user;
  const event = await db.getEventById(req.params.id);
  
  if (!event || event.organizationId !== user.organizationId) {
    res.status(404).json({ error: 'Evento não encontrado' });
    return;
  }

  const { name, date, location, capacity, description, credentialType, credentialSize, showQRCode, enableAccessControl, enableCloakroom, enableScanner, layoutConfig, checkinScreenConfig, cloakroomLabelConfig } = req.body;
  const updated = await db.updateEvent(req.params.id, {
    ...(name && { name }),
    ...(description !== undefined && { description }),
    ...(date && { date }),
    ...(location && { location }),
    ...(capacity && { capacity: Number(capacity) }),
    ...(credentialType && { credentialType }),
    ...(credentialSize && { credentialSize }),
    ...(showQRCode !== undefined && { showQRCode: Boolean(showQRCode) }),
    ...(enableAccessControl !== undefined && { enableAccessControl: Boolean(enableAccessControl) }),
    ...(enableCloakroom !== undefined && { enableCloakroom: Boolean(enableCloakroom) }),
    ...(enableScanner !== undefined && { enableScanner: Boolean(enableScanner) }),
    ...(layoutConfig !== undefined && { layoutConfig }),
    ...(checkinScreenConfig !== undefined && { checkinScreenConfig }),
    ...(cloakroomLabelConfig !== undefined && { cloakroomLabelConfig })
  });

  res.json(updated);
});

app.delete('/api/events/:id', authenticateToken, requireAdmin, async (req, res) => {
  const user = (req as any).user;
  const event = await db.getEventById(req.params.id);
  
  if (!event || event.organizationId !== user.organizationId) {
    res.status(404).json({ error: 'Evento não encontrado' });
    return;
  }

  const deleted = await db.deleteEvent(req.params.id);
  res.json({ message: 'Evento excluído com sucesso' });
});


// --- PARTICIPANTS ENDPOINTS ---
app.get('/api/events/:eventId/participants', authenticateToken, async (req, res) => {
  const user = (req as any).user;
  const event = await db.getEventById(req.params.eventId);
  if (!event || event.organizationId !== user.organizationId) {
    res.status(404).json({ error: 'Evento não encontrado ou acesso restrito' });
    return;
  }

  const plist = await db.getParticipants(req.params.eventId);
  res.json(plist);
});

app.post('/api/events/:eventId/participants', authenticateToken, requireParticipantCreatePermission, async (req, res) => {
  const eventId = req.params.eventId;
  const user = (req as any).user;
  const event = await db.getEventById(eventId);
  if (!event || event.organizationId !== user.organizationId) {
    res.status(404).json({ error: 'Evento não encontrado ou acesso restrito' });
    return;
  }

  const { name, email, cpf, category, ticketCode, checkedIn, checkedInAt, company, badgeName } = req.body;
  const allowedAreaIds = Array.isArray(req.body.allowedAreaIds)
    ? req.body.allowedAreaIds
    : (Array.isArray(req.body.allowedAreas) ? req.body.allowedAreas : []);

  // Validate fields dynamically
  const fields = await db.getParticipantFields();
  const activeRequiredFields = fields.filter(f => f.active && f.required);
  for (const field of activeRequiredFields) {
    let fieldKey = '';
    if (field.id === 'f_name') fieldKey = 'name';
    else if (field.id === 'f_email') fieldKey = 'email';
    else if (field.id === 'f_cpf') fieldKey = 'cpf';
    else if (field.id === 'f_category') fieldKey = 'category';
    else if (field.id === 'f_company') fieldKey = 'company';
    else fieldKey = field.id;

    const val = req.body[fieldKey];
    if (val === undefined || val === null || String(val).trim() === '') {
      res.status(400).json({ error: `O campo '${field.name}' é obrigatório.` });
      return;
    }
  }

  // Validate double registration under the same CPF and eventId ONLY if CPF is active and configured
  const cpfField = fields.find(f => f.id === 'f_cpf');
  if (cpfField?.active && cpf) {
    const existing = await db.getParticipantByCpfAndEvent(cpf, eventId);
    if (existing) {
      res.status(400).json({ error: 'Participante com este CPF já está cadastrado neste evento' });
      return;
    }
  }

  // Support spreading custom fields from req.body
  const participantPayload = {
    ...req.body,
    eventId,
    name: name || '',
    badgeName: badgeName || name || '',
    email: email || '',
    cpf: cpf || '',
    category: (category || 'Participante') as ParticipantCategory,
    company: company || '',
    allowedAreaIds,
    allowedAreas: allowedAreaIds
  };

  const newParticipant = await db.createParticipant(participantPayload);

  // Log creation and check-in
  await writeLegacyLog({
    participantId: newParticipant.id,
    action: 'CREATE',
    performedBy: user?.name || user?.email || 'Operador',
    eventId: eventId,
    organizationId: user.organizationId
  });
  await writeActionLog({
    eventId,
    userId: user.id,
    participantId: newParticipant.id,
    action: 'CREATE_PARTICIPANT'
  });

  if (checkedIn) {
    // Audit check-in if pre-checkedIn
    await writeLegacyLog({
      participantId: newParticipant.id,
      action: 'CHECKIN',
      performedBy: user?.name || user?.email || 'Operador',
      eventId: eventId,
      organizationId: user.organizationId
    });
    await writeActionLog({
      eventId,
      userId: user.id,
      participantId: newParticipant.id,
      action: 'CHECKIN'
    });
  }

  res.status(201).json(newParticipant);
});

// Import in batch (Excel parsing results)
app.post('/api/events/:eventId/participants/batch', authenticateToken, requireParticipantCreatePermission, async (req, res) => {
  const user = (req as any).user;
  const eventId = req.params.eventId;
  const event = await db.getEventById(eventId);
  if (!event || event.organizationId !== user.organizationId) {
    res.status(404).json({ error: 'Evento não encontrado ou acesso restrito' });
    return;
  }

  const { participants } = req.body;
  if (!participants || !Array.isArray(participants)) {
    res.status(400).json({ error: 'Formato de importação inválido: esperado vetor de participantes' });
    return;
  }

  // Pre-load current areas and access profiles for dynamic importation mapping
  const allAreas = await db.getAreas(eventId);
  const profiles = await db.getAccessProfiles(eventId);

  const itemsToCreate = participants.map((p: any) => {
    const keys = Object.keys(p);
    
    const findValue = (possibleNames: string[]) => {
      const match = keys.find(k => 
        possibleNames.some(pName => k.toLowerCase().trim() === pName.toLowerCase())
      );
      return match ? p[match] : undefined;
    };

    const name = String(findValue(['nome', 'name', 'nome completo', 'nome_completo', 'full name', 'fullname', 'membro']) || '').trim();
    const email = String(findValue(['email', 'e-mail', 'mail', 'endereço de e-mail', 'correio']) || '').trim();
    const cpf = String(findValue(['cpf', 'c.p.f.', 'documento', 'identidade', 'cpf/cnpj']) || '').replace(/\D/g, '');
    const company = String(findValue(['empresa', 'company', 'corporação', 'corporacao', 'org', 'organização', 'organizacao', 'trabalho']) || '').trim();
    
    const ticketCode = String(findValue(['ticketCode', 'ticket_code', 'codigo qr', 'qr code', 'codigo do ingresso', 'ingresso', 'ticket', 'codigo']) || '').trim();

    // Normalize Category access
    const categoryRaw = String(findValue(['categoria', 'category', 'grupo']) || 'Participante').trim();
    let category: ParticipantCategory = 'Participante';
    const catLower = categoryRaw.toLowerCase();
    if (catLower.includes('vip')) category = 'VIP';
    else if (catLower.includes('palestr')) category = 'Palestrante';
    else if (catLower.includes('expos')) category = 'Expositor';
    else if (catLower.includes('staff')) category = 'Staff';

    // Access control areas resolution
    let allowedAreas: string[] = [];

    const directAllowedAreaIds = findValue(['allowedAreaIds', 'allowed_area_ids', 'allowedAreas', 'allowed_areas']);
    if (Array.isArray(directAllowedAreaIds)) {
      allowedAreas = directAllowedAreaIds.filter((areaId: any) => allAreas.some(area => area.id === String(areaId)));
    }

    const hasAreasColumn = keys.some(k => ['areas', 'acessos', 'area', 'acesso', 'salas', 'sala', 'allowed_areas', 'allowedareas'].includes(k.toLowerCase().trim()));
    const hasProfileColumn = keys.some(k => ['perfil', 'tipo', 'type', 'profile', 'accessprofile', 'access_profile'].includes(k.toLowerCase().trim()));

    if (allowedAreas.length === 0 && hasAreasColumn) {
      // CASO 1: Se existir coluna "areas", carregar e converter para array e salvar
      const areasVal = findValue(['areas', 'acessos', 'area', 'acesso', 'salas', 'sala', 'allowed_areas', 'allowedareas']);
      if (areasVal !== undefined && areasVal !== null) {
        const rawItems = String(areasVal)
          .split(/[;,]+/)
          .map(s => s.trim())
          .filter(Boolean);
          
        rawItems.forEach(item => {
          const matchedArea = allAreas.find(a => 
            a.id.toLowerCase() === item.toLowerCase() || 
            a.name.toLowerCase() === item.toLowerCase()
          );
          if (matchedArea) {
            if (!allowedAreas.includes(matchedArea.id)) {
              allowedAreas.push(matchedArea.id);
            }
          }
        });
      }
    } else if (allowedAreas.length === 0 && hasProfileColumn) {
      // CASO 2: Se existir coluna "tipo" ou "perfil", carregar o profile e mapear automatizado
      const profileNameVal = String(findValue(['perfil', 'tipo', 'type', 'profile', 'accessprofile', 'access_profile']) || '').trim();
      if (profileNameVal) {
        const matchedProfile = profiles.find(ap => ap.name.toLowerCase() === profileNameVal.toLowerCase());
        if (matchedProfile && Array.isArray(matchedProfile.area_ids)) {
          allowedAreas = [...matchedProfile.area_ids];
        } else {
          // Log opcional: Sistema não quebra se profile não existir
          console.warn(`[Import AccessProfile] Profile "${profileNameVal}" was specified but does not exist in active profiles.`);
        }
      }
    } else {
      // CASO 3: Sem nenhuma dessas colunas, participante sem acesso por padrão
      allowedAreas = [];
    }

    return {
      eventId,
      name,
      email,
      cpf,
      category,
      company,
      ...(ticketCode ? { ticketCode } : {}),
      allowedAreaIds: allowedAreas,
      allowedAreas
    };
  }).filter(p => p.name);

  const created = await db.createParticipantsBatch(itemsToCreate);
  await Promise.all(created.map(participant => writeActionLog({
    eventId,
    userId: user.id,
    participantId: participant.id,
    action: 'CREATE_PARTICIPANT'
  })));
  res.json({
    totalProcessed: participants.length,
    totalImported: created.length,
    skipped: participants.length - created.length,
    imported: created
  });
});

app.put('/api/participants/:id', authenticateToken, requireAdmin, async (req, res) => {
  const user = (req as any).user;
  const current = await db.getParticipantById(req.params.id);
  if (!current) {
    res.status(404).json({ error: 'Participante não encontrado' });
    return;
  }

  const event = await db.getEventById(current.eventId);
  if (!event || event.organizationId !== user.organizationId) {
    res.status(403).json({ error: 'Acesso negado para esta organização' });
    return;
  }

  const allowedAreaIds = req.body.allowedAreaIds !== undefined
    ? req.body.allowedAreaIds
    : req.body.allowedAreas;
  const updated = await db.updateParticipant(req.params.id, {
    ...req.body,
    ...(allowedAreaIds !== undefined ? { allowedAreaIds, allowedAreas: allowedAreaIds } : {})
  });
  if (updated) {
    await writeActionLog({
      eventId: current.eventId,
      userId: user.id,
      participantId: current.id,
      action: 'EDIT_PARTICIPANT'
    });
  }
  res.json(updated);
});

app.patch('/api/participants/:id/badge-name', authenticateToken, async (req, res) => {
  const user = (req as any).user;
  const current = await db.getParticipantById(req.params.id);
  if (!current) {
    res.status(404).json({ error: 'Participante não encontrado' });
    return;
  }

  const event = await db.getEventById(current.eventId);
  if (!event || event.organizationId !== user.organizationId) {
    res.status(403).json({ error: 'Acesso negado para esta organização' });
    return;
  }

  const badgeName = String(req.body.badgeName || '').trim();
  if (!badgeName) {
    res.status(400).json({ error: 'Informe o nome que será impresso no crachá' });
    return;
  }

  const updated = await db.updateParticipant(req.params.id, { badgeName });
  res.json(updated);
});

app.delete('/api/participants/:id', authenticateToken, requireAdmin, async (req, res) => {
  const user = (req as any).user;
  const current = await db.getParticipantById(req.params.id);
  if (!current) {
    res.status(404).json({ error: 'Participante não encontrado' });
    return;
  }

  const event = await db.getEventById(current.eventId);
  if (!event || event.organizationId !== user.organizationId) {
    res.status(403).json({ error: 'Acesso negado para esta organização' });
    return;
  }

  await db.deleteParticipant(req.params.id);
  res.json({ message: 'Participante removido do evento com sucesso' });
});


// --- CHECK-IN ENDPOINTS ---
app.post('/api/participants/:id/checkin', authenticateToken, async (req, res) => {
  const { checkedIn } = req.body;
  const pId = req.params.id;
  const user = (req as any).user;

  const current = await db.getParticipantById(pId);
  if (!current) {
    res.status(404).json({ error: 'Participante não encontrado' });
    return;
  }

  const event = await db.getEventById(current.eventId);
  if (!event || event.organizationId !== user.organizationId) {
    res.status(403).json({ error: 'Acesso negado para esta organização' });
    return;
  }

  if (checkedIn && current.checkedIn) {
    res.status(400).json({ error: 'Este participante já realizou o check-in' });
    return;
  }

  const updated = await db.performCheckIn(pId, !!checkedIn);
  
  if (checkedIn && updated) {
    await writeLegacyLog({
      participantId: pId,
      action: 'CHECKIN',
      performedBy: user?.name || user?.email || 'Operador',
      eventId: current.eventId,
      organizationId: user.organizationId
    });
    await writeActionLog({
      eventId: current.eventId,
      userId: user.id,
      participantId: pId,
      action: 'CHECKIN'
    });
  }

  res.json({
    message: checkedIn ? 'Check-in realizado com sucesso' : 'Check-in desfeito com sucesso',
    participant: updated
  });
});

// Search and code validation (QR Code / CPF)
app.post('/api/events/:eventId/checkin/scan', authenticateToken, async (req, res) => {
  const { code } = req.body; // Can be ticketCode OR CPF
  const eventId = req.params.eventId;
  const user = (req as any).user;

  const event = await db.getEventById(eventId);
  if (!event || event.organizationId !== user.organizationId) {
    res.status(404).json({ error: 'Evento não encontrado' });
    return;
  }

  if (!code) {
    res.json({ error: 'Código do QR Code ou CPF não fornecido' });
    return;
  }

  let p = await db.getParticipantByTicketCode(code);
  
  // Try searching by CPF if code looks like a CPF or was not found
  if (!p) {
    const cleanCode = code.replace(/\D/g, '');
    p = await db.getParticipantByCpfAndEvent(cleanCode, eventId);
  }

  if (!p || p.eventId !== eventId) {
    res.json({ error: 'Participante não localizado neste evento' });
    return;
  }

  if (p.checkedIn) {
    res.json({ 
      error: 'Check-in já realizado anteriormente!', 
      participant: p,
      alreadyCheckedIn: true
    });
    return;
  }

  // Perform operational check-in
  const updated = await db.performCheckIn(p.id, true);
  
  if (updated) {
    await writeLegacyLog({
      participantId: p.id,
      action: 'CHECKIN',
      performedBy: user?.name || user?.email || 'Operador',
      eventId: eventId,
      organizationId: user.organizationId
    });
    await writeActionLog({
      eventId,
      userId: user.id,
      participantId: p.id,
      action: 'CHECKIN'
    });
  }

  res.json({
    message: 'Check-in por leitura operado com sucesso',
    participant: updated
  });
});

// Create manual/action logs
app.post('/api/checkin/log', authenticateToken, async (req, res) => {
  const { participantId, action } = req.body;
  const user = (req as any).user;

  if (!participantId || !action) {
    res.status(400).json({ error: 'Parâmetros participantId e action são obrigatórios' });
    return;
  }

  const current = await db.getParticipantById(participantId);
  if (!current) {
    res.status(404).json({ error: 'Participante não encontrado' });
    return;
  }

  const event = await db.getEventById(current.eventId);
  if (!event || event.organizationId !== user.organizationId) {
    res.status(403).json({ error: 'Acesso negado para esta organização' });
    return;
  }

  const log = await db.createLog({
    participantId,
    action: action as any,
    performedBy: user?.name || user?.email || 'Operador',
    eventId: current.eventId,
    organizationId: user.organizationId
  });

  res.status(201).json(log);
});

// Retrieve lists of audit logs
app.get('/api/logs', authenticateToken, async (req, res) => {
  const user = (req as any).user;
  const list = await db.getLogs(user.organizationId);
  
  const enriched = await Promise.all(list.map(async (log) => {
    const participant = await db.getParticipantById(log.participantId);
    return {
      ...log,
      participantName: participant ? participant.name : 'Membro Desconhecido',
      participantCpf: participant ? participant.cpf : '',
      participantCategory: participant ? participant.category : 'Participante'
    };
  }));

  res.json(enriched.reverse()); // latest first
});

app.get('/api/action-logs', authenticateToken, async (req, res) => {
  const user = (req as any).user;
  const eventId = req.query.eventId as string | undefined;
  const logs = await db.getActionLogs(eventId);
  const events = await db.getEvents(user.organizationId);
  const eventIds = new Set(events.map(event => event.id));
  const users = await db.getUsers(user.organizationId);

  const scopedLogs = logs.filter(log => eventIds.has(log.eventId));
  const enriched = await Promise.all(scopedLogs.map(async (log) => {
    const participant = log.participantId ? await db.getParticipantById(log.participantId) : undefined;
    const operator = users.find(item => item.id === log.userId);
    return {
      ...log,
      participantName: participant?.name || '',
      operatorName: operator?.name || 'Operador'
    };
  }));

  res.json(enriched.reverse());
});

// --- ACTIVITIES & ACTIVITY ATTENDANCE ---
app.get('/api/events/:eventId/activities', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const event = await db.getEventById(req.params.eventId);
    if (!event || event.organizationId !== user.organizationId) {
      res.status(404).json({ error: 'Evento não encontrado ou acesso restrito' });
      return;
    }

    const activities = await db.getActivities(req.params.eventId);
    res.json(activities);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao listar atividades' });
  }
});

app.post('/api/events/:eventId/activities', authenticateToken, requireActivityAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const event = await db.getEventById(req.params.eventId);
    if (!event || event.organizationId !== user.organizationId) {
      res.status(404).json({ error: 'Evento não encontrado ou acesso restrito' });
      return;
    }

    const { title, roomName, speakerName, date, startTime, endTime, workloadHours, active } = req.body;
    if (!title || !roomName || !date || !startTime || !endTime) {
      res.status(400).json({ error: 'Título, sala, data, início e fim são obrigatórios' });
      return;
    }

    const activity = await db.createActivity({
      eventId: req.params.eventId,
      title,
      roomName,
      speakerName: speakerName || '',
      date,
      startTime,
      endTime,
      workloadHours: Number(workloadHours) || 0,
      active: active !== false
    });
    res.status(201).json(activity);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao criar atividade' });
  }
});

app.put('/api/activities/:id', authenticateToken, requireActivityAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const activity = await db.getActivityById(req.params.id);
    if (!activity) {
      res.status(404).json({ error: 'Atividade não encontrada' });
      return;
    }

    const event = await db.getEventById(activity.eventId);
    if (!event || event.organizationId !== user.organizationId) {
      res.status(403).json({ error: 'Acesso negado para esta atividade' });
      return;
    }

    const updated = await db.updateActivity(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao atualizar atividade' });
  }
});

app.delete('/api/activities/:id', authenticateToken, requireActivityAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const activity = await db.getActivityById(req.params.id);
    if (!activity) {
      res.status(404).json({ error: 'Atividade não encontrada' });
      return;
    }

    const event = await db.getEventById(activity.eventId);
    if (!event || event.organizationId !== user.organizationId) {
      res.status(403).json({ error: 'Acesso negado para esta atividade' });
      return;
    }

    await db.deleteActivity(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao excluir atividade' });
  }
});

app.get('/api/events/:eventId/activity-attendances', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const event = await db.getEventById(req.params.eventId);
    if (!event || event.organizationId !== user.organizationId) {
      res.status(404).json({ error: 'Evento não encontrado ou acesso restrito' });
      return;
    }

    const activityId = req.query.activityId as string | undefined;
    const attendances = await db.getActivityAttendances(req.params.eventId, activityId);
    const [participants, users] = await Promise.all([
      db.getParticipants(req.params.eventId),
      db.getUsers(user.organizationId)
    ]);

    const enriched = attendances.map(att => {
      const participant = participants.find(p => p.id === att.participantId);
      const operator = users.find(u => u.id === att.checkedByUserId);
      return {
        ...att,
        participantName: participant?.name || 'Participante não encontrado',
        participantCpf: participant?.cpf || '',
        participantCategory: participant?.category || '',
        operatorName: operator?.name || 'Operador'
      };
    });

    res.json(enriched.reverse());
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao listar presenças por atividade' });
  }
});

app.post('/api/events/:eventId/activity-attendances', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { activityId, search } = req.body;
    const event = await db.getEventById(req.params.eventId);
    if (!event || event.organizationId !== user.organizationId) {
      res.status(404).json({ error: 'Evento não encontrado ou acesso restrito' });
      return;
    }

    const activity = activityId ? await db.getActivityById(activityId) : undefined;
    if (!activity || activity.eventId !== req.params.eventId || activity.active === false) {
      res.status(400).json({ error: 'Atividade inválida ou inativa' });
      return;
    }

    const cleanSearch = String(search || '').trim();
    if (!cleanSearch) {
      res.status(400).json({ error: 'Informe nome, CPF ou QR Code do participante' });
      return;
    }

    const normalizeText = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const normalizeCode = (value: string) => normalizeText(value).replace(/[^a-z0-9_-]/g, '');
    const queryText = normalizeText(cleanSearch);
    const queryCpf = cleanSearch.replace(/\D/g, '');
    const queryCode = normalizeCode(cleanSearch);
    const codeMatches = (storedCode: string) => {
      if (!storedCode || !queryCode) return false;
      return storedCode === queryCode || storedCode.includes(queryCode) || queryCode.includes(storedCode);
    };
    const participants = await db.getParticipants(req.params.eventId);
    const participant = participants.find(p => {
      const participantId = normalizeCode(p.id || '');
      const ticketCode = normalizeCode(p.ticketCode || '');
      return codeMatches(participantId)
        || codeMatches(ticketCode)
        || (!!queryCpf && p.cpf.replace(/\D/g, '') === queryCpf)
        || normalizeText(p.name).includes(queryText);
    });

    if (!participant) {
      res.status(404).json({ status: 'NOT_FOUND', error: 'Participante não encontrado' });
      return;
    }

    const existing = await db.getActivityAttendance(activity.id, participant.id);
    if (existing) {
      res.status(200).json({
        status: 'ALREADY_REGISTERED',
        attendance: existing,
        participant
      });
      return;
    }

    const attendance = await db.createActivityAttendance({
      eventId: req.params.eventId,
      activityId: activity.id,
      participantId: participant.id,
      checkedByUserId: user.id
    });

    await writeActionLog({
      eventId: req.params.eventId,
      activityId: activity.id,
      participantId: participant.id,
      userId: user.id,
      action: 'ACTIVITY_ATTENDANCE_REGISTERED'
    });

    res.status(201).json({
      status: 'REGISTERED',
      attendance,
      participant
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao registrar presença na atividade' });
  }
});

app.get('/api/events/:eventId/certificates/participant', authenticateToken, requireCertificatePermission, async (req, res) => {
  try {
    const user = (req as any).user;
    const event = await db.getEventById(req.params.eventId);
    if (!event || event.organizationId !== user.organizationId) {
      res.status(404).json({ error: 'Evento não encontrado ou acesso restrito' });
      return;
    }

    const search = String(req.query.search || '').trim();
    if (!search) {
      res.status(400).json({ error: 'Informe nome, CPF ou QR Code do participante' });
      return;
    }

    const normalizeText = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const normalizeCode = (value: string) => normalizeText(value).replace(/[^a-z0-9_-]/g, '');
    const queryText = normalizeText(search);
    const queryCpf = search.replace(/\D/g, '');
    const queryCode = normalizeCode(search);
    const codeMatches = (storedCode: string) => {
      if (!storedCode || !queryCode) return false;
      return storedCode === queryCode || storedCode.includes(queryCode) || queryCode.includes(storedCode);
    };
    const participants = await db.getParticipants(req.params.eventId);
    const participant = participants.find(p => {
      const participantId = normalizeCode(p.id || '');
      const ticketCode = normalizeCode(p.ticketCode || '');
      return codeMatches(participantId)
        || codeMatches(ticketCode)
        || (!!queryCpf && p.cpf.replace(/\D/g, '') === queryCpf)
        || normalizeText(p.name).includes(queryText);
    });

    if (!participant) {
      res.status(404).json({ error: 'Participante não encontrado' });
      return;
    }

    const [activities, attendances, certificates] = await Promise.all([
      db.getActivities(req.params.eventId),
      db.getActivityAttendances(req.params.eventId),
      db.getCertificates(req.params.eventId, participant.id)
    ]);

    const participantAttendances = attendances.filter(att => att.participantId === participant.id);
    const attendedActivities = participantAttendances
      .map(attendance => {
        const activity = activities.find(item => item.id === attendance.activityId);
        if (!activity) return null;
        return {
          ...activity,
          checkedAt: attendance.checkedAt,
          attendanceId: attendance.id
        };
      })
      .filter(Boolean);
    const totalHours = attendedActivities.reduce((sum: number, activity: any) => sum + (Number(activity.workloadHours) || 0), 0);

    res.json({
      participant,
      event,
      attendedActivities,
      totalHours,
      certificates
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao buscar dados para certificado' });
  }
});

app.get('/api/events/:eventId/certificate-template', authenticateToken, requireCertificatePermission, async (req, res) => {
  try {
    const user = (req as any).user;
    const event = await db.getEventById(req.params.eventId);
    if (!event || event.organizationId !== user.organizationId) {
      res.status(404).json({ error: 'Evento não encontrado ou acesso restrito' });
      return;
    }

    const template = await db.getCertificateTemplate(req.params.eventId);
    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao carregar template de certificado' });
  }
});

app.put('/api/events/:eventId/certificate-template', authenticateToken, requireCertificateTemplateAdmin, async (req, res) => {
  try {
    const input = req.body || {};
    const templateInput: Partial<CertificateTemplate> = {
      name: input.name,
      orientation: input.orientation === 'portrait' ? 'portrait' : 'landscape',
      pageSize: input.pageSize === 'A5' ? 'A5' : 'A4',
      backgroundImageUrl: typeof input.backgroundImageUrl === 'string' ? input.backgroundImageUrl : '',
      logoUrl: typeof input.logoUrl === 'string' ? input.logoUrl : '',
      elements: Array.isArray(input.elements) ? input.elements : undefined
    };
    const template = await db.saveCertificateTemplate(req.params.eventId, templateInput);
    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao salvar template de certificado' });
  }
});

app.post('/api/events/:eventId/certificates', authenticateToken, requireCertificatePermission, async (req, res) => {
  try {
    const user = (req as any).user;
    const { participantId, activityId, type } = req.body;
    const certificateType = type === 'activity' ? 'activity' : 'general';
    const event = await db.getEventById(req.params.eventId);
    if (!event || event.organizationId !== user.organizationId) {
      res.status(404).json({ error: 'Evento não encontrado ou acesso restrito' });
      return;
    }

    const participant = participantId ? await db.getParticipantById(participantId) : undefined;
    if (!participant || participant.eventId !== req.params.eventId) {
      res.status(404).json({ error: 'Participante não encontrado' });
      return;
    }

    const attendances = (await db.getActivityAttendances(req.params.eventId)).filter(att => att.participantId === participant.id);
    if (attendances.length === 0) {
      res.status(400).json({ error: 'Participante não possui presença registrada.' });
      return;
    }

    const activities = await db.getActivities(req.params.eventId);
    let certificateActivityId: string | undefined;
    let totalHours = 0;

    if (certificateType === 'activity') {
      const activity = activityId ? activities.find(item => item.id === activityId) : undefined;
      const hasAttendance = activity ? attendances.some(att => att.activityId === activity.id) : false;
      if (!activity || !hasAttendance) {
        res.status(400).json({ error: 'Participante não possui presença registrada nesta atividade.' });
        return;
      }
      certificateActivityId = activity.id;
      totalHours = Number(activity.workloadHours) || 0;
    } else {
      totalHours = attendances.reduce((sum, attendance) => {
        const activity = activities.find(item => item.id === attendance.activityId);
        return sum + (Number(activity?.workloadHours) || 0);
      }, 0);
    }

    const certificate = await db.createCertificate({
      eventId: req.params.eventId,
      participantId: participant.id,
      ...(certificateActivityId ? { activityId: certificateActivityId } : {}),
      type: certificateType,
      totalHours,
      issuedByUserId: user.id
    });

    await writeActionLog({
      eventId: req.params.eventId,
      participantId: participant.id,
      ...(certificateActivityId ? { activityId: certificateActivityId } : {}),
      userId: user.id,
      action: 'CERTIFICATE_ISSUED'
    });

    const template = await db.getCertificateTemplate(req.params.eventId);
    res.status(201).json({ certificate, template });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao emitir certificado' });
  }
});

app.get('/api/events/:eventId/certificates', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const event = await db.getEventById(req.params.eventId);
    if (!event || event.organizationId !== user.organizationId) {
      res.status(404).json({ error: 'Evento não encontrado ou acesso restrito' });
      return;
    }

    const [certificates, participants, activities, users] = await Promise.all([
      db.getCertificates(req.params.eventId),
      db.getParticipants(req.params.eventId),
      db.getActivities(req.params.eventId),
      db.getUsers(user.organizationId)
    ]);

    const enriched = certificates.map(certificate => {
      const participant = participants.find(item => item.id === certificate.participantId);
      const activity = certificate.activityId ? activities.find(item => item.id === certificate.activityId) : undefined;
      const operator = users.find(item => item.id === certificate.issuedByUserId);
      return {
        ...certificate,
        participantName: participant?.name || 'Participante não encontrado',
        participantCpf: participant?.cpf || '',
        participantCategory: participant?.category || '',
        activityTitle: activity?.title || '',
        activitySpeakerName: activity?.speakerName || '',
        operatorName: operator?.name || 'Operador'
      };
    });

    res.json(enriched.reverse());
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao listar certificados' });
  }
});

// Register action reprint
app.post('/api/participants/:id/reprint', authenticateToken, async (req, res) => {
  const pId = req.params.id;
  const user = (req as any).user;

  const participant = await db.getParticipantById(pId);
  if (!participant) {
    res.status(404).json({ error: 'Participante não encontrado' });
    return;
  }

  const event = await db.getEventById(participant.eventId);
  if (!event || event.organizationId !== user.organizationId) {
    res.status(403).json({ error: 'Acesso negado para esta organização' });
    return;
  }

  // Set as printed
  await db.updateParticipant(pId, { printed: true });

  // Record audit log
  await writeLegacyLog({
    participantId: pId,
    action: 'REPRINT',
    performedBy: user?.name || user?.email || 'Operador',
    eventId: participant.eventId,
    organizationId: user.organizationId
  });
  await writeActionLog({
    eventId: participant.eventId,
    userId: user.id,
    participantId: pId,
    action: 'REPRINT_BADGE'
  });

  res.json({ success: true, message: 'Reimpressão contabilizada com sucesso' });
});


// --- CLOAKROOM (CHAPELARIA) ENDPOINTS ---
app.get('/api/events/:eventId/cloakroom', authenticateToken, requireAdmin, async (req, res) => {
  const user = (req as any).user;
  const event = await db.getEventById(req.params.eventId);
  if (!event || event.organizationId !== user.organizationId) {
    res.status(404).json({ error: 'Evento não encontrado ou acesso restrito' });
    return;
  }

  const cloakroom = await db.getCloakroom(req.params.eventId);
  res.json(cloakroom);
});

app.post('/api/events/:eventId/cloakroom', authenticateToken, requireAdmin, async (req, res) => {
  const user = (req as any).user;
  const eventId = req.params.eventId;
  const event = await db.getEventById(eventId);
  if (!event || event.organizationId !== user.organizationId) {
    res.status(404).json({ error: 'Evento não encontrado ou acesso restrito' });
    return;
  }

  const { participantId, participantName, itemDescription, volumeCount } = req.body;

  if (!participantName) {
    res.status(400).json({ error: 'Nome do participante é obrigatório' });
    return;
  }

  const newItem = await db.createCloakroomItem({
    eventId,
    participantId,
    participantName,
    itemDescription: itemDescription || '',
    volumeCount: Math.max(1, Math.min(5, Number(volumeCount) || 1)),
    registeredByUserId: user.id,
    registeredByName: user.name || user.email || 'Operador'
  });

  await writeActionLog({
    eventId,
    userId: user.id,
    participantId,
    ticketNumber: newItem.tagNumber,
    action: 'CLOAKROOM_CREATE'
  });

  res.status(201).json(newItem);
});

app.post('/api/cloakroom/:id/collect', authenticateToken, requireAdmin, async (req, res) => {
  const user = (req as any).user;
  const item = await db.getCloakroomItemById(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Item de chapelaria não localizado' });
    return;
  }

  const event = await db.getEventById(item.eventId);
  if (!event || event.organizationId !== user.organizationId) {
    res.status(403).json({ error: 'Acesso negado para esta organização' });
    return;
  }

  const updatedItem = await db.collectCloakroomItem(req.params.id, {
    userId: user.id,
    name: user.name || user.email || 'Operador'
  });

  await writeActionLog({
    eventId: item.eventId,
    userId: user.id,
    participantId: item.participantId,
    ticketNumber: item.tagNumber,
    action: 'CLOAKROOM_RETURN'
  });

  res.json(updatedItem);
});

app.delete('/api/cloakroom/:id', authenticateToken, requireAdmin, async (req, res) => {
  const user = (req as any).user;
  const item = await db.getCloakroomItemById(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Item de chapelaria não localizado' });
    return;
  }

  const event = await db.getEventById(item.eventId);
  if (!event || event.organizationId !== user.organizationId) {
    res.status(403).json({ error: 'Acesso negado para esta organização' });
    return;
  }

  const deleted = await db.deleteCloakroomItem(req.params.id);
  res.json({ message: 'Registro de chapelaria limpo com sucesso' });
});


// --- DASHBOARD STATISTICS ENDPOINT ---
app.get('/api/events/:eventId/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const user = (req as any).user;
    const event = await db.getEventById(eventId);
    
    if (!event || event.organizationId !== user.organizationId) {
      res.status(404).json({ error: 'Evento não encontrado ou acesso restrito' });
      return;
    }

    const plist = await db.getParticipants(eventId);
    const totalRegistered = plist.length;
    const totalCheckedIn = plist.filter(p => p.checkedIn).length;
    const totalWaiting = totalRegistered - totalCheckedIn;

    // Track recent checkins (last 10)
    const recentCheckins = plist
      .filter(p => p.checkedIn && p.checkedInAt)
      .sort((a, b) => {
        try {
          const tA = new Date(a.checkedInAt!).getTime();
          const tB = new Date(b.checkedInAt!).getTime();
          if (isNaN(tA) || isNaN(tB)) return 0;
          return tB - tA;
        } catch {
          return 0;
        }
      })
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        participantName: p.name,
        category: p.category,
        checkedInAt: p.checkedInAt!
      }));

    // Build check-ins by hour chart
    // Group checked-in dates by hour interval (e.g. "08h", "09h")
    const hourMap: Record<string, number> = {};
    
    // Initialize standard active times
    const workHours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
    workHours.forEach(h => { hourMap[h] = 0; });

    plist.forEach(p => {
      if (p.checkedIn && p.checkedInAt) {
        try {
          const time = new Date(p.checkedInAt);
          if (!isNaN(time.getTime())) {
            const hour = String(time.getHours()).padStart(2, '0');
            const formattedHour = `${hour}:00`;
            if (hourMap[formattedHour] !== undefined) {
              hourMap[formattedHour]++;
            } else {
              hourMap[formattedHour] = 1;
            }
          }
        } catch (e) {
          // Safe skip invalid dates
        }
      }
    });

    const hourlyCheckins = Object.keys(hourMap)
      .sort()
      .map(hour => ({
        hour,
        count: hourMap[hour]
      }));

    res.json({
      totalRegistered,
      totalCheckedIn,
      totalWaiting,
      capacity: event.capacity,
      recentCheckins,
      hourlyCheckins
    });
  } catch (error: any) {
    console.error('Error serving event dashboard stats:', error);
    res.status(500).json({ error: 'Erro de servidor ao gerar estatísticas do painel' });
  }
});


// --- DYNAMIC REGISTRATION FIELDS ENDPOINTS ---
app.get('/api/fields', authenticateToken, async (req, res) => {
  try {
    const fields = await db.getParticipantFields();
    res.json(fields);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao listar campos de cadastro' });
  }
});

app.post('/api/fields', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { fields } = req.body;
    if (!fields || !Array.isArray(fields)) {
      res.status(400).json({ error: 'Lista de campos inválida' });
      return;
    }
    const updated = await db.saveParticipantFields(fields);
    res.json({ success: true, fields: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao atualizar campos de cadastro' });
  }
});


// --- ACCESS CONTROL BY AREAS ENDPOINTS ---
app.get('/api/areas', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.query;
    const areas = await db.getAreas(eventId as string);
    res.json(areas);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao listar áreas' });
  }
});

app.post('/api/areas', authenticateToken, requireAccessAreaAdmin, async (req, res) => {
  try {
    const { name, color, eventId, event_id, active, isActive, is_active } = req.body;
    if (!name) {
      res.status(400).json({ error: 'O nome da área é obrigatório' });
      return;
    }
    const accessAreaEventId = (req as any).accessAreaEventId || eventId || event_id;
    const newArea = await db.createArea({ name, color, eventId: accessAreaEventId, event_id: accessAreaEventId, active, isActive, is_active });
    res.status(201).json(newArea);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao criar nova área' });
  }
});

app.put('/api/areas/:id', authenticateToken, requireAccessAreaAdmin, async (req, res) => {
  try {
    const updated = await db.updateArea(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Área não encontrada' });
      return;
    }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao atualizar área' });
  }
});

app.delete('/api/areas/:id', authenticateToken, requireAccessAreaAdmin, async (req, res) => {
  try {
    const deleted = await db.deleteArea(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Área não encontrada' });
      return;
    }
    res.json({ success: true, message: 'Área excluída com sucesso' });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao excluir área' });
  }
});

// --- ACCESS PROFILE ENDPOINTS ---
app.get('/api/access-profiles', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.query;
    const profiles = await db.getAccessProfiles(eventId as string);
    res.json(profiles);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao listar perfis de acesso' });
  }
});

app.post('/api/access-profiles', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, area_ids, eventId, event_id } = req.body;
    if (!name) {
      res.status(400).json({ error: 'O nome do perfil é obrigatório' });
      return;
    }
    const newProfile = await db.createAccessProfile({ 
      name, 
      area_ids: Array.isArray(area_ids) ? area_ids : [], 
      eventId: eventId || event_id,
      event_id: eventId || event_id 
    });
    res.status(201).json(newProfile);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao criar perfil de acesso' });
  }
});

app.put('/api/access-profiles/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updated = await db.updateAccessProfile(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Perfil de acesso não encontrado' });
      return;
    }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao atualizar perfil de acesso' });
  }
});

app.delete('/api/access-profiles/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const deleted = await db.deleteAccessProfile(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Perfil de acesso não encontrado' });
      return;
    }
    res.json({ success: true, message: 'Perfil de acesso excluído com sucesso' });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao excluir perfil de acesso' });
  }
});

app.get('/api/access-control/logs', authenticateToken, async (req, res) => {
  try {
    const rawLogs = await db.getAreaAccessLogs();
    const areas = await db.getAreas();
    const participants = await db.getParticipants();
    const users = await db.getUsers();

    const enrichedLogs = rawLogs.map(log => {
      const participant = participants.find(p => p.id === log.participantId);
      const area = areas.find(a => a.id === log.areaId);
      const operator = users.find(u => u.id === log.userId);

      return {
        ...log,
        participantName: participant ? participant.name : 'Membro Desconhecido',
        participantCpf: participant ? participant.cpf : '',
        areaName: area ? area.name : 'Área Desconhecida',
        operatorName: operator ? operator.name : 'Operador'
      };
    });

    res.json(enrichedLogs.reverse());
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao carregar log de acesso' });
  }
});

app.post('/api/access-control/validate', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { search, areaId, eventId } = req.body;

    if (!user) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    // Role verification
    const allowedRoles = ['ADMIN', 'CHECKIN', 'CHECKIN_CADASTRO', 'SUPERVISOR', 'ATENDENTE', 'admin', 'operator'];
    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ error: 'Perfil sem permissão para controle de acesso por áreas' });
      return;
    }

    if (!search || !areaId) {
      res.status(400).json({ error: 'Parâmetros search e areaId são obrigatórios' });
      return;
    }

    const cleanSearch = String(search).trim();

    // 1. Check if Area is active
    const area = await db.getAreaById(areaId);
    const isAreaActive = area && (area.active !== false && area.isActive !== false && area.is_active !== false);
    const areaEventId = eventId || area?.eventId || area?.event_id;
    const writeAccessAudit = async (status: 'ALLOWED' | 'DENIED', participantId?: string, participantEventId?: string) => {
      await writeActionLog({
        eventId: participantEventId || areaEventId,
        userId: user.id,
        ...(participantId ? { participantId } : {}),
        action: status === 'ALLOWED' ? 'ACCESS_ALLOWED' : 'ACCESS_DENIED'
      });
    };

    // 2. Participant lookup
    let participant = await db.getParticipantById(cleanSearch);
    if (!participant) {
      participant = await db.getParticipantByTicketCode(cleanSearch);
    }
    if (!participant) {
      const cleanCpf = cleanSearch.replace(/\D/g, '');
      if (cleanCpf) {
        const allParticipants = await db.getParticipants(eventId);
        participant = allParticipants.find(p => p.cpf.replace(/\D/g, '') === cleanCpf);
      }
    }
    if (!participant) {
      const allParticipants = await db.getParticipants(eventId);
      const query = cleanSearch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      participant = allParticipants.find(p => {
        const pName = p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return pName.includes(query) || query.includes(pName);
      });
    }

    // Validation rule check 1: IF participante não existe -> NEGAR acesso
    if (!participant) {
      await writeAreaAccessLog({
        participantId: 'unknown',
        areaId,
        status: 'DENIED',
        userId: user.id
      });
      await writeAccessAudit('DENIED');

      res.json({
        allowed: false,
        status: 'DENIED',
        message: 'Participante não registrado no evento.'
      });
      return;
    }

    // Validation rule check 2: IF área não está ativa -> NEGAR acesso
    if (!isAreaActive) {
      await writeAreaAccessLog({
        participantId: participant.id,
        areaId,
        status: 'DENIED',
        userId: user.id
      });
      await writeAccessAudit('DENIED', participant.id, participant.eventId);

      res.json({
        allowed: false,
        status: 'DENIED',
        participant,
        message: 'Acesso negado: esta sala/área está inativa ou desativada no momento.'
      });
      return;
    }

    // If looking up for a specific event but event doesn't match
    if (eventId && participant.eventId !== eventId) {
      await writeAreaAccessLog({
        participantId: participant.id,
        areaId,
        status: 'DENIED',
        userId: user.id
      });
      await writeAccessAudit('DENIED', participant.id, eventId);

      res.json({
        allowed: false,
        status: 'DENIED',
        participant,
        message: 'Acesso negado: participante pertence a outro evento.'
      });
      return;
    }

    // Validation rule check 3: IF participante não tem acesso à área -> NEGAR acesso
    const participantAllowedAreaIds = Array.isArray(participant.allowedAreaIds)
      ? participant.allowedAreaIds
      : (Array.isArray(participant.allowedAreas) ? participant.allowedAreas : []);
    const hasAccess = participantAllowedAreaIds.includes(areaId);

    if (!hasAccess) {
      await writeAreaAccessLog({
        participantId: participant.id,
        areaId,
        status: 'DENIED',
        userId: user.id
      });
      await writeAccessAudit('DENIED', participant.id, participant.eventId);

      res.json({
        allowed: false,
        status: 'DENIED',
        participant,
        message: 'Acesso negado para a área selecionada.'
      });
      return;
    }

    // Validation rule check 4: IF permitido -> LIBERAR acesso
    await writeAreaAccessLog({
      participantId: participant.id,
      areaId,
      status: 'ALLOWED',
      userId: user.id
    });
    await writeAccessAudit('ALLOWED', participant.id, participant.eventId);

    res.json({
      allowed: true,
      status: 'ALLOWED',
      participant,
      message: 'Acesso liberado.'
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao validar acesso à área' });
  }
});


// --- VITE DEV AND RUNTIME INTEGRATION ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    // Let Vite serve all assets and pages in Dev mode, intercepting after API routes
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Serves the precompiled bundle in Cloud Run / Production environments
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(` CREDENCIA Eventos Server running successfully!`);
    console.log(` Endpoint: http://localhost:${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`======================================================\n`);
  });
}

startServer().catch(err => {
  console.error('Failed to start CREDENCIA full-stack server:', err);
});
