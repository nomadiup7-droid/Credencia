import React, { useState, useMemo } from 'react';
import { Event, User } from '../types';
import EventList from '../components/EventList';
import EventForm from '../components/EventForm';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  CalendarDays, 
  ArrowUpDown, 
  X, 
  Sparkles, 
  AlertCircle 
} from 'lucide-react';

interface EventsPageProps {
  events: Event[];
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
  currentUser: User | null;
  apiCall: (endpoint: string, options?: RequestInit) => Promise<any>;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function EventsPage({
  events,
  setEvents,
  selectedEventId,
  onSelectEvent,
  currentUser,
  apiCall,
  addToast
}: EventsPageProps) {
  // Local state for Search & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByDateOrder, setSortByDateOrder] = useState<'asc' | 'desc'>('desc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const userRole = String(currentUser?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERVISOR' || currentUser?.role === 'admin';
  const selectedEvent = events.find(event => event.id === selectedEventId) || null;
  const selectedEventState = selectedEvent?.eventMode === 'PREPARACAO' || selectedEvent?.eventMode === 'TESTE'
    ? 'PREPARACAO'
    : selectedEvent?.eventMode === 'ENCERRADO'
      ? 'ENCERRADO'
      : 'OFICIAL';
  const isPreparation = selectedEventState === 'PREPARACAO';
  const isOfficial = selectedEventState === 'OFICIAL';
  const isClosed = selectedEventState === 'ENCERRADO';

  const updateEventInState = (updatedEvent: Event) => {
    setEvents(prev => prev.map(event => event.id === updatedEvent.id ? updatedEvent : event));
  };

  const handleSetPreparationMode = async () => {
    if (!selectedEvent || !isAdmin) return;
    try {
      const updated = await apiCall(`/api/events/${selectedEvent.id}/mode-test`, { method: 'POST' });
      updateEventInState(updated);
      addToast('Evento colocado em preparação.', 'success');
    } catch (error) {}
  };

  const handleResetTests = async () => {
    if (!selectedEvent || !isAdmin) return;
    const confirmation = window.prompt('Tem certeza que deseja zerar todos os check-ins e impressões de teste deste evento? Essa ação não apagará participantes nem configurações.\n\nDigite ZERAR TESTES para confirmar.');
    if (confirmation !== 'ZERAR TESTES') {
      if (confirmation !== null) addToast('Confirmacao invalida. Nenhum registro foi alterado.', 'error');
      return;
    }

    try {
      await apiCall(`/api/events/${selectedEvent.id}/reset-tests`, {
        method: 'POST',
        body: JSON.stringify({ confirmation })
      });
      addToast('Registros de teste foram desconsiderados.', 'success');
    } catch (error) {}
  };

  const handleStartOfficial = async () => {
    if (!selectedEvent || !isAdmin) return;
    if (!window.confirm('Iniciar evento oficial agora? Os novos check-ins, impressões e acessos passarão a entrar no relatório oficial.')) return;
    try {
      const updated = await apiCall(`/api/events/${selectedEvent.id}/start-official`, { method: 'POST' });
      updateEventInState(updated);
      addToast('Evento iniciado oficialmente.', 'success');
    } catch (error) {}
  };

  const handleCloseEvent = async () => {
    if (!selectedEvent || !isAdmin) return;
    if (!window.confirm('Encerrar este evento agora? Novos check-ins, impressões e acessos ficarão bloqueados até um ADMIN reabrir o evento.')) return;
    try {
      const updated = await apiCall(`/api/events/${selectedEvent.id}/close-event`, { method: 'POST' });
      updateEventInState(updated);
      addToast('Evento encerrado com dados oficiais consolidados.', 'success');
    } catch (error) {}
  };

  const handleReopenEvent = async () => {
    if (!selectedEvent || !isAdmin) return;
    if (!window.confirm('Reabrir este evento em modo oficial? Novos registros voltarão a entrar nos relatórios oficiais.')) return;
    try {
      const updated = await apiCall(`/api/events/${selectedEvent.id}/reopen-event`, { method: 'POST' });
      updateEventInState(updated);
      addToast('Evento reaberto em modo oficial.', 'success');
    } catch (error) {}
  };

  // Toggle sorting by date
  const toggleDateSort = () => {
    setSortByDateOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    addToast(
      `Ordenação de datas alterada para: ${sortByDateOrder === 'asc' ? 'Recentes primeiro' : 'Mais antigos primeiro'}`,
      'info'
    );
  };

  // Filter & Sort Events
  const filteredAndSortedEvents = useMemo(() => {
    let result = [...events];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        ev => 
          ev.name.toLowerCase().includes(q) || 
          ev.location.toLowerCase().includes(q) ||
          ev.id.toLowerCase().includes(q) ||
          (ev.description && ev.description.toLowerCase().includes(q))
      );
    }

    // Date sorting
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortByDateOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [events, searchQuery, sortByDateOrder]);

  // Handle Event select Action
  const handleSelectEvent = (id: string) => {
    const evName = events.find(e => e.id === id)?.name || 'Evento';
    onSelectEvent(id);
    addToast(`Evento selecionado com sucesso: ${evName}`, 'success');
  };

