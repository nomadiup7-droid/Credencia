import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { db, DBUser } from './db';
import { UserRole } from '../src/types';

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRES_IN = '12h';
const runtimeJwtSecret = randomBytes(64).toString('hex');
let warnedMissingSecret = false;

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
  organizationId: string;
  mustChangeCredentials: boolean;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim().length >= 32) return secret;

  if (!warnedMissingSecret) {
    console.warn('JWT_SECRET ausente ou muito curto. Usando segredo temporario em memoria para desenvolvimento.');
    warnedMissingSecret = true;
  }

  return runtimeJwtSecret;
}

export function sanitizeAuthenticatedUser(user: DBUser): AuthenticatedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions || [],
    organizationId: user.organizationId || 'org1',
    mustChangeCredentials: user.mustChangeCredentials === true
  };
}

export function isAdminRole(role?: string) {
  const normalized = String(role || '').toUpperCase();
  return normalized === 'ADMIN';
}

export function signAuthToken(user: DBUser) {
  return jwt.sign(
    {
      role: user.role,
      email: user.email,
      organizationId: user.organizationId || 'org1'
    },
    getJwtSecret(),
    {
      subject: user.id,
      expiresIn: JWT_EXPIRES_IN
    }
  );
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash?: string) {
  if (!passwordHash) return { valid: false, needsRehash: false };

  if (passwordHash.startsWith('$2a$') || passwordHash.startsWith('$2b$') || passwordHash.startsWith('$2y$')) {
    return {
      valid: await bcrypt.compare(password, passwordHash),
      needsRehash: false
    };
  }

  return {
    valid: passwordHash === password,
    needsRehash: passwordHash === password
  };
}

export const authenticateToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Token de autenticacao ausente' });
      return;
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      res.status(401).json({ error: 'Token malformado' });
      return;
    }

    const payload = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload;
    const userId = String(payload.sub || '');
    if (!userId) {
      res.status(403).json({ error: 'Token inválido ou expirado' });
      return;
    }

    const user = await db.getUserById(userId);
    if (!user) {
      res.status(403).json({ error: 'Acesso nao autorizado' });
      return;
    }

    if (user.mustChangeCredentials && !req.path.endsWith('/auth/complete-first-access')) {
      res.status(403).json({
        error: 'Conclua o primeiro acesso antes de continuar.',
        code: 'FIRST_ACCESS_REQUIRED'
      });
      return;
    }

    const payloadOrganizationId = payload.organizationId ? String(payload.organizationId) : '';
    if (payloadOrganizationId && payloadOrganizationId !== (user.organizationId || 'org1')) {
      res.status(403).json({ error: 'Token nao pertence a organizacao do usuario' });
      return;
    }

    (req as any).user = sanitizeAuthenticatedUser(user);
    next();
  } catch (error) {
    res.status(403).json({ error: 'Token inválido ou expirado' });
  }
};

export const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: 'Nao autenticado' });
    return;
  }

  if (!isAdminRole(user.role)) {
    res.status(403).json({ error: 'Acesso negado. Requer perfil ADMIN.' });
    return;
  }

  next();
};
