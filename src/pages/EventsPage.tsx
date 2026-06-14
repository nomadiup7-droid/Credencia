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
