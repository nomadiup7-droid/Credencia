import React, { useState, useEffect, useRef } from 'react';
import { Event, Participant, User, ParticipantField, ParticipantCategory } from '../types';
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
  Sliders,
  Settings,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Palette,
  Maximize2,
  Minimize2,
  Layout,
  Grid,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Trash2,
  Info,
  Calendar,
  Layers,
  ChevronUp,
  ChevronDown,
  Monitor,
  UserPlus
} from 'lucide-react';

interface CheckInModularProps {
  events: Event[];
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
  apiCall: (endpoint: string, options?: RequestInit) => Promise<any>;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  currentUser: User | null;
  onPrintBadge: (participant: Participant) => void;
}

// 1. Definition of the White-Label configuration structure
export interface CheckInOperacaoConfig {
  layoutMode: 'centered' | 'fixed-header' | 'totem' | 'grid';
  isDarkMode: boolean;
  colors: {
    background: string;
    primary: string;
    success: string;
    error: string;
    text: string;
    cardBackground: string;
    border: string;
  };
  typography: {
    inputSize: 'text-lg' | 'text-xl' | 'text-2xl' | 'text-3xl' | 'text-4xl';
    messageSize: 'text-sm' | 'text-base' | 'text-lg' | 'text-xl' | 'text-2xl';
    fontFamily: 'Inter' | 'Fira Code' | 'Space Grotesk' | 'Outfit' | 'Playfair Display';
  };
  blocks: string[]; // Sequential order of renderable blocks: ['header', 'instructions', 'search', 'newParticipant', 'result', 'footer']
  activeBlocks: {
    header: boolean;
    instructions: boolean;
    search: boolean;
    newParticipant: boolean;
    result: boolean;
    footer: boolean;
  };
  // Block internal texts/elements
  headerLogoUrl: string; // Base64 or standard asset
  headerTitle: string;
  searchPlaceholder: string;
  showParticipantName: boolean;
  showParticipantCategory: boolean;
  successCustomText: string;
  errorCustomText: string;
  feedbackDuration: number; // milliseconds, default 2500
  footerText: string;
  footerLogoUrl: string;
  instructionsText: string;
  playSuccessSound: boolean;
  playErrorSound: boolean;
}

// Default configuration
const DEFAULT_CONFIG: CheckInOperacaoConfig = {
  layoutMode: 'centered',
  isDarkMode: false,
  colors: {
    background: '#f8fafc', // slate-50
    primary: '#2563eb', // blue-600
    success: '#10b981', // emerald-500
    error: '#f43f5e', // rose-500
    text: '#0f172a', // slate-900
    cardBackground: '#ffffff',
    border: '#e2e8f0', // slate-200
  },
  typography: {
    inputSize: 'text-2xl',
    messageSize: 'text-lg',
    fontFamily: 'Inter',
  },
  blocks: ['header', 'instructions', 'search', 'newParticipant', 'result', 'footer'],
  activeBlocks: {
    header: true,
    instructions: true,
    search: true,
    newParticipant: true,
    result: true,
    footer: true,
  },
  headerLogoUrl: '',
  headerTitle: '',
  searchPlaceholder: 'Digite o Nome, CPF ou aponte o Código QR Code...',
  showParticipantName: true,
  showParticipantCategory: true,
  successCustomText: 'Acesso Liberado! Credencial impressa.',
  errorCustomText: 'Cadastro não localizado para este evento. Dirija-se à secretaria.',
  feedbackDuration: 2500,
  footerText: '© 2026 Sistema Credencia • Solução Oficial de Check-in Corporativo',
  footerLogoUrl: '',
  instructionsText: 'Operador: Mantenha o cursor sempre na caixa de busca central para recepção rápida.',
  playSuccessSound: true,
  playErrorSound: true,
};

