import { Participant } from '../types';
import { getParticipantsFromCache, saveParticipantsToCache } from './offlineService';

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
    throw new Error(errData.error || `Erro na requisição. Status: ${res.status}`);
  }
  return res.json();
};

export const participantService = {
  /**
   * Obtém a lista de participantes vinculados a um evento. Se offline, retorna do cache local.
   */
  async getParticipants(eventId: string): Promise<Participant[]> {
    if (!eventId) return [];

    const isOffline = !navigator.onLine;
    if (isOffline) {
      console.log(`[Offline] Lendo participantes do cache local para o evento: ${eventId}`);
      return getParticipantsFromCache(eventId);
    }

    try {
      const data = await serviceFetch(`/api/events/${eventId}/participants`);
      const participants = Array.isArray(data) ? data : (data.participants || []);
      // Atualiza o cache local
      saveParticipantsToCache(eventId, participants);
      return participants;
    } catch (error) {
      console.warn('Erro ao obter participantes online, tentando ler do cache offline:', error);
      return getParticipantsFromCache(eventId);
    }
  },

  /**
   * Cria um participante associado a um evento.
   */
  async createParticipant(eventId: string, participantData: Omit<Participant, 'id' | 'createdAt' | 'checkedIn' | 'ticketCode'>): Promise<Participant> {
    const data = await serviceFetch(`/api/events/${eventId}/participants`, {
      method: 'POST',
      body: JSON.stringify(participantData)
    });
    
    // Atualiza o cache local pós cadastrar online
    try {
      const cached = getParticipantsFromCache(eventId);
      cached.push(data);
      saveParticipantsToCache(eventId, cached);
    } catch (e) {
      console.error('Erro ao atualizar cache local pós cadastro', e);
    }

    return data;
  },

  /**
   * Atualiza um participante.
   */
  async updateParticipant(participantId: string, eventId: string, updates: Partial<Participant>): Promise<Participant> {
    const data = await serviceFetch(`/api/participants/${participantId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });

    // Atualiza cache local
    if (eventId) {
      try {
        const cached = getParticipantsFromCache(eventId);
        const updated = cached.map(p => p.id === participantId ? { ...p, ...data } : p);
        saveParticipantsToCache(eventId, updated);
      } catch (e) {
        console.error('Erro ao atualizar cache local pós edição', e);
      }
    }

    return data;
  },

  /**
   * Deleta um participante.
   */
  async deleteParticipant(participantId: string, eventId: string): Promise<boolean> {
    await serviceFetch(`/api/participants/${participantId}`, {
      method: 'DELETE'
    });

    // Atualiza cache local
    if (eventId) {
      try {
        const cached = getParticipantsFromCache(eventId);
        const filtered = cached.filter(p => p.id !== participantId);
        saveParticipantsToCache(eventId, filtered);
      } catch (e) {
        console.error('Erro ao atualizar cache local pós remoção', e);
      }
    }

    return true;
  },

  /**
   * Importa lote de participantes via planilha.
   */
  async importBatch(eventId: string, participantsList: any[]): Promise<any> {
    const data = await serviceFetch(`/api/events/${eventId}/participants/batch`, {
      method: 'POST',
      body: JSON.stringify({ participants: participantsList })
    });

    // Atualiza o cache local
    try {
      const updatedList = await this.getParticipants(eventId);
      saveParticipantsToCache(eventId, updatedList);
    } catch (e) {
      console.error('Erro ao reatualizar cache local após importação por lotes', e);
    }

    return data;
  }
};
