import express from 'express';
import { db } from '../server/db';
import { UserRole, ActionLogAction } from '../src/types';

const router = express.Router();

const writeActionLog = async (log: { eventId?: string; userId?: string; participantId?: string; action: ActionLogAction }) => {
  try {
    if (!log.eventId || !log.userId) return;
    await db.createActionLog({
      eventId: log.eventId,
      userId: log.userId,
      ...(log.participantId ? { participantId: log.participantId } : {}),
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

// Self-contained Authentication Middleware
const authenticateToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      res.status(401).json({ error: 'Token de autenticação ausente' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Token malformado' });
      return;
    }

    const parts = token.split('-');
    if (parts[0] !== 'credencia' || parts[1] !== 'token' || parts.length < 5) {
      res.status(403).json({ error: 'Token inválido ou expirado' });
      return;
    }

    const dbUserId = parts[2];
    const role = parts[3] as UserRole;
    const email = parts.slice(4).join('-');

    const user = await db.getUserById(dbUserId);
    if (!user || user.email.toLowerCase() !== email.toLowerCase() || user.role !== role) {
      res.status(403).json({ error: 'Acesso recusado' });
      return;
    }

    (req as any).user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Erro interno ao autenticar requisição' });
  }
};

const CHECKIN_PERMISSION_IDS = ['checkin.perform'];

const hasCheckinPermission = async (user: any, eventId: string) => {
  const globalRole = String(user?.role || '').toUpperCase();
  if (globalRole === 'ADMIN' || user?.role === 'admin') return true;

  const eventLink = await db.getEventUser(eventId, user.id);
  if (eventLink?.active) {
    const permissions = Array.isArray(eventLink.permissions) ? eventLink.permissions : [];
    if (permissions.some(permission => CHECKIN_PERMISSION_IDS.includes(permission))) return true;
    return ['ADMIN', 'CHECKIN_CADASTRO', 'CHECKIN'].includes(String(eventLink.role || '').toUpperCase());
  }

  const userPermissions = Array.isArray(user?.permissions) ? user.permissions : [];
  if (userPermissions.some(permission => CHECKIN_PERMISSION_IDS.includes(permission))) return true;
  return ['SUPERVISOR', 'CHECKIN_CADASTRO', 'CHECKIN', 'ATENDENTE', 'OPERADOR', 'OPERATOR'].includes(globalRole);
};

/**
 * 1. POST /api/checkin
 * Body: { userId, eventId }
 * - Verifica se já existe check-in
 * - Se não existir -> cria
 * - Retorna sucesso ou erro
 */
router.post('/', authenticateToken, async (req: express.Request, res: express.Response) => {
  const { userId, eventId } = req.body;

  if (!userId || !eventId) {
    res.status(400).json({ 
      success: false, 
      message: 'Parâmetros userId e eventId são obrigatórios' 
    });
    return;
  }

  try {
    // Check if participant/user exists
    let participant = await db.getParticipantById(userId);
    if (!participant) {
      participant = await db.getParticipantByTicketCode(userId);
    }
    if (!participant) {
      participant = await db.getParticipantByCpfAndEvent(userId, eventId);
    }

    if (!participant) {
      res.status(404).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
      return;
    }

    // Verify participant target event matches input
    if (participant.eventId !== eventId) {
      res.status(400).json({ 
        success: false, 
        message: 'Este participante pertence a um evento diferente' 
      });
      return;
    }

    const event = await db.getEventById(eventId);
    const reqUser = (req as any).user;

    if (!event || event.organizationId !== (reqUser?.organizationId || 'org1')) {
      res.status(403).json({
        success: false,
        message: 'Acesso negado para este evento'
      });
      return;
    }

    if (!(await hasCheckinPermission(reqUser, eventId))) {
      res.status(403).json({
        success: false,
        message: 'Usuário sem permissão para fazer check-in neste evento'
      });
      return;
    }

    // Check if already checked in
    const existingCheckIn = await db.getCheckIn(participant.id, eventId);
    if (existingCheckIn || participant.checkedIn) {
      res.status(200).json({ 
        success: true, 
        alreadyCheckedIn: true,
        message: 'Participante já credenciado. Deseja imprimir a etiqueta novamente?',
        user: {
          id: participant.id,
          name: participant.name,
          email: participant.email,
          cpf: participant.cpf,
          category: participant.category,
          company: participant.company,
          ticketCode: participant.ticketCode
        },
        event: {
          id: event?.id || eventId,
          name: event?.name || 'Evento'
        },
        checkInAt: existingCheckIn?.checkInAt || participant.checkedInAt || new Date().toISOString()
      });
      return;
    }

    // Perform check in
    const checkIn = await db.createCheckIn(participant.id, eventId);
    
    // Log the check-in action automatically
    await writeLegacyLog({
      participantId: participant.id,
      action: 'CHECKIN',
      performedBy: reqUser?.name || reqUser?.email || 'Operador',
      eventId: eventId,
      organizationId: reqUser?.organizationId || 'org1'
    });
    await writeActionLog({
      eventId,
      userId: reqUser?.id,
      participantId: participant.id,
      action: 'CHECKIN'
    });

    res.status(201).json({
      success: true,
      alreadyCheckedIn: false,
      message: 'Check-in realizado com sucesso',
      user: {
        id: participant.id,
        name: participant.name,
        email: participant.email,
        cpf: participant.cpf,
        category: participant.category,
        company: participant.company,
        ticketCode: participant.ticketCode
      },
      event: {
        id: event?.id || eventId,
        name: event?.name || 'Evento'
      },
      checkIn,
      participant: { ...participant, checkedIn: true, checkedInAt: checkIn.checkInAt }
    });
  } catch (error: any) {
    console.error('Error handling checkin POST:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno ao registrar check-in' 
    });
  }
});

/**
 * 2. GET /api/checkin/event/:eventId (or query parameter eventId)
 * - Lista todos participantes que fizeram check-in no evento
 */
router.get('/event/:eventId?', authenticateToken, async (req: express.Request, res: express.Response) => {
  const eventIdParams = req.params.eventId;
  const eventIdQuery = req.query.eventId as string;
  const eventId = eventIdParams || eventIdQuery;

  if (!eventId) {
    res.status(400).json({ error: 'O ID do evento (eventId) é obrigatório como parâmetro ou query' });
    return;
  }

  try {
    // Find all check-ins for this event from db
    const checkins = await db.getCheckInsByEvent(eventId);
    
    // Fetch all participants for this event in a single call to avoid N+1 queries
    const participants = await db.getParticipants(eventId);
    const participantMap = new Map(participants.map(p => [p.id, p]));
    
    // Join details of active participants
    const responseList = [];
    for (const c of checkins) {
      const p = participantMap.get(c.userId);
      if (p) {
        responseList.push({
          id: c.id,
          userId: c.userId,
          eventId: c.eventId,
          checkInAt: c.checkInAt,
          name: p.name,
          email: p.email,
          cpf: p.cpf,
          category: p.category,
          ticketCode: p.ticketCode,
          company: p.company
        });
      }
    }

    res.json(responseList);
  } catch (error: any) {
    console.error('Error getting event check-ins:', error);
    res.status(500).json({ error: 'Erro interno ao obter presentes do evento' });
  }
});

/**
 * 3. GET /api/checkin/user/:userId (or query parameter userId)
 * - Lista eventos que o usuário participou
 */
router.get('/user/:userId?', authenticateToken, async (req: express.Request, res: express.Response) => {
  const userIdParams = req.params.userId;
  const userIdQuery = req.query.userId as string;
  const userId = userIdParams || userIdQuery;

  if (!userId) {
    res.status(400).json({ error: 'O ID do participante (userId) é obrigatório como parâmetro ou query' });
    return;
  }

  try {
    const checkins = await db.getCheckInsByUser(userId);
    const responseList = [];

    for (const c of checkins) {
      const event = await db.getEventById(c.eventId);
      if (event) {
        responseList.push({
          id: c.id,
          userId: c.userId,
          eventId: c.eventId,
          checkInAt: c.checkInAt,
          eventName: event.name,
          eventDate: event.date,
          eventLocation: event.location
        });
      }
    }

    res.json(responseList);
  } catch (error: any) {
    console.error('Error getting user checked events:', error);
    res.status(500).json({ error: 'Erro interno ao listar eventos participados' });
  }
});

export default router;