  // Trigger Create Action Modal
  const handleNewEventBtn = () => {
    if (!isAdmin) {
      addToast('Apenas administradores podem criar novos eventos.', 'warning');
      return;
    }
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  // Trigger Edit Action Modal
  const handleEditEventBtn = (event: Event) => {
    if (!isAdmin) {
      addToast('Apenas administradores podem gerenciar e editar eventos.', 'warning');
      return;
    }
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  // Handle Save (both PUT / POST)
  const handleSaveForm = async (formData: { 
    name: string; 
    description: string; 
    date: string; 
    location: string; 
    capacity: number; 
    credentialType: 'label' | 'badge';
    credentialSize: '9x4' | '8x4' | '8x5' | 'A6' | 'A7';
    showQRCode: boolean;
    enableAccessControl: boolean;
    enableCloakroom: boolean;
    enableScanner: boolean;
  }) => {
    setIsSaving(true);
    try {
      const isEdit = !!editingEvent;
      const endpoint = isEdit ? `/api/events/${editingEvent.id}` : '/api/events';
      const method = isEdit ? 'PUT' : 'POST';

      const saved = await apiCall(endpoint, {
        method,
        body: JSON.stringify(formData)
      });

      if (isEdit) {
        setEvents(prev => prev.map(ev => ev.id === saved.id ? saved : ev));
        addToast('Evento corporativo atualizado com sucesso!', 'success');
      } else {
        setEvents(prev => [...prev, saved]);
        // Auto select newly created event
        onSelectEvent(saved.id);
        addToast('Novo evento corporativo criado e ativado com sucesso!', 'success');
      }

      setIsModalOpen(false);
      setEditingEvent(null);
    } catch (err: any) {
      console.error('Error saving event:', err);
      // Toast message is already fired inside apiCall helper, but we reinforce it here if needed
    } finally {
      setIsSaving(false);
    }
  };

  // Handle DELETE API Call
  const handleDeleteEventClick = async (eventId: string) => {
    if (!isAdmin) {
      addToast('Apenas administradores possuem acesso à exclusão.', 'warning');
      return;
    }
    
    const evName = events.find(e => e.id === eventId)?.name || 'Este evento';
    const confirmMessage = ` Atenção!\nVocê está prestes a deletar permanentemente o evento "${evName}".\n\nIsso EXCLUIRÁ EM CASCATA todos os participantes, credenciamentos e itens salvos na chapelaria deste evento!\n\nDeseja realmente continuar?`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      await apiCall(`/api/events/${eventId}`, { method: 'DELETE' });
      addToast('Evento e todos os dados relacionados foram excluídos.', 'success');
      
      // Update state and selections
      setEvents(prev => prev.filter(ev => ev.id !== eventId));
      if (selectedEventId === eventId) {
        onSelectEvent('');
      }
    } catch (err: any) {
      console.error('Error deleting event:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-display">
            Gerenciamento de Eventos
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Gerencie datas, locais, lotações em tempo real e selecione o evento ativo da operação.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleNewEventBtn}
            className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all duration-150 shadow-sm cursor-pointer hover:shadow-lg active:scale-95 shrink-0 self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>Novo Evento</span>
          </button>
        )}
      </div>

      {selectedEvent && isAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Preparacao do Evento</p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-black text-slate-950">{selectedEvent.name}</h3>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide border ${
                  isClosed
                    ? 'bg-slate-200 text-slate-700 border-slate-300'
                    : isPreparation
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}>
                  {isClosed ? 'EVENTO ENCERRADO' : isPreparation ? 'PREPARAÇÃO' : 'EVENTO OFICIAL'}
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm text-slate-500">
                Controle quando a operação está em teste, quando passa a contar oficialmente e quando o evento fica encerrado para consolidar os relatórios.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 xl:min-w-[760px]">
              <button
                type="button"
                onClick={handleSetPreparationMode}
                disabled={isPreparation || isClosed}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Modo Teste
              </button>
              <button
                type="button"
                onClick={handleResetTests}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 hover:bg-rose-100 transition"
              >
                Zerar Testes
              </button>
              <button
                type="button"
                onClick={handleStartOfficial}
                disabled={!isPreparation}
                className="rounded-xl border border-emerald-200 bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Iniciar Evento Oficial
              </button>
              <button
                type="button"
                onClick={handleCloseEvent}
                disabled={!isOfficial}
                className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Encerrar Evento
              </button>
              <button
                type="button"
                onClick={handleReopenEvent}
                disabled={!isClosed}
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Reabrir Evento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control Bar: Search & Organizing filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search Bar Input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por nome, local ou id..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200/80 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters/Sorting Trigger */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={toggleDateSort}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer self-stretch sm:self-auto"
          >
            <CalendarDays size={14} className="text-slate-400" />
            <span>Data: {sortByDateOrder === 'asc' ? 'Antigos primeiro' : 'Recentes primeiro'}</span>
            <ArrowUpDown size={13} className="text-slate-500" />
          </button>
          
          <span className="text-xs text-slate-400 font-mono hidden md:inline ml-1 shrink-0 font-semibold">
            {filteredAndSortedEvents.length} listados
          </span>
        </div>
      </div>

      {/* Grid of contents list */}
      <EventList
        events={filteredAndSortedEvents}
        selectedEventId={selectedEventId}
        onSelect={handleSelectEvent}
        onEdit={handleEditEventBtn}
        onDelete={handleDeleteEventClick}
        currentUser={currentUser}
      />

      {/* Modal overlays for Create & Update Events (AnimatePresence) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop Layer wrapper */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSaving && setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg p-6 relative z-10 overflow-hidden"
            >
              {/* Close Icon button */}
              <button
                onClick={() => !isSaving && setIsModalOpen(false)}
                disabled={isSaving}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-705 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition shrink-0 cursor-pointer disabled:opacity-50"
              >
                <X size={16} />
              </button>

              <EventForm
                event={editingEvent}
                onSave={handleSaveForm}
                onCancel={() => setIsModalOpen(false)}
                isSaving={isSaving}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
