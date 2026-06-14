import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { UserRole, ParticipantCategory } from './src/types';
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
  const permissions = ROLE_PERMISSIONS[user.role] || [];

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

// Get all users (restricted to administrators)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rawUsers = await db.getUsers();
    const users = rawUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt
    }));
    res.json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Erro de servidor ao buscar usuários' });
  }
});

// Admin manually creates a system user
app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;
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
    organizationId: user.organizationId || 'org1'
  });

  res.status(201).json({
    id: createdUser.id,
    name: createdUser.name,
    email: createdUser.email,
    role: createdUser.role,
    createdAt: createdUser.createdAt
  });
});

// Update user details (either the user updating themselves or Admin updating anyone)
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  const requester = (req as any).user;
  const targetId = req.params.id;

  // Authorization check: User can only update themselves, unless they are Admin.
  if (requester.role !== 'admin' && requester.id !== targetId) {
    res.status(403).json({ error: 'Acesso negado. Você só pode atualizar seus próprios dados ou login.' });
    return;
  }

  const { name, email, password, role } = req.body;
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
  // Only Admin can change another user's role
  const isReqAdmin = String(requester.role || '').toUpperCase() === 'ADMIN' || requester.role === 'admin';
  if (role && isReqAdmin) {
    updates.role = role as UserRole;
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
    createdAt: updatedUser.createdAt
  });
});

// Delete user account (restricted to Admin, and users can't delete themselves)
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
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

// --- EVENTS ENDPOINTS ---
app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const events = await db.getEvents(user.organizationId);
    res.json(events);
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
    res.json(event);
  } catch (error: any) {
    console.error('Error in GET /api/events/:id:', error);
    res.status(500).json({ error: 'Erro de servidor ao obter evento' });
  }
});

