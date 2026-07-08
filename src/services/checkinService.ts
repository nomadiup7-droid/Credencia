import { CheckIn, DashboardStats, Participant } from '../types';
import { apiRequest } from './api';
import { saveCheckinOffline, getParticipantsFromCache, saveParticipantsToCache } from './offlineService';

interface CheckinResult {
  success: boolean;
  message: string;
  participant?: Participant;
}

const persistOfflineCheckin = (eventId: string, participantId: string, participantObj?: Participant): CheckinResult => {
  const checkedInAt = new Date().toISOString();
  saveCheckinOffline({ participantId, eventId, checkedInAt });

  const cached = getParticipantsFromCache(eventId);
  const updated = cached.map(participant =>
    participant.id === participantId ? { ...participant, checkedIn: true, checkedInAt } : participant
  );
  saveParticipantsToCache(eventId, updated);

  const target = updated.find(participant => participant.id === participantId) || participantObj;
  return {
    success: true,
    message: '[Offline] Check-in gravado localmente para sincronizacao futura',
    participant: target ? { ...target, checkedIn: true, checkedInAt } : undefined
  };
};

export const checkinService = {
  async performCheckin(eventId: string, participantId: string, participantObj?: Participant): Promise<CheckinResult> {
    if (!navigator.onLine) {
      return persistOfflineCheckin(eventId, participantId, participantObj);
    }

    try {
      const data = await apiRequest<{ message?: string; participant?: Participant }>('/api/checkin', {
        method: 'POST',
        body: JSON.stringify({ userId: participantId, eventId })
      });
      return {
        success: true,
        message: data.message || 'Check-in realizado com sucesso',
        participant: data.participant
      };
    } catch (error: any) {
      const isNetworkError = error.message?.includes('Failed to fetch') ||
        error.message?.includes('network') ||
        error.message?.includes('conectar ao servidor');
      if (isNetworkError) {
        return persistOfflineCheckin(eventId, participantId, participantObj);
      }
      throw error;
    }
  },

  async scanCheckin(eventId: string, code: string): Promise<unknown> {
    if (!navigator.onLine) {
      const cached = getParticipantsFromCache(eventId);
      const cleanCode = code.trim().toLowerCase();
      const participant = cached.find(item =>
        item.id.toLowerCase() === cleanCode ||
        (item.ticketCode && item.ticketCode.toLowerCase() === cleanCode) ||
        (item.cpf && item.cpf.replace(/\D/g, '') === cleanCode.replace(/\D/g, ''))
      );

      if (!participant) {
        throw new Error('Participante nao localizado no cache offline');
      }

      if (participant.checkedIn) {
        return {
          success: true,
          alreadyCheckedIn: true,
          message: 'Participante ja realizou check-in (cache offline)',
          user: participant
        };
      }

      const result = persistOfflineCheckin(eventId, participant.id, participant);
      return {
        success: true,
        alreadyCheckedIn: false,
        message: result.message,
        user: result.participant
      };
    }

    return apiRequest(`/api/events/${eventId}/checkin/scan`, {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  },

  async getEventDashboard(eventId: string): Promise<DashboardStats> {
    return apiRequest<DashboardStats>(`/api/events/${eventId}/dashboard`);
  },

  async getEventCheckins(eventId: string): Promise<CheckIn[]> {
    return apiRequest<CheckIn[]>(`/api/checkin/event/${eventId}`);
  }
};
