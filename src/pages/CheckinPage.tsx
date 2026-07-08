import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Event, Participant, User, ParticipantField, ParticipantCategory, CheckinScreenConfig } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserCheck, 
  QrCode, 
  Search, 
  Plus, 
  Printer, 
  X, 
  Check,
  AlertTriangle,
  Building,
  RefreshCw,
  UserPlus,
  Settings,
  Save,
  CheckCircle2,
  Maximize2,
  CircleDot,
  Pencil,
  Users
} from 'lucide-react';

interface CheckinPageProps {
  id?: string;
  events: Event[];
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
  apiCall: (endpoint: string, options?: RequestInit) => Promise<any>;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  currentUser: User | null;
  canCreateParticipants: boolean;
  canConfigureCheckinScreen: boolean;
  onPrintBadge: (participant: Participant) => void;
  onUpdateEvent: (event: Event) => void;
  onLogout: () => void;
}

const DEFAULT_CHECKIN_SCREEN_CONFIG: CheckinScreenConfig = {
  showLogo: false,
  logoUrl: '',
  showEventName: true,
  backgroundColor: '#f8fafc',
  backgroundImageUrl: '',
  darkOverlay: false,
  primaryColor: '#1D4ED8',
  successColor: '#16A34A',
  errorColor: '#DC2626',
  searchPlaceholder: 'Buscar por nome, CPF ou QR Code',
  resetDelaySeconds: 2
};

type FeedbackState =
  | { type: 'success'; title: 'CHECK-IN REALIZADO'; message: string }
  | { type: 'warning'; title: 'PARTICIPANTE JÁ CREDENCIADO'; message: string }
  | { type: 'error'; title: 'PARTICIPANTE NÃO ENCONTRADO'; message: string };

