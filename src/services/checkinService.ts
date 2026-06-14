import { CheckIn, DashboardStats, Participant } from '../types';
import { saveCheckinOffline, getParticipantsFromCache, saveParticipantsToCache } from './offlineService';

const getAuthHeaders = () => {
  const token = localStorage.getItem('credencia_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const serviceFetch = async (endpoint: string, options: RequestInit = {}) => {
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    }
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Erro de conexão com o servidor! Status: ${res.status}`);
  }
  return res.json();
};

export const checkinService = {
  /**
   * Realiza um check-in para um participante. Se estiver offline, salva na fila pendente.
   */
  async performCheckin(eventId: string, participantId: string, participantObj?: Participant): Promise<{ success: boolean; message: string; participant?: Participant }> {
    const isOffline = !navigator.onLine;

    if (isOffline) {
      saveCheckinOffline({
        participantId,
        eventId,
        checkedInAt: new Date().toISOString()
      });

      // Atualiza o participante no cache offline
      const cached = getParticipantsFromCache(eventId);
      const updated = cached.map(p => p.id === participantId ? { ...p, checkedIn: true, checkedInAt: new Date().toISOString() } : p);
      saveParticipantsToCache(eventId, updated);

      const target = updated.find(p => p.id === participantId) || participantObj;
      return {
        success: true,
        message: '[Offline] Check-in gravado localmente para sincronização futura',
        participant: target ? { ...target, checkedIn: true } : undefined
      };
    }

    try {
      const data = await serviceFetch('/api/checkin', {
        method: 'POST',
        body: JSON.stringify({ userId: participantId, eventId })
      });
      return {
        success: true,
        message: data.message || 'Check-in realizado com sucesso',
        participant: data.participant
      };
    } catch (error: any) {
      // Fallback em tempo de erro de rede
      const isNetError = error.message?.includes('Failed to fetch') || error.message?.includes('network') || error.message?.includes('comunicação');
      if (isNetError) {
        saveCheckinOffline({
          participantId,
          eventId,
          checkedInAt: new Date().toISOString()
        });
        const cached = getParticipantsFromCache(eventId);
        const updated = cached.map(p => p.id === participantId ? { ...p, checkedIn: true, checkedInAt: new Date().toISOString() } : p);
        saveParticipantsToCache(eventId, updated);

        const target = updated.find(p => p.id === participantId) || participantObj;
        return {
          success: true,
          message: '[Offline-Fallback] Check-in gravado localmente devido a falhas na rede',
          participant: target ? { ...target, checkedIn: true } : undefined
        };
      }
      throw error;
    }
  },

  /**
   * Valida e realiza check-in via escaner de código de barras ou QRCode.
   */
  async scanCheckin(eventId: string, code: string): Promise<any> {
    const isOffline = !navigator.onLine;
    if (isOffline) {
      const cached = getParticipantsFromCache(eventId);
      const cleanCode = code.trim().toLowerCase();
      const p = cached.find(p => 
        p.id.toLowerCase() === cleanCode || 
        (p.ticketCode && p.ticketCode.toLowerCase() === cleanCode) ||
        (p.cpf && p.cpf.replace(/\D/g, '') === cleanCode.replace(/\D/g, ''))
      );

      if (!p) {
        throw new Error('Participante não localizado no cache offline');
      }

      if (p.checkedIn) {
        return {
          success: true,
          alreadyCheckedIn: true,
          message: 'Participante já realizou check-in (cache offline)',
          user: p
        };
      }

      // Salva offline
      saveCheckinOffline({
        participantId: p.id,
        eventId,
        checkedInAt: new Date().toISOString()
      });

      // Atualiza cache
      const updated = cached.map(item => item.id === p.id ? { ...item, checkedIn: true, checkedInAt: new Date().toISOString() } : item);
      saveParticipantsToCache(eventId, updated);

      return {
        success: true,
        alreadyCheckedIn: false,
        message: '[Offline] Check-in validado e agendado com sucesso!',
        user: { ...p, checkedIn: true }
      };
    }

    return await serviceFetch(`/api/events/${eventId}/checkin/scan`, {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  },

  /**
   * Obtém as estatísticas do painel (dashboard) do evento.
   */
  async getEventDashboard(eventId: string): Promise<DashboardStats> {
    return await serviceFetch(`/api/events/${eventId}/dashboard`);
  }
};