export default function CheckInModular({
  events,
  selectedEventId,
  onSelectEvent,
  apiCall,
  addToast,
  participants,
  setParticipants,
  currentUser,
  onPrintBadge,
}: CheckInModularProps) {
  // Store white label state
  const [config, setConfig] = useState<CheckInOperacaoConfig>(() => {
    const cached = localStorage.getItem(`credencia_saas_checkin_config_${selectedEventId || 'global'}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Safely merge with any missing keys in default config
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          colors: { ...DEFAULT_CONFIG.colors, ...(parsed.colors || {}) },
          typography: { ...DEFAULT_CONFIG.typography, ...(parsed.typography || {}) },
          activeBlocks: { ...DEFAULT_CONFIG.activeBlocks, ...(parsed.activeBlocks || {}) },
        };
      } catch (e) {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  });

  // Keep track of current selected event name
  const currentEvent = events.find(e => e.id === selectedEventId);

  // Sync config cache whenever event or layout config changes
  useEffect(() => {
    localStorage.setItem(`credencia_saas_checkin_config_${selectedEventId || 'global'}`, JSON.stringify(config));
  }, [config, selectedEventId]);

  // View modes
  const [isKioskMode, setIsKioskMode] = useState(false); // full fullscreen/totem
  const [isConfigTabOpen, setIsConfigTabOpen] = useState(true);

  // Search/Input state
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Autocomplete real-time suggestions and focusing states
  const [suggestions, setSuggestions] = useState<Participant[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Helper utility to draw highlighted match regions in search lists
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const cleanHighlight = highlight.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex = new RegExp(`(${cleanHighlight})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-amber-200 text-slate-900 rounded-[2px] px-0.5 font-bold transition-all">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Real-time debounce filters matching CPF (partial), name or QR Code instantly from 2 characters
  useEffect(() => {
    const q = searchValue.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setFocusedIndex(0);
      return;
    }

    const handler = setTimeout(() => {
      const normQuery = q.toLowerCase();
      const digitsQuery = q.replace(/\D/g, '');

      const found = participants.filter((p) => {
        const pCpf = p.cpf ? p.cpf.replace(/\D/g, '') : '';
        const pTicket = p.ticketCode ? p.ticketCode.toLowerCase() : '';
        const pName = p.name ? p.name.toLowerCase() : '';
        const pEmail = p.email ? p.email.toLowerCase() : '';

        return (
          pName.includes(normQuery) ||
          pEmail.includes(normQuery) ||
          (pCpf && pCpf.includes(digitsQuery)) ||
          (pTicket && pTicket.includes(normQuery))
        );
      });

      // Sort and prioritize: participants still awaiting check-in go first
      const sorted = found.sort((a, b) => {
        if (a.checkedIn && !b.checkedIn) return 1;
        if (!a.checkedIn && b.checkedIn) return -1;
        return a.name.localeCompare(b.name);
      });

      // Safe bounds limit of results between 5 and 10 (we select 8 for sweet aesthetic sizing)
      setSuggestions(sorted.slice(0, 8));
      setFocusedIndex(0);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchValue, participants]);

  // Real-time status feedbacks
  const [feedbackState, setFeedbackState] = useState<'idle' | 'success' | 'error'>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [activeParticipant, setActiveParticipant] = useState<Participant | null>(null);

  // Modal register toggle
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newParticipantForm, setNewParticipantForm] = useState({
    name: '',
    email: '',
    cpf: '',
    category: 'Participante' as ParticipantCategory,
    company: '',
  });

  // Keep search input focused
  const mainInputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    if (mainInputRef.current) {
      mainInputRef.current.focus();
    }
  };

  // Re-autofocus whenever anything changes
  useEffect(() => {
    focusInput();
    const timer = setInterval(() => {
      // Auto-re-focus if not in modal
      if (!isRegisterOpen && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'SELECT' && document.activeElement?.tagName !== 'TEXTAREA') {
        focusInput();
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [isRegisterOpen, isKioskMode, feedbackState]);

  // Audio synthesis players
  const audioContextRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playChime = (type: 'success' | 'error') => {
    try {
      initAudio();
      if (!audioContextRef.current) return;
      
      const ctx = audioContextRef.current;
      // safety check if suspended
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        // Elegant double tone rising
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(523.25, now); // C5
        gain.gain.setValueAtTime(0.15, now);
        osc.start(now);
        
        osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
        gain.gain.setValueAtTime(0.15, now + 0.12);
        
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.stop(now + 0.45);
      } else {
        osc.type = 'sawtooth';
        // low warning buzz decaying
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(180, now); // LOW Buzz
        osc.frequency.linearRampToValueAtTime(110, now + 0.35);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {
      console.error('Falha ao acionar sintetizador de áudio:', e);
    }
  };

  // Handle autocomplete selection and automatic check-in execution
  const handleSelectParticipant = async (participant: Participant) => {
    // Clear autocomplete state instantly to optimize field re-use
    setSearchValue('');
    setSuggestions([]);
    setFocusedIndex(0);

    // Run custom-tailored visual/acoustic checkin process
    await processCheckInForParticipant(participant);
  };

  // Perform search / check-in action
  const handleMainSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If suggestions dropdown is open and active, select the highlighted option
    if (suggestions.length > 0) {
      const selected = suggestions[focusedIndex] || suggestions[0];
      if (selected) {
        await handleSelectParticipant(selected);
        return;
      }
    }

    const originalQuery = searchValue.trim();
    if (!originalQuery) return;

    if (!selectedEventId) {
      addToast('Selecione um evento ativo nas configurações.', 'warning');
      return;
    }

    setIsSearching(true);
    setSearchValue(''); // clear instantly to allow next operational scan
    setSuggestions([]);
    setFocusedIndex(0);

    try {
      // 1. Search locally or via endpoint first.
      // Search matching participant in participants cache
      const normalizedQuery = originalQuery.toLowerCase().replace(/\D/g, ''); // for numeric CPF/Ticket match
      const rawNormalizedQuery = originalQuery.toLowerCase();

      // Filter local list for matching participants (by exact ticketCode, normalized CPF, or name matching)
      const matches = participants.filter(p => {
        const pCpfClean = p.cpf.replace(/\D/g, '');
        const pTicketClean = p.ticketCode.toLowerCase().trim();
        const pNameLower = p.name.toLowerCase();
        const pEmailLower = p.email.toLowerCase();

        return (
          pTicketClean === rawNormalizedQuery ||
          (pCpfClean && pCpfClean === normalizedQuery) ||
          pNameLower.includes(rawNormalizedQuery) ||
          pEmailLower.includes(rawNormalizedQuery)
        );
      });

      if (matches.length === 0) {
        // No match found
        triggerErrorState(config.errorCustomText);
        return;
      }

      // If multiple matches exist, we must show a quick choice rather than error.
      if (matches.length > 1) {
        // Let's look for exact match on CPF or ticketCode
        const exactMatch = matches.find(p => p.ticketCode.toLowerCase() === rawNormalizedQuery || p.cpf.replace(/\D/g, '') === normalizedQuery);
        if (exactMatch) {
          await processCheckInForParticipant(exactMatch);
        } else {
          // Trigger info toast to clarify and display temporary match overlay inside search results
          // We can assign matching options to let operator choose
          setActiveParticipant(null);
          setFeedbackState('error');
          setFeedbackMessage(`Múltiplos participantes encotrados para "${originalQuery}". Seja mais específico.`);
          if (config.playErrorSound) playChime('error');
        }
        return;
      }

      // Exactly 1 match found
      const targetParticipant = matches[0];
      await processCheckInForParticipant(targetParticipant);

    } catch (err: any) {
      console.error(err);
      triggerErrorState(err.message || 'Erro operacional no check-in');
    } finally {
      setIsSearching(false);
    }
  };

  // Helper action to check in
  const processCheckInForParticipant = async (participant: Participant) => {
    if (participant.checkedIn) {
      // Play already checked in warning or success reprinted credentials
      setActiveParticipant(participant);
      setFeedbackState('success');
      setFeedbackMessage(`Participante já estava credenciado! Emitindo nova via.`);
      if (config.playSuccessSound) playChime('success');

      // Sync print and reprint on server
      try {
        await apiCall(`/api/participants/${participant.id}/reprint`, { method: 'POST' });
        onPrintBadge(participant);
      } catch (e) {}

      // Clear timer
      setupFeedbackTimeout();
      return;
    }

    try {
      // POST Checkin API
      const res = await apiCall('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: participant.id,
          eventId: selectedEventId
        })
      });

      // Update parent list
      const timestamp = res.checkIn?.checkInAt || new Date().toISOString();
      setParticipants(prev =>
        prev.map(p => p.id === participant.id ? { ...p, checkedIn: true, checkedInAt: timestamp } : p)
      );

      // Increment print status on server
      await apiCall(`/api/participants/${participant.id}/reprint`, { method: 'POST' });
      
      const updatedParticipant = { ...participant, checkedIn: true, checkedInAt: timestamp, printed: true };
      setParticipants(prev =>
        prev.map(p => p.id === participant.id ? { ...p, printed: true } : p)
      );

      // Trigger automatic printer callback to issue thermal/badge media
      onPrintBadge(updatedParticipant);

      // Trigger Success feedbacks
      setActiveParticipant(updatedParticipant);
      setFeedbackState('success');
      setFeedbackMessage(config.successCustomText || 'Check-in concluído com sucesso!');
      if (config.playSuccessSound) playChime('success');

    } catch (err: any) {
      // Handle potential offline local database queuing
      const isOfflineError = !navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('network') || err.message?.includes('offline');
      if (isOfflineError) {
        const queueKey = 'credencia_checkins_queue';
        const queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
        const timestamp = new Date().toISOString();
        
        queue.push({
          participantId: participant.id,
          eventId: selectedEventId,
          organizationId: currentUser?.organizationId || 'org1',
          checkedInAt: timestamp
        });
        localStorage.setItem(queueKey, JSON.stringify(queue));

        const updatedParticipant = { ...participant, checkedIn: true, checkedInAt: timestamp, printed: true };
        setParticipants(prev => {
          const updated = prev.map(p => p.id === participant.id ? { ...p, checkedIn: true, checkedInAt: timestamp, printed: true } : p);
          localStorage.setItem(`credencia_participants_cache_${selectedEventId}`, JSON.stringify(updated));
          return updated;
        });

        onPrintBadge(updatedParticipant);
        setActiveParticipant(updatedParticipant);
        setFeedbackState('success');
        setFeedbackMessage(`[Modo Offline] Check-in salvo localmente. Impressão iniciada.`);
        if (config.playSuccessSound) playChime('success');
      } else {
        triggerErrorState(err.message || 'Falha ao autorizar check-in.');
      }
    }

    setupFeedbackTimeout();
  };

  // Set timeout to restore idle state automatically
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const setupFeedbackTimeout = () => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedbackState('idle');
      setActiveParticipant(null);
    }, config.feedbackDuration);
  };

  const triggerErrorState = (msg: string) => {
    setFeedbackState('error');
    setFeedbackMessage(msg);
    setActiveParticipant(null);
    if (config.playErrorSound) playChime('error');
    setupFeedbackTimeout();
  };

  // Create participant form handler
  const handleQuickRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParticipantForm.name.trim()) {
      addToast('Nome é de preenchimento obrigatório.', 'warning');
      return;
    }

    try {
      const payload = {
        name: newParticipantForm.name,
        email: newParticipantForm.email || `${Math.random().toString(36).substr(2, 5)}@evento.com.br`,
        cpf: newParticipantForm.cpf.replace(/\D/g, ''),
        category: newParticipantForm.category,
        company: newParticipantForm.company,
        ticketCode: 'TKT-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        checkedIn: true,
        checkedInAt: new Date().toISOString()
      };

      const newParticipant = await apiCall(`/api/events/${selectedEventId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Update parent list
      setParticipants(prev => [newParticipant, ...prev]);
      
      // Auto reprint/print
      await apiCall(`/api/participants/${newParticipant.id}/reprint`, { method: 'POST' });
      const updated = { ...newParticipant, printed: true };
      
      setParticipants(prev =>
        prev.map(p => p.id === newParticipant.id ? { ...p, printed: true } : p)
      );

      // Send to printed
      onPrintBadge(updated);

      // Feedback Modular
      setActiveParticipant(updated);
      setFeedbackState('success');
      setFeedbackMessage(`Novo participante registrado & credenciado com sucesso!`);
      if (config.playSuccessSound) playChime('success');

      setIsRegisterOpen(false);
      setNewParticipantForm({
        name: '',
        email: '',
        cpf: '',
        category: 'Participante',
        company: '',
      });
      setupFeedbackTimeout();

    } catch (err: any) {
      addToast(err.message || 'Falha ao realizar cadastro rápido.', 'error');
    }
  };

  // Block Order controllers
  const moveBlockUp = (index: number) => {
    if (index === 0) return;
    const newBlocks = [...config.blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[index - 1];
    newBlocks[index - 1] = temp;
    setConfig({ ...config, blocks: newBlocks });
  };

  const moveBlockDown = (index: number) => {
    if (index === config.blocks.length - 1) return;
    const newBlocks = [...config.blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[index + 1];
    newBlocks[index + 1] = temp;
    setConfig({ ...config, blocks: newBlocks });
  };

  const toggleBlockActive = (blockId: string) => {
    setConfig({
      ...config,
      activeBlocks: {
        ...config.activeBlocks,
        [blockId]: !config.activeBlocks[blockId as keyof typeof config.activeBlocks]
      }
    });
  };

  // Reset check-in configurator back to defaults
  const handleResetConfigToDefaults = () => {
    if (confirm('Deseja realmente restaurar as configurações padrão da tela de Check-in?')) {
      setConfig(DEFAULT_CONFIG);
      addToast('Configurações originais restauradas!', 'info');
    }
  };

  // Dynamically select fonts and sizes based on theme properties
  const fontClass = 
    config.typography.fontFamily === 'Fira Code' ? 'font-mono' :
    config.typography.fontFamily === 'Space Grotesk' ? 'font-display' :
    config.typography.fontFamily === 'Outfit' ? 'font-sans tracking-tight font-light' :
    config.typography.fontFamily === 'Playfair Display' ? 'font-serif' :
    'font-sans';

  // Quick select presets for customer styles
  const applyPreset = (presetName: string) => {
    switch (presetName) {
      case 'dark-neon':
        setConfig({
          ...config,
          isDarkMode: true,
          colors: {
            background: '#090d16',
            primary: '#10b981', // Neon emerald
            success: '#059669',
            error: '#dc2626',
            text: '#f1f5f9',
            cardBackground: '#111827',
            border: '#1f2937',
          }
        });
        break;
      case 'amber-coaxial':
        setConfig({
          ...config,
          isDarkMode: false,
          colors: {
            background: '#fef3c7', // amber-100
            primary: '#d97706', // amber-600
            success: '#16a34a',
            error: '#e11d48',
            text: '#78350f', // amber-900
            cardBackground: '#ffffff',
            border: '#fde68a',
          }
        });
        break;
      case 'creative-minimalist':
        setConfig({
          ...config,
          isDarkMode: false,
          colors: {
            background: '#fafafa',
            primary: '#18181b', // zinc-900
            success: '#10b981',
            error: '#ef4444',
            text: '#18181b',
            cardBackground: '#ffffff',
            border: '#e4e4e7',
          }
        });
        break;
      case 'royal-blue':
        setConfig({
          ...config,
          isDarkMode: true,
          colors: {
            background: '#1e1b4b', // indigo-950
            primary: '#6366f1', // indigo-500
            success: '#10b981',
            error: '#f43f5e',
            text: '#f8fafc',
            cardBackground: '#312e81',
            border: '#4338ca',
          }
        });
        break;
      default:
        break;
    }
    addToast(`Preset "${presetName}" aplicado com sucesso!`, 'success');
  };

  return (
    <div className={`min-h-[calc(100vh-80px)] flex flex-col md:flex-row bg-slate-100 overflow-hidden ${fontClass}`} id="checkin-modular-tab-screen">
      
      {/* 1. ADMINISTRATION CONFIGURATION SIDEBAR PAINEL (Only visible if not in totemic immersive Kiosk mode & isConfigTabOpen) */}
      {!isKioskMode && isConfigTabOpen && (
        <div className="w-full md:w-[420px] shrink-0 bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-86px)] overflow-y-auto shadow-sm select-none" id="saas-configuration-controls">
          
          {/* Header Painel */}
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="bg-indigo-600 text-white rounded-xl p-2 shadow-md shadow-indigo-100">
                <Sliders size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider font-display">
                  Painel de Estilo Operacao 
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                  Estilo, Cores & Blocos Modulares
                </p>
              </div>
            </div>
            <button
              onClick={handleResetConfigToDefaults}
              className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 cursor-pointer shadow-xs"
              title="Restaurar layout padrão"
            >
              Resetar
            </button>
          </div>

          <div className="p-5 space-y-6">
            
            {/* Quick Presets */}
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2.5">
                 Temas & Presets Rápidos
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('creative-minimalist')}
                  className="p-2 border border-slate-200 rounded-xl hover:border-slate-400 text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer text-left text-xs font-bold font-display"
                >
                  ▫ Minimalista Escuro
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('dark-neon')}
                  className="p-2 border border-slate-700 rounded-xl hover:border-slate-500 text-cyan-400 bg-slate-900 hover:bg-slate-850 transition cursor-pointer text-left text-xs font-mono"
                >
                   Futuro Neon
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('amber-coaxial')}
                  className="p-2 border border-amber-200 rounded-xl hover:border-amber-400 text-amber-800 bg-amber-50 hover:bg-amber-100 transition cursor-pointer text-left text-xs font-semibold"
                >
                   Amber Warm
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('royal-blue')}
                  className="p-2 border border-indigo-500 rounded-xl hover:border-indigo-400 text-indigo-200 bg-indigo-900 hover:bg-indigo-850 transition cursor-pointer text-left text-xs font-display"
                >
                   Império Indigo
                </button>
              </div>
            </div>

            {/* Layout Mode Selection */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2.5">
                 Modo de Visualização do Layout
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'centered', label: 'Centralizado', icon: Layout },
                  { id: 'fixed-header', label: 'Header Fixo', icon: Monitor },
                  { id: 'totem', label: 'Modo Totem', icon: Maximize2 },
                ].map((mode) => {
                  const IconComponent = mode.icon;
                  const isSelected = config.layoutMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setConfig({ ...config, layoutMode: mode.id as any })}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 transition cursor-pointer text-left ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-extrabold shadow-xs' 
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <IconComponent size={14} className={isSelected ? 'text-indigo-600' : 'text-slate-400'} />
                      <span className="text-xs font-bold leading-none">{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Typologia & Dark Mode */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2.5">
                 Aparência & Tipografia
              </label>
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-150">
                {/* Dark mode switch */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">Modo Escurecido (Dark Model)</span>
                    <span className="text-[10px] text-slate-400">Ativa fundo de alta absorção de luz para totens</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newDark = !config.isDarkMode;
                      setConfig({
                        ...config,
                        isDarkMode: newDark,
                        colors: {
                          ...config.colors,
                          background: newDark ? '#0f172a' : '#f8fafc',
                          text: newDark ? '#f8fafc' : '#0f172a',
                          cardBackground: newDark ? '#1e293b' : '#ffffff',
                          border: newDark ? '#334155' : '#e2e8f0',
                        }
                      });
                    }}
                    className={`w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${config.isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${config.isDarkMode ? 'translate-x-4' : 'translate-x-0'} shadow-sm`} />
                  </button>
                </div>

                {/* Font selection */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Fonte da Tela</span>
                  <select
                    value={config.typography.fontFamily}
                    onChange={(e) => setConfig({
                      ...config,
                      typography: { ...config.typography, fontFamily: e.target.value as any }
                    })}
                    className="w-full text-xs font-bold bg-white border border-slate-200 text-slate-800 rounded-lg p-1.5 focus:border-indigo-600"
                  >
                    <option value="Inter">Inter (Sans-Serif Corporativo)</option>
                    <option value="Space Grotesk">Space Grotesk (Design Tech)</option>
                    <option value="Outfit">Outfit (Moderna e Leve)</option>
                    <option value="Fira Code">Fira Code (Foco de Comando)</option>
                    <option value="Playfair Display">Playfair Display (Serif Elegante)</option>
                  </select>
                </div>

                {/* Input text sizing */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Escala da Caixa de Busca</span>
                  <select
                    value={config.typography.inputSize}
                    onChange={(e) => setConfig({
                      ...config,
                      typography: { ...config.typography, inputSize: e.target.value as any }
                    })}
                    className="w-full text-xs font-bold bg-white border border-slate-200 text-slate-800 rounded-lg p-1.5"
                  >
                    <option value="text-lg">Padrão Compacto</option>
                    <option value="text-xl">Foco Médio</option>
                    <option value="text-2xl">Grande Destacado</option>
                    <option value="text-3xl">Lente Gigante (Kiosk)</option>
                    <option value="text-4xl">Totem Ultra Imersivo</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Configurações de Cores White Label */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2.5">
                 Definição Fina de Paleta (Operacao)
              </label>
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-150">
                {/* Background color */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Cor de Fundo</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={config.colors.background}
                      onChange={(e) => setConfig({
                        ...config,
                        colors: { ...config.colors, background: e.target.value }
                      })}
                      className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono font-bold text-slate-600 bg-white border border-slate-150 px-1 py-0.5 rounded">
                      {config.colors.background.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Primary Button/Accent */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Cor Primária</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={config.colors.primary}
                      onChange={(e) => setConfig({
                        ...config,
                        colors: { ...config.colors, primary: e.target.value }
                      })}
                      className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono font-bold text-slate-600 bg-white border border-slate-150 px-1 py-0.5 rounded">
                      {config.colors.primary.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Success color */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Sucesso (Green)</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={config.colors.success}
                      onChange={(e) => setConfig({
                        ...config,
                        colors: { ...config.colors, success: e.target.value }
                      })}
                      className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono font-bold text-slate-600 bg-white border border-slate-150 px-1 py-0.5 rounded">
                      {config.colors.success.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Error color */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Erro (Warning)</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={config.colors.error}
                      onChange={(e) => setConfig({
                        ...config,
                        colors: { ...config.colors, error: e.target.value }
                      })}
                      className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono font-bold text-slate-600 bg-white border border-slate-150 px-1 py-0.5 rounded">
                      {config.colors.error.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Configurações dos Blocos (Ativação e Reordenação) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                   Sequência & Visibilidade de Blocos
                </label>
                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                  Modulação
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mb-2.5 leading-relaxed">
                Cada bloco é independente. Use as setas para reorganizar a ordem visual na tela.
              </p>

              <div className="space-y-1.5">
                {config.blocks.map((blockId, index) => {
                  const isActive = config.activeBlocks[blockId as keyof typeof config.activeBlocks];
                  const blockNames: Record<string, string> = {
                    header: '1. Cabeçalho / Logo ',
                    instructions: '5. Instruções do Operador ℹ',
                    search: '2. Caixa de Busca Central  (Mandatório)',
                    newParticipant: '3. Botão "Novo Participante" ',
                    result: '4. Área de Resposta (Feedback)  (Mandatório)',
                    footer: '6. Rodapé Institucional '
                  };

                  return (
                    <div 
                      key={blockId}
                      className={`flex items-center justify-between p-2 rounded-xl border transition ${
                        isActive 
                          ? 'bg-white border-slate-200 shadow-xxs' 
                          : 'bg-slate-50/70 border-slate-100 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleBlockActive(blockId)}
                          disabled={blockId === 'search' || blockId === 'result'} // required blocks
                          className={`p-1 rounded cursor-pointer transition ${
                            isActive 
                              ? 'text-indigo-601 bg-indigo-50 hover:bg-indigo-100/60' 
                              : 'text-slate-350 bg-slate-100 hover:bg-slate-200/50'
                          } disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                          {isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                        </button>
                        <span className="text-xs font-bold leading-none">
                          {blockNames[blockId] || blockId}
                        </span>
                      </div>

                      {/* Control buttons UP/DOWN */}
                      <div className="flex items-center gap-1 select-none">
                        <button
                          type="button"
                          onClick={() => moveBlockUp(index)}
                          disabled={index === 0}
                          className="p-1 rounded hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed text-slate-500 cursor-pointer"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveBlockDown(index)}
                          disabled={index === config.blocks.length - 1}
                          className="p-1 rounded hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed text-slate-500 cursor-pointer"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customize Textos Intuitivos */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2.5">
                 Textos & Placeholders Customizados
              </label>
              
              <div className="space-y-3.5">
                {/* Search field placeholder */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Dica da Busca (Placeholder)</span>
                  <input
                    type="text"
                    value={config.searchPlaceholder}
                    onChange={(e) => setConfig({ ...config, searchPlaceholder: e.target.value })}
                    className="w-full text-xs font-bold bg-white border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-indigo-600"
                    placeholder="Instruções para o totem"
                  />
                </div>

                {/* Header Title Text */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Título do Evento no Cabeçalho</span>
                  <input
                    type="text"
                    value={config.headerTitle}
                    onChange={(e) => setConfig({ ...config, headerTitle: e.target.value })}
                    className="w-full text-xs font-bold bg-white border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-indigo-600"
                    placeholder={currentEvent?.name || 'Selecione ou insira o nome do evento'}
                  />
                </div>

                {/* Success response text */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Texto de Sucesso Customizado</span>
                  <textarea
                    rows={2}
                    value={config.successCustomText}
                    onChange={(e) => setConfig({ ...config, successCustomText: e.target.value })}
                    className="w-full text-xs font-bold bg-white border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-indigo-600"
                  />
                </div>

                {/* Error response text */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Texto de Falha / Erro Customizado</span>
                  <textarea
                    rows={2}
                    value={config.errorCustomText}
                    onChange={(e) => setConfig({ ...config, errorCustomText: e.target.value })}
                    className="w-full text-xs font-bold bg-white border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-indigo-600"
                  />
                </div>

                {/* Instructions Text */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Área Extras (Instruções)</span>
                  <textarea
                    rows={2}
                    value={config.instructionsText}
                    onChange={(e) => setConfig({ ...config, instructionsText: e.target.value })}
                    className="w-full text-xs font-bold bg-white border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-indigo-600"
                  />
                </div>

                {/* Footer Text */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Texto de Rodapé</span>
                  <input
                    type="text"
                    value={config.footerText}
                    onChange={(e) => setConfig({ ...config, footerText: e.target.value })}
                    className="w-full text-xs font-bold bg-white border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-indigo-600"
                  />
                </div>

                {/* Logos selection or custom direct Base64 input */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Upload da Logo (Imagem URL ou Base64)</span>
                  <input
                    type="text"
                    value={config.headerLogoUrl}
                    onChange={(e) => setConfig({ ...config, headerLogoUrl: e.target.value })}
                    className="w-full text-xs font-bold bg-white border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-indigo-600"
                    placeholder="https://sua-url/logo.png"
                  />
                  <div className="mt-2.5 flex items-center justify-between gap-1 bg-slate-50 p-2.5 rounded-xl border border-dashed border-slate-200">
                    <span className="text-[9px] text-slate-400 font-bold uppercase leading-none">Arquivos Locais:</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setConfig({ ...config, headerLogoUrl: event.target.result as string });
                              addToast('Logo carregada com sucesso!', 'success');
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="upload-saas-logo-header"
                    />
                    <label 
                      htmlFor="upload-saas-logo-header"
                      className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-1 rounded-lg hover:bg-indigo-100 transition cursor-pointer select-none"
                    >
                      Selecionar Logo
                    </label>
                  </div>
                </div>

                {/* Display toggles inside success card info */}
                <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-150">
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                     Configuração do Cartão de Sucesso
                  </span>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-700 font-semibold">Exibir nome do participante</span>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, showParticipantName: !config.showParticipantName })}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${config.showParticipantName ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${config.showParticipantName ? 'translate-x-4' : 'translate-x-0'} shadow-sm`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-700 font-semibold">Exibir categoria / acesso</span>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, showParticipantCategory: !config.showParticipantCategory })}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${config.showParticipantCategory ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${config.showParticipantCategory ? 'translate-x-4' : 'translate-x-0'} shadow-sm`} />
                    </button>
                  </div>
                </div>

                {/* Sound triggers & timer duration */}
                <div className="space-y-3.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-150">
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                     Sinais Sonoros & Timers
                  </span>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-700 text-xs font-semibold">
                      {config.playSuccessSound ? <Volume2 size={14} className="text-indigo-600" /> : <VolumeX size={14} className="text-slate-400" />}
                      <span>Bip (Sucesso)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, playSuccessSound: !config.playSuccessSound })}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${config.playSuccessSound ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${config.playSuccessSound ? 'translate-x-4' : 'translate-x-0'} shadow-sm`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-700 text-xs font-semibold">
                      {config.playErrorSound ? <Volume2 size={14} className="text-rose-600" /> : <VolumeX size={14} className="text-slate-400" />}
                      <span>Alarme (Falhas)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, playErrorSound: !config.playErrorSound })}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${config.playErrorSound ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${config.playErrorSound ? 'translate-x-4' : 'translate-x-0'} shadow-sm`} />
                    </button>
                  </div>

                  {/* Feedback reset delay */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Tempo de Resposta Ativa</span>
                      <span className="text-[10px] font-mono font-bold text-indigo-600">
                        {(config.feedbackDuration / 1000).toFixed(1)} segundos
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1000"
                      max="8000"
                      step="500"
                      value={config.feedbackDuration}
                      onChange={(e) => setConfig({ ...config, feedbackDuration: parseInt(e.target.value) })}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. THE MAIN PREVIEW AREA / TELEMETRILESS IMMERSIVE KIOSK SCREEN */}
      <div 
        className="flex-grow flex flex-col items-center justify-between min-h-[calc(100vh-80px)] p-6 transition-all"
        style={{ backgroundColor: config.colors.background }}
        id="white-label-stage-canvas"
      >
        
        {/* Toggle tools floating for standard operation users */}
        <div className="w-full flex items-center justify-between mb-4 shrink-0 select-none">
          
          {/* Active Event Indicator */}
          <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-850/80 backdrop-blur border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-full shadow-xxs">
            <Calendar size={13} className="text-indigo-500" />
            <span className="text-xxs font-black text-slate-800 dark:text-slate-200">
              {currentEvent ? currentEvent.name : 'Selecione um Evento'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Show config panel toggle */}
            {!isKioskMode && (
              <button
                type="button"
                onClick={() => setIsConfigTabOpen(!isConfigTabOpen)}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-full text-xxs font-black flex items-center gap-1.5 transition select-none shadow-xxs cursor-pointer"
              >
                <Sliders size={12} className={isConfigTabOpen ? 'text-indigo-600' : 'text-slate-400'} />
                <span>{isConfigTabOpen ? "Ocultar Painel Operacao" : "Exibir Painel Operacao"}</span>
              </button>
            )}

            {/* Immersive totem screen toggle */}
            <button
              type="button"
              onClick={() => setIsKioskMode(!isKioskMode)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-full text-xxs font-black flex items-center gap-1.5 transition select-none shadow-sm shadow-indigo-100 cursor-pointer"
            >
              {isKioskMode ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              <span>{isKioskMode ? "Sair da Tela Cheia [ESC]" : "Modo Totem / Auto-atendimento"}</span>
            </button>
          </div>
        </div>

        {/* Exit help reminder in Totem screen */}
        {isKioskMode && (
          <div className="fixed top-4 right-4 bg-black/60 backdrop-blur text-white px-3 py-1 text-[10px] rounded-full opacity-0 hover:opacity-100 transition select-none z-50">
            Pressione <strong>ESC</strong> ou clique para sair do Totem
          </div>
        )}

        {/* --- MAIN RENDERING ACCORDING TO USER'S CUSTOM MODULAR SEQUENCE --- */}
        <div 
          className={`w-full max-w-4xl flex-grow flex flex-col justify-center ${
            config.layoutMode === 'fixed-header' ? 'justify-start' : 'justify-center'
          }`}
        >
          
          <div 
            className={`w-full rounded-3xl p-8 transition-all ${
              config.layoutMode === 'totem' 
                ? 'bg-transparent border-transparent max-w-full shadow-none p-0' 
                : 'shadow-lg border shadow-slate-100'
            }`}
            style={{ 
              backgroundColor: config.layoutMode === 'totem' ? 'transparent' : config.colors.cardBackground,
              borderColor: config.layoutMode === 'totem' ? 'transparent' : config.colors.border
            }}
          >
            
            {/* Loop through each customized blocks array sequentially */}
            {config.blocks.map((blockId) => {
              const isBlockActive = config.activeBlocks[blockId as keyof typeof config.activeBlocks];
              if (!isBlockActive) return null;

              switch (blockId) {
                // BLOCK 1: HEADER
                case 'header':
                  return (
                    <div 
                      key="block-header" 
                      className="text-center pb-6 mb-6 border-b border-dashed flex flex-col items-center justify-center"
                      style={{ borderColor: config.colors.border }}
                    >
                      {config.headerLogoUrl ? (
                        <img 
                          src={config.headerLogoUrl} 
                          alt="Logo do Evento / Cliente" 
                          className="max-h-16 object-contain mb-3"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center mb-3">
                          <Building size={26} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                      )}
                      
                      <h1 
                        className="text-3xl font-black tracking-tight uppercase font-display" 
                        style={{ color: config.colors.text }}
                      >
                        {config.headerTitle || currentEvent?.name || 'Selecione um Evento'}
                      </h1>
                      
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-slate-400">
                        <span>Portal Oficial de Credenciamento White-Label</span>
                      </div>
                    </div>
                  );

                // BLOCK 5: MENSAGENS / INSTRUÇÕES OPERADOR
                case 'instructions':
                  return (
                    <div 
                      key="block-instructions" 
                      className="mb-6 p-4 rounded-2xl border text-center flex items-center justify-center gap-2"
                      style={{ 
                        borderColor: config.colors.border, 
                        backgroundColor: config.isDarkMode ? '#334155' : '#f1f5f9',
                        color: config.isDarkMode ? '#e2e8f0' : '#475569'
                      }}
                    >
                      <Info size={16} className="text-indigo-500 shrink-0" />
                      <span className="text-xs font-semibold leading-relaxed">
                        {config.instructionsText}
                      </span>
                    </div>
                  );

                // BLOCK 2: CENTRAL SEARCH CASE (MANDATORY)
                case 'search':
                  return (
                    <div key="block-search" className="mb-6 relative">
                      <form onSubmit={handleMainSearchSubmit} className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-slate-400">
                          {isSearching ? (
                            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Search size={22} style={{ color: config.colors.primary }} />
                          )}
                        </div>
                        
                        <input
                          ref={mainInputRef}
                          type="text"
                          value={searchValue}
                          onChange={(e) => setSearchValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (suggestions.length === 0) return;
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setFocusedIndex((prev) => (prev + 1) % suggestions.length);
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setFocusedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setSuggestions([]);
                              setFocusedIndex(0);
                            }
                          }}
                          className={`w-full pl-13 pr-12 py-5 rounded-2xl border-2 font-black transition-all ${
                            config.typography.inputSize
                          } ${
                            config.isDarkMode 
                              ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-950/40' 
                              : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100'
                          }`}
                          placeholder={config.searchPlaceholder}
                          disabled={isSearching}
                        />
                        
                        {/* Floating visual status indicator that search is continuous and focused */}
                        <div className="absolute inset-y-0 right-4 flex items-center">
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                          </span>
                        </div>
                      </form>

                      {/* REAL-TIME AUTOCOMPLETE SUGGESTIONS DROPDOWN */}
                      <AnimatePresence>
                        {suggestions.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute left-0 right-0 mt-2 rounded-2xl border shadow-xl z-50 overflow-hidden max-h-[380px] overflow-y-auto"
                            style={{ 
                              backgroundColor: config.colors.cardBackground, 
                              borderColor: config.colors.border 
                            }}
                          >
                            <div className="p-3 border-b border-dashed flex justify-between items-center bg-slate-50/70 dark:bg-slate-900/50" style={{ borderColor: config.colors.border }}>
                              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                Resultados Compatíveis ({suggestions.length})
                              </span>
                              <span className="text-[9px] font-mono font-bold text-slate-400">
                                Seta ↓ ↑ para navegar • Enter para confirmar
                              </span>
                            </div>
                            <ul className="divide-y divide-dashed" style={{ borderColor: config.colors.border }}>
                              {suggestions.map((p, idx) => {
                                const isFocused = idx === focusedIndex;
                                return (
                                  <li
                                    key={p.id}
                                    onClick={() => handleSelectParticipant(p)}
                                    className={`p-4 flex items-center justify-between cursor-pointer transition-all ${
                                      isFocused 
                                        ? 'bg-indigo-50/65 dark:bg-slate-800 text-indigo-900 dark:text-slate-100' 
                                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'
                                    }`}
                                  >
                                    <div className="flex flex-col text-left">
                                      <span className={`text-sm font-bold ${isFocused ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-800 dark:text-slate-200'}`}>
                                        {highlightText(p.name, searchValue)}
                                      </span>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-slate-400 font-medium">
                                          {p.cpf ? `CPF: ${p.cpf}` : `Código: ${p.ticketCode}`}
                                        </span>
                                        {p.company && (
                                          <span className="text-[10px] text-slate-400 font-light truncate max-w-[150px]">
                                            • {p.company}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                        p.category === 'VIP' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900' :
                                        p.category === 'Palestrante' ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-400 border border-purple-200 dark:border-purple-900' :
                                        p.category === 'Staff' ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-900' :
                                        p.category === 'Expositor' ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900' :
                                        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-205 dark:border-slate-700'
                                      }`}>
                                        {p.category || 'Participante'}
                                      </span>
                                      
                                      <span className={`w-2.5 h-2.5 rounded-full ${
                                        p.checkedIn ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                                      }`} title={p.checkedIn ? 'Credenciado' : 'Pendente'} />
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );

                // BLOCK 3: QUICK CREATE PARTICIPANT SWITCH
                case 'newParticipant':
                  // Only logged in checkin operators check
                  return (
                    <div key="block-newParticipant" className="mb-6 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setIsRegisterOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition hover:opacity-90 shadow-xs cursor-pointer text-white"
                        style={{ backgroundColor: config.colors.primary }}
                      >
                        <UserPlus size={14} />
                        <span>Novo Participante (Inscrição Rápida)</span>
                      </button>
                    </div>
                  );

                // BLOCK 4: FEEDBACK RESPONSE DESIGN CARD (MANDATORY)
                case 'result':
                  return (
                    <div key="block-result" className="mb-6">
                      <AnimatePresence mode="wait">
                        {feedbackState !== 'idle' && (
                          <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="rounded-2xl p-6 border text-white shadow-md text-center"
                            style={{ 
                              backgroundColor: feedbackState === 'success' ? config.colors.success : config.colors.error,
                              borderColor: 'transparent'
                            }}
                          >
                            <div className="flex flex-col items-center justify-center">
                              <div className="p-3 bg-white/20 rounded-full mb-3.5">
                                {feedbackState === 'success' ? <Check size={36} /> : <AlertTriangle size={36} />}
                              </div>
                              
                              <h2 className="text-xl font-black uppercase tracking-wide">
                                {feedbackState === 'success' ? 'Verificado & Autorizado!' : 'Falha na Validação'}
                              </h2>

                              <p className={`mt-2 font-semibold ${config.typography.messageSize}`}>
                                {feedbackMessage}
                              </p>

                              {/* Participant detail rendering under Success state */}
                              {feedbackState === 'success' && activeParticipant && (
                                <div className="mt-4 pt-4 border-t border-white/20 w-full max-w-md">
                                  {config.showParticipantName && (
                                    <h3 className="text-2xl font-black uppercase tracking-tight">
                                      {activeParticipant.name}
                                    </h3>
                                  )}
                                  
                                  {config.showParticipantCategory && (
                                    <span className="inline-block mt-2 bg-white text-emerald-800 font-black text-xs uppercase px-3 py-1 rounded-full shadow-xs">
                                      Acesso: {activeParticipant.category || 'Participante'}
                                    </span>
                                  )}

                                  {activeParticipant.company && (
                                    <p className="text-xs text-white/80 mt-1 font-bold">
                                      {activeParticipant.company}
                                    </p>
                                  )}
                                  
                                  <div className="mt-3 flex items-center justify-center gap-1 text-[10px] bg-black/25 text-white/90 py-1 px-3 rounded-full font-mono max-w-fit mx-auto">
                                    <QrCode size={10} />
                                    <span>TKT: {activeParticipant.ticketCode}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );

                // BLOCK 6: FOOTER
                case 'footer':
                  return (
                    <div 
                      key="block-footer" 
                      className="text-center pt-6 mt-6 border-t flex flex-col items-center justify-center"
                      style={{ 
                        borderColor: config.colors.border,
                        color: config.isDarkMode ? '#64748b' : '#94a3b8'
                      }}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {config.footerText}
                      </span>
                    </div>
                  );

                default:
                  return null;
              }
            })}

          </div>
        </div>

      </div>

      {/* --- QUICK NEW VISUALLY HARMONIOUS REGISTRATION SLIDE-OVER OVERLAY DIALOG --- */}
      <AnimatePresence>
        {isRegisterOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-xl"
            >
              <div className="bg-indigo-600 p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider font-display">Inscrição Rápida de Entrada</h3>
                  <p className="text-xxs text-indigo-200">Adicione e faça o check-in instantâneo de um novo participante</p>
                </div>
                <button
                  onClick={() => setIsRegisterOpen(false)}
                  className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleQuickRegisterSubmit} className="p-6 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={newParticipantForm.name}
                    onChange={(e) => setNewParticipantForm({ ...newParticipantForm, name: e.target.value })}
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:border-indigo-600 focus:bg-white transition"
                    placeholder="Nome do Participante"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider mb-1">E-mail</label>
                  <input
                    type="email"
                    value={newParticipantForm.email}
                    onChange={(e) => setNewParticipantForm({ ...newParticipantForm, email: e.target.value })}
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:border-indigo-600 focus:bg-white transition"
                    placeholder="participante@email.com"
                  />
                </div>

                {/* CPF */}
                <div>
                  <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider mb-1">CPF (Opcional)</label>
                  <input
                    type="text"
                    value={newParticipantForm.cpf}
                    onChange={(e) => setNewParticipantForm({ ...newParticipantForm, cpf: e.target.value })}
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:border-indigo-600 focus:bg-white transition"
                    placeholder="Apenas números ou formatado"
                  />
                </div>

                {/* Category Access selection */}
                <div>
                  <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider mb-1">Categoria de Entrada</label>
                  <select
                    value={newParticipantForm.category}
                    onChange={(e) => setNewParticipantForm({ ...newParticipantForm, category: e.target.value as ParticipantCategory })}
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:border-indigo-600 focus:bg-white transition"
                  >
                    <option value="Participante">Participante</option>
                    <option value="VIP">VIP</option>
                    <option value="Palestrante">Palestrante</option>
                    <option value="Expositor">Expositor</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>

                {/* Company */}
                <div>
                  <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider mb-1">Empresa / Afiliação</label>
                  <input
                    type="text"
                    value={newParticipantForm.company}
                    onChange={(e) => setNewParticipantForm({ ...newParticipantForm, company: e.target.value })}
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:border-indigo-600 focus:bg-white transition"
                    placeholder="Empresa do participante"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRegisterOpen(false)}
                    className="w-1/2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl py-3 transition cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-md transition cursor-pointer rounded-xl py-3"
                  >
                    Confirmar & Check-in
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
