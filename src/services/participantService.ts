import { Participant } from '../types';
import { apiRequest } from './api';
import { getParticipantsFromCache, saveParticipantsToCache } from './offlineService';

type ParticipantBatchPayload = Record<string, unknown>;

const normalizeParticipantList = (data: unknown): Participant[] => {
  if (Array.isArray(data)) return data as Participant[];
  if (data && typeof data === 'object' && Array.isArray((data as { participants?: unknown[] }).participants)) {
    return (data as { participants: Participant[] }).participants;
  }
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown[] }).data)) {
    return (data as { data: Participant[] }).data;
  }
  return [];
};

export const participantService = {
  async getParticipants(eventId: string): Promise<Participant[]> {
    if (!eventId) return [];

    if (!navigator.onLine) {
      return getParticipantsFromCache(eventId);
    }

    try {
      const data = await apiRequest<Participant[] | { participants?: Participant[]; data?: Participant[] }>(`/api/events/${eventId}/participants`);
      const participants = normalizeParticipantList(data);
      saveParticipantsToCache(eventId, participants);
      return participants;
    } catch (error) {
      console.warn('Erro ao obter participantes online, tentando ler do cache offline:', error);
      return getParticipantsFromCache(eventId);
    }
  },

  async createParticipant(eventId: string, participantData: Omit<Participant, 'id' | 'createdAt' | 'checkedIn' | 'ticketCode'>): Promise<Participant> {
    const data = await apiRequest<Participant>(`/api/events/${eventId}/participants`, {
      method: 'POST',
      body: JSON.stringify(participantData)
    });

    try {
      const cached = getParticipantsFromCache(eventId);
      saveParticipantsToCache(eventId, [...cached, data]);
    } catch (error) {
      console.warn('Erro ao atualizar cache local apos cadastro:', error);
    }

    return data;
  },

  async updateParticipant(participantId: string, eventId: string, updates: Partial<Participant>): Promise<Participant> {
    const data = await apiRequest<Participant>(`/api/participants/${participantId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });

    if (eventId) {
      try {
        const cached = getParticipantsFromCache(eventId);
        const updated = cached.map(participant => participant.id === participantId ? { ...participant, ...data } : participant);
        saveParticipantsToCache(eventId, updated);
      } catch (error) {
        console.warn('Erro ao atualizar cache local apos edicao:', error);
      }
    }

    return data;
  },

  async deleteParticipant(participantId: string, eventId: string): Promise<boolean> {
    await apiRequest(`/api/participants/${participantId}`, {
      method: 'DELETE'
    });

    if (eventId) {
      try {
        const cached = getParticipantsFromCache(eventId);
        saveParticipantsToCache(eventId, cached.filter(participant => participant.id !== participantId));
      } catch (error) {
        console.warn('Erro ao atualizar cache local apos remocao:', error);
      }
    }

    return true;
  },

  async importBatch(eventId: string, participantsList: ParticipantBatchPayload[]): Promise<unknown> {
    const data = await apiRequest(`/api/events/${eventId}/participants/batch`, {
      method: 'POST',
      body: JSON.stringify({ participants: participantsList })
    });

    try {
      const updatedList = await this.getParticipants(eventId);
      saveParticipantsToCache(eventId, updatedList);
    } catch (error) {
      console.warn('Erro ao reatualizar cache local apos importacao por lotes:', error);
    }

    return data;
  }
};
