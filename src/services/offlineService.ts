import { Participant } from '../types';

export interface OfflineCheckInItem {
  participantId: string;
  eventId: string;
  organizationId: string;
  checkedInAt: string;
  synced: boolean;
}

const PARTICIPANTS_CACHE_PREFIX = 'credencia_participants_cache_';
const CHECKINS_QUEUE_KEY = 'credencia_checkins_queue';

/**
 * Salva a lista de participantes de um evento específico em cache local.
 */
export function saveParticipantsToCache(eventId: string, data: Participant[]): void {
  if (!eventId) return;
  try {
    localStorage.setItem(`${PARTICIPANTS_CACHE_PREFIX}${eventId}`, JSON.stringify(data));
  } catch (error) {
    console.error('Erro ao salvar cache de participantes offline:', error);
  }
}

/**
 * Recupera os participantes de um evento específico que foram armazenados em cache local.
 */
export function getParticipantsFromCache(eventId: string): Participant[] {
  if (!eventId) return [];
  try {
    const cached = localStorage.getItem(`${PARTICIPANTS_CACHE_PREFIX}${eventId}`);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('Erro ao ler cache de participantes offline:', error);
    return [];
  }
}

/**
 * Salva um check-in realizado offline na fila de sincronização pendente.
 */
export function saveCheckinOffline(data: { participantId: string; eventId: string; organizationId?: string; checkedInAt?: string }): void {
  try {
    const queue = getPendingCheckins();
    const newItem: OfflineCheckInItem = {
      participantId: data.participantId,
      eventId: data.eventId,
      organizationId: data.organizationId || 'org1',
      checkedInAt: data.checkedInAt || new Date().toISOString(),
      synced: false,
    };
    
    // Evitar duplicados na fila pendente antes de enviar
    const exists = queue.some(item => item.participantId === newItem.participantId && item.eventId === newItem.eventId);
    if (!exists) {
      queue.push(newItem);
    }
    
    localStorage.setItem(CHECKINS_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Erro ao salvar check-in offline na fila:', error);
  }
}

/**
 * Recupera todos os check-ins offline pendentes armazenados no dispositivo.
 */
export function getPendingCheckins(): OfflineCheckInItem[] {
  try {
    const raw = localStorage.getItem(CHECKINS_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Erro ao obter fila de check-ins pendentes:', error);
    return [];
  }
}

/**
 * Limpa a fila de check-ins pendentes (normalmente após sincronização bem-sucedida).
 */
export function clearPendingCheckins(): void {
  try {
    localStorage.setItem(CHECKINS_QUEUE_KEY, '[]');
  } catch (error) {
    console.error('Erro ao limpar fila de check-ins pendentes:', error);
  }
}
