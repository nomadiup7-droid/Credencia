import type { Participant } from '../types';
import { fixMojibake } from './text';

export const normalizeParticipantSearch = (value?: string) => fixMojibake(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[._\-+/ ]/g, '');

export const extractCredentialTokenFromScan = (value?: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const scannerNormalized = fixMojibake(raw).replace(/[Çç]/g, ':');
  const directToken = scannerNormalized.match(/qr_[a-z0-9_-]+/i)?.[0];
  if (directToken) return directToken;
  const match = scannerNormalized.match(/(?:\/|;|\\)convite(?:\/|;|\\)+([^/?#;\\\s]+)/i);
  if (match) return decodeURIComponent(match[1]);
  try {
    const urlLike = scannerNormalized.replace(/;+/g, '/');
    const parsed = new URL(urlLike);
    const token = parsed.pathname.match(/\/convite\/([^/?#]+)/i)?.[1];
    if (token) return decodeURIComponent(token);
  } catch {}
  return raw;
};

export const getParticipantSearchScore = (participant: Participant, query: string) => {
  const name = normalizeParticipantSearch(participant.name);
  const badgeName = normalizeParticipantSearch(participant.badgeName || '');
  const firstName = normalizeParticipantSearch(participant.name.split(/\s+/)[0] || '');
  const badgeFirstName = normalizeParticipantSearch((participant.badgeName || '').split(/\s+/)[0] || '');
  const cpf = normalizeParticipantSearch(participant.cpf || '');
  const ticketCode = normalizeParticipantSearch(participant.ticketCode || '');
  const qrToken = normalizeParticipantSearch(participant.qrToken || '');
  const id = normalizeParticipantSearch(participant.id || '');

  if (firstName.startsWith(query)) return 0;
  if (badgeFirstName.startsWith(query)) return 1;
  if (name.startsWith(query)) return 2;
  if (badgeName.startsWith(query)) return 3;
  if (cpf.startsWith(query)) return 4;
  if (
    (ticketCode && (ticketCode.startsWith(query) || query.includes(ticketCode))) ||
    (qrToken && (qrToken.startsWith(query) || query.includes(qrToken))) ||
    (id && (id.startsWith(query) || query.includes(id)))
  ) return 5;
  if (name.includes(query)) return 6;
  if (badgeName.includes(query)) return 7;
  if (cpf.includes(query) || ticketCode.includes(query) || qrToken.includes(query) || id.includes(query)) return 8;
  return 99;
};
