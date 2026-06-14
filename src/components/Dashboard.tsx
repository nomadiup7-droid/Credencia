import React, { useState, useEffect } from 'react';
import { User, Event, DashboardStats } from '../types';
import StatsCard from './StatsCard';
import { 
  RefreshCw, 
  AlertTriangle
} from 'lucide-react';

interface DashboardProps {
  id?: string;
  currentUser: User | null;
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
  onNavigate?: (tab: 'eventos-ativos' | 'eventos' | 'evento-dashboard' | 'participantes' | 'checkin' | 'usuarios') => void;
  onLogout: () => void;
  token: string | null;
}

export default function Dashboard({
  id,
  currentUser,
  selectedEventId,
  onSelectEvent,
  onNavigate,
  onLogout,
  token
}: DashboardProps) {
  // State for data from API
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventStats, setEventStats] = useState<DashboardStats | null>(null);

  // Load and errors states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Helper to fetch data safely using authorization headers
  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    setError(null);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    try {
      // 1. Fetch Users and Events in parallel
      const [usersRes, eventsRes] = await Promise.all([
        fetch('/api/users', { headers }),
        fetch('/api/events', { headers })
      ]);

      if (!usersRes.ok) throw new Error('Falha ao buscar usuários do sistema.');
      if (!eventsRes.ok) throw new Error('Falha ao buscar eventos do sistema.');

      const usersData: User[] = await usersRes.json();
      const eventsData: Event[] = await eventsRes.json();

      setUsers(usersData);
      setEvents(eventsData);

      // Determine active event ID to load stats for.
      // Fallback to first event id if none is selected
      const targetEventId = selectedEventId || (eventsData.length > 0 ? eventsData[0].id : '');

      if (targetEventId) {
        // Automatically set the event id in parent if not set yet
        if (!selectedEventId) {
          onSelectEvent(targetEventId);
        }

        // 2. Fetch specific statistics for the active event
        const statsRes = await fetch(`/api/events/${targetEventId}/dashboard`, { headers });
        if (statsRes.ok) {
          const statsData: DashboardStats = await statsRes.json();
          setEventStats(statsData);
        } else {
          setEventStats(null);
        }
      } else {
        setEventStats(null);
      }
    } catch (err: any) {
      console.error('Error in Dashboard data loading:', err);
      setError(err.message || 'Ocorreu um erro ao carregar os dados do painel.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refetch when token or selectedEventId changes
  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, selectedEventId]);

  // Compute stats calculations 
  const totalUsersCount = users.length;
  const totalEventsCount = events.length;
  
  // Extract stats for chosen event, fallback to mock/defaults if none
  const totalRegisteredCount = eventStats?.totalRegistered ?? 0;
  const totalCheckedInCount = eventStats?.totalCheckedIn ?? 0;
  const totalWaitingCount = eventStats?.totalWaiting ?? 0;
  const eventCapacity = eventStats?.capacity ?? 0;

  // Percentage calculations
  const checkinPercentage = totalRegisteredCount > 0 
    ? Math.round((totalCheckedInCount / totalRegisteredCount) * 100) 
    : 0;

  return (
    <section id={id} className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Painel geral</p>
          <h1 className="text-2xl font-bold text-slate-950 font-display mt-1">Administração do sistema</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl">
            Crie eventos, acompanhe operadores e entre na operação do evento ativo quando precisar.
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-[#12e000] bg-[#12e000] text-sm font-bold text-slate-950 hover:bg-[#0fc800] disabled:opacity-60 transition cursor-pointer"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin text-slate-950' : ''} />
          <span>Atualizar</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-md flex items-center gap-3 text-rose-800 text-sm">
          <AlertTriangle size={16} className="shrink-0" />
          <span className="font-semibold">{error}</span>
          <button
            onClick={() => fetchData()}
            className="ml-auto underline font-bold hover:text-rose-950 cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          id="kpi-users"
          title="Operadores"
          value={totalUsersCount}
          iconName="Shield"
          description="Acessos cadastrados"
          trend={{ text: 'Sistema', type: 'info' }}
          colorTheme="blue"
          isLoading={loading}
          onClick={() => onNavigate?.('usuarios')}
        />
        <StatsCard
          id="kpi-events"
          title="Eventos"
          value={totalEventsCount}
          iconName="Calendar"
          description="Eventos disponiveis"
          trend={{ text: 'Base', type: 'info' }}
          colorTheme="purple"
          isLoading={loading}
          onClick={() => onNavigate?.('eventos')}
        />
        <StatsCard
          id="kpi-registered"
          title="Inscritos"
          value={totalRegisteredCount}
          iconName="Users"
          description={eventCapacity > 0 ? `Capacidade: ${eventCapacity}` : 'Sem limite definido'}
          trend={{ text: eventStats ? 'Evento ativo' : 'Sem dados', type: eventStats ? 'success' : 'warning' }}
          colorTheme="emerald"
          isLoading={loading}
          onClick={() => onNavigate?.('participantes')}
        />
        <StatsCard
          id="kpi-checkins"
          title="Check-ins"
          value={totalCheckedInCount}
          iconName="UserCheck"
          description={`${checkinPercentage}% de presenca`}
          trend={{ text: `${totalWaitingCount} pendentes`, type: 'info' }}
          colorTheme="amber"
          isLoading={loading}
          onClick={() => onNavigate?.('checkin')}
        />
      </div>

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0, 1].map(item => (
            <div key={item} className="bg-white rounded-lg p-6 h-[320px] border border-slate-200 flex flex-col animate-pulse">
              <div className="h-5 w-48 bg-slate-200 rounded mb-4" />
              <div className="flex-1 space-y-4">
                {[0, 1, 2, 3].map(row => <div key={row} className="h-12 bg-slate-100 rounded" />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>

  );
}
