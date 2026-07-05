import type { Participant } from '../types';
import { fixMojibake } from './text';

export const normalizeParticipantSearch = (value?: string) => fixMojibake(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[._\-+/ ]/g, '');

export const getParticipantSearchScore = (participant: Participant, query: string) => {
  const name = normalizeParticipantSearch(participant.name);
  const badgeName = normalizeParticipantSearch(participant.badgeName || '');
  const firstName = normalizeParticipantSearch(participant.name.split(/\s+/)[0] || '');
  const badgeFirstName = normalizeParticipantSearch((participant.badgeName || '').split(/\s+/)[0] || '');
  const cpf = normalizeParticipantSearch(participant.cpf || '');
  const ticketCode = normalizeParticipantSearch(participant.ticketCode || '');
  const id = normalizeParticipantSearch(participant.id || '');

  if (firstName.startsWith(query)) return 0;
  if (badgeFirstName.startsWith(query)) return 1;
  if (name.startsWith(query)) return 2;
  if (badgeName.startsWith(query)) return 3;
  if (cpf.startsWith(query)) return 4;
  if (ticketCode.startsWith(query) || id.startsWith(query) || query.includes(ticketCode) || query.includes(id)) return 5;
  if (name.includes(query)) return 6;
  if (badgeName.includes(query)) return 7;
  if (cpf.includes(query) || ticketCode.includes(query) || id.includes(query)) return 8;
  return 99;
};