app.post('/api/events', authenticateToken, requireAdmin, async (req, res) => {
  const { name, date, location, capacity, description, credentialType, credentialSize, showQRCode, enableAccessControl, enableCloakroom, enableScanner, layoutConfig } = req.body;
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

  const { name, date, location, capacity, description, credentialType, credentialSize, showQRCode, enableAccessControl, enableCloakroom, enableScanner, layoutConfig } = req.body;
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
    ...(layoutConfig !== undefined && { layoutConfig })
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

app.post('/api/events/:eventId/participants', authenticateToken, verifyPermission('CAN_CREATE_PARTICIPANT'), async (req, res) => {
  const eventId = req.params.eventId;
  const user = (req as any).user;
  const event = await db.getEventById(eventId);
  if (!event || event.organizationId !== user.organizationId) {
    res.status(404).json({ error: 'Evento não encontrado ou acesso restrito' });
    return;
  }

  const { name, email, cpf, category, ticketCode, checkedIn, checkedInAt, company } = req.body;

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
    email: email || '',
    cpf: cpf || '',
    category: (category || 'Participante') as ParticipantCategory,
    company: company || ''
  };

  const newParticipant = await db.createParticipant(participantPayload);

  // Log creation and check-in
  await db.createLog({
    participantId: newParticipant.id,
    action: 'CREATE',
    performedBy: user?.name || user?.email || 'Operador',
    eventId: eventId,
    organizationId: user.organizationId
  });

  if (checkedIn) {
    // Audit check-in if pre-checkedIn
    await db.createLog({
      participantId: newParticipant.id,
      action: 'CHECKIN',
      performedBy: user?.name || user?.email || 'Operador',
      eventId: eventId,
      organizationId: user.organizationId
    });
  }

  res.status(201).json(newParticipant);
});

// Import in batch (Excel parsing results)
app.post('/api/events/:eventId/participants/batch', authenticateToken, requireAdmin, async (req, res) => {
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
    
    // Normalize Category access
    const categoryRaw = String(findValue(['categoria', 'category', 'tipo', 'acesso', 'grupo']) || 'Participante').trim();
    let category: ParticipantCategory = 'Participante';
    const catLower = categoryRaw.toLowerCase();
    if (catLower.includes('vip')) category = 'VIP';
    else if (catLower.includes('palestr')) category = 'Palestrante';
    else if (catLower.includes('expos')) category = 'Expositor';
    else if (catLower.includes('staff')) category = 'Staff';

    // Access control areas resolution
    let allowedAreas: string[] = [];

    const hasAreasColumn = keys.some(k => ['areas', 'area', 'salas', 'sala', 'allowed_areas', 'allowedareas'].includes(k.toLowerCase().trim()));
    const hasProfileColumn = keys.some(k => ['tipo', 'perfil', 'type', 'profile', 'accessprofile', 'access_profile'].includes(k.toLowerCase().trim()));

    if (hasAreasColumn) {
      // CASO 1: Se existir coluna "areas", carregar e converter para array e salvar
      const areasVal = findValue(['areas', 'area', 'salas', 'sala', 'allowed_areas', 'allowedareas']);
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
          } else {
            if (!allowedAreas.includes(item)) {
              allowedAreas.push(item);
            }
          }
        });
      }
    } else if (hasProfileColumn) {
      // CASO 2: Se existir coluna "tipo" ou "perfil", carregar o profile e mapear automatizado
      const profileNameVal = String(findValue(['tipo', 'perfil', 'type', 'profile', 'accessprofile', 'access_profile']) || '').trim();
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
      allowedAreas
    };
  }).filter(p => p.name);

  const created = await db.createParticipantsBatch(itemsToCreate);
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

  const updated = await db.updateParticipant(req.params.id, req.body);
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
    await db.createLog({
      participantId: pId,
      action: 'CHECKIN',
      performedBy: user?.name || user?.email || 'Operador',
      eventId: current.eventId,
      organizationId: user.organizationId
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
    await db.createLog({
      participantId: p.id,
      action: 'CHECKIN',
      performedBy: user?.name || user?.email || 'Operador',
      eventId: eventId,
      organizationId: user.organizationId
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
  await db.createLog({
    participantId: pId,
    action: 'REPRINT',
    performedBy: user?.name || user?.email || 'Operador',
    eventId: participant.eventId,
    organizationId: user.organizationId
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

  const { participantId, participantName, itemDescription } = req.body;

  if (!participantName || !itemDescription) {
    res.status(400).json({ error: 'Nome do participante e descrição do item são obrigatórios' });
    return;
  }

  const newItem = await db.createCloakroomItem({
    eventId,
    participantId,
    participantName,
    itemDescription
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

  const updatedItem = await db.collectCloakroomItem(req.params.id);
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

app.post('/api/areas', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, color, eventId, event_id, isActive, is_active } = req.body;
    if (!name) {
      res.status(400).json({ error: 'O nome da área é obrigatório' });
      return;
    }
    const newArea = await db.createArea({ name, color, eventId, event_id, isActive, is_active });
    res.status(201).json(newArea);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao criar nova área' });
  }
});

app.put('/api/areas/:id', authenticateToken, requireAdmin, async (req, res) => {
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

app.delete('/api/areas/:id', authenticateToken, requireAdmin, async (req, res) => {
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
    const isAreaActive = area && (area.isActive !== false && area.is_active !== false);

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
      await db.createAreaAccessLog({
        participantId: 'unknown',
        areaId,
        status: 'DENIED',
        userId: user.id
      });

      res.json({
        allowed: false,
        status: 'DENIED',
        message: 'Participante não registrado no evento.'
      });
      return;
    }

    // Validation rule check 2: IF área não está ativa -> NEGAR acesso
    if (!isAreaActive) {
      await db.createAreaAccessLog({
        participantId: participant.id,
        areaId,
        status: 'DENIED',
        userId: user.id
      });

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
      await db.createAreaAccessLog({
        participantId: participant.id,
        areaId,
        status: 'DENIED',
        userId: user.id
      });

      res.json({
        allowed: false,
        status: 'DENIED',
        participant,
        message: 'Acesso negado: participante pertence a outro evento.'
      });
      return;
    }

    // Validation rule check 3: IF participante não tem acesso à área -> NEGAR acesso
    const hasAccess = Array.isArray(participant.allowedAreas) && participant.allowedAreas.includes(areaId);

    if (!hasAccess) {
      await db.createAreaAccessLog({
        participantId: participant.id,
        areaId,
        status: 'DENIED',
        userId: user.id
      });

      res.json({
        allowed: false,
        status: 'DENIED',
        participant,
        message: 'Acesso negado para a área selecionada.'
      });
      return;
    }

    // Validation rule check 4: IF permitido -> LIBERAR acesso
    await db.createAreaAccessLog({
      participantId: participant.id,
      areaId,
      status: 'ALLOWED',
      userId: user.id
    });

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