export default function CheckinPage({
  id,
  events,
  selectedEventId,
  onSelectEvent,
  apiCall,
  addToast,
  participants,
  setParticipants,
  currentUser,
  canCreateParticipants,
  canConfigureCheckinScreen,
  onPrintBadge,
  onUpdateEvent,
  onLogout
}: CheckinPageProps) {
  // OFFLINE QUEUE STATES & HELPERS
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);

  const loadPendingQueueCount = () => {
    try {
      const queue = JSON.parse(localStorage.getItem('credencia_checkins_queue') || '[]');
      setPendingQueueCount(queue.length);
    } catch (e) {
      setPendingQueueCount(0);
    }
  };

  const syncOfflineQueue = async () => {
    const queueKey = 'credencia_checkins_queue';
    try {
      const queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
      if (queue.length === 0) return;

      setIsSyncingQueue(true);
      let successCount = 0;
      
      for (const item of queue) {
        try {
          await apiCall('/api/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: item.participantId,
              eventId: item.eventId
            })
          });
          successCount++;
        } catch (err) {
          console.error('Falha ao sincronizar item individual da fila:', err);
        }
      }

      if (successCount > 0) {
        addToast(`${successCount} check-in(s) offline sincronizado(s) com sucesso!`, 'success');
      }

      localStorage.setItem(queueKey, '[]');
      setPendingQueueCount(0);
    } catch (e) {
      console.error('Erro ao sincronizar fila:', e);
    } finally {
      setIsSyncingQueue(false);
    }
  };

  useEffect(() => {
    loadPendingQueueCount();
    const handleOnline = () => {
      addToast('Conectividade restabelecida! Sincronizando check-ins offline...', 'info');
      syncOfflineQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [badgeNameParticipant, setBadgeNameParticipant] = useState<Participant | null>(null);
  const [badgeNameValue, setBadgeNameValue] = useState('');
  const [isSavingBadgeName, setIsSavingBadgeName] = useState(false);

  // Focus ref for continuous keyboard readiness
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Loading and action operations
  const [isCheckingInId, setIsCheckingInId] = useState<string | null>(null);
  const [isSubmittingNewUser, setIsSubmittingNewUser] = useState(false);
  const [registrationFields, setRegistrationFields] = useState<ParticipantField[]>([]);
  const [isFieldsLoading, setIsFieldsLoading] = useState(false);

  // Scanner Simulator toggle
  const [simulatedCode, setSimulatedCode] = useState('');
  const [showScannerSimulator, setShowScannerSimulator] = useState(false);

  // Modal controls
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isReprintModalOpen, setIsReprintModalOpen] = useState(false);
  const [participantToReprint, setParticipantToReprint] = useState<Participant | null>(null);

  // Dynamic Form Values dictionary
  const [dynamicFormValues, setDynamicFormValues] = useState<Record<string, any>>({});

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const config: CheckinScreenConfig = {
    ...DEFAULT_CHECKIN_SCREEN_CONFIG,
    ...(selectedEvent?.checkinScreenConfig || {})
  };
  const [configForm, setConfigForm] = useState<CheckinScreenConfig>(config);

  useEffect(() => {
    setConfigForm(config);
  }, [selectedEventId, selectedEvent?.checkinScreenConfig]);

  // Keep input focused automatically
  useEffect(() => {
    if (selectedEventId) {
      searchInputRef.current?.focus();
    }
  }, [selectedEventId, isRegisterModalOpen, isReprintModalOpen]);

  // Fetch Participant Configuration Fields
  const fetchRegistrationFields = async () => {
    setIsFieldsLoading(true);
    try {
      const data = await apiCall('/api/fields');
      setRegistrationFields(data || []);
    } catch (err: any) {
      console.error('Falha ao buscar campos configurados:', err);
    } finally {
      setIsFieldsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrationFields();
  }, []);

  // Initialize form keys with dynamic fields
  const initializeDynamicForm = () => {
    const initialValues: Record<string, any> = {};
    registrationFields.forEach(f => {
      let fieldKey = f.id;
      if (f.id === 'f_name') fieldKey = 'name';
      else if (f.id === 'f_email') fieldKey = 'email';
      else if (f.id === 'f_cpf') fieldKey = 'cpf';
      else if (f.id === 'f_category') fieldKey = 'category';
      else if (f.id === 'f_company') fieldKey = 'company';

      if (f.type === 'checkbox') {
        initialValues[fieldKey] = false;
      } else if (f.type === 'select') {
        initialValues[fieldKey] = f.options?.[0] || 'Participante';
      } else {
        initialValues[fieldKey] = '';
      }
    });
    setDynamicFormValues(initialValues);
  };

  useEffect(() => {
    if (isRegisterModalOpen) {
      initializeDynamicForm();
    }
  }, [isRegisterModalOpen, registrationFields]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  // Standardize query comparisons
  const normalizeQuery = (text: string) => {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[._\-+/ ]/g, '');
  };

  // Real-time matched participants
  const filteredParticipants = useMemo(() => {
    const query = normalizeQuery(debouncedSearchTerm);
    if (query.length < 3) return [];

    const getSearchScore = (participant: Participant) => {
      const name = normalizeQuery(participant.name);
      const badgeName = normalizeQuery(participant.badgeName || '');
      const firstName = normalizeQuery(participant.name.split(/\s+/)[0] || '');
      const badgeFirstName = normalizeQuery((participant.badgeName || '').split(/\s+/)[0] || '');
      const ticketCode = normalizeQuery(participant.ticketCode || '');
      const cpf = normalizeQuery(participant.cpf || '');
      const email = normalizeQuery(participant.email || '');

      if (ticketCode === query) return 0;
      if (cpf === query) return 1;
      if (firstName.startsWith(query)) return 2;
      if (badgeFirstName.startsWith(query)) return 3;
      if (name.startsWith(query)) return 4;
      if (badgeName.startsWith(query)) return 5;
      if (ticketCode.includes(query)) return 6;
      if (cpf.includes(query)) return 7;
      if (email.startsWith(query)) return 8;
      if (name.includes(query)) return 9;
      if (badgeName.includes(query)) return 10;
      return 99;
    };

    const matched = participants
      .filter(p => getSearchScore(p) < 99)
      .sort((a, b) => {
        const scoreDiff = getSearchScore(a) - getSearchScore(b);
        if (scoreDiff !== 0) return scoreDiff;
        return (a.badgeName || a.name).localeCompare(b.badgeName || b.name, 'pt-BR');
      });

    setActiveSearchIndex(0);
    return matched;
  }, [participants, debouncedSearchTerm]);

  // Reset check-in view back to idle focused state
  const resetAfterAction = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setActiveSearchIndex(0);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 120);
  };

  const clearFeedbackAfterDelay = () => {
    const delay = Math.max(1, Number(config.resetDelaySeconds) || DEFAULT_CHECKIN_SCREEN_CONFIG.resetDelaySeconds) * 1000;
    window.setTimeout(() => {
      setFeedback(null);
      searchInputRef.current?.focus();
    }, delay);
  };

  const selectParticipant = (participant: Participant) => {
    if (participant.checkedIn) {
      setFeedback({
        type: 'warning',
        title: 'PARTICIPANTE JÁ CREDENCIADO',
        message: participant.checkedInAt
          ? `${participant.name} já realizou check-in às ${new Date(participant.checkedInAt).toLocaleTimeString('pt-BR')}.`
          : `${participant.name} já realizou check-in.`
      });
      clearFeedbackAfterDelay();
      searchInputRef.current?.focus();
      return;
    }

    handleCheckIn(participant);
  };

  // Perform participant accreditation
  const handleCheckIn = async (participant: Participant) => {
    if (!selectedEventId) {
      addToast('Selecione um evento ativo.', 'warning');
      return;
    }

    setIsCheckingInId(participant.id);
    try {
      const res = await apiCall('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: participant.id,
          eventId: selectedEventId
        })
      });

      // Synchronize in parent state
      setParticipants(prev =>
        prev.map(p => p.id === participant.id ? { ...p, checkedIn: true, checkedInAt: res.checkIn?.checkInAt } : p)
      );

      addToast(`Check-in realizado com sucesso! Emissão da credencial iniciada para: ${participant.name}`, 'success');

      // Set print status to backend
      await apiCall(`/api/participants/${participant.id}/reprint`, { method: 'POST' });
      
      setParticipants(prev =>
        prev.map(p => p.id === participant.id ? { ...p, printed: true } : p)
      );

      // Instantly call printer helper
      onPrintBadge({ ...participant, checkedIn: true, printed: true });

      setFeedback({
        type: 'success',
        title: 'CHECK-IN REALIZADO',
        message: `${participant.name} foi credenciado com sucesso.`
      });

      // Clean the terminal to accept next customer instantly
      resetAfterAction();
      clearFeedbackAfterDelay();

    } catch (err: any) {
      const isOfflineError = !navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('comunicação') || err.message?.includes('network') || err.message?.includes('offline');
      if (isOfflineError) {
        try {
          const queueKey = 'credencia_checkins_queue';
          const queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
          
          const timestamp = new Date().toISOString();
          const newItem = {
            participantId: participant.id,
            eventId: selectedEventId,
            organizationId: currentUser?.organizationId || 'org1',
            checkedInAt: timestamp
          };
          
          queue.push(newItem);
          localStorage.setItem(queueKey, JSON.stringify(queue));
          
          // Update parent state and local cache
          setParticipants(prev => {
            const updated = prev.map(p => p.id === participant.id ? { ...p, checkedIn: true, checkedInAt: timestamp, printed: true } : p);
            localStorage.setItem(`credencia_participants_cache_${selectedEventId}`, JSON.stringify(updated));
            return updated;
          });
          
          addToast(`[Offline] Check-in de ${participant.name} salvo localmente para sincronização futura!`, 'info');
          
          // Print badge
          onPrintBadge({ ...participant, checkedIn: true, printed: true, checkedInAt: timestamp });

          setFeedback({
            type: 'success',
            title: 'CHECK-IN REALIZADO',
            message: `${participant.name} foi credenciado em modo offline.`
          });
          
          // Update count
          loadPendingQueueCount();
          
          resetAfterAction();
          clearFeedbackAfterDelay();
          return;
        } catch (queueErr) {
          console.error('Falha ao enfileirar offline:', queueErr);
        }
      }
      addToast(err.message || 'Erro ao processar check-in.', 'error');
    } finally {
      setIsCheckingInId(null);
    }
  };

  // Immediate print helper
  const handleDirectPrint = async (participant: Participant) => {
    try {
      await apiCall(`/api/participants/${participant.id}/reprint`, { method: 'POST' });
      
      setParticipants(prev =>
        prev.map(p => p.id === participant.id ? { ...p, printed: true } : p)
      );
      
      addToast(`Credencial gerada com sucesso para ${participant.name}`, 'success');
      onPrintBadge({ ...participant, printed: true });
      resetAfterAction();
    } catch (err: any) {
      addToast(err.message || 'Falha ao registrar impressão.', 'error');
    }
  };

  // Reprint ask
  const askReprintConfirmation = (participant: Participant) => {
    setParticipantToReprint(participant);
    setIsReprintModalOpen(true);
  };

  // Confirm reprint Action
  const confirmReprint = async () => {
    if (!participantToReprint) return;
    try {
      await apiCall(`/api/participants/${participantToReprint.id}/reprint`, { method: 'POST' });
      addToast(`Reimpressão contabilizada: ${participantToReprint.name}`, 'success');
      onPrintBadge(participantToReprint);
      resetAfterAction();
    } catch (err: any) {
      addToast(err.message || 'Erro de reimpressão', 'error');
    } finally {
      setParticipantToReprint(null);
      setIsReprintModalOpen(false);
    }
  };

  // Handle dynamic form registration submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateParticipants) {
      addToast('Usuário sem permissão para cadastrar participantes neste evento.', 'error');
      return;
    }

    // Local dynamic validation of required fields
    const activeRequiredFields = registrationFields.filter(f => f.active && f.required);
    for (const f of activeRequiredFields) {
      let fieldKey = f.id;
      if (f.id === 'f_name') fieldKey = 'name';
      else if (f.id === 'f_email') fieldKey = 'email';
      else if (f.id === 'f_cpf') fieldKey = 'cpf';
      else if (f.id === 'f_category') fieldKey = 'category';
      else if (f.id === 'f_company') fieldKey = 'company';

      const val = dynamicFormValues[fieldKey];
      if (val === undefined || val === null || String(val).trim() === '') {
        addToast(`O campo '${f.name}' é de preenchimento obrigatório!`, 'warning');
        return;
      }
    }

    setIsSubmittingNewUser(true);
    try {
      // Setup payload including all custom dynamic values
      const payload = {
        ...dynamicFormValues,
        badgeName: dynamicFormValues.badgeName || dynamicFormValues.name || '',
        ticketCode: 'TKT-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        checkedIn: true,
        checkedInAt: new Date().toISOString()
      };

      const newParticipant = await apiCall(`/api/events/${selectedEventId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Update local sets
      setParticipants(prev => [newParticipant, ...prev]);
      addToast(`Participante cadastrado & credenciado: ${newParticipant.name}`, 'success');

      setIsRegisterModalOpen(false);

      // Track printed flag on server
      await apiCall(`/api/participants/${newParticipant.id}/reprint`, { method: 'POST' });
      setParticipants(prev =>
        prev.map(p => p.id === newParticipant.id ? { ...p, printed: true } : p)
      );

      // Trigger automatic badge printing
      onPrintBadge({ ...newParticipant, printed: true });

      // Clean check-in screen
      resetAfterAction();

    } catch (err: any) {
      addToast(err.message || 'Erro ao registrar participante.', 'error');
    } finally {
      setIsSubmittingNewUser(false);
    }
  };

  // Simulated barcode reader input checkin
  const triggerSimulatedCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = simulatedCode.trim();
    if (!cleanCode) return;

    try {
      const result = await apiCall(`/api/events/${selectedEventId}/checkin/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode })
      });

      if (result.error) {
        addToast(` ${result.error}`, 'error');
        return;
      }

      const p = result.participant;
      setParticipants(prev =>
        prev.map(item => item.id === p.id ? { ...item, checkedIn: true, checkedInAt: p.checkedInAt } : item)
      );

      addToast(` Check-in realizado via Leitor: ${p.name}`, 'success');
      setSimulatedCode('');
      setShowScannerSimulator(false);

      // Dispatch direct print
      handleDirectPrint(p);

    } catch (err: any) {
      addToast(err.message || 'Erro na leitura do leitor físico.', 'error');
    }
  };

  // Keyboard navigation on list items
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      if (filteredParticipants.length === 0) return;
      e.preventDefault();
      setActiveSearchIndex(prev => (prev + 1) % filteredParticipants.length);
    } else if (e.key === 'ArrowUp') {
      if (filteredParticipants.length === 0) return;
      e.preventDefault();
      setActiveSearchIndex(prev => (prev - 1 + filteredParticipants.length) % filteredParticipants.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredParticipants[activeSearchIndex];
      if (selected) {
        selectParticipant(selected);
      } else if (normalizeQuery(searchTerm).length >= 3) {
        setFeedback({
          type: 'error',
          title: 'PARTICIPANTE NÃO ENCONTRADO',
          message: `Nenhum participante encontrado para "${searchTerm}".`
        });
        clearFeedbackAfterDelay();
      }
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !canConfigureCheckinScreen) return;

    setIsSavingConfig(true);
    try {
      const updated = await apiCall(`/api/events/${selectedEvent.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          checkinScreenConfig: {
            ...configForm,
            resetDelaySeconds: Math.max(1, Number(configForm.resetDelaySeconds) || DEFAULT_CHECKIN_SCREEN_CONFIG.resetDelaySeconds)
          }
        })
      });
      onUpdateEvent(updated);
      addToast('Configuração da tela de Check-in salva com sucesso.', 'success');
      setShowConfigPanel(false);
      setTimeout(() => searchInputRef.current?.focus(), 120);
    } catch (err: any) {
      addToast(err.message || 'Erro ao salvar configuração da tela de Check-in.', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const openBadgeNameEditor = (participant: Participant) => {
    setBadgeNameParticipant(participant);
    setBadgeNameValue(participant.badgeName || participant.name);
  };

  const handleSaveBadgeName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeNameParticipant) return;

    const cleanBadgeName = badgeNameValue.trim();
    if (!cleanBadgeName) {
      addToast('Informe o nome que será impresso no crachá.', 'warning');
      return;
    }

    setIsSavingBadgeName(true);
    try {
      const updated = await apiCall(`/api/participants/${badgeNameParticipant.id}/badge-name`, {
        method: 'PATCH',
        body: JSON.stringify({ badgeName: cleanBadgeName })
      });

      setParticipants(prev => prev.map(p => p.id === updated.id ? updated : p));
      setBadgeNameParticipant(null);
      setBadgeNameValue('');
      addToast('Nome do crachá atualizado.', 'success');
      setTimeout(() => searchInputRef.current?.focus(), 120);
    } catch (err: any) {
      addToast(err.message || 'Erro ao atualizar nome do crachá.', 'error');
    } finally {
      setIsSavingBadgeName(false);
    }
  };

  const normalizedSearchTerm = normalizeQuery(searchTerm);
  const normalizedDebouncedSearchTerm = normalizeQuery(debouncedSearchTerm);
  const isWaitingForDebouncedSearch = normalizedSearchTerm !== normalizedDebouncedSearchTerm;
  const notFound = false;

  const activeFeedback: FeedbackState | null = feedback || (notFound ? {
    type: 'error',
    title: 'PARTICIPANTE NÃO ENCONTRADO',
    message: `Nenhum participante encontrado para "${debouncedSearchTerm}".`
  } : null);

  const feedbackColor = activeFeedback?.type === 'success'
    ? config.successColor
    : activeFeedback?.type === 'error'
      ? config.errorColor
      : '#D97706';
  const isStandaloneCheckin = window.location.pathname === '/checkin';
  const isCheckinOnlyOperator = !!currentUser && !canCreateParticipants && !canConfigureCheckinScreen;
  const isFullscreenCheckin = isStandaloneCheckin || isCheckinOnlyOperator;
  const toolbarPositionClass = isFullscreenCheckin ? 'fixed right-4 top-4 z-50' : 'absolute right-4 top-4 z-50';

  return (
    <div
      id={id}
      className={`relative overflow-hidden px-4 py-6 sm:px-8 ${isFullscreenCheckin ? 'h-screen min-h-screen rounded-none' : 'min-h-[calc(100vh-150px)] rounded-none sm:rounded-xl'}`}
      style={{
        backgroundColor: config.backgroundColor,
        backgroundImage: config.backgroundImageUrl ? `url(${config.backgroundImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {config.darkOverlay && <div className="absolute inset-0 bg-slate-950/55" />}
      <div className="relative z-10 mx-auto flex min-h-full max-w-4xl flex-col space-y-6">
      <div className={`${toolbarPositionClass} flex items-center justify-end gap-2 select-none`}>
        {!isCheckinOnlyOperator && (
          <a
            href="/checkin"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/85 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
            title="Abrir Check-in em janela separada"
          >
            <Maximize2 size={18} />
          </a>
        )}
        {canConfigureCheckinScreen && (
          <button
            type="button"
            onClick={() => setShowConfigPanel(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/85 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
            title="Configuração da Tela de Check-in"
          >
            <Settings size={18} />
          </button>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/85 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
          title="Trocar usuário"
        >
          <Users size={18} />
        </button>
      </div>
      
      {/* Top Header - Pure Operations details */}
      <div className="hidden">
        <div className="space-y-0.5">
          <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
            <CircleDot className="text-emerald-500 animate-pulse" size={10} />
            <span>Guichê de Atendimento Ativo</span>
          </div>
          <h2 className="text-sm font-extrabold text-slate-800">
            {selectedEvent ? selectedEvent.name : 'Nenhum Evento Ativo Selecionado'}
          </h2>
        </div>

        <div className="text-right text-xs">
          <div className="text-slate-400 font-bold">Operador</div>
          <div className="font-extrabold text-slate-700">{currentUser?.name}</div>
        </div>
      </div>

      {pendingQueueCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 shrink-0 animate-pulse">
              <RefreshCw className={`w-5 h-5 ${isSyncingQueue ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">Check-ins offline pendentes</h4>
              <p className="text-xs text-amber-900/80">Há <strong>{pendingQueueCount}</strong> credenciamento(s) armazenado(s) localmente aguardando sincronização com as nuvens.</p>
            </div>
          </div>
          <button
            onClick={syncOfflineQueue}
            disabled={isSyncingQueue}
            className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl uppercase transition shrink-0 select-none cursor-pointer disabled:opacity-50"
          >
            {isSyncingQueue ? 'Sincronizando...' : ' Sincronizar'}
          </button>
        </div>
      )}

      {!selectedEventId ? (
        <div className="bg-amber-50/40 border border-amber-200/60 rounded-3xl p-10 text-center max-w-md mx-auto space-y-4">
          <Building size={40} className="text-amber-500 mx-auto animate-bounce" />
          <h3 className="font-black text-amber-900 text-sm uppercase tracking-wide">Evento Não Selecionado</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Selecione um evento ativo no menu principal antes de iniciar as buscas de participantes e o check-in rápida de recepção.
          </p>
        </div>
      ) : (
        <div className={`space-y-6 focus-within:ring-0 flex flex-1 flex-col justify-center ${isFullscreenCheckin ? 'min-h-0' : 'min-h-[calc(100vh-260px)]'}`}>
          <div className="text-center">
            {config.showLogo && config.logoUrl && (
              <img
                src={config.logoUrl}
                alt="Logo do evento"
                className="mx-auto mb-4 max-h-20 max-w-[220px] object-contain sm:max-h-24"
              />
            )}
            {config.showEventName && (
              <h1 className={`text-2xl font-black tracking-tight sm:text-4xl lg:text-5xl ${config.darkOverlay || config.backgroundImageUrl ? 'text-white' : 'text-slate-950'}`}>
                {selectedEvent?.name}
              </h1>
            )}
          </div>
          
          {/* Main search input - Centered, massive and rapid */}
          <div className="space-y-3">
            <div className="hidden">
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 font-display tracking-tight">
                Buscar ou Escanear Participante
              </h1>
              <p className="text-xs text-slate-400 font-medium select-none">
                Digite o nome, CPF ou insira código QR do convite do participante no campo de busca abaixo.
              </p>
            </div>

            <div className="relative max-w-3xl mx-auto">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={28} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setFeedback(null);
                  setActiveSearchIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={config.searchPlaceholder || DEFAULT_CHECKIN_SCREEN_CONFIG.searchPlaceholder}
                className="w-full pl-16 pr-14 py-5 sm:py-6 bg-white border-2 rounded-xl shadow-xl placeholder:text-slate-400 font-black focus:outline-none text-xl sm:text-2xl transition"
                style={{ borderColor: config.primaryColor, boxShadow: `0 18px 45px ${config.primaryColor}22` }}
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setActiveSearchIndex(0);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X size={24} />
                </button>
              )}
            </div>

            {/* Sub Controls: Scan trigger and Add Participant */}
            <div className="flex items-center justify-center gap-3 select-none pt-1">
              <button
                onClick={() => setShowScannerSimulator(!showScannerSimulator)}
                className={`hidden items-center gap-1.5 px-4 py-2 border rounded-xl text-xs font-bold transition cursor-pointer ${
                  showScannerSimulator ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-250 border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <QrCode size={14} />
                <span> Escanear QR Code</span>
              </button>

              {canCreateParticipants && (
                <button
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="checkin-new-participant-button cx-button-primary flex items-center gap-2 px-6 py-4 text-slate-950 text-base font-black rounded-xl shadow-lg transition cursor-pointer active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #12e000, #8fff86)', color: '#061009' }}
                >
                  <Plus size={22} />
                  <span>+ Novo Participante</span>
                </button>
              )}
            </div>
          </div>

          {/* Barcode/Scan Simulator Subpanel */}
          <AnimatePresence>
            {showScannerSimulator && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="max-w-xl mx-auto bg-slate-900 text-white rounded-2xl p-4.5 border border-slate-800 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                      <h4 className="text-xs font-black uppercase tracking-wider font-display">Simular Disparo de Leitor Físico</h4>
                    </div>
                    <button
                      onClick={() => setShowScannerSimulator(false)}
                      className="text-slate-400 hover:text-white p-0.5 rounded-full"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  
                  <form onSubmit={triggerSimulatedCheckin} className="flex gap-2">
                    <input
                      type="text"
                      value={simulatedCode}
                      onChange={e => setSimulatedCode(e.target.value)}
                      placeholder="Passe o leitor ou digite o código/CPF do participante..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-emerald-400 placeholder:text-slate-700 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-505 bg-emerald-500 hover:bg-emerald-600 text-white px-4 rounded-xl font-bold text-xs transition"
                    >
                      Simular BIP
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dynamic Result Area */}
          <div className="max-w-3xl mx-auto pt-4">
            {normalizedDebouncedSearchTerm.length < 3 || isWaitingForDebouncedSearch ? (
              <div className="hidden text-center p-8 border border-dashed border-slate-300 rounded-lg bg-white select-none">
                <QrCode size={36} className="text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-extrabold text-slate-700">Aguardando busca</h3>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1">
                  Insira o nome, informe o CPF ou faça a leitura do ingresso para carregar os controles de check-in em tempo real.
                </p>
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="text-center p-5 sm:p-7 bg-white/95 border-4 rounded-xl shadow-xl select-none space-y-3" style={{ borderColor: config.errorColor }}>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-white" style={{ backgroundColor: config.errorColor }}>
                  <AlertTriangle size={32} />
                </div>
                <h4 className="text-sm font-bold text-slate-700">Participante não localizado</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Não encontramos correspondência para "{searchTerm}". Verifique a digitação ou cadastre o participante utilizando o botão "Novo Cadastro".
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                
                {/* Keyboard instruction tip */}
                <div className="hidden">
                  <span>RESULTADOS ENCONTRADOS: {filteredParticipants.length}</span>
                  <span className="flex items-center gap-1.5">
                    <span>Use</span>
                    <kbd className="bg-white border px-1 py-0.2 rounded font-mono font-bold dark:bg-slate-50">↑</kbd>
                    <kbd className="bg-white border px-1 py-0.2 rounded font-mono font-bold dark:bg-slate-50">↓</kbd>
                    <span>e</span>
                    <kbd className="bg-white border px-1.5 py-0.2 rounded font-mono font-bold text-blue-600 dark:bg-slate-50">Enter</kbd>
                    <span>para check-in rápido</span>
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {filteredParticipants.map((p, idx) => {
                    const isSelfSelected = idx === activeSearchIndex;
                    const isPending = isCheckingInId === p.id;

                    return (
                      <div
                        key={p.id}
                        onClick={() => selectParticipant(p)}
                        className={`p-4 rounded-xl border transition-all duration-150 flex flex-col justify-between gap-3 bg-white relative cursor-pointer ${
                          isSelfSelected 
                            ? 'ring-2 ring-blue-600 border-blue-100 shadow-md' 
                            : 'border-slate-100 hover:border-slate-250 hover:bg-slate-50/30'
                        }`}
                      >
                        {/* Demographic elements */}
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="font-extrabold text-slate-900 text-xl sm:text-2xl font-display truncate max-w-[420px]">
                              {p.badgeName || p.name}
                            </h4>
                            <span className="hidden text-[9px] bg-slate-150 text-slate-600 font-extrabold px-1.5 py-0.5 rounded select-none uppercase">
                              {p.category}
                            </span>
                            {p.company && (
                              <span className="hidden text-[9px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded truncate max-w-[140px]">
                                {p.company}
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openBadgeNameEditor(p);
                              }}
                              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                            >
                              <Pencil size={14} />
                              Nome no crachá
                            </button>
                          </div>

                          <div className="hidden flex-wrap gap-x-3 text-[11px] text-slate-500 font-medium">
                            <span className="hidden">E-mail: <b className="font-semibold text-slate-700">{p.email}</b></span>
                            <span>CPF: <b className="font-mono text-slate-700">{p.cpf || 'Não possui'}</b></span>
                            <span className="font-mono text-slate-400 select-none">[{p.ticketCode}]</span>
                          </div>
                        </div>

                        {/* Status bar & Operational Button with 1 clicks */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1 select-none">
                          <div>
                            {p.checkedIn ? (
                              <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                <span>Check-in já realizado: {p.checkedInAt ? new Date(p.checkedInAt).toLocaleTimeString('pt-BR') : 'Horário Desconhecido'}</span>
                              </div>
                            ) : (
                              <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-350 bg-slate-300"></span>
                                <span>Check-in pendente</span>
                              </div>
                            )}
                          </div>

                          {/* Dynamic single action buttons */}
                          <div>
                            {!p.checkedIn ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCheckIn(p);
                                }}
                                disabled={isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-[11px] font-bold rounded-lg shadow-sm transition cursor-pointer"
                              >
                                {isPending ? (
                                  <RefreshCw className="animate-spin" size={11} />
                                ) : (
                                  <UserCheck size={12} />
                                )}
                                <span>Check-In & Imprimir</span>
                              </button>
                            ) : !p.printed ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDirectPrint(p);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg shadow-sm transition cursor-pointer"
                              >
                                <Printer size={12} />
                                <span>Imprimir Credencial</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    askReprintConfirmation(p);
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                                >
                                  <Printer size={11} />
                                  <span>Reimprimir</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    resetAfterAction();
                                  }}
                                  className="px-2.5 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-550/1 hover:bg-slate-50 text-[11px] font-semibold rounded-lg transition"
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {activeFeedback && (
            <div
              className="max-w-3xl mx-auto text-center p-5 sm:p-7 bg-white/95 border-4 rounded-xl shadow-xl select-none space-y-3"
              style={{ borderColor: feedbackColor }}
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-white" style={{ backgroundColor: feedbackColor }}>
                {activeFeedback.type === 'success' ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
              </div>
              <h4 className="text-2xl sm:text-4xl font-black" style={{ color: feedbackColor }}>{activeFeedback.title}</h4>
              <p className="text-base sm:text-lg font-semibold text-slate-600 max-w-xl mx-auto">{activeFeedback.message}</p>
            </div>
          )}

        </div>
      )}

      <AnimatePresence>
        {showConfigPanel && canConfigureCheckinScreen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <motion.form
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onSubmit={handleSaveConfig}
              className="w-full max-w-3xl rounded-xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-black text-slate-950">Configuração da Tela de Check-in</h2>
                  <p className="text-sm text-slate-500">Configuração visual salva apenas para este evento.</p>
                </div>
                <button type="button" onClick={() => setShowConfigPanel(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                  <X size={20} />
                </button>
              </div>

              <div className="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-bold text-slate-700">
                  <input type="checkbox" checked={configForm.showLogo} onChange={e => setConfigForm(prev => ({ ...prev, showLogo: e.target.checked }))} />
                  Exibir logo
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-bold text-slate-700">
                  <input type="checkbox" checked={configForm.showEventName} onChange={e => setConfigForm(prev => ({ ...prev, showEventName: e.target.checked }))} />
                  Exibir nome do evento
                </label>

                <label className="space-y-1 text-sm font-bold text-slate-700 md:col-span-2">
                  Upload ou URL da logo
                  <input value={configForm.logoUrl} onChange={e => setConfigForm(prev => ({ ...prev, logoUrl: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-medium" placeholder="https://..." />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setConfigForm(prev => ({ ...prev, logoUrl: String(reader.result || '') }));
                      reader.readAsDataURL(file);
                    }}
                    className="w-full rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs font-medium"
                  />
                </label>

                <label className="space-y-1 text-sm font-bold text-slate-700">
                  Cor de fundo
                  <input type="color" value={configForm.backgroundColor} onChange={e => setConfigForm(prev => ({ ...prev, backgroundColor: e.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 p-1" />
                </label>
                <label className="space-y-1 text-sm font-bold text-slate-700">
                  Cor principal
                  <input type="color" value={configForm.primaryColor} onChange={e => setConfigForm(prev => ({ ...prev, primaryColor: e.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 p-1" />
                </label>
                <label className="space-y-1 text-sm font-bold text-slate-700">
                  Cor de sucesso
                  <input type="color" value={configForm.successColor} onChange={e => setConfigForm(prev => ({ ...prev, successColor: e.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 p-1" />
                </label>
                <label className="space-y-1 text-sm font-bold text-slate-700">
                  Cor de erro
                  <input type="color" value={configForm.errorColor} onChange={e => setConfigForm(prev => ({ ...prev, errorColor: e.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 p-1" />
                </label>

                <label className="space-y-1 text-sm font-bold text-slate-700 md:col-span-2">
                  Imagem de fundo ou URL de background
                  <input value={configForm.backgroundImageUrl} onChange={e => setConfigForm(prev => ({ ...prev, backgroundImageUrl: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-medium" placeholder="https://..." />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setConfigForm(prev => ({ ...prev, backgroundImageUrl: String(reader.result || '') }));
                      reader.readAsDataURL(file);
                    }}
                    className="w-full rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs font-medium"
                  />
                </label>

                <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-bold text-slate-700 md:col-span-2">
                  <input type="checkbox" checked={configForm.darkOverlay} onChange={e => setConfigForm(prev => ({ ...prev, darkOverlay: e.target.checked }))} />
                  Usar background com escurecimento
                </label>

                <label className="space-y-1 text-sm font-bold text-slate-700 md:col-span-2">
                  Texto do placeholder do campo de busca
                  <input value={configForm.searchPlaceholder} onChange={e => setConfigForm(prev => ({ ...prev, searchPlaceholder: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-medium" />
                </label>

                <label className="space-y-1 text-sm font-bold text-slate-700">
                  Tempo para limpar após sucesso (segundos)
                  <input type="number" min={1} max={30} value={configForm.resetDelaySeconds} onChange={e => setConfigForm(prev => ({ ...prev, resetDelaySeconds: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-medium" />
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
                <button type="button" onClick={() => setShowConfigPanel(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                  Cancelar
                </button>
                <button type="submit" disabled={isSavingConfig} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                  {isSavingConfig ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  Salvar
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {badgeNameParticipant && (
          <div className="fixed inset-0 z-[72] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <motion.form
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onSubmit={handleSaveBadgeName}
              className="w-full max-w-md rounded-xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-black text-slate-950">Nome no crachá</h2>
                  <p className="text-sm text-slate-500">Altere apenas o nome que será impresso.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBadgeNameParticipant(null)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                  Cadastro: <span className="text-slate-950">{badgeNameParticipant.name}</span>
                </div>
                <label className="space-y-1 text-sm font-bold text-slate-700">
                  Nome que sai no crachá
                  <input
                    value={badgeNameValue}
                    onChange={e => setBadgeNameValue(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-3 text-base font-bold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    autoFocus
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setBadgeNameParticipant(null)}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingBadgeName}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {isSavingBadgeName ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  Salvar
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: DYNAMIC NEW REGISTRATION FORM WITH AUTO CHECKIN */}
      <AnimatePresence>
        {isRegisterModalOpen && canCreateParticipants && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[96vh]"
            >
              {/* Header */}
              <div className="px-9 py-6 bg-slate-900 text-white flex items-center justify-between select-none">
                <div className="flex items-center gap-3">
                  <UserPlus className="text-blue-400" size={22} />
                  <div>
                    <h3 className="font-extrabold text-sm uppercase tracking-wider font-display">Novo Cadastro (Formulário Dinâmico)</h3>
                    <p className="text-xs text-slate-400">Emissão de credencial e credenciamento imediato</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Dynamic form inputs container */}
              <form onSubmit={handleRegisterSubmit} className="p-9 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {isFieldsLoading ? (
                    <div className="text-center py-6 text-xs text-slate-400 flex items-center justify-center gap-2">
                      <RefreshCw className="animate-spin" size={14} />
                      <span>Carregando campos do evento...</span>
                    </div>
                  ) : registrationFields.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-500">
                      Nenhum campo de formulário configurado.
                    </div>
                  ) : (
                    registrationFields.filter(f => f.active).map(f => {
                      let fieldKey = f.id;
                      if (f.id === 'f_name') fieldKey = 'name';
                      else if (f.id === 'f_email') fieldKey = 'email';
                      else if (f.id === 'f_cpf') fieldKey = 'cpf';
                      else if (f.id === 'f_category') fieldKey = 'category';
                      else if (f.id === 'f_company') fieldKey = 'company';

                      return (
                        <div key={f.id} className="space-y-1.5">
                          <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider font-display">
                            {f.name} {f.required && <span className="text-rose-500">*</span>}
                          </label>

                          {f.type === 'select' ? (
                            <select
                              value={dynamicFormValues[fieldKey] || ''}
                              onChange={e => setDynamicFormValues(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
                            >
                              {(f.options || []).map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : f.type === 'checkbox' ? (
                            <label className="flex items-center gap-2 cursor-pointer select-none py-2">
                              <input
                                type="checkbox"
                                checked={!!dynamicFormValues[fieldKey]}
                                onChange={e => setDynamicFormValues(prev => ({ ...prev, [fieldKey]: e.target.checked }))}
                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                              />
                              <span className="text-sm text-slate-600 font-semibold">{f.name}</span>
                            </label>
                          ) : (
                            <input
                              type={f.type === 'email' ? 'email' : (f.type === 'number' ? 'number' : 'text')}
                              required={f.required}
                              value={dynamicFormValues[fieldKey] || ''}
                              onChange={e => setDynamicFormValues(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                              placeholder={`Informe o ${f.name.toLowerCase()}`}
                              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer buttons */}
                <div className="pt-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="px-5 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNewUser || isFieldsLoading}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-2 transition cursor-pointer active:scale-98"
                  >
                    {isSubmittingNewUser ? (
                      <RefreshCw className="animate-spin" size={13} />
                    ) : (
                      <Check size={13} />
                    )}
                    <span>Salvar e Credenciar</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CONFIRM REPRINT */}
      <AnimatePresence>
        {isReprintModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 relative text-center border border-slate-100"
            >
              <div className="mx-auto w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-100 mb-4 animate-bounce">
                <AlertTriangle size={24} />
              </div>

              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide font-display">Credencial já gerada</h3>
              <p className="text-xs text-slate-500 leading-relaxed mt-2">
                O crachá do participante <b className="text-slate-805 text-slate-800">{participantToReprint?.name}</b> já foi emitido anteriormente. Deseja realizar uma nova reimpressão?
              </p>

              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={confirmReprint}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-450 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1 cursor-pointer transition uppercase"
                >
                  <Printer size={13} />
                  <span>Sim, Reimprimir</span>
                </button>
                <button
                  onClick={() => {
                    setParticipantToReprint(null);
                    setIsReprintModalOpen(false);
                  }}
                  className="w-full py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl flex items-center justify-center cursor-pointer transition uppercase"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
