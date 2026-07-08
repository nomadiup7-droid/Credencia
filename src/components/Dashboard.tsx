import React, { useState, useEffect } from 'react';
import { User, Event, DashboardStats } from '../types';
import StatsCard from './StatsCard';
import { 
  RefreshCw, 
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Radio
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
  const hourlyCheckins = eventStats?.hourlyCheckins || [];
  const recentCheckins = eventStats?.recentCheckins || [];
  const maxHourlyCheckins = Math.max(1, ...hourlyCheckins.map(item => item.count));
  const selectedEvent = events.find(event => event.id === (selectedEventId || events[0]?.id));
  const activeEvents = events.slice(0, 4);

  return (
    <section id={id} className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="cx-card relative overflow-hidden p-6 lg:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#12e000]/10 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="cx-badge inline-flex px-3 py-1 text-[11px]">Painel executivo</div>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-950 font-display mt-3 tracking-tight">
              Visão central do Credencia
            </h1>
            <p className="text-sm text-slate-500 mt-2 max-w-2xl">
              Acompanhe operação, eventos e credenciamento em tempo real com leitura rápida dos principais indicadores.
            </p>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="cx-button-primary inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-slate-950' : ''} />
            <span>Atualizar painel</span>
          </button>
        </div>
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

      {!loading && !error && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
          <div className="cx-card p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Operação do evento</p>
                <h2 className="font-display text-xl font-bold text-slate-950 mt-1">
                  {selectedEvent?.name || 'Evento ativo'}
                </h2>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                <Radio size={13} />
                Ao vivo
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-center">
              <div
                className="relative mx-auto flex h-48 w-48 items-center justify-center rounded-full"
                style={{ background: `conic-gradient(#12e000 ${checkinPercentage}%, #e7ece5 0)` }}
              >
                <div className="absolute inset-4 rounded-full bg-white/95 shadow-inner" />
                <div className="relative text-center">
                  <div className="text-4xl font-bold font-display text-slate-950">{checkinPercentage}%</div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Presença</div>
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Check-ins por horário</h3>
                    <p className="text-xs text-slate-500">Volume de credenciamentos do evento ativo.</p>
                  </div>
                  <ArrowUpRight size={18} className="text-emerald-700" />
                </div>
                <div className="flex h-44 items-end gap-2 rounded-2xl border border-slate-200/80 bg-white/55 p-4">
                  {(hourlyCheckins.length ? hourlyCheckins : [{ hour: 'Agora', count: totalCheckedInCount }]).slice(-10).map(item => (
                    <div key={item.hour} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-emerald-700 to-[#12e000] shadow-[0_8px_18px_rgba(18,224,0,0.18)]"
                        style={{ height: `${Math.max(8, (item.count / maxHourlyCheckins) * 132)}px` }}
                        title={`${item.hour}: ${item.count}`}
                      />
                      <span className="max-w-full truncate text-[10px] font-bold text-slate-400">{item.hour}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="cx-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Credenciados hoje</p>
                  <h2 className="font-display text-xl font-bold text-slate-950">Últimos check-ins</h2>
                </div>
                <CheckCircle2 className="text-emerald-700" size={22} />
              </div>
              <div className="space-y-3">
                {recentCheckins.length ? recentCheckins.slice(0, 5).map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900">{item.participantName}</div>
                      <div className="text-xs text-slate-500">{item.category}</div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <Clock size={13} />
                      {new Date(item.checkedInAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )) : (
                  <div className="cx-empty-state p-6 text-center text-sm font-semibold text-slate-500">
                    Nenhum check-in recente para exibir.
                  </div>
                )}
              </div>
            </div>

            <div className="cx-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Eventos</p>
                  <h2 className="font-display text-xl font-bold text-slate-950">Próximas operações</h2>
                </div>
                <Calendar className="text-emerald-700" size={22} />
              </div>
              <div className="space-y-2">
                {activeEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => onSelectEvent(event.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      event.id === selectedEvent?.id
                        ? 'border-emerald-300 bg-emerald-50/80'
                        : 'border-slate-200/80 bg-white/55 hover:border-emerald-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-bold text-slate-900">{event.name}</span>
                      <span className="text-xs font-semibold text-slate-500">{event.date}</span>
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-500">{event.location}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
