import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  QrCode,
  FolderLock,
  BarChart3,
  LogOut,
  Plus,
  Search,
  Check,
  FileText,
  XCircle,
  Sparkles,
  Building,
  AlertTriangle,
  Download,
  Upload,
  UserCheck,
  Trash2,
  Tag,
  History,
  Info,
  ShieldAlert,
  Edit,
  RefreshCw,
  Printer,
  ChevronRight,
  ArrowRight,
  Sliders,
  Settings,
  Camera,
  X,
  ShieldCheck,
  MoreHorizontal,
  Sun,
  Moon
} from 'lucide-react';
import PrintCredential from './components/PrintCredential';
import LabelConfigTab from './components/LabelConfigTab';
import Dashboard from './components/Dashboard';
import StatsCard from './components/StatsCard';
import EventsPage from './pages/EventsPage';
import CheckinPage from './pages/CheckinPage';
import ScanAccessControlPage from './pages/ScanAccessControlPage';
import CheckInModular from './pages/CheckInModular';
import UserQRCode from './components/UserQRCode';
import FieldsConfig from './components/FieldsConfig';
import AreaAccessControl from './components/AreaAccessControl';
import credenciaLogo from './assets/credencia-logo-lockup.png';
import { User, Event, Participant, CloakroomItem, DashboardStats, ParticipantCategory, UserRole, EventUserRole, EventUser, Area, AccessProfile } from './types';

// Sleek CSS Color mapping & constants
const CATEGORY_TAGS: Record<ParticipantCategory, { bg: string, text: string, border: string }> = {
  VIP: { bg: 'bg-amber-100 text-amber-800', text: 'text-amber-800', border: 'border-amber-200' },
  Palestrante: { bg: 'bg-purple-100 text-purple-800', text: 'text-purple-800', border: 'border-purple-200' },
  Expositor: { bg: 'bg-teal-100 text-teal-800', text: 'text-teal-800', border: 'border-teal-200' },
  Participante: { bg: 'bg-blue-100 text-blue-800', text: 'text-blue-800', border: 'border-blue-200' },
  Staff: { bg: 'bg-rose-100 text-rose-800', text: 'text-rose-800', border: 'border-rose-200' }
};

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ReportAreaAccessLog {
  id: string;
  participantId: string;
  areaId: string;
  status: 'ALLOWED' | 'DENIED';
  userId: string;
  timestamp: string;
  participantName?: string;
  participantCpf?: string;
  areaName?: string;
  operatorName?: string;
}

interface ReportActionLog {
  id: string;
  eventId: string;
  userId: string;
  participantId?: string;
  action: string;
  timestamp: string;
  participantName?: string;
  operatorName?: string;
}

interface ReportBrandConfig {
  showLogo: boolean;
  logoUrl: string;
  showWatermark: boolean;
  watermarkUrl: string;
  watermarkOpacity: number;
}

const DEFAULT_REPORT_BRAND_CONFIG: ReportBrandConfig = {
  showLogo: false,
  logoUrl: '',
  showWatermark: false,
  watermarkUrl: '',
  watermarkOpacity: 0.08
};

type ActiveTab =
  | 'dashboard'
  | 'eventos-ativos'
  | 'evento-dashboard'
  | 'eventos'
  | 'participantes'
  | 'checkin'
  | 'checkin-modular'
  | 'scanner'
  | 'areas'
  | 'chapelaria'
  | 'relatorios'
  | 'impressao'
  | 'etiquetas'
  | 'usuarios'
  | 'campos';

const ACTIVE_TAB_STORAGE_KEY = 'credencia_active_tab';
const CURRENT_EVENT_ID_STORAGE_KEY = 'currentEventId';
const CURRENT_USER_ROLE_STORAGE_KEY = 'currentUserRole';
const LEGACY_SELECTED_EVENT_ID_STORAGE_KEY = 'credencia_selected_event_id';
const ACTIVE_TABS: ActiveTab[] = [
  'dashboard',
  'eventos-ativos',
  'evento-dashboard',
  'eventos',
  'participantes',
  'checkin',
  'checkin-modular',
  'scanner',
  'areas',
  'chapelaria',
  'relatorios',
  'impressao',
  'etiquetas',
  'usuarios',
  'campos'
];

const isActiveTab = (value: string | null): value is ActiveTab => {
  return !!value && ACTIVE_TABS.includes(value as ActiveTab);
};

export default function App() {
  const [isDarkTheme, setIsDarkTheme] = useState(() => localStorage.getItem('credencia_theme') === 'dark');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showFernandoWelcome, setShowFernandoWelcome] = useState(false);

  // Session / Auth States
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('credencia_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('credencia_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [currentEventRole, setCurrentEventRole] = useState<string>(() => localStorage.getItem(CURRENT_USER_ROLE_STORAGE_KEY) || '');

  const userRole = String(currentUser?.role || '').toUpperCase();
  const eventRole = String(currentEventRole || currentUser?.role || '').toUpperCase();
  const isUserAdmin = userRole === 'ADMIN' || currentUser?.role === 'admin' || eventRole === 'ADMIN';
  const canCreateParticipants = isUserAdmin || eventRole === 'CHECKIN_CADASTRO';
  const canManageParticipants = isUserAdmin || eventRole === 'SUPERVISOR' || eventRole === 'CHECKIN_CADASTRO';
  const canViewReports = isUserAdmin || eventRole === 'SUPERVISOR' || eventRole === 'RELATORIO';
  const isFernandoAdmin = String(currentUser?.email || '').toLowerCase() === 'fernando@credencia.com';

  // Login Form States
  const [loginMethod, setLoginMethod] = useState<'pin' | 'email'>('email');
  const [pinInput, setPinInput] = useState('');
  const [emailInput, setEmailInput] = useState('admin@credencia.com');
  const [passwordInput, setPasswordInput] = useState('admin123');
  const [authLoading, setAuthLoading] = useState(false);

  // New Login/Sign Up and Profile Editing States
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registerNameInput, setRegisterNameInput] = useState('');
  const [registerOrgInput, setRegisterOrgInput] = useState('');
  const [registerRoleInput, setRegisterRoleInput] = useState<UserRole>('admin');
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', password: '' });

  // System Users Management (Admin)
  const [usersList, setUsersList] = useState<User[]>([]);
  const [eventUsers, setEventUsers] = useState<EventUser[]>([]);
  const [eventUserForm, setEventUserForm] = useState({
    eventId: '',
    userId: '',
    role: 'CHECKIN' as EventUserRole,
    active: true
  });
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    id: '',
    name: '',
    email: '',
    password: '',
    role: 'CHECKIN' as UserRole,
    eventId: '',
    eventRole: 'CHECKIN' as EventUserRole,
    eventActive: true
  });

  // Active Event
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(() => (
    localStorage.getItem(CURRENT_EVENT_ID_STORAGE_KEY) ||
    localStorage.getItem(LEGACY_SELECTED_EVENT_ID_STORAGE_KEY) ||
    ''
  ));
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (window.location.pathname === '/checkin') return 'checkin';

    const savedTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    if (isActiveTab(savedTab)) return savedTab;

    const saved = localStorage.getItem('credencia_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const savedRole = String(parsed?.role || '').toUpperCase();
        if (savedRole !== 'ADMIN' && parsed?.role !== 'admin') {
          return 'checkin';
        }
      } catch (e) {}
    }
    return 'dashboard';
  });

  // Core Entity States
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [cloakroom, setCloakroom] = useState<CloakroomItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [availableAreas, setAvailableAreas] = useState<Area[]>([]);
  const [accessProfiles, setAccessProfiles] = useState<AccessProfile[]>([]);
  const [areaAccessLogs, setAreaAccessLogs] = useState<ReportAreaAccessLog[]>([]);
  const [actionLogs, setActionLogs] = useState<ReportActionLog[]>([]);
  const [loadingMain, setLoadingMain] = useState(false);

  // Filter / Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedPresenceFilter, setSelectedPresenceFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [reportBrandConfig, setReportBrandConfig] = useState<ReportBrandConfig>(DEFAULT_REPORT_BRAND_CONFIG);

  // Modal / Form trigger states
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const [isCloakroomModalOpen, setIsCloakroomModalOpen] = useState(false);
  const [cloakroomTab, setCloakroomTab] = useState<'store' | 'return' | 'history'>('store');
  const [cloakroomSearch, setCloakroomSearch] = useState('');
  const [cloakroomSelectedParticipant, setCloakroomSelectedParticipant] = useState<Participant | null>(null);
  const [cloakroomVolumeCount, setCloakroomVolumeCount] = useState(1);
  const [cloakroomDescription, setCloakroomDescription] = useState('');
  const [cloakroomSuccess, setCloakroomSuccess] = useState<CloakroomItem | null>(null);
  const [cloakroomReturnSearch, setCloakroomReturnSearch] = useState('');
  const [cloakroomReturnItem, setCloakroomReturnItem] = useState<CloakroomItem | null>(null);
  const [cloakroomReturnSuccess, setCloakroomReturnSuccess] = useState<CloakroomItem | null>(null);
  const [cloakroomHistoryFilter, setCloakroomHistoryFilter] = useState<'all' | 'guardado' | 'retirado'>('all');
  const [cloakroomHistorySearch, setCloakroomHistorySearch] = useState('');
  const [eventForm, setEventForm] = useState({
    id: '',
    name: '',
    date: '',
    location: '',
    capacity: 200,
    enableAccessControl: true,
    enableCloakroom: false,
    enableScanner: true
  });
  const [participantForm, setParticipantForm] = useState<{ id: string, name: string, email: string, cpf: string, category: ParticipantCategory, company: string, allowedAreaIds: string[], allowedAreas: string[] }>({
    id: '', name: '', email: '', cpf: '', category: 'Participante', company: '', allowedAreaIds: [], allowedAreas: []
  });
  const [cloakroomForm, setCloakroomForm] = useState({ participantId: '', participantName: '', itemDescription: '' });

  // Badge Visualizer state
  const [activeBadgeParticipant, setActiveBadgeParticipant] = useState<Participant | null>(null);

  // Participant QR code modal state
  const [selectedQrParticipant, setSelectedQrParticipant] = useState<Participant | null>(null);

  // Scanner Simulator States
  const [scanCode, setScanCode] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; participant?: Participant } | null>(null);

  // Import Preview & Validation States
  const [isImportPreviewModalOpen, setIsImportPreviewModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importFileIsLoading, setImportFileIsLoading] = useState(false);
  const [isImportingInProgress, setIsImportingInProgress] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [autoPrintOnCheckin, setAutoPrintOnCheckin] = useState(true);
  const [checkinSearchQuery, setCheckinSearchQuery] = useState('');
  const [showCheckinAddForm, setShowCheckinAddForm] = useState(false);
  const [checkinAddForm, setCheckinAddForm] = useState({ name: '', email: '', cpf: '', category: 'Participante', company: '' });
  const [checkinFilter, setCheckinFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Global Toast Notification triggers
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const persistSelectedEvent = (eventId: string, role?: string) => {
    setSelectedEventId(eventId);

    if (!eventId) {
      setCurrentEventRole('');
      localStorage.removeItem(CURRENT_EVENT_ID_STORAGE_KEY);
      localStorage.removeItem(CURRENT_USER_ROLE_STORAGE_KEY);
      localStorage.removeItem(LEGACY_SELECTED_EVENT_ID_STORAGE_KEY);
      return;
    }

    const eventRole = role || events.find(event => event.id === eventId)?.currentUserRole || currentUser?.role || '';
    setCurrentEventRole(eventRole);
    localStorage.setItem(CURRENT_EVENT_ID_STORAGE_KEY, eventId);
    localStorage.setItem(LEGACY_SELECTED_EVENT_ID_STORAGE_KEY, eventId);
    if (eventRole) {
      localStorage.setItem(CURRENT_USER_ROLE_STORAGE_KEY, eventRole);
    }
  };

  const getActiveHeaders = () => {
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  useEffect(() => {
    localStorage.setItem('credencia_theme', isDarkTheme ? 'dark' : 'light');
  }, [isDarkTheme]);

  useEffect(() => {
    if (!currentUser || !token || !isFernandoAdmin) return;
    const key = `credencia_fernando_welcome_${currentUser.id}`;
    if (sessionStorage.getItem(key) === 'seen') return;
    setShowFernandoWelcome(true);
    sessionStorage.setItem(key, 'seen');
  }, [currentUser, token, isFernandoAdmin]);

  // Safe fetch helper
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    try {
      const res = await fetch(endpoint, {
        ...options,
        headers: {
          ...getActiveHeaders(),
          ...options.headers
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `HTTP error! status: ${res.status}`);
      }
      return await res.json();
    } catch (e: any) {
      console.error(`API Call failed to [${endpoint}]:`, e);
      addToast(e.message || 'Erro de comunicaÃ§Ã£o com o servidor', 'error');
      throw e;
    }
  };

  // Perform Application Authentication
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      addToast('Por favor, preencha todos os campos.', 'error');
      return;
    }

    setAuthLoading(true);
    try {
      const data = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      });

      localStorage.setItem('credencia_token', data.token);
      localStorage.setItem('credencia_user', JSON.stringify(data.user));
      setToken(data.token);
      setCurrentUser(data.user);
      addToast(`Bem-vindo de volta, ${data.user.name}!`, 'success');
    } catch (err) {
      // API call triggers toast automatically
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePinLogin = async (pinValue: string) => {
    if (!pinValue) return;
    setAuthLoading(true);
    try {
      const data = await apiCall('/api/auth/login-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue })
      });

      localStorage.setItem('credencia_token', data.token);
      localStorage.setItem('credencia_user', JSON.stringify(data.user));
      setToken(data.token);
      setCurrentUser(data.user);
      addToast(`Bem-vindo de volta, ${data.user.name}!`, 'success');
    } catch (err: any) {
      // failed PIN attempts are warned
      addToast(err.message || 'CÃ³digo PIN incorreto', 'error');
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  // Auto-submit PIN once it reaches 4-6 digits with a small delay for visual satisfaction
  useEffect(() => {
    if (pinInput.length >= 4 && pinInput.length <= 6) {
      const runAutoSubmit = async () => {
        try {
          await handlePinLogin(pinInput);
          setPinInput('');
        } catch (e) {
          setPinInput('');
        }
      };
      const tid = setTimeout(runAutoSubmit, 150);
      return () => clearTimeout(tid);
    }
  }, [pinInput]);

  const handleLogout = () => {
    localStorage.removeItem('credencia_token');
    localStorage.removeItem('credencia_user');
    localStorage.removeItem(CURRENT_EVENT_ID_STORAGE_KEY);
    localStorage.removeItem(CURRENT_USER_ROLE_STORAGE_KEY);
    localStorage.removeItem(LEGACY_SELECTED_EVENT_ID_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
    setToken(null);
    setCurrentUser(null);
    setCurrentEventRole('');
    setSelectedEventId('');
    setEvents([]);
    setParticipants([]);
    setStats(null);
    addToast('SessÃ£o encerrada com sucesso', 'info');
  };

  // Signup/Registration Handler
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerNameInput || !emailInput || !passwordInput) {
      addToast('Por favor, preencha todos os campos do cadastro.', 'error');
      return;
    }

    setAuthLoading(true);
    try {
      const data = await apiCall('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          name: registerNameInput,
          email: emailInput,
          password: passwordInput,
          role: registerRoleInput,
          orgName: registerOrgInput
        })
      });

      localStorage.setItem('credencia_token', data.token);
      localStorage.setItem('credencia_user', JSON.stringify(data.user));
      setToken(data.token);
      setCurrentUser(data.user);
      addToast(`Conta criada! Bem-vindo, ${data.user.name}!`, 'success');
      setIsRegisterMode(false);
      setRegisterNameInput('');
      setRegisterOrgInput('');
    } catch (err) {
      // apiCall displays toast automatically
    } finally {
      setAuthLoading(false);
    }
  };

  // Self-Profile Details update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name || !profileForm.email) {
      addToast('Nome e e-mail sÃ£o obrigatÃ³rios para seu perfil.', 'error');
      return;
    }

    try {
      const updated = await apiCall(`/api/users/${currentUser?.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: profileForm.name,
          email: profileForm.email,
          ...(profileForm.password ? { password: profileForm.password } : {})
        })
      });

      const updatedUser = {
        ...currentUser,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        id: updated.id,
        createdAt: updated.createdAt
      };

      localStorage.setItem('credencia_user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser as User);
      setIsProfileModalOpen(false);
      addToast('Seu perfil e credenciais de acesso foram atualizados!', 'success');
    } catch (err) {}
  };

  // Load and cache all users for administrator management
  const loadUsers = async () => {
    if (!isUserAdmin) return;
    setIsLoadingUsers(true);
    try {
      const data = await apiCall('/api/users');
      setUsersList(data);
    } catch (e) {
      console.error('Erro ao ler lista de usuÃ¡rios:', e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadEventUsers = async (eventId: string) => {
    if (!isUserAdmin || !eventId) {
      setEventUsers([]);
      return;
    }
    try {
      const data = await apiCall(`/api/events/${eventId}/users`);
      setEventUsers(data);
    } catch (e) {
      console.error('Erro ao carregar vÃ­nculos de operadores por evento:', e);
    }
  };

  const handleSaveEventUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventUserForm.eventId || !eventUserForm.userId || !eventUserForm.role) {
      addToast('Selecione evento, usuÃ¡rio e permissÃ£o do vÃ­nculo.', 'error');
      return;
    }

    try {
      const saved = await apiCall(`/api/events/${eventUserForm.eventId}/users`, {
        method: 'POST',
        body: JSON.stringify({
          userId: eventUserForm.userId,
          role: eventUserForm.role,
          active: eventUserForm.active
        })
      });
      setEventUsers(prev => {
        const exists = prev.some(link => link.id === saved.id);
        return exists ? prev.map(link => link.id === saved.id ? saved : link) : [...prev, saved];
      });
      addToast('VÃ­nculo entre usuÃ¡rio e evento salvo com sucesso!', 'success');
    } catch (e) {}
  };

  const handleToggleEventUser = async (link: EventUser) => {
    try {
      const updated = await apiCall(`/api/events/${link.eventId}/users/${link.id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !link.active })
      });
      setEventUsers(prev => prev.map(item => item.id === updated.id ? updated : item));
    } catch (e) {}
  };

  const handleDeleteEventUser = async (link: EventUser) => {
    if (!window.confirm('Remover este vÃ­nculo entre usuÃ¡rio e evento?')) return;
    try {
      await apiCall(`/api/events/${link.eventId}/users/${link.id}`, { method: 'DELETE' });
      setEventUsers(prev => prev.filter(item => item.id !== link.id));
      addToast('VÃ­nculo removido com sucesso.', 'info');
    } catch (e) {}
  };

  // Admin inserts or updates system users (operator/admin)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email || (!userForm.id && !userForm.password)) {
      addToast('Nome, E-mail e Senha sÃ£o campos obrigatÃ³rios para novos operadores.', 'error');
      return;
    }

    try {
      const isEdit = !!userForm.id;
      const endpoint = isEdit ? `/api/users/${userForm.id}` : '/api/users';
      const method = isEdit ? 'PUT' : 'POST';

      const saved = await apiCall(endpoint, {
        method,
        body: JSON.stringify({
          name: userForm.name,
          email: userForm.email,
          role: userForm.role,
          ...(userForm.password ? { password: userForm.password } : {})
        })
      });

      if (isEdit) {
        setUsersList(prev => prev.map(u => u.id === saved.id ? saved : u));
        addToast(`UsuÃ¡rio "${saved.name}" atualizado com sucesso!`, 'success');
      } else {
        setUsersList(prev => [...prev, saved]);
        addToast(`UsuÃ¡rio "${saved.name}" criado com login e senha prontos!`, 'success');
      }

      if (userForm.eventId) {
        const savedLink = await apiCall(`/api/events/${userForm.eventId}/users`, {
          method: 'POST',
          body: JSON.stringify({
            userId: saved.id,
            role: userForm.eventRole,
            active: userForm.eventActive
          })
        });

        if (userForm.eventId === eventUserForm.eventId) {
          setEventUsers(prev => {
            const exists = prev.some(link => link.id === savedLink.id);
            return exists ? prev.map(link => link.id === savedLink.id ? savedLink : link) : [...prev, savedLink];
          });
        }

        addToast(`VÃƒÂ­nculo de "${saved.name}" com evento criado.`, 'success');
      }

      setIsUserModalOpen(false);
      setUserForm({
        id: '',
        name: '',
        email: '',
        password: '',
        role: 'CHECKIN',
        eventId: '',
        eventRole: 'CHECKIN',
        eventActive: true
      });
    } catch (err) {}
  };

  // Delete credentials of an operator/admin
  const handleDeleteUser = async (id: string) => {
    if (id === currentUser?.id) {
      addToast('VocÃª nÃ£o pode excluir sua prÃ³pria conta atualmente ativa.', 'error');
      return;
    }
    if (!window.confirm('Excluir este login removerÃ¡ definitivamente o acesso dele ao sistema. Confirmar exclusÃ£o?')) return;

    try {
      await apiCall(`/api/users/${id}`, { method: 'DELETE' });
      addToast('UsuÃ¡rio revogado do sistema.', 'success');
      setUsersList(prev => prev.filter(u => u.id !== id));
    } catch (e) {}
  };

  // Load user management lists on tab change
  useEffect(() => {
    if (activeTab === 'usuarios' && isUserAdmin && token) {
      loadUsers();
      if (selectedEventId) {
        loadEventUsers(selectedEventId);
      }
    }
  }, [activeTab, isUserAdmin, token, selectedEventId]);

  useEffect(() => {
    if (!eventUserForm.eventId && selectedEventId) {
      setEventUserForm(prev => ({ ...prev, eventId: selectedEventId }));
    }
  }, [selectedEventId, eventUserForm.eventId]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  // Keep the current tab when it is allowed; only redirect when permissions require it.
  useEffect(() => {
    if (!currentUser) return;
    if (isUserAdmin) return;

    const allowedTabs: ActiveTab[] = ['eventos-ativos', 'checkin'];
    if (canManageParticipants) allowedTabs.push('participantes');
    if (canViewReports) allowedTabs.push('relatorios');

    if (!allowedTabs.includes(activeTab)) {
      setActiveTab('checkin');
    }
  }, [currentUser, isUserAdmin, canManageParticipants, canViewReports, activeTab]);

  // --- Fetch Operations ---
  const loadEvents = async () => {
    try {
      const data: Event[] = await apiCall('/api/events');
      setEvents(data);

      if (data.length === 0) {
        persistSelectedEvent('');
        return;
      }

      const savedEventId = localStorage.getItem(CURRENT_EVENT_ID_STORAGE_KEY) || localStorage.getItem(LEGACY_SELECTED_EVENT_ID_STORAGE_KEY);
      const savedEvent = data.find(event => event.id === savedEventId);

      if (data.length === 1) {
        persistSelectedEvent(data[0].id, data[0].currentUserRole);
        if (!selectedEventId || activeTab === 'eventos-ativos') {
          setActiveTab(isUserAdmin ? 'evento-dashboard' : 'checkin');
        }
        return;
      }

      if (savedEvent) {
        persistSelectedEvent(savedEvent.id, savedEvent.currentUserRole);
        return;
      }

      persistSelectedEvent('');
      setActiveTab('eventos-ativos');
    } catch (e) {}
  };

  const loadDataForEvent = async (eventId: string) => {
    if (!eventId) return;
    setLoadingMain(true);
    try {
      // Load current areas and access profiles for the event dynamically
      const [areasData, profilesData, accessLogsData, actionLogsData] = await Promise.all([
        apiCall(`/api/areas?eventId=${eventId}`),
        apiCall(`/api/access-profiles?eventId=${eventId}`),
        apiCall('/api/access-control/logs').catch(() => []),
        apiCall(`/api/action-logs?eventId=${eventId}`).catch(() => [])
      ]);
      setAvailableAreas(areasData || []);
      setAccessProfiles(profilesData || []);
      setAreaAccessLogs(Array.isArray(accessLogsData) ? accessLogsData : []);
      setActionLogs(Array.isArray(actionLogsData) ? actionLogsData : []);

      if (isUserAdmin || canViewReports) {
        // Parallelize fetches for speedy Operacao load times for admins
        const [plist, clist, statData] = await Promise.all([
          apiCall(`/api/events/${eventId}/participants`),
          apiCall(`/api/events/${eventId}/cloakroom`),
          apiCall(`/api/events/${eventId}/dashboard`)
        ]);
        setParticipants(plist);
        setCloakroom(clist);
        setStats(statData);
      } else {
        // Non-admin can only request the event participants list
        const plist = await apiCall(`/api/events/${eventId}/participants`);
        setParticipants(plist);
        setCloakroom([]);
        setStats(null);
      }
    } catch (e) {
      console.error('Error loading event operational details:', e);
    } finally {
      setLoadingMain(false);
    }
  };

  // Bootstrapping
  useEffect(() => {
    if (token) {
      loadEvents();
    }
  }, [token]);

  useEffect(() => {
    if (selectedEventId) {
      loadDataForEvent(selectedEventId);
    }
  }, [selectedEventId]);

  // Current selected Event Object
  const currentEvent = useMemo(() => {
    return events.find(e => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  useEffect(() => {
    if (!currentEvent) return;
    const eventRole = currentEvent.currentUserRole || currentUser?.role || '';
    setCurrentEventRole(eventRole);
    localStorage.setItem(CURRENT_EVENT_ID_STORAGE_KEY, currentEvent.id);
    localStorage.setItem(LEGACY_SELECTED_EVENT_ID_STORAGE_KEY, currentEvent.id);
    if (eventRole) {
      localStorage.setItem(CURRENT_USER_ROLE_STORAGE_KEY, eventRole);
    }
  }, [currentEvent, currentUser]);

  useEffect(() => {
    if (!selectedEventId) {
      setReportBrandConfig(DEFAULT_REPORT_BRAND_CONFIG);
      return;
    }

    const savedConfig = localStorage.getItem(`credencia_report_brand_${selectedEventId}`);
    if (!savedConfig) {
      setReportBrandConfig(DEFAULT_REPORT_BRAND_CONFIG);
      return;
    }

    try {
      setReportBrandConfig({
        ...DEFAULT_REPORT_BRAND_CONFIG,
        ...JSON.parse(savedConfig)
      });
    } catch (error) {
      setReportBrandConfig(DEFAULT_REPORT_BRAND_CONFIG);
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) return;
    localStorage.setItem(`credencia_report_brand_${selectedEventId}`, JSON.stringify(reportBrandConfig));
  }, [reportBrandConfig, selectedEventId]);

  useEffect(() => {
    if (!currentEvent) return;
    if (isUserAdmin) return;
    if (activeTab === 'areas' && currentEvent.enableAccessControl === false) setActiveTab('evento-dashboard');
    if (activeTab === 'chapelaria' && currentEvent.enableCloakroom !== true) setActiveTab('evento-dashboard');
    if (activeTab === 'scanner' && currentEvent.enableScanner === false) setActiveTab('evento-dashboard');
  }, [activeTab, currentEvent, isUserAdmin]);

  // Handle Select Event action
  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    persistSelectedEvent(val);
    addToast('Evento alterado com sucesso', 'info');
  };

  // --- Crucial Event Handlers (CRUD) ---
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.name || !eventForm.date || !eventForm.location || !eventForm.capacity) {
      addToast('Todos os campos sÃ£o obrigatÃ³rios', 'error');
      return;
    }

    try {
      const isEdit = !!eventForm.id;
      const endpoint = isEdit ? `/api/events/${eventForm.id}` : '/api/events';
      const method = isEdit ? 'PUT' : 'POST';

      const saved = await apiCall(endpoint, {
        method,
        body: JSON.stringify(eventForm)
      });

      if (isEdit) {
        setEvents(prev => prev.map(ev => ev.id === saved.id ? saved : ev));
        addToast('Evento atualizado com sucesso!', 'success');
      } else {
        setEvents(prev => [...prev, saved]);
        persistSelectedEvent(saved.id, saved.currentUserRole || 'ADMIN');
        setActiveTab('evento-dashboard');
        addToast('Evento criado e ativado com sucesso!', 'success');
      }

      setIsEventModalOpen(false);
      setEventForm({ id: '', name: '', date: '', location: '', capacity: 200, enableAccessControl: true, enableCloakroom: false, enableScanner: true });
    } catch (err) {}
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('AtenÃ§Ã£o: A remoÃ§Ã£o deste evento excluirÃ¡ em cascata todos os participantes e itens de chapelaria relacionados. Deseja prosseguir?')) return;
    try {
      await apiCall(`/api/events/${id}`, { method: 'DELETE' });
      addToast('Evento removido do sistema.', 'success');
      setEvents(prev => prev.filter(ev => ev.id !== id));
      if (selectedEventId === id) {
        persistSelectedEvent('');
      }
    } catch (e) {}
  };

  // --- Participant Operations ---
  const handleSaveParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateParticipants && !participantForm.id) {
      addToast('UsuÃ¡rio sem permissÃ£o para cadastrar participantes neste evento.', 'error');
      return;
    }
    if (!selectedEventId) {
      addToast('Selecione um evento ativo primeiro.', 'error');
      return;
    }
    if (!participantForm.name || !participantForm.email) {
      addToast('Nome e e-mail sÃ£o obrigatÃ³rios!', 'error');
      return;
    }

    try {
      const isEdit = !!participantForm.id;
      const endpoint = isEdit ? `/api/participants/${participantForm.id}` : `/api/events/${selectedEventId}/participants`;
      const method = isEdit ? 'PUT' : 'POST';

      const saved = await apiCall(endpoint, {
        method,
        body: JSON.stringify({
          ...participantForm,
          allowedAreaIds: participantForm.allowedAreaIds || participantForm.allowedAreas || [],
          allowedAreas: participantForm.allowedAreaIds || participantForm.allowedAreas || []
        })
      });

      if (isEdit) {
        setParticipants(prev => prev.map(p => p.id === saved.id ? saved : p));
        addToast('Participante atualizado com sucesso!', 'success');
      } else {
        setParticipants(prev => [saved, ...prev]);
        addToast('Participante cadastrado no evento!', 'success');
      }

      setIsParticipantModalOpen(false);
      setParticipantForm({ id: '', name: '', email: '', cpf: '', category: 'Participante', company: '', allowedAreaIds: [], allowedAreas: [] });
      // Refresh current dashboard metrics
      loadDataForEvent(selectedEventId);
    } catch (err) {}
  };

  const handleDeleteParticipant = async (id: string) => {
    if (!window.confirm('Deseja realmente remover este participante?')) return;
    try {
      await apiCall(`/api/participants/${id}`, { method: 'DELETE' });
      setParticipants(prev => prev.filter(p => p.id !== id));
      addToast('Participante removido com sucesso.', 'success');
      if (selectedEventId) {
        loadDataForEvent(selectedEventId);
      }
    } catch (e) {}
  };

  const handleToggleCheckin = async (participant: Participant) => {
    const nextCheckinState = !participant.checkedIn;
    try {
      const data = await apiCall(`/api/participants/${participant.id}/checkin`, {
        method: 'POST',
        body: JSON.stringify({ checkedIn: nextCheckinState })
      });

      setParticipants(prev => prev.map(p => p.id === participant.id ? data.participant : p));
      addToast(data.message, 'success');
      
      if (selectedEventId) {
        loadDataForEvent(selectedEventId);
      }
    } catch (e) {}
  };

  // Quick scan simulation (from quick scanner)
  const handleQuickScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      addToast('Por favor, selecione um evento ativo.', 'error');
      return;
    }
    if (!scanCode.trim()) {
      addToast('Insira um CPF ou cÃ³digo do convite.', 'error');
      return;
    }

    try {
      const res = await apiCall(`/api/events/${selectedEventId}/checkin/scan`, {
        method: 'POST',
        body: JSON.stringify({ code: scanCode.trim() })
      });

      if (res && res.error) {
        setScanResult({
          success: false,
          message: res.error
        });
        return;
      }

      setScanResult({
        success: true,
        message: res.message,
        participant: res.participant
      });

      addToast(res.message, 'success');
      setScanCode('');
      loadDataForEvent(selectedEventId);

      if (autoPrintOnCheckin && res.participant) {
        setActiveBadgeParticipant(res.participant);
      }
    } catch (err: any) {
      setScanResult({
        success: false,
        message: err.message || 'CÃ³digo do participante nÃ£o localizado ou jÃ¡ credenciado.'
      });
    }
  };

  // Cadastra e efetua Check-in com ImpressÃ£o de Etiqueta instantÃ¢nea na recepÃ§Ã£o
  const handleCheckinAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      addToast('Selecione um evento ativo primeiro.', 'error');
      return;
    }
    if (!checkinAddForm.name || !checkinAddForm.email || !checkinAddForm.cpf) {
      addToast('Preencha os campos obrigatÃ³rios!', 'error');
      return;
    }

    try {
      const saved = await apiCall(`/api/events/${selectedEventId}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...checkinAddForm,
          checkedIn: true,
          checkedInAt: new Date().toISOString()
        })
      });

      setParticipants(prev => [saved, ...prev]);
      addToast('Membro cadastrado e credenciado com sucesso!', 'success');
      
      // Limpa formulÃ¡rio da recepÃ§Ã£o
      setCheckinAddForm({ name: '', email: '', cpf: '', category: 'Participante', company: '' });
      setShowCheckinAddForm(false);
      
      // Auto-abre para impressÃ£o da etiqueta
      setActiveBadgeParticipant(saved);
      
      // Recarrega dados
      loadDataForEvent(selectedEventId);
    } catch (err: any) {
      addToast(err.message || 'Erro ao realizar o cadastro de recepÃ§Ã£o.', 'error');
    }
  };

  // Realiza check-in e dispara a impressÃ£o de crachÃ¡ de uma sÃ³ vez
  const handleCheckinAndPrint = async (participant: Participant) => {
    try {
      let updatedParticipant = participant;
      
      if (!participant.checkedIn) {
        const data = await apiCall(`/api/participants/${participant.id}/checkin`, {
          method: 'POST',
          body: JSON.stringify({ checkedIn: true })
        });
        
        updatedParticipant = data.participant;
        setParticipants(prev => prev.map(p => p.id === participant.id ? updatedParticipant : p));
        addToast(`Check-in de ${participant.name} realizado com sucesso!`, 'success');
        
        if (selectedEventId) {
          loadDataForEvent(selectedEventId);
        }
      } else {
        addToast(`Reemitindo etiqueta de ${participant.name}...`, 'info');
      }
      
      setActiveBadgeParticipant(updatedParticipant);
    } catch (e: any) {
      addToast(e.message || 'Falha ao processar o check-in.', 'error');
    }
  };

  // --- Chapelaria Operations ---
  const normalizeCloakroomQuery = (value: string) => value.toLowerCase().replace(/\D/g, '').trim();
  const normalizeCloakroomText = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const cloakroomParticipantResults = useMemo(() => {
    const query = cloakroomSearch.trim();
    if (query.length < 2) return [];

    const textQuery = normalizeCloakroomText(query);
    const numberQuery = normalizeCloakroomQuery(query);

    return participants
      .filter(participant => {
        const nameMatch = normalizeCloakroomText(participant.name).includes(textQuery);
        const cpfMatch = numberQuery.length >= 3 && participant.cpf.replace(/\D/g, '').includes(numberQuery);
        const codeMatch = normalizeCloakroomText(participant.ticketCode || '').includes(textQuery);
        return nameMatch || cpfMatch || codeMatch;
      })
      .slice(0, 8);
  }, [cloakroomSearch, participants]);

  const cloakroomReturnResults = useMemo(() => {
    const query = cloakroomReturnSearch.trim();
    if (query.length < 1) return [];

    const textQuery = normalizeCloakroomText(query);
    const numberQuery = normalizeCloakroomQuery(query);

    return cloakroom
      .filter(item => item.status === 'guardado')
      .filter(item => {
        const tagMatch = String(item.tagNumber).includes(query) || (item.volumeTags || []).some(tag => tag.includes(query));
        const participant = participants.find(p => p.id === item.participantId);
        const nameMatch = normalizeCloakroomText(item.participantName).includes(textQuery);
        const cpfMatch = numberQuery.length >= 3 && (participant?.cpf || '').replace(/\D/g, '').includes(numberQuery);
        const codeMatch = normalizeCloakroomText(participant?.ticketCode || '').includes(textQuery);
        return tagMatch || nameMatch || cpfMatch || codeMatch;
      })
      .slice(0, 10);
  }, [cloakroom, cloakroomReturnSearch, participants]);

  const filteredCloakroomHistory = useMemo(() => {
    const query = cloakroomHistorySearch.trim();
    const textQuery = normalizeCloakroomText(query);
    const numberQuery = normalizeCloakroomQuery(query);

    return cloakroom.filter(item => {
      const statusMatch = cloakroomHistoryFilter === 'all' || item.status === cloakroomHistoryFilter;
      const participant = participants.find(p => p.id === item.participantId);
      const searchMatch = !query
        || String(item.tagNumber).includes(query)
        || (item.volumeTags || []).some(tag => tag.includes(query))
        || normalizeCloakroomText(item.participantName).includes(textQuery)
        || (numberQuery.length >= 3 && (participant?.cpf || '').replace(/\D/g, '').includes(numberQuery));
      return statusMatch && searchMatch;
    });
  }, [cloakroom, cloakroomHistoryFilter, cloakroomHistorySearch, participants]);

  const handleOperationalCloakroomSave = async () => {
    if (!selectedEventId) {
      addToast('Selecione um evento ativo', 'error');
      return;
    }
    if (!cloakroomSelectedParticipant) {
      addToast('Localize e selecione um participante antes de guardar os pertences.', 'error');
      return;
    }

    try {
      const saved = await apiCall(`/api/events/${selectedEventId}/cloakroom`, {
        method: 'POST',
        body: JSON.stringify({
          participantId: cloakroomSelectedParticipant.id,
          participantName: cloakroomSelectedParticipant.name,
          itemDescription: cloakroomDescription.trim(),
          volumeCount: cloakroomVolumeCount
        })
      });

      setCloakroom(prev => [saved, ...prev]);
      setCloakroomSuccess(saved);
      setCloakroomSearch('');
      setCloakroomSelectedParticipant(null);
      setCloakroomVolumeCount(1);
      setCloakroomDescription('');
      addToast(`Pertences registrados. Ticket #${saved.tagNumber}`, 'success');
      loadDataForEvent(selectedEventId);
    } catch (err: any) {
      addToast(err.message || 'Erro ao registrar pertences.', 'error');
    }
  };

  const handleSaveCloakroomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      addToast('Selecione um evento ativo', 'error');
      return;
    }
    if (!cloakroomForm.participantName) {
      addToast('Nome do participante é obrigatório', 'error');
      return;
    }

    try {
      const saved = await apiCall(`/api/events/${selectedEventId}/cloakroom`, {
        method: 'POST',
        body: JSON.stringify({ ...cloakroomForm, volumeCount: 1 })
      });

      setCloakroom(prev => [saved, ...prev]);
      addToast(`Item guardado com sucesso! Etiqueta gerada: #${saved.tagNumber}`, 'success');
      setIsCloakroomModalOpen(false);
      setCloakroomForm({ participantId: '', participantName: '', itemDescription: '' });
      loadDataForEvent(selectedEventId);
    } catch (err) {}
  };

  const handleWithdrawCloakroomItem = async (id: string, tagNum: number, skipConfirm = false) => {
    if (!skipConfirm && !window.confirm(`Confirmar devolução do item etiqueta #${tagNum}?`)) return;
    try {
      const updated = await apiCall(`/api/cloakroom/${id}/collect`, { method: 'POST' });
      setCloakroom(prev => prev.map(item => item.id === id ? updated : item));
      setCloakroomReturnSuccess(updated);
      setCloakroomReturnItem(null);
      setCloakroomReturnSearch('');
      addToast(`Etiqueta #${tagNum} devolvida e concluída com sucesso!`, 'success');
      if (selectedEventId) {
        loadDataForEvent(selectedEventId);
      }
    } catch (e) {}
  };

  const handleDeleteCloakroomItem = async (id: string) => {
    if (!window.confirm('Remover definitivamente este registro de chapelaria do histÃ³rico?')) return;
    try {
      await apiCall(`/api/cloakroom/${id}`, { method: 'DELETE' });
      setCloakroom(prev => prev.filter(item => item.id !== id));
      addToast('Registro removido.', 'success');
    } catch (e) {}
  };


  // --- EXCEL (.XLSX/.CSV) IMPORT / PARSE LOGIC WITH PREVIEW & VALIDATION ---
  const validateCPF = (cpf: string): boolean => {
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false; // same digits
    
    // Check digits
    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
    
    return true;
  };

  const processUploadedFile = (file: File) => {
    if (!canCreateParticipants) {
      addToast('UsuÃ¡rio sem permissÃ£o para importar participantes neste evento.', 'error');
      return;
    }
    if (!file || !selectedEventId) return;
    
    setImportFileName(file.name);
    setImportFileIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          addToast('NÃ£o foi possÃ­vel ler o arquivo.', 'error');
          setImportFileIsLoading(false);
          return;
        }
        
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        if (!worksheet) {
          addToast('Nenhuma planilha encontrada no arquivo.', 'error');
          setImportFileIsLoading(false);
          return;
        }

        const rawRows = XLSX.utils.sheet_to_json(worksheet);

        if (rawRows.length === 0) {
          addToast('A planilha enviada estÃ¡ vazia ou sem linhas de dados.', 'error');
          setImportFileIsLoading(false);
          return;
        }

        const seenCPFsInSheet = new Set<string>();

        const validatedList = rawRows.map((row: any, idx) => {
          const keys = Object.keys(row);
          const findValue = (possibleNames: string[]) => {
            const match = keys.find(k => 
              possibleNames.some(pName => k.toLowerCase().trim() === pName.toLowerCase())
            );
            return match !== undefined ? row[match] : undefined;
          };

          const rawNome = findValue(['nome', 'name', 'nome completo', 'nome_completo', 'full name', 'fullname', 'membro']);
          const rawEmail = findValue(['email', 'e-mail', 'mail', 'endereÃ§o de e-mail', 'correio']);
          const rawCpf = findValue(['cpf', 'c.p.f.', 'documento', 'identidade', 'cpf/cnpj']);
          const rawCategory = findValue(['categoria', 'category', 'grupo']);
          const rawCompany = findValue(['empresa', 'company', 'corporaÃ§Ã£o', 'corporacao', 'org', 'organizaÃ§Ã£o', 'organizacao', 'trabalho']);
          const rawProfile = findValue(['perfil', 'tipo', 'type', 'profile', 'accessprofile', 'access_profile']);
          const rawAreas = findValue(['areas', 'acessos', 'area', 'acesso', 'salas', 'sala', 'allowed_areas', 'allowedareas']);

          const nome = rawNome !== undefined ? String(rawNome).trim() : '';
          const email = rawEmail !== undefined ? String(rawEmail).trim() : '';
          const originalCpf = rawCpf !== undefined ? String(rawCpf).trim() : '';
          const cleanCpf = originalCpf.replace(/\D/g, '');
          const category = rawCategory !== undefined ? String(rawCategory).trim() : 'Participante';
          const company = rawCompany !== undefined ? String(rawCompany).trim() : '';
          const profile = rawProfile !== undefined ? String(rawProfile).trim() : '';
          const areasText = rawAreas !== undefined ? String(rawAreas).trim() : '';

          const errors: string[] = [];

          // 1. Validar Nome obritatÃ³rio
          if (!nome) {
            errors.push('Nome Ã© obrigatÃ³rio');
          }

          // 2. Validar CPF e formato vÃ¡lido (apenas se fornecido)
          if (originalCpf) {
            if (!validateCPF(cleanCpf)) {
              errors.push('CPF invÃ¡lido');
            } else {
              // 3. Validar duplicidade dentro do prÃ³prio arquivo importado
              if (seenCPFsInSheet.has(cleanCpf)) {
                errors.push(`CPF duplicado na planilha`);
              } else {
                seenCPFsInSheet.add(cleanCpf);
              }

              // 4. Validar se CPF jÃ¡ estÃ¡ cadastrado no sistema para este evento
              const isResident = participants.some(p => p.cpf.replace(/\D/g, '') === cleanCpf);
              if (isResident) {
                errors.push('CPF jÃ¡ cadastrado neste evento');
              }
            }
          }
          let resolvedAreaIds: string[] = [];
          let resolvedAreaNames: string[] = [];

          // 5. Validar se perfil/tipo existe no banco (caso usado)
          if (profile) {
            const matchedProfile = accessProfiles.find(ap => ap.name.toLowerCase() === profile.toLowerCase());
            if (!matchedProfile) {
              errors.push(`Perfil de acesso "${profile}" nÃ£o encontrado no sistema`);
            } else {
              const profileAreaIds = Array.isArray(matchedProfile.area_ids) ? matchedProfile.area_ids : [];
              resolvedAreaIds = [...new Set([...resolvedAreaIds, ...profileAreaIds])];
              const profileAreaNames = profileAreaIds
                .map(areaId => availableAreas.find(area => area.id === areaId)?.name)
                .filter(Boolean) as string[];
              resolvedAreaNames = [...new Set([...resolvedAreaNames, ...profileAreaNames])];
            }
          }

          // 6. Validar se as areas existem (caso usadas)
          if (areasText) {
            const parsedItems = areasText.split(/[;,]+/).map(s => s.trim()).filter(Boolean);
            parsedItems.forEach(item => {
              const matchedArea = availableAreas.find(a => 
                a.id.toLowerCase() === item.toLowerCase() || 
                a.name.toLowerCase() === item.toLowerCase()
              );
              if (!matchedArea) {
                errors.push(`Ãrea "${item}" nÃ£o cadastrada no evento`);
              } else {
                if (!resolvedAreaIds.includes(matchedArea.id)) {
                  resolvedAreaIds.push(matchedArea.id);
                }
                if (!resolvedAreaNames.includes(matchedArea.name)) {
                  resolvedAreaNames.push(matchedArea.name);
                }
              }
            });
          }

          return {
            rowNumber: idx + 1,
            originalData: row,
            nome,
            email,
            cpf: cleanCpf || originalCpf,
            category,
            company,
            profile,
            areasText,
            resolvedAreaIds,
            resolvedAreaNames,
            errors,
            isValid: errors.length === 0
          };
        });

        setImportRows(validatedList);
        setIsImportPreviewModalOpen(true);
      } catch (err) {
        console.error('Error processing sheet:', err);
        addToast('Erro ao interpretar estrutura ou conteÃºdo do arquivo carregado.', 'error');
      } finally {
        setImportFileIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEventId) return;
    processUploadedFile(file);
    e.target.value = '';
  };

  const confirmBatchImport = async () => {
    if (importRows.some(row => !row.isValid)) {
      addToast('Corrija todas as inconsistÃªncias e erros antes de importar os dados.', 'error');
      return;
    }

    if (importRows.length === 0) {
      addToast('Sua planilha nÃ£o possui registros vÃ¡lidos.', 'error');
      return;
    }

    setIsImportingInProgress(true);
    try {
      const payloadRows = importRows.map(row => {
        const item: any = {};
        item['nome'] = row.nome;
        item['email'] = row.email;
        item['cpf'] = row.cpf;
        item['categoria'] = row.category;
        item['empresa'] = row.company;
        
        if (row.profile) {
          item['perfil'] = row.profile;
        }
        if (row.resolvedAreaIds?.length > 0) {
          item['allowedAreaIds'] = row.resolvedAreaIds;
          item['allowedAreas'] = row.resolvedAreaIds;
        } else if (row.areasText) {
          item['acessos'] = row.areasText;
        }
        return item;
      });

      const responseData = await apiCall(`/api/events/${selectedEventId}/participants/batch`, {
        method: 'POST',
        body: JSON.stringify({ participants: payloadRows })
      });

      addToast(
        `Sucesso! Importados: ${responseData.totalImported}, Ignorados por duplicidade: ${responseData.skipped}`,
        responseData.totalImported > 0 ? 'success' : 'info'
      );
      
      setIsImportPreviewModalOpen(false);
      setImportRows([]);
      setImportFileName('');
      loadDataForEvent(selectedEventId);
    } catch (err: any) {
      console.error('Error conducting batch import:', err);
      addToast(err.message || 'Erro durante a gravaÃ§Ã£o dos dados da planilha no bando de dados.', 'error');
    } finally {
      setIsImportingInProgress(false);
    }
  };

  // Generate an instant Template Excel download
  const downloadSampleExcelTemplate = () => {
    const templateData = [
      { Nome: 'JoÃ£o da Silva', Email: 'joao.silva@email.com', CPF: '12345678901', Empresa: 'Tech SoluÃ§Ãµes', Categoria: 'Participante' },
      { Nome: 'Dr. Marcos Souza', Email: 'marcos.s@email.com', CPF: '98765432100', Empresa: 'Universidade Federal', Categoria: 'Palestrante' },
      { Nome: 'Empresa Alpha Ltda', Email: 'contato@alpha.com', CPF: '33344455566', Empresa: 'Alpha Ventures', Categoria: 'Expositor' },
      { Nome: 'Juliana Garcia', Email: 'juliana.g@email.com', CPF: '55566677788', Empresa: 'Inova Digital', Categoria: 'VIP' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Participantes');
    
    // Create direct blob buffer download
    XLSX.writeFile(workbook, 'Modelo_Importacao_CREDENCIA.xlsx');
    addToast('Modelo Excel de importaÃ§Ã£o baixado!', 'success');
  };


  // --- REPORTS EXPORT GENERATORS ---
  const exportParticipantsToExcelWithFilter = (presentOnly: boolean, sourceList?: Participant[], fileLabel?: string) => {
    if (!currentEvent) return;

    const reportSource = sourceList || participants;
    
    const baseList = presentOnly 
      ? reportSource.filter(p => p.checkedIn)
      : reportSource;

    const titleSuffix = fileLabel || (presentOnly ? 'Presentes' : 'Inscritos_Geral');
    
    const outputRows = baseList.map(p => {
      const participantAreaLogs = areaAccessLogs.filter(log => log.participantId === p.id);
      const allowedAreaNames = [...new Set(participantAreaLogs
        .filter(log => log.status === 'ALLOWED')
        .map(log => log.areaName || availableAreas.find(area => area.id === log.areaId)?.name || 'Área'))];
      const deniedCount = participantAreaLogs.filter(log => log.status === 'DENIED').length;

      return {
        Nome: p.name,
        'E-mail': p.email,
        CPF: p.cpf,
        Empresa: p.company || '',
        Categoria: p.category,
        'Credenciado?': p.checkedIn ? 'Sim' : 'Não',
        'Horário do Credenciamento': p.checkedInAt ? new Date(p.checkedInAt).toLocaleString('pt-BR') : 'Não realizado',
        'Acessos por Sala': allowedAreaNames.length > 0 ? allowedAreaNames.join(', ') : '-',
        'Acessos Negados': deniedCount,
        'Operador Responsável': getReportCheckinOperator(p),
        'Código do Convite': p.ticketCode
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(outputRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
    XLSX.writeFile(workbook, `Filtro_${titleSuffix}_${currentEvent.name.replace(/\s+/g, '_')}.xlsx`);
    addToast('Planilha gerada com sucesso!', 'success');
  };

  // Direct CSV printable list
  const triggerPrintableReport = () => {
    window.print();
  };

  // Filtered Participants computed list
  const filteredParticipantsList = useMemo(() => {
    return participants.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.cpf.includes(searchQuery) || 
                          p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.ticketCode.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchCategory = selectedCategoryFilter === 'all' || p.category === selectedCategoryFilter;
      const matchPresence = selectedPresenceFilter === 'all' || 
                            (selectedPresenceFilter === 'present' ? p.checkedIn : !p.checkedIn);

      return matchSearch && matchCategory && matchPresence;
    });
  }, [participants, searchQuery, selectedCategoryFilter, selectedPresenceFilter]);

  const reportParticipants = filteredParticipantsList;

  const reportSummary = useMemo(() => {
    const total = reportParticipants.length;
    const checkedIn = reportParticipants.filter(p => p.checkedIn).length;
    const pending = total - checkedIn;
    const attendanceRate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

    return { total, checkedIn, pending, attendanceRate };
  }, [reportParticipants]);

  const reportCheckinsByHour = useMemo(() => {
    const buckets = reportParticipants
      .filter(p => p.checkedIn && p.checkedInAt)
      .reduce<Record<string, number>>((acc, participant) => {
        const hour = new Date(participant.checkedInAt as string).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        }).slice(0, 2) + 'h';
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {});

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, count]) => ({ label, count }));
  }, [reportParticipants]);

  const reportParticipantsByCategory = useMemo(() => {
    return (Object.keys(CATEGORY_TAGS) as ParticipantCategory[])
      .map(category => ({
        label: category,
        count: reportParticipants.filter(p => p.category === category).length
      }))
      .filter(item => item.count > 0);
  }, [reportParticipants]);

  const reportPresenceBreakdown = useMemo(() => ([
    { label: 'Credenciados', count: reportSummary.checkedIn, color: 'bg-emerald-500' },
    { label: 'Pendentes', count: reportSummary.pending, color: 'bg-amber-400' }
  ]), [reportSummary]);

  const reportCheckinOperatorByParticipant = useMemo(() => {
    const map = new Map<string, string>();
    const checkinLogs = actionLogs
      .filter(log => log.action === 'CHECKIN' && log.participantId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    checkinLogs.forEach(log => {
      if (log.participantId && !map.has(log.participantId)) {
        map.set(log.participantId, log.operatorName || 'Operador');
      }
    });

    return map;
  }, [actionLogs]);

  const getReportCheckinOperator = (participant: Participant) => {
    return reportCheckinOperatorByParticipant.get(participant.id)
      || (participant as any).operatorName
      || (participant as any).checkedInByName
      || (participant as any).checkedInBy
      || '-';
  };

  const reportAreaAccessLogs = useMemo(() => {
    const participantIds = new Set(reportParticipants.map(p => p.id));
    const areaIds = new Set(availableAreas.map(area => area.id));

    return areaAccessLogs.filter(log => {
      const logParticipant = participants.find(p => p.id === log.participantId);
      const matchesParticipant = participantIds.has(log.participantId);
      const matchesArea = areaIds.size === 0 || areaIds.has(log.areaId);
      const matchesEvent = !currentEvent?.id || logParticipant?.eventId === currentEvent.id || matchesParticipant;
      return matchesParticipant && matchesArea && matchesEvent;
    });
  }, [areaAccessLogs, availableAreas, currentEvent, participants, reportParticipants]);

  const reportAreaAccessSummary = useMemo(() => {
    return availableAreas.map(area => {
      const logs = reportAreaAccessLogs.filter(log => log.areaId === area.id);
      const allowed = logs.filter(log => log.status === 'ALLOWED').length;
      const denied = logs.filter(log => log.status === 'DENIED').length;

      return {
        areaId: area.id,
        areaName: area.name,
        allowed,
        denied,
        total: logs.length
      };
    }).filter(item => item.total > 0);
  }, [availableAreas, reportAreaAccessLogs]);

  const reportParticipantAreaAccess = useMemo(() => {
    return reportParticipants.map(participant => {
      const logs = reportAreaAccessLogs.filter(log => log.participantId === participant.id);
      const allowedAreaNames = [...new Set(logs
        .filter(log => log.status === 'ALLOWED')
        .map(log => log.areaName || availableAreas.find(area => area.id === log.areaId)?.name || 'Área'))];
      const deniedCount = logs.filter(log => log.status === 'DENIED').length;

      return {
        participantId: participant.id,
        allowedAreaNames,
        deniedCount,
        total: logs.length,
        lastAccessAt: logs[0]?.timestamp
      };
    });
  }, [availableAreas, reportAreaAccessLogs, reportParticipants]);


  // Clean up initial bootstrap user if missing key items
  const editParticipant = (p: Participant) => {
    setParticipantForm({
      id: p.id,
      name: p.name,
      email: p.email,
      cpf: p.cpf,
      category: p.category,
      company: p.company || '',
      allowedAreaIds: p.allowedAreaIds || p.allowedAreas || [],
      allowedAreas: p.allowedAreas || p.allowedAreaIds || []
    });
    setIsParticipantModalOpen(true);
  };

  const editEvent = (ev: Event) => {
    setEventForm({
      id: ev.id,
      name: ev.name,
      date: ev.date,
      location: ev.location,
      capacity: ev.capacity,
      enableAccessControl: ev.enableAccessControl !== false,
      enableCloakroom: ev.enableCloakroom === true,
      enableScanner: ev.enableScanner !== false
    });
    setIsEventModalOpen(true);
  };

  // --- Layout components Render helpers ---
  if (!token) {
    return (
      <div className="min-h-screen bg-[#f7f7f2] text-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 items-center">
          <section className="hidden lg:block">
            <img src={credenciaLogo} alt="CREDENCIA" className="h-16 w-auto object-contain mb-6" />
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 font-display max-w-xl">
              Credenciamento de eventos sem ruido.
            </h1>
            <p className="mt-4 text-base text-slate-600 max-w-lg leading-relaxed">
              Controle participantes, check-ins, acessos e impressoes em uma operacao clara para a equipe de recepcao.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 max-w-xl">
              <div className="border border-slate-200 bg-white rounded-lg p-4">
                <div className="text-sm font-bold text-slate-950">Check-in</div>
                <div className="text-xs text-slate-500 mt-1">Busca, leitura e presenca.</div>
              </div>
              <div className="border border-slate-200 bg-white rounded-lg p-4">
                <div className="text-sm font-bold text-slate-950">Acesso</div>
                <div className="text-xs text-slate-500 mt-1">Areas, perfis e logs.</div>
              </div>
              <div className="border border-slate-200 bg-white rounded-lg p-4">
                <div className="text-sm font-bold text-slate-950">Relatorios</div>
                <div className="text-xs text-slate-500 mt-1">Exportacao e auditoria.</div>
              </div>
            </div>
          </section>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 sm:p-8">
            <div className="mb-7">
              <img src={credenciaLogo} alt="CREDENCIA" className="h-12 w-auto object-contain mb-5 lg:hidden" />
              <h2 className="text-xl font-bold text-slate-950 font-display">
                {isRegisterMode ? 'Criar acesso' : 'Entrar no sistema'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {isRegisterMode ? 'Cadastre um operador para usar o sistema.' : 'Use seu e-mail e senha para acessar a operacao.'}
              </p>
            </div>

            {loginMethod === 'pin' && !isRegisterMode ? (
              <div className="space-y-5">
                <div className="flex justify-center gap-2 select-none">
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const val = pinInput[idx];
                    const active = pinInput.length === idx;
                    return (
                      <div
                        key={idx}
                        className={`w-10 h-12 rounded-md border flex items-center justify-center font-bold text-xl transition ${
                          active
                            ? 'border-[#1D4ED8] bg-slate-50 text-[#1D4ED8]'
                            : val
                              ? 'border-slate-300 bg-slate-100 text-slate-700'
                              : 'border-slate-200 bg-white text-slate-300'
                        }`}
                      >
                        {authLoading ? <div className="w-2 h-2 rounded-full bg-[#1D4ED8] animate-ping" /> : val ? '*' : ''}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        if (pinInput.length < 6 && !authLoading) {
                          setPinInput(prev => prev + num);
                        }
                      }}
                      className="h-12 bg-white border border-slate-200 rounded-md font-semibold text-slate-900 hover:bg-slate-50 active:scale-98 transition cursor-pointer select-none"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPinInput('')}
                    className="h-12 bg-white border border-slate-200 text-slate-600 rounded-md text-xs font-semibold hover:bg-slate-50 transition cursor-pointer select-none"
                  >
                    Limpar
                  </button>
                  <button
                    key={0}
                    type="button"
                    onClick={() => {
                      if (pinInput.length < 6 && !authLoading) {
                        setPinInput(prev => prev + '0');
                      }
                    }}
                    className="h-12 bg-white border border-slate-200 rounded-md font-semibold text-slate-900 hover:bg-slate-50 active:scale-98 transition cursor-pointer select-none"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => setPinInput(prev => prev.slice(0, -1))}
                    className="h-12 bg-white border border-slate-200 text-slate-600 rounded-md text-xs font-semibold hover:bg-slate-50 transition cursor-pointer select-none"
                  >
                    Apagar
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => { setLoginMethod('email'); setPinInput(''); }}
                  className="w-full py-2.5 text-sm font-semibold text-slate-600 hover:text-[#1D4ED8] transition cursor-pointer"
                >
                  Entrar com e-mail e senha
                </button>
              </div>
            ) : (
              <form onSubmit={isRegisterMode ? handleSignup : handleLogin} className="space-y-4">
                {isRegisterMode && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Nome completo
                      </label>
                      <input
                        type="text"
                        value={registerNameInput}
                        onChange={e => setRegisterNameInput(e.target.value)}
                        placeholder="Nome do operador"
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Organizacao ou empresa
                      </label>
                      <input
                        type="text"
                        value={registerOrgInput}
                        onChange={e => setRegisterOrgInput(e.target.value)}
                        placeholder="Nome da organizacao"
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition placeholder-slate-400"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="email@empresa.com"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Senha
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    placeholder="Senha"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition placeholder-slate-400"
                  />
                </div>

                {isRegisterMode && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Nivel de acesso
                    </label>
                    <select
                      value={registerRoleInput}
                      onChange={e => setRegisterRoleInput(e.target.value as UserRole)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition cursor-pointer"
                    >
                      <option value="admin">Administrador</option>
                      <option value="operator">Operador</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 px-4 bg-[#1D4ED8] hover:bg-[#173FAE] disabled:bg-slate-300 text-white rounded-md text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
                >
                  {authLoading ? (
                    <>
                      <RefreshCw className="animate-spin" size={14} />
                      <span>Entrando...</span>
                    </>
                  ) : (
                    <>
                      <span>{isRegisterMode ? 'Criar acesso' : 'Entrar'}</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            )}

            {!isRegisterMode && loginMethod === 'email' && (
              <button
                type="button"
                onClick={() => { setLoginMethod('pin'); setPinInput(''); }}
                className="mt-4 w-full py-2.5 border border-slate-200 rounded-md text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition"
              >
                Entrar com PIN
              </button>
            )}

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setLoginMethod('email');
                  setEmailInput(isRegisterMode ? 'admin@credencia.com' : '');
                  setPasswordInput(isRegisterMode ? 'admin123' : '');
                }}
                className="text-sm text-[#1D4ED8] hover:text-[#0F172A] font-semibold focus:outline-none transition cursor-pointer select-none"
              >
                {isRegisterMode ? 'Voltar para login' : 'Criar acesso administrativo'}
              </button>
            </div>
          </div>
        </div>

        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`px-4 py-3.5 rounded-md shadow-xl flex items-center gap-3 text-sm font-medium border bg-white animate-slide-in duration-300 ${
                t.type === 'success' ? 'border-emerald-200 text-emerald-900' :
                t.type === 'error' ? 'border-rose-200 text-rose-900' :
                'border-blue-200 text-blue-900'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${t.type === 'success' ? 'bg-emerald-500' : t.type === 'error' ? 'bg-rose-500' : 'bg-blue-500'}`} />
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const roleText = (() => {
    const role = String(currentUser?.role || '').toUpperCase();
    if (role === 'ADMIN' || currentUser?.role === 'admin') return 'Administrador';
    if (role === 'SUPERVISOR') return 'Operador NÃ­vel 1';
    if (role === 'CHECKIN_CADASTRO') return 'Operador NÃ­vel 2';
    if (role === 'CHECKIN' || role === 'ATENDENTE' || role === 'OPERATOR' || currentUser?.role === 'operator') return 'Operador NÃ­vel 3';
    return 'Operador';
  })();

  const eventHasAccessControl = currentEvent?.enableAccessControl !== false;
  const eventHasCloakroom = currentEvent?.enableCloakroom === true;
  const eventHasScanner = currentEvent?.enableScanner !== false;
  const eventUserRoleLabels: Record<EventUserRole, string> = {
    ADMIN: 'Administrador do evento',
    CHECKIN_CADASTRO: 'Check-in + Cadastro',
    CHECKIN: 'Check-in',
    RELATORIO: 'Relatório'
  };

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ElementType }> = [
    ...(isUserAdmin ? [{ id: 'dashboard' as const, label: 'Painel Geral', icon: BarChart3 }] : []),
    ...(isUserAdmin ? [{ id: 'eventos' as const, label: 'Eventos', icon: Calendar }] : []),
    ...(isUserAdmin ? [{ id: 'usuarios' as const, label: 'Operadores', icon: Users }] : []),
    ...(canManageParticipants || isUserAdmin ? [{ id: 'participantes' as const, label: 'Participantes', icon: Users }] : []),
    ...(isUserAdmin ? [{ id: 'campos' as const, label: 'Campos de Cadastro', icon: FileText }] : []),
    { id: 'checkin' as const, label: 'Check-in', icon: QrCode },
    ...(isUserAdmin ? [{ id: 'areas' as const, label: 'Salas e Acessos', icon: ShieldCheck }] : []),
    ...(isUserAdmin ? [{ id: 'scanner' as const, label: 'Scan', icon: Camera }] : []),
    ...(isUserAdmin ? [{ id: 'chapelaria' as const, label: 'Chapelaria', icon: FolderLock }] : []),
    ...(canViewReports ? [{ id: 'relatorios' as const, label: 'Relatórios', icon: Download }] : []),
    ...(isUserAdmin ? [{ id: 'impressao' as const, label: 'Impressão de Etiquetas', icon: Printer }] : []),
  ];

  const secondaryNavItems: Array<{ id: ActiveTab; label: string; icon: React.ElementType }> = [];

  const isMoreActive = secondaryNavItems.some(item => item.id === activeTab);
  const visibleNavIds = navItems.map(item => item.id);
  const visibleNavKey = visibleNavIds.join('|');
  const isStandaloneCheckin = window.location.pathname === '/checkin';

  useEffect(() => {
    if (!currentUser) return;
    const internalTabs: ActiveTab[] = ['evento-dashboard', 'eventos-ativos', 'etiquetas', 'checkin-modular'];
    if (internalTabs.includes(activeTab)) return;
    if (!visibleNavIds.includes(activeTab)) {
      setActiveTab(isUserAdmin ? 'dashboard' : 'checkin');
    }
  }, [currentUser, activeTab, isUserAdmin, visibleNavKey]);

  return (
    <div className={`min-h-screen text-slate-900 flex flex-col overflow-hidden ${isDarkTheme ? 'theme-dark bg-[#0B1120]' : 'bg-[#f7f7f2]'}`}>
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 no-print">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-md shadow-lg flex items-center gap-3 text-sm font-medium border bg-white select-none ${
              t.type === 'success' ? 'border-emerald-200 text-emerald-900' :
              t.type === 'error' ? 'border-rose-200 text-rose-900' :
              'border-blue-200 text-blue-900'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${
              t.type === 'success' ? 'bg-emerald-500' :
              t.type === 'error' ? 'bg-rose-500' :
              'bg-blue-500'
            }`} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      <header className={`${isStandaloneCheckin ? 'hidden' : 'bg-white border-b border-slate-200 no-print shrink-0'}`}>
        <div className="px-5 lg:px-8 py-4 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={() => isUserAdmin ? setActiveTab('dashboard') : setActiveTab('checkin')}
                className="flex items-center gap-2 shrink-0 cursor-pointer"
                title="Ir para o inicio"
              >
                <div className="text-left">
                  <img src={credenciaLogo} alt="CREDENCIA" className="h-10 w-auto object-contain" />
                </div>
              </button>

            </div>

            <div className="flex items-center justify-between lg:justify-end gap-3">
              {isUserAdmin && (
                <button
                  onClick={() => {
                    setEventForm({ id: '', name: '', date: '', location: '', capacity: 200, enableAccessControl: true, enableCloakroom: false, enableScanner: true });
                    setIsEventModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-[#1D4ED8] hover:bg-[#173FAE] text-white rounded-md transition cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Novo evento</span>
                </button>
              )}

              <button
                onClick={() => setIsDarkTheme(prev => !prev)}
                className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title={isDarkTheme ? 'Usar tema claro' : 'Usar tema escuro'}
              >
                {isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <button
                onClick={() => {
                  setProfileForm({
                    name: currentUser?.name || '',
                    email: currentUser?.email || '',
                    password: ''
                  });
                  setIsProfileModalOpen(true);
                }}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                  {currentUser?.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-900 leading-none max-w-[150px] truncate">{currentUser?.name}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{roleText}</div>
                </div>
              </button>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer text-sm font-semibold"
                title="Sair"
              >
                <LogOut size={15} />
                <span>Sair</span>
              </button>
            </div>
          </div>

          <nav className="relative flex flex-wrap gap-1 pb-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setIsMoreMenuOpen(false);
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-[#0F172A] text-white'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {secondaryNavItems.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setIsMoreMenuOpen(prev => !prev)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
                    isMoreActive || isMoreMenuOpen
                      ? 'bg-[#0F172A] text-white'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                >
                  <MoreHorizontal size={15} />
                  <span>Mais</span>
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute left-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl p-1.5 z-50">
                    {secondaryNavItems.map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id as any);
                            setIsMoreMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold text-left transition cursor-pointer ${
                            isActive
                              ? 'bg-slate-950 text-white'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                          }`}
                        >
                          <Icon size={15} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-8 border-t border-slate-100 pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 font-display">VÃ­nculos por Evento</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Defina quais usuÃ¡rios participam de cada evento e qual permissÃ£o terÃ£o naquele evento.
                      </p>
                    </div>

                    <form onSubmit={handleSaveEventUser} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 w-full lg:max-w-4xl">
                      <select
                        value={eventUserForm.eventId}
                        onChange={e => {
                          const eventId = e.target.value;
                          setEventUserForm(prev => ({ ...prev, eventId }));
                          loadEventUsers(eventId);
                        }}
                        className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="">Selecione o evento</option>
                        {events.map(event => (
                          <option key={event.id} value={event.id}>{event.name}</option>
                        ))}
                      </select>

                      <select
                        value={eventUserForm.userId}
                        onChange={e => setEventUserForm(prev => ({ ...prev, userId: e.target.value }))}
                        className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="">Selecione o usuÃ¡rio</option>
                        {usersList.map(user => (
                          <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                      </select>

                      <select
                        value={eventUserForm.role}
                        onChange={e => setEventUserForm(prev => ({ ...prev, role: e.target.value as EventUserRole }))}
                        className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        {(Object.keys(eventUserRoleLabels) as EventUserRole[]).map(role => (
                          <option key={role} value={role}>{eventUserRoleLabels[role]}</option>
                        ))}
                      </select>

                      <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={eventUserForm.active}
                          onChange={e => setEventUserForm(prev => ({ ...prev, active: e.target.checked }))}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-100"
                        />
                        <span>Ativo</span>
                      </label>

                      <button
                        type="submit"
                        className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Vincular
                      </button>
                    </form>
                  </div>

                  <div className="mt-4 overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">UsuÃ¡rio</th>
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">PermissÃ£o no Evento</th>
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eventUserForm.eventId && eventUsers.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-xs font-semibold text-slate-400">
                              Nenhum usuÃ¡rio vinculado a este evento.
                            </td>
                          </tr>
                        ) : !eventUserForm.eventId ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-xs font-semibold text-slate-400">
                              Selecione um evento para visualizar os vÃ­nculos.
                            </td>
                          </tr>
                        ) : (
                          eventUsers.map(link => {
                            const linkedUser = usersList.find(user => user.id === link.userId);
                            return (
                              <tr key={link.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="p-3 text-sm font-semibold text-slate-800">
                                  {linkedUser?.name || 'UsuÃ¡rio removido'}
                                </td>
                                <td className="p-3 text-xs text-slate-600">
                                  {eventUserRoleLabels[link.role] || link.role}
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                    link.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {link.active ? 'Ativo' : 'Inativo'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleEventUser(link)}
                                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer"
                                    >
                                      {link.active ? 'Desativar' : 'Ativar'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteEventUser(link)}
                                      className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-600 border border-rose-200 transition cursor-pointer"
                                      title="Remover vÃ­nculo"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-print">
        {/* DETECT AN EMPTY EVENT STATE */}
        {events.length === 0 ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center bg-[#f7f7f2]">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
              <Calendar size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 font-display mb-2">Primeiro Acesso: Crie seu Primeiro Evento</h2>
            <p className="text-slate-500 max-w-md mb-6">
              Para liberar o dashboard de monitoramento em tempo real, credenciamento via QR Code e chapelaria, inicie configurando as informaÃ§Ãµes do seu evento.
            </p>
            <button
              onClick={() => {
                setEventForm({ id: '', name: '', date: '', location: '', capacity: 200, enableAccessControl: true, enableCloakroom: false, enableScanner: true });
                setIsEventModalOpen(true);
              }}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/10 transition"
            >
              Criar Evento Agora
            </button>
          </div>
        ) : loadingMain ? (
          <div className="flex-grow flex flex-col items-center justify-center gap-3 bg-[#f7f7f2]">
            <RefreshCw className="animate-spin text-blue-500" size={32} />
            <p className="text-slate-500 font-medium text-sm">Carregando painel em tempo real...</p>
          </div>
        ) : (
          <div className={`flex-1 overflow-y-auto ${activeTab === 'checkin' ? (isStandaloneCheckin ? 'p-0 bg-white' : 'p-0 bg-white') : 'p-8 bg-[#f7f7f2]'}`}>
            
            {/* --- TAB 1: DASHBOARD --- */}
            {activeTab === 'dashboard' && (
              <Dashboard
                currentUser={currentUser}
                selectedEventId={selectedEventId}
                onSelectEvent={(eventId) => {
                  persistSelectedEvent(eventId);
                }}
                onNavigate={(tab) => setActiveTab(tab)}
                onLogout={handleLogout}
                token={token}
              />
            )}

            {activeTab === 'evento-dashboard' && currentEvent && (
              <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Evento em operação</p>
                    <h1 className="text-2xl font-bold text-slate-950 font-display mt-1">{currentEvent.name}</h1>
                    <p className="text-sm text-slate-500 mt-2 max-w-2xl">
                      Painel limpo para acompanhar e operar somente os recursos habilitados neste evento.
                    </p>
                  </div>
                  {isUserAdmin && (
                    <button
                      onClick={() => editEvent(currentEvent)}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition cursor-pointer"
                    >
                      <Settings size={15} />
                      <span>Configurar evento</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatsCard
                    title="Inscritos"
                    value={stats?.totalRegistered ?? participants.length}
                    iconName="Users"
                    description={`Capacidade: ${currentEvent.capacity}`}
                    trend={{ text: 'Participantes', type: 'info' }}
                    colorTheme="emerald"
                    onClick={() => setActiveTab('participantes')}
                  />
                  <StatsCard
                    title="Check-ins"
                    value={stats?.totalCheckedIn ?? participants.filter(p => p.checkedIn).length}
                    iconName="UserCheck"
                    description={`${stats?.totalWaiting ?? participants.filter(p => !p.checkedIn).length} pendentes`}
                    trend={{ text: 'Operação', type: 'success' }}
                    colorTheme="blue"
                    onClick={() => setActiveTab('checkin')}
                  />
                  <StatsCard
                    title="Salas"
                    value={eventHasAccessControl ? availableAreas.length : 'Inativo'}
                    iconName="ShieldCheck"
                    description={eventHasAccessControl ? 'Áreas configuradas' : 'Módulo desligado'}
                    trend={{ text: eventHasAccessControl ? 'Acessos' : 'Opcional', type: eventHasAccessControl ? 'success' : 'warning' }}
                    colorTheme="purple"
                    onClick={eventHasAccessControl ? () => setActiveTab('areas') : undefined}
                  />
                  <StatsCard
                    title="Chapelaria"
                    value={eventHasCloakroom ? cloakroom.filter(c => c.status === 'guardado').length : 'Inativo'}
                    iconName="FolderLock"
                    description={eventHasCloakroom ? 'Itens guardados agora' : 'Módulo desligado'}
                    trend={{ text: eventHasCloakroom ? 'Ativa' : 'Opcional', type: eventHasCloakroom ? 'success' : 'warning' }}
                    colorTheme="amber"
                    onClick={eventHasCloakroom ? () => setActiveTab('chapelaria') : undefined}
                  />
                </div>

                <div className="bg-white rounded-lg border border-slate-200 p-5">
                  <h2 className="text-sm font-bold text-slate-950 mb-4">Fluxo do evento</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button onClick={() => setActiveTab('participantes')} className="text-left p-4 rounded-lg border border-slate-200 hover:border-slate-400 bg-white transition cursor-pointer">
                      <Users size={18} className="text-slate-500 mb-2" />
                      <div className="font-bold text-slate-900 text-sm">Participantes</div>
                      <div className="text-xs text-slate-500 mt-1">Cadastro, importação e credenciais.</div>
                    </button>
                    <button onClick={() => setActiveTab('checkin')} className="text-left p-4 rounded-lg border border-slate-200 hover:border-slate-400 bg-white transition cursor-pointer">
                      <QrCode size={18} className="text-slate-500 mb-2" />
                      <div className="font-bold text-slate-900 text-sm">Check-in</div>
                      <div className="text-xs text-slate-500 mt-1">Busca rápida e entrada do participante.</div>
                    </button>
                    {eventHasAccessControl && (
                      <button onClick={() => setActiveTab('areas')} className="text-left p-4 rounded-lg border border-slate-200 hover:border-slate-400 bg-white transition cursor-pointer">
                        <ShieldCheck size={18} className="text-slate-500 mb-2" />
                        <div className="font-bold text-slate-900 text-sm">Salas e acessos</div>
                        <div className="text-xs text-slate-500 mt-1">Setores, perfis e validação por área.</div>
                      </button>
                    )}
                    {eventHasCloakroom && (
                      <button onClick={() => setActiveTab('chapelaria')} className="text-left p-4 rounded-lg border border-slate-200 hover:border-slate-400 bg-white transition cursor-pointer">
                        <FolderLock size={18} className="text-slate-500 mb-2" />
                        <div className="font-bold text-slate-900 text-sm">Chapelaria</div>
                        <div className="text-xs text-slate-500 mt-1">Entrada e retirada de pertences.</div>
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'eventos-ativos' && (
              <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Eventos ativos</p>
                    <h1 className="text-2xl font-bold text-slate-950 font-display mt-1">Escolha o evento da operação</h1>
                    <p className="text-sm text-slate-500 mt-2 max-w-2xl">
                      O evento selecionado controla o painel, os participantes, o check-in, o scanner e os acessos.
                    </p>
                  </div>
                  {isUserAdmin && (
                    <button
                      onClick={() => {
                        setEventForm({ id: '', name: '', date: '', location: '', capacity: 200, enableAccessControl: true, enableCloakroom: false, enableScanner: true });
                        setIsEventModalOpen(true);
                      }}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-[#1D4ED8] hover:bg-[#173FAE] text-white text-sm font-semibold transition cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>Novo evento</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {events.map(ev => {
                    const isSelected = ev.id === selectedEventId;
                    const eventParticipants = participants.filter(p => p.eventId === ev.id);
                    const checked = eventParticipants.filter(p => p.checkedIn).length;
                    const hasLoadedStats = isSelected && eventParticipants.length > 0;
                    const percent = hasLoadedStats ? Math.round((checked / eventParticipants.length) * 100) : 0;
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => {
                          persistSelectedEvent(ev.id, ev.currentUserRole);
                          setActiveTab('evento-dashboard');
                          addToast(`Evento ativo: ${ev.name}`, 'success');
                        }}
                        className={`text-left bg-white rounded-lg border p-5 shadow-sm transition cursor-pointer hover:border-slate-400 hover:shadow-md ${
                          isSelected ? 'border-[#1D4ED8] ring-2 ring-[#1D4ED8]/10' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
                              isSelected ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]' : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              {isSelected ? 'Selecionado' : 'Disponivel'}
                            </span>
                            <h2 className="text-base font-bold text-slate-950 mt-3 line-clamp-2">{ev.name}</h2>
                          </div>
                          <Calendar size={18} className={isSelected ? 'text-[#1D4ED8] shrink-0' : 'text-slate-400 shrink-0'} />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Data</p>
                            <p className="font-semibold text-slate-900 mt-1">{ev.date}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Capacidade</p>
                            <p className="font-semibold text-slate-900 mt-1">{ev.capacity}</p>
                          </div>
                        </div>

                        <p className="mt-3 text-sm text-slate-500 truncate">{ev.location}</p>

                        <div className="mt-5">
                          <div className="flex justify-between text-xs font-semibold text-slate-500 mb-2">
                            <span>Check-ins</span>
                            <span>{hasLoadedStats ? `${checked}/${eventParticipants.length} (${percent}%)` : 'Carrega ao selecionar'}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#1D4ED8] rounded-full transition-all" style={{ width: `${percent}%` }} />
                          </div>
                        </div>

                        <div className="mt-5 flex items-center gap-2">
                          <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-slate-950 text-white text-xs font-semibold">
                            Usar este evento
                          </span>
                          {isUserAdmin && (
                            <span
                              onClick={(event) => {
                                event.stopPropagation();
                                editEvent(ev);
                              }}
                              className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                            >
                              Editar
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* --- DISABLED OLD LOGIC TO PRESERVE COMPILATION AND MATCH --- */}
            {false && stats && (
              <div className="space-y-6">
                
                {/* 4 Cards das MÃ©tricas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  
                  <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 flex flex-col gap-2 relative overflow-hidden group">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total de Inscritos</span>
                    <div className="text-3.5xl font-bold text-slate-900 tracking-tight font-display">{stats.totalRegistered}</div>
                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                      <Users size={14} />
                      <span>{stats.capacity} Limite de Capacidade</span>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 flex flex-col gap-2 relative">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Check-ins Realizados</span>
                    <div className="text-3.5xl font-bold text-slate-900 tracking-tight font-display">{stats.totalCheckedIn}</div>
                    <div className="w-full bg-slate-100 h-2 rounded-full mt-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${stats.totalRegistered > 0 ? (stats.totalCheckedIn / stats.totalRegistered) * 105 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-slate-400 mt-1">
                      {stats.totalRegistered > 0 ? Math.round((stats.totalCheckedIn / stats.totalRegistered) * 100) : 0}% concluÃ­do
                    </span>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 flex flex-col gap-2">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Aguardando Credenciamento</span>
                    <div className="text-3.5xl font-bold text-slate-900 tracking-tight font-display">{stats.totalWaiting}</div>
                    <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                      <Clock size={14} className="text-slate-400 shrink-0" />
                      <span>DisponÃ­veis para check-in imediato</span>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 flex flex-col gap-2">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Ativos na Chapelaria</span>
                    <div className="text-3.5xl font-bold text-[#0f172a] tracking-tight font-display">
                      {cloakroom.filter(c => c.status === 'guardado').length}
                    </div>
                    <div className="flex items-center gap-1 text-amber-700 text-xs font-semibold bg-amber-50 rounded px-2 py-0.5 w-fit">
                      <Tag size={12} />
                      <span>{cloakroom.filter(c => c.status === 'retirado').length} entregues hoje</span>
                </div>
                </div>

              </div>

                {/* GrÃ¡fico de HorÃ¡rios e Logs Recentes de Check-in */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Fluxo por HorÃ¡rio (SVG / CSS Custom Bar Chart altamente customizado) */}
                  <div className="lg:col-span-8 bg-white rounded-2xl shadow-xs border border-slate-100 flex flex-col h-[400px]">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                      <div>
                        <h3 className="font-bold text-slate-800 font-display">Fluxo de Entrada de Credenciados</h3>
                        <p className="text-xs text-slate-500">NÃºmero de check-ins registrados por faixa horÃ¡ria ativa</p>
                      </div>
                      <span className="px-3 py-1 bg-white text-blue-600 text-xs font-semibold border border-blue-100 rounded-full">
                        Hoje
                      </span>
                    </div>

                    <div className="flex-1 px-8 py-6 flex items-end justify-between gap-3 overflow-hidden">
                      {stats.hourlyCheckins.map((entry, index) => {
                        const maxCount = Math.max(...stats.hourlyCheckins.map(i => i.count), 1);
                        const percentHeight = (entry.count / maxCount) * 82; // Cap at 82% to fit label nicely
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                            <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition duration-150 bg-slate-900 text-white px-1.5 py-0.5 rounded shadow-md pointer-events-none">
                              {entry.count}
                            </span>
                            <div 
                              className={`w-full rounded-t-md transition-all duration-500 cursor-pointer ${
                                entry.count > 0 ? 'bg-blue-600 hover:bg-blue-500 shadow-xs' : 'bg-slate-100'
                              }`} 
                              style={{ height: `${percentHeight || 4}%` }}
                              title={`Check-ins Ã s ${entry.hour}: ${entry.count}`}
                            />
                            <span className="text-[10px] text-slate-400 font-semibold font-mono whitespace-nowrap">
                              {entry.hour}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ãšltimos Check-ins realizados */}
                  <div className="lg:col-span-4 bg-white rounded-2xl shadow-xs border border-slate-100 flex flex-col h-[400px]">
                    <div className="p-6 border-b border-slate-100 bg-gray-50/50 rounded-t-2xl flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-800 font-display">Ãšltimos Check-ins</h3>
                        <p className="text-xs text-slate-500">TransmissÃ£o em tempo real</p>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>

                    <div className="flex-grow overflow-y-auto p-4 space-y-3">
                      {stats.recentCheckins.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                          <UserCheck className="text-slate-300 mb-2" size={32} />
                          <p className="text-xs text-slate-500 font-medium">Nenhum scan registrado para este evento ainda.</p>
                        </div>
                      ) : (
                        stats.recentCheckins.map(p => (
                          <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-100 transition">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold tracking-tighter text-sm shrink-0">
                              {p.participantName.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{p.participantName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                  p.category === 'VIP' ? 'bg-amber-100 text-amber-800' :
                                  p.category === 'Palestrante' ? 'bg-purple-100 text-purple-800' :
                                  'bg-zinc-100 text-zinc-800'
                                }`}>
                                  {p.category}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(p.checkedInAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              </div>
                            </div>
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
                      <button 
                        onClick={() => setActiveTab('participantes')}
                        className="w-full py-2.5 bg-white border border-slate-250 text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 hover:text-blue-600 rounded-xl transition duration-150 shadow-xs cursor-pointer"
                      >
                        Ver Lista Completa
                      </button>
                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* --- TAB 2: INFORMAÃ‡Ã•ES DOS EVENTOS --- */}
            {activeTab === 'eventos' && (
              <EventsPage
                events={events}
                setEvents={setEvents}
                selectedEventId={selectedEventId}
                onSelectEvent={(eventId) => {
                  persistSelectedEvent(eventId);
                  setActiveTab('evento-dashboard');
                }}
                currentUser={currentUser}
                apiCall={apiCall}
                addToast={addToast}
              />
            )}

            {/* --- TAB 3: PARTICIPANTES --- */}
            {activeTab === 'participantes' && (
              <div 
                className="space-y-6 relative"
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    processUploadedFile(file);
                  }
                }}
              >
                {/* Visual Drag Over Overlay */}
                {isDragOver && (
                  <div className="absolute inset-0 bg-slate-100/90 backdrop-blur-xs border-3 border-dashed border-emerald-505 z-50 flex flex-col items-center justify-center p-8 text-center rounded-2xl animate-pulse">
                    <div className="p-4 bg-emerald-100 rounded-full text-emerald-600 mb-4 shadow-md">
                      <Upload size={40} className="animate-bounce" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Pronto para ValidaÃ§Ã£o!</h3>
                    <p className="text-sm text-slate-500 max-w-sm mt-1">
                      Solte seu arquivo <strong className="text-emerald-700">.xlsx, .xls ou .csv</strong> aqui para processar o preview e a validaÃ§Ã£o em tempo real.
                    </p>
                  </div>
                )}
                
                {/* CabeÃ§alho Ativo */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 font-display">Lista de Participantes</h2>
                    <p className="text-sm text-slate-500">
                      Evento selecionado: <span className="font-semibold text-slate-700">{currentEvent?.name}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* BotÃ£o Baixar Modelo */}
                    <button
                      onClick={downloadSampleExcelTemplate}
                      className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-sm transition cursor-pointer font-medium"
                      title="Baixar planilha modelo recomendada"
                    >
                      <Download size={15} />
                      <span className="hidden sm:inline">Modelo Excel</span>
                    </button>

                    {canCreateParticipants && (
                      <label className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold transition cursor-pointer">
                        <Upload size={15} />
                        <span>Importar Excel / CSV</span>
                        <input
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          onChange={handleExcelUpload}
                          className="hidden"
                        />
                      </label>
                    )}

                    {/* Novo participante manual */}
                    {canCreateParticipants && (
                      <button
                        onClick={() => {
                          setParticipantForm({ id: '', name: '', email: '', cpf: '', category: 'Participante', company: '', allowedAreaIds: [], allowedAreas: [] });
                          setIsParticipantModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
                      >
                        <Plus size={16} />
                        <span>Adicionar</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filtros e Barra de Pesquisa */}
                <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                  {/* Barra de Busca Geral */}
                  <div className="relative w-full md:w-80">
                    <input
                      type="text"
                      placeholder="Pesquisar por nome, CPF ou e-mail..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-100 hover:bg-slate-100/70 border-none rounded-xl text-sm text-slate-705 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400 placeholder:text-xs"
                    />
                    <Search size={16} className="text-slate-400 absolute left-3 top-2.5" />
                  </div>

                  {/* Filtro Dropdown */}
                  <div className="flex items-center gap-3 w-full md:w-auto self-end md:self-auto">
                    
                    <select
                      value={selectedCategoryFilter}
                      onChange={e => setSelectedCategoryFilter(e.target.value)}
                      className="text-xs bg-slate-100 border-none rounded-xl px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-full md:w-auto"
                    >
                      <option value="all">Filtro: Todos as Categorias</option>
                      <option value="VIP">VIP</option>
                      <option value="Palestrante">Palestrante</option>
                      <option value="Expositor">Expositor</option>
                      <option value="Participante">Participante</option>
                      <option value="Staff">Staff</option>
                    </select>

                    <select
                      value={selectedPresenceFilter}
                      onChange={e => setSelectedPresenceFilter(e.target.value as any)}
                      className="text-xs bg-slate-100 border-none rounded-xl px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-full md:w-auto"
                    >
                      <option value="all">Presença: Todos</option>
                      <option value="present">Credenciado / Presente</option>
                      <option value="absent">Aguardando / Ausente</option>
                    </select>

                  </div>
                </div>

                {/* Tabela dos Participantes */}
                <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Participante</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Identidade / CPF</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Empresa</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Categoria</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status Presença</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center no-print">Ações e Credencial</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredParticipantsList.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-12 text-center text-slate-400">
                              <Info className="mx-auto text-slate-300 mb-2" size={32} />
                              <p className="font-semibold text-slate-500">Nenhum participante localizado.</p>
                              <p className="text-xs mt-1">Refine o termo buscado ou realize novos cadastros para este evento.</p>
                            </td>
                          </tr>
                        ) : (
                          filteredParticipantsList.map(p => (
                            <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                              
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold select-none text-xs">
                                    {p.name.substring(0,2).toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-slate-800 text-sm leading-tight">{p.name}</h4>
                                    <span className="text-xs font-mono text-slate-500 select-all">{p.email}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="p-4">
                                <p className="text-slate-700 font-mono text-xs select-all">
                                  {p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-slate-400 font-mono select-all">Ref: {p.ticketCode}</span>
                                  <button
                                    onClick={() => setSelectedQrParticipant(p)}
                                    className="p-1 text-slate-600 hover:bg-blue-50 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition cursor-pointer"
                                    title="Visualizar QR Code Individual"
                                  >
                                    <QrCode size={10} />
                                  </button>
                                </div>
                              </td>

                              <td className="p-4">
                                <p className="text-slate-700 text-xs font-medium max-w-[150px] truncate select-all">
                                  {p.company || <span className="text-slate-350 italic">NÃ£o informada</span>}
                                </p>
                              </td>

                              <td className="p-4 align-middle text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_TAGS[p.category].bg}`}>
                                  {p.category}
                                </span>
                              </td>

                              <td className="p-4 align-middle text-center">
                                <div className="flex flex-col items-center justify-center">
                                  {p.checkedIn ? (
                                    <>
                                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 select-none">
                                        <Check size={12} strokeWidth={3} />
                                        <span>Presente</span>
                                      </span>
                                      <span className="text-[9px] text-slate-400 mt-1 select-none font-mono">
                                        Entrou {new Date(p.checkedInAt!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="inline-block text-xs text-slate-500 font-medium px-2.5 py-0.5 rounded-full bg-slate-100 select-none">
                                      Aguardando
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="p-4 align-middle text-center no-print">
                                <div className="flex items-center justify-center gap-2">
                                  
                                  <button
                                    onClick={() => handleToggleCheckin(p)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition duration-200 cursor-pointer select-none ${
                                      p.checkedIn 
                                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' 
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    }`}
                                  >
                                    {p.checkedIn ? 'Desfazer' : 'Dar Presença'}
                                  </button>

                                  <button
                                    onClick={() => setActiveBadgeParticipant(p)}
                                    className="p-1.5 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition"
                                    title="Gerar e Imprimir CrachÃ¡"
                                  >
                                    <Printer size={15} />
                                  </button>

                                  <button
                                    onClick={() => editParticipant(p)}
                                    className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-lg transition"
                                    title="Editar Dados"
                                  >
                                    <Edit size={15} />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteParticipant(p.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition"
                                    title="Remover"
                                  >
                                    <Trash2 size={15} />
                                  </button>

                                </div>
                              </td>

                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* --- TAB 4: CHECK-IN RÃPIDO / SCANNER SIMULATOR --- */}
            {activeTab === 'checkin' && (
              <CheckinPage
                events={events}
                selectedEventId={selectedEventId}
                onSelectEvent={(eventId) => {
                  persistSelectedEvent(eventId);
                }}
                apiCall={apiCall}
                addToast={addToast}
                participants={participants}
                setParticipants={setParticipants}
                currentUser={currentUser}
                canCreateParticipants={canCreateParticipants}
                canConfigureCheckinScreen={isUserAdmin}
                onPrintBadge={(participant) => setActiveBadgeParticipant(participant)}
                onUpdateEvent={(updated) => setEvents(prev => prev.map(ev => ev.id === updated.id ? updated : ev))}
              />
            )}

            {/* --- TAB NEW: WHITE-LABEL MODULAR PORTAL CHECK-IN --- */}
            {activeTab === 'checkin-modular' && (
              <CheckInModular
                events={events}
                selectedEventId={selectedEventId}
                onSelectEvent={(eventId) => {
                  persistSelectedEvent(eventId);
                }}
                apiCall={apiCall}
                addToast={addToast}
                participants={participants}
                setParticipants={setParticipants}
                currentUser={currentUser}
                canCreateParticipants={canCreateParticipants}
                onPrintBadge={(participant) => setActiveBadgeParticipant(participant)}
              />
            )}

            {/* --- TAB 10: ACCESS CONTROL SCAN --- */}
            {activeTab === 'scanner' && (
              <ScanAccessControlPage
                currentEvent={currentEvent}
                currentUser={currentUser}
                apiCall={apiCall}
                addToast={addToast}
              />
            )}

            {/* --- TAB 12: AREA SPECIFIC ACCESS PORTAL CONTROLLER --- */}
            {activeTab === 'areas' && (
              <AreaAccessControl
                currentEvent={currentEvent}
                currentUser={currentUser}
                apiCall={apiCall}
                addToast={addToast}
              />
            )}

            {/* --- TAB 5: CHAPELARIA (CLOAKROOM) --- */}
            {activeTab === 'chapelaria' && (
              <div className="space-y-6">
                
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 font-display">Controle Integrado de Chapelaria</h2>
                    <p className="text-sm text-slate-500">
                      Entrada automatizada de pertences sob etiquetas numÃ©ricas sequenciais. Evento ativo: <b>{currentEvent?.name}</b>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCloakroomForm({ participantId: '', participantName: '', itemDescription: '' });
                      setIsCloakroomModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Guardar Pertence</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-white border border-slate-200 rounded-lg p-1">
                  {[
                    { id: 'store' as const, label: 'Guardar Pertences' },
                    { id: 'return' as const, label: 'Retirar Pertences' },
                    { id: 'history' as const, label: 'Histórico' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setCloakroomTab(tab.id)}
                      className={`px-3 py-2 rounded-md text-xs font-bold transition cursor-pointer ${
                        cloakroomTab === tab.id ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {cloakroomTab === 'store' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-5">
                    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5 shadow-xs">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Passo 1</p>
                        <h3 className="text-lg font-bold text-slate-900 mt-1">Localizar participante</h3>
                        <div className="relative mt-3">
                          <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
                          <input
                            value={cloakroomSearch}
                            onChange={event => {
                              setCloakroomSearch(event.target.value);
                              setCloakroomSelectedParticipant(null);
                              setCloakroomSuccess(null);
                            }}
                            placeholder="Buscar por nome, CPF ou QR Code"
                            className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-lg text-base font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        {!cloakroomSelectedParticipant && cloakroomParticipantResults.length > 0 && (
                          <div className="mt-3 border border-slate-100 rounded-lg overflow-hidden">
                            {cloakroomParticipantResults.map(participant => (
                              <button
                                key={participant.id}
                                onClick={() => {
                                  setCloakroomSelectedParticipant(participant);
                                  setCloakroomSearch(participant.name);
                                }}
                                className="w-full text-left p-3 hover:bg-blue-50 border-b last:border-b-0 border-slate-100 transition cursor-pointer"
                              >
                                <div className="font-bold text-slate-900 text-sm">{participant.name}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{participant.category}{participant.company ? ` • ${participant.company}` : ''} • {participant.ticketCode}</div>
                              </button>
                            ))}
                          </div>
                        )}
                        {cloakroomSelectedParticipant && (
                          <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
                            <div className="font-black text-slate-950">{cloakroomSelectedParticipant.name}</div>
                            <div className="text-sm text-slate-600 mt-1">{cloakroomSelectedParticipant.category}{cloakroomSelectedParticipant.company ? ` • ${cloakroomSelectedParticipant.company}` : ''}</div>
                            <div className="text-xs font-mono text-blue-700 mt-2">Código: {cloakroomSelectedParticipant.ticketCode}</div>
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Passo 2</p>
                        <h3 className="text-lg font-bold text-slate-900 mt-1">Quantidade de volumes</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {[1, 2, 3, 4, 5].map(volume => (
                            <button key={volume} onClick={() => setCloakroomVolumeCount(volume)} className={`px-4 py-3 rounded-lg text-sm font-bold border transition cursor-pointer ${cloakroomVolumeCount === volume ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'}`}>
                              {volume} volume{volume > 1 ? 's' : ''}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Passo 3</p>
                        <h3 className="text-lg font-bold text-slate-900 mt-1">Descrição dos volumes</h3>
                        <textarea value={cloakroomDescription} onChange={event => setCloakroomDescription(event.target.value)} placeholder="Mochila preta, casaco azul, mala de bordo..." rows={3} className="w-full mt-3 px-3 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-slate-950 text-white rounded-lg p-5 shadow-xs">
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-200">Resumo da impressão</p>
                        <div className="mt-4 space-y-3 text-sm">
                          <div className="flex justify-between"><span>Volume(s)</span><b>{cloakroomVolumeCount}</b></div>
                          <div className="flex justify-between"><span>Etiqueta principal</span><b>1</b></div>
                          <div className="flex justify-between"><span>Etiquetas de volume</span><b>{cloakroomVolumeCount}</b></div>
                          <div className="pt-3 border-t border-white/20 flex justify-between text-lg"><span>Total</span><b>{1 + cloakroomVolumeCount}</b></div>
                        </div>
                        <button onClick={handleOperationalCloakroomSave} disabled={!cloakroomSelectedParticipant} className="mt-5 w-full px-4 py-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-500 text-white text-sm font-black transition cursor-pointer disabled:cursor-not-allowed">GUARDAR PERTENCES</button>
                      </div>

                      {cloakroomSuccess && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
                          <div className="flex items-center gap-2 text-emerald-800 font-black"><CheckCircle2 size={20} /><span>Pertences registrados com sucesso</span></div>
                          <div className="mt-4 text-sm text-slate-700">
                            <p>Número: <b className="font-mono text-slate-950">{cloakroomSuccess.tagNumber}</b></p>
                            <p className="mt-2">Volumes:</p>
                            <div className="flex flex-wrap gap-2 mt-2">{(cloakroomSuccess.volumeTags || []).map(tag => <span key={tag} className="px-2.5 py-1 bg-white border border-emerald-200 rounded font-mono text-xs font-bold">{tag}</span>)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {cloakroomTab === 'return' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-5">
                    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                      <h3 className="text-lg font-bold text-slate-900">Retirar pertences</h3>
                      <div className="relative mt-4">
                        <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
                        <input value={cloakroomReturnSearch} onChange={event => { setCloakroomReturnSearch(event.target.value); setCloakroomReturnItem(null); setCloakroomReturnSuccess(null); }} placeholder="Buscar por etiqueta, nome, CPF ou QR Code" className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-lg text-base font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500" />
                      </div>
                      {cloakroomReturnResults.length > 0 && (
                        <div className="mt-3 border border-slate-100 rounded-lg overflow-hidden">
                          {cloakroomReturnResults.map(item => (
                            <button key={item.id} onClick={() => { setCloakroomReturnItem(item); setCloakroomReturnSearch(String(item.tagNumber)); }} className="w-full text-left p-3 hover:bg-amber-50 border-b last:border-b-0 border-slate-100 transition cursor-pointer">
                              <div className="flex items-center justify-between gap-3"><span className="font-mono font-black text-amber-700">#{item.tagNumber}</span><span className="text-xs text-slate-500">{item.volumeCount || 1} volume(s)</span></div>
                              <div className="font-bold text-slate-900 text-sm mt-1">{item.participantName}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{item.itemDescription || 'Sem descrição'}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      {cloakroomReturnItem ? (
                        <div className="bg-white border border-amber-200 rounded-lg p-5 shadow-xs">
                          <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Item localizado</p>
                          <h3 className="text-xl font-black text-slate-950 mt-1">#{cloakroomReturnItem.tagNumber}</h3>
                          <div className="mt-4 space-y-2 text-sm text-slate-700">
                            <p><b>Participante:</b> {cloakroomReturnItem.participantName}</p>
                            <p><b>Volumes:</b> {cloakroomReturnItem.volumeCount || 1}</p>
                            <p><b>Descrição:</b> {cloakroomReturnItem.itemDescription || '-'}</p>
                            <p><b>Entrada:</b> {new Date(cloakroomReturnItem.registeredAt).toLocaleString('pt-BR')}</p>
                            <p><b>Operador entrada:</b> {cloakroomReturnItem.registeredByName || '-'}</p>
                          </div>
                          <button onClick={() => handleWithdrawCloakroomItem(cloakroomReturnItem.id, cloakroomReturnItem.tagNumber, true)} className="mt-5 w-full px-4 py-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-black transition cursor-pointer">ENTREGAR PERTENCES</button>
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400"><FolderLock className="mx-auto mb-3" size={32} /><p className="font-semibold">Busque uma etiqueta para entrega.</p></div>
                      )}
                      {cloakroomReturnSuccess && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 text-emerald-800 font-black flex items-center gap-2"><CheckCircle2 size={20} /><span>Entrega concluída: #{cloakroomReturnSuccess.tagNumber}</span></div>}
                    </div>
                  </div>
                )}

                {cloakroomTab === 'history' && (
                  <>

                <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Histórico da chapelaria</h3>
                    <p className="text-xs text-slate-500">{filteredCloakroomHistory.length} registros encontrados.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select value={cloakroomHistoryFilter} onChange={event => setCloakroomHistoryFilter(event.target.value as any)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                      <option value="all">Todos</option>
                      <option value="guardado">Guardados</option>
                      <option value="retirado">Retirados</option>
                    </select>
                    <input value={cloakroomHistorySearch} onChange={event => setCloakroomHistorySearch(event.target.value)} placeholder="Nome, CPF ou ticket" className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </div>

                {/* Grid de Itens Atuais */}
                <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">NÂº Etiqueta</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">EspecificaÃ§Ã£o do Item</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dono / Participante</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Registro / Entrada</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center no-print">OperaÃ§Ãµes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCloakroomHistory.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-12 text-center text-slate-400">
                              <FolderLock className="mx-auto text-slate-300 mb-2" size={32} />
                              <p className="font-semibold text-slate-500">Chapelaria sem volumes no evento.</p>
                              <p className="text-xs mt-1">Gere novos nÃºmeros sequenciais para pertences de integrantes acima.</p>
                            </td>
                          </tr>
                        ) : (
                          filteredCloakroomHistory.map(item => (
                            <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                              
                              <td className="p-4 text-center align-middle">
                                <span className="inline-flex items-center justify-center font-mono font-bold text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-100">
                                  #{item.tagNumber}
                                </span>
                              </td>

                              <td className="p-4 font-medium text-slate-800 text-sm">
                                {item.itemDescription}
                              </td>

                              <td className="p-4 text-slate-600 text-xs">
                                <p className="font-bold text-slate-850">{item.participantName}</p>
                              </td>

                              <td className="p-4 align-middle text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  item.status === 'guardado' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {item.status === 'guardado' ? 'Com a OrganizaÃ§Ã£o' : 'Retirado / Devolvido'}
                                </span>
                              </td>

                              <td className="p-4 text-center align-middle text-xs font-mono text-slate-400">
                                {new Date(item.registeredAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                {item.returnedAt && (
                                  <div className="text-[10px] text-zinc-500 mt-0.5">
                                    Devolvido: {new Date(item.returnedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </td>

                              <td className="p-4 align-middle text-center no-print">
                                <div className="flex items-center justify-center gap-2">
                                  {item.status === 'guardado' ? (
                                    <button
                                      onClick={() => handleWithdrawCloakroomItem(item.id, item.tagNumber)}
                                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer select-none transition"
                                    >
                                      Dar Baixa / Devolver
                                    </button>
                                  ) : (
                                    <span className="text-slate-400 font-medium text-xs flex items-center gap-1">
                                      <Check size={14} className="text-emerald-500" />
                                      <span>ConcluÃ­do</span>
                                    </span>
                                  )}

                                  {currentUser?.role === 'admin' && (
                                    <button
                                      onClick={() => handleDeleteCloakroomItem(item.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition"
                                      title="Limpar Registro"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>

                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                  </>
                )}

              </div>
            )}

            {/* --- TAB 6: RELATÓRIOS --- */}
            {activeTab === 'relatorios' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      {reportBrandConfig.showLogo && reportBrandConfig.logoUrl && (
                        <img src={reportBrandConfig.logoUrl} alt="Logo do relatório" className="h-12 max-w-[160px] object-contain rounded bg-white border border-slate-100 p-1" />
                      )}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Relatórios</p>
                        <h2 className="text-2xl font-bold text-slate-900 font-display mt-1">Dashboard de credenciamento</h2>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                      Acompanhe presença, categorias e horários do evento atual sem alterar as exportações existentes.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                    <button
                      onClick={() => exportParticipantsToExcelWithFilter(false, reportParticipants, 'Relatorio_Filtrado')}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <Download size={15} />
                      <span>Baixar planilha geral</span>
                    </button>
                    <button
                      onClick={() => exportParticipantsToExcelWithFilter(true, reportParticipants, 'Presentes_Filtrado')}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <CheckCircle2 size={15} />
                      <span>Baixar presentes</span>
                    </button>
                    <button
                      onClick={triggerPrintableReport}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <Printer size={15} />
                      <span>Imprimir relatório</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {[
                    { title: 'Total de participantes', value: reportSummary.total, icon: Users, color: 'bg-blue-50 text-blue-700 border-blue-100' },
                    { title: 'Check-ins realizados', value: reportSummary.checkedIn, icon: UserCheck, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                    { title: 'Participantes pendentes', value: reportSummary.pending, icon: Clock, color: 'bg-amber-50 text-amber-700 border-amber-100' },
                    { title: 'Percentual de presença', value: `${reportSummary.attendanceRate}%`, icon: BarChart3, color: 'bg-violet-50 text-violet-700 border-violet-100' }
                  ].map(card => {
                    const Icon = card.icon;
                    return (
                      <div key={card.title} className={`bg-white border rounded-lg p-5 shadow-xs ${card.color}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider opacity-75">{card.title}</p>
                            <p className="text-3xl font-black text-slate-950 mt-2">{card.value}</p>
                          </div>
                          <div className="w-10 h-10 rounded-lg bg-white/75 flex items-center justify-center shrink-0">
                            <Icon size={20} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Evento atual</label>
                      <select
                        value={selectedEventId}
                        disabled
                        className="w-full px-3 py-3 bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700"
                      >
                        <option>{currentEvent?.name || 'Evento não selecionado'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Categoria</label>
                      <select
                        value={selectedCategoryFilter}
                        onChange={e => setSelectedCategoryFilter(e.target.value)}
                        className="w-full px-3 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">Todas as categorias</option>
                        <option value="VIP">VIP</option>
                        <option value="Palestrante">Palestrante</option>
                        <option value="Expositor">Expositor</option>
                        <option value="Participante">Participante</option>
                        <option value="Staff">Staff</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Status</label>
                      <select
                        value={selectedPresenceFilter}
                        onChange={e => setSelectedPresenceFilter(e.target.value as any)}
                        className="w-full px-3 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">Todos</option>
                        <option value="present">Credenciados</option>
                        <option value="absent">Pendentes</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Busca</label>
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Nome ou CPF"
                          className="w-full pl-9 pr-3 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                        <FileText size={17} className="text-slate-500" />
                        <span>Identidade visual do relatório</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Configure uma logo no topo e uma marca d'água para a versão impressa do relatório.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReportBrandConfig(DEFAULT_REPORT_BRAND_CONFIG)}
                      className="self-start px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      Limpar marca
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={reportBrandConfig.showLogo}
                          onChange={event => setReportBrandConfig(prev => ({ ...prev, showLogo: event.target.checked }))}
                          className="rounded border-slate-300"
                        />
                        Exibir logo no topo
                      </label>
                      <input
                        type="url"
                        value={reportBrandConfig.logoUrl}
                        onChange={event => setReportBrandConfig(prev => ({ ...prev, logoUrl: event.target.value }))}
                        placeholder="URL da logo superior"
                        className="w-full px-3 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {reportBrandConfig.showLogo && reportBrandConfig.logoUrl && (
                        <div className="h-16 border border-slate-100 rounded-lg bg-slate-50 flex items-center justify-center p-2">
                          <img src={reportBrandConfig.logoUrl} alt="Prévia da logo do relatório" className="max-h-full max-w-full object-contain" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={reportBrandConfig.showWatermark}
                          onChange={event => setReportBrandConfig(prev => ({ ...prev, showWatermark: event.target.checked }))}
                          className="rounded border-slate-300"
                        />
                        Exibir marca d'água na impressão
                      </label>
                      <input
                        type="url"
                        value={reportBrandConfig.watermarkUrl}
                        onChange={event => setReportBrandConfig(prev => ({ ...prev, watermarkUrl: event.target.value }))}
                        placeholder="URL da imagem da marca d'água"
                        className="w-full px-3 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          <span>Opacidade</span>
                          <span>{Math.round(reportBrandConfig.watermarkOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.03"
                          max="0.25"
                          step="0.01"
                          value={reportBrandConfig.watermarkOpacity}
                          onChange={event => setReportBrandConfig(prev => ({ ...prev, watermarkOpacity: Number(event.target.value) }))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                  <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-3 mb-5">
                      <h3 className="text-sm font-bold text-slate-900 font-display">Check-ins por horário</h3>
                      <History size={17} className="text-slate-400" />
                    </div>
                    <div className="space-y-3">
                      {reportCheckinsByHour.length === 0 ? (
                        <p className="text-sm text-slate-400 py-8 text-center">Nenhum check-in nos filtros atuais.</p>
                      ) : (
                        reportCheckinsByHour.map(item => {
                          const max = Math.max(...reportCheckinsByHour.map(row => row.count), 1);
                          return (
                            <div key={item.label} className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                                <span>{item.label}</span>
                                <span>{item.count}</span>
                              </div>
                              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.max((item.count / max) * 100, 6)}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-3 mb-5">
                      <h3 className="text-sm font-bold text-slate-900 font-display">Participantes por categoria</h3>
                      <Tag size={17} className="text-slate-400" />
                    </div>
                    <div className="space-y-3">
                      {reportParticipantsByCategory.length === 0 ? (
                        <p className="text-sm text-slate-400 py-8 text-center">Nenhuma categoria encontrada.</p>
                      ) : (
                        reportParticipantsByCategory.map(item => {
                          const max = Math.max(...reportParticipantsByCategory.map(row => row.count), 1);
                          return (
                            <div key={item.label} className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                                <span>{item.label}</span>
                                <span>{item.count}</span>
                              </div>
                              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.max((item.count / max) * 100, 6)}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-3 mb-5">
                      <h3 className="text-sm font-bold text-slate-900 font-display">Presentes x Ausentes</h3>
                      <BarChart3 size={17} className="text-slate-400" />
                    </div>
                    <div className="space-y-4">
                      <div className="h-5 bg-slate-100 rounded-full overflow-hidden flex">
                        {reportPresenceBreakdown.map(item => (
                          <div
                            key={item.label}
                            className={`${item.color} h-full`}
                            style={{ width: `${reportSummary.total > 0 ? (item.count / reportSummary.total) * 100 : 0}%` }}
                          />
                        ))}
                      </div>
                      {reportPresenceBreakdown.map(item => (
                        <div key={item.label} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                            <span className="font-semibold text-slate-700">{item.label}</span>
                          </div>
                          <span className="font-bold text-slate-950">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {currentEvent?.enableAccessControl !== false && (
                  <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                          <ShieldCheck size={17} className="text-slate-500" />
                          <span>Acessos por sala</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Exibe liberações e negações registradas pelo controle de acesso do evento.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold">
                        <span className="inline-flex items-center gap-1.5 text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-500" />Liberados</span>
                        <span className="inline-flex items-center gap-1.5 text-rose-700"><span className="w-2 h-2 rounded-full bg-rose-500" />Negados</span>
                      </div>
                    </div>

                    {reportAreaAccessSummary.length === 0 ? (
                      <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50">
                        <ShieldAlert className="mx-auto text-slate-300 mb-2" size={28} />
                        <p className="text-sm font-semibold text-slate-500">Nenhum acesso por sala registrado nos filtros atuais.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {reportAreaAccessSummary.map(item => {
                          const max = Math.max(...reportAreaAccessSummary.map(row => row.total), 1);
                          return (
                            <div key={item.areaId} className="border border-slate-100 rounded-lg p-4 bg-slate-50/60">
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <span className="font-bold text-slate-800 text-sm">{item.areaName}</span>
                                <span className="text-xs font-black text-slate-500">{item.total} leituras</span>
                              </div>
                              <div className="h-3 bg-white rounded-full overflow-hidden flex border border-slate-100">
                                <div className="h-full bg-emerald-500" style={{ width: `${Math.max((item.allowed / max) * 100, item.allowed > 0 ? 5 : 0)}%` }} />
                                <div className="h-full bg-rose-500" style={{ width: `${Math.max((item.denied / max) * 100, item.denied > 0 ? 5 : 0)}%` }} />
                              </div>
                              <div className="flex items-center justify-between text-xs text-slate-600 mt-2">
                                <span>{item.allowed} liberados</span>
                                <span>{item.denied} negados</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-display">Tabela do relatório</h3>
                      <p className="text-xs text-slate-500">{reportParticipants.length} registros nos filtros atuais.</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1080px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">CPF</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Horário do check-in</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acessos por sala</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Operador responsável</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportParticipants.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-12 text-center text-slate-400">
                              <Info className="mx-auto text-slate-300 mb-2" size={32} />
                              <p className="font-semibold text-slate-500">Nenhum participante nos filtros atuais.</p>
                            </td>
                          </tr>
                        ) : (
                          reportParticipants.map(p => {
                            const areaAccess = reportParticipantAreaAccess.find(item => item.participantId === p.id);
                            return (
                            <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition">
                              <td className="p-4">
                                <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                                <div className="text-xs text-slate-400">{p.email || 'E-mail não informado'}</div>
                              </td>
                              <td className="p-4 font-mono text-xs text-slate-700">{p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</td>
                              <td className="p-4">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${CATEGORY_TAGS[p.category].bg}`}>
                                  {p.category}
                                </span>
                              </td>
                              <td className="p-4">
                                {p.checkedIn ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                                    <Check size={12} strokeWidth={3} />
                                    Credenciado
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                                    <Clock size={12} />
                                    Pendente
                                  </span>
                                )}
                              </td>
                              <td className="p-4 font-mono text-xs text-slate-700">
                                {p.checkedInAt ? new Date(p.checkedInAt).toLocaleString('pt-BR') : '-'}
                              </td>
                              <td className="p-4 text-xs text-slate-600">
                                {areaAccess && areaAccess.total > 0 ? (
                                  <div className="space-y-1">
                                    <div className="font-semibold text-slate-800">
                                      {areaAccess.allowedAreaNames.length > 0 ? areaAccess.allowedAreaNames.join(', ') : 'Sem liberação'}
                                    </div>
                                    {areaAccess.deniedCount > 0 && (
                                      <div className="text-rose-600 font-semibold">{areaAccess.deniedCount} negado(s)</div>
                                    )}
                                  </div>
                                ) : '-'}
                              </td>
                              <td className="p-4 text-xs text-slate-600">
                                {getReportCheckinOperator(p)}
                              </td>
                            </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB 7: CONFIGURAÃ‡ÃƒO DE ETIQUETAS DE CRACHÃ --- */}
            {activeTab === 'impressao' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Impressão de Etiquetas</p>
                  <h2 className="text-xl font-bold text-slate-800 font-display mt-1">Configuração de etiquetas e crachás</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Configure o modelo de impressão, fontes, campos exibidos e layout das credenciais do evento.
                  </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6">
                  <LabelConfigTab
                    participants={participants}
                    currentEvent={currentEvent}
                    addToast={addToast}
                    apiCall={apiCall}
                    onUpdateEvent={(updated) => setEvents(prev => prev.map(ev => ev.id === updated.id ? updated : ev))}
                    onPrintBadge={(participant) => setActiveBadgeParticipant(participant)}
                  />
                </div>
              </div>
            )}

            {false && activeTab === 'etiquetas' && (
              <LabelConfigTab
                participants={participants}
                currentEvent={currentEvent}
                addToast={addToast}
                apiCall={apiCall}
                onUpdateEvent={(updated) => setEvents(prev => prev.map(ev => ev.id === updated.id ? updated : ev))}
                onPrintBadge={(participant) => setActiveBadgeParticipant(participant)}
              />
            )}

            {/* --- TAB 11: CONFIGURAÃ‡ÃƒO DOS CAMPOS DE CADASTRO --- */}
            {activeTab === 'campos' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Campos de Cadastro</p>
                  <h2 className="text-xl font-bold text-slate-800 font-display mt-1">Configuração dos campos de cadastro</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Defina os campos exibidos nos cadastros e formulários rápidos dos participantes.
                  </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6">
                  <FieldsConfig 
                    apiCall={apiCall}
                    addToast={addToast}
                    currentUser={currentUser}
                  />
                </div>
              </div>
            )}

            {/* --- TAB 8: GERENCIAMENTO DE USUÃRIOS DO SISTEMA --- */}
            {activeTab === 'usuarios' && (
              <div className="bg-white rounded-xl shadow-xs border border-slate-205 p-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 font-display">Operadores do Sistema</h2>
                    <p className="text-slate-500 text-xs mt-0.5">Gerencie os logins, senhas e níveis de acesso dos operadores e administradores.</p>
                  </div>
                  <button
                    onClick={() => {
                      setUserForm({
                        id: '',
                        name: '',
                        email: '',
                        password: '',
                        role: 'CHECKIN',
                        eventId: selectedEventId || '',
                        eventRole: 'CHECKIN',
                        eventActive: true
                      });
                      setIsUserModalOpen(true);
                    }}
                    className="self-start px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/10 hover:shadow-blue-500/25 active:scale-[0.98] transition flex items-center gap-2 cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Novo Operador / Admin</span>
                  </button>
                </div>

                {isLoadingUsers ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <RefreshCw className="animate-spin mb-3 text-blue-500" size={32} />
                    <p className="font-medium text-slate-600">Carregando credenciais...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Completo</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail de Login</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Nível de Acesso</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Registro</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-12 text-center text-slate-400">
                              <Info className="mx-auto text-slate-300 mb-2" size={32} />
                              <p className="font-semibold text-slate-500">Nenhum operador listado.</p>
                            </td>
                          </tr>
                        ) : (
                          usersList.map(u => (
                            <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                              <td className="p-4 font-semibold text-slate-800 text-sm">{u.name}</td>
                              <td className="p-4 text-slate-650 text-xs font-mono">{u.email}</td>
                               <td className="p-4 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  String(u.role).toUpperCase() === 'ADMIN' ? 'bg-amber-100 text-amber-800' :
                                  String(u.role).toUpperCase() === 'SUPERVISOR' ? 'bg-purple-100 text-purple-800' :
                                  String(u.role).toUpperCase() === 'CHECKIN_CADASTRO' ? 'bg-emerald-100 text-emerald-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {String(u.role).toUpperCase() === 'ADMIN' ? 'Administrador' :
                                   String(u.role).toUpperCase() === 'SUPERVISOR' ? 'Operador NÃ­vel 1' :
                                   String(u.role).toUpperCase() === 'CHECKIN_CADASTRO' ? 'Operador NÃ­vel 2' :
                                   String(u.role).toUpperCase() === 'CHECKIN' || String(u.role).toUpperCase() === 'ATENDENTE' || u.role === 'operator' ? 'Operador NÃ­vel 3' :
                                   String(u.role)}
                                </span>
                              </td>
                              <td className="p-4 text-center text-slate-400 text-xs">
                                {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      setUserForm({
                                        id: u.id,
                                        name: u.name,
                                        email: u.email,
                                        password: '',
                                        role: u.role,
                                        eventId: '',
                                        eventRole: 'CHECKIN',
                                        eventActive: true
                                      });
                                      setIsUserModalOpen(true);
                                    }}
                                    className="p-1.5 bg-slate-50 hover:bg-slate-150 rounded-lg text-slate-550 border border-slate-200 hover:text-blue-600 transition cursor-pointer"
                                    title="Editar usuÃ¡rio"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u.id)}
                                    disabled={u.id === currentUser?.id}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-600 border border-rose-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                    title="Excluir cÃ³digo de acesso"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </main>

      {showFernandoWelcome && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4 no-print">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-7 text-center animate-fade-in">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#12e000] text-slate-950 flex items-center justify-center mb-4">
              <CheckCircle2 size={24} strokeWidth={3} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Bem-vindo</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950 font-display leading-tight">
              Vamos la, Pastor Fernando!
            </h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Pronto para criarmos o melhor e maior sistema para credenciamento de Brasilia?
            </p>
            <div className="mt-5 rounded-xl border border-slate-200 bg-[#f7f7f2] p-4">
              <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                "Tudo quanto fizerdes, fazei-o de todo o coracao, como para o Senhor e nao para homens."
              </p>
              <p className="mt-2 text-xs font-bold text-slate-500">Colossenses 3:23</p>
            </div>
            <button
              type="button"
              onClick={() => setShowFernandoWelcome(false)}
              className="mt-6 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#12e000] hover:bg-[#0fc800] text-slate-950 text-sm font-bold transition cursor-pointer shadow-sm"
            >
              Vamos nessa!
            </button>
          </div>
        </div>
      )}

      {/* --- PRINT SHADOW LOG: APENAS VISÍVEL DURANTE O PRINT REAL --- */}
      <div className="hidden print:block relative p-8 bg-white text-black min-h-screen overflow-hidden">
        {reportBrandConfig.showWatermark && reportBrandConfig.watermarkUrl && (
          <img
            src={reportBrandConfig.watermarkUrl}
            alt=""
            className="absolute left-1/2 top-1/2 max-w-[70%] max-h-[70%] -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none"
            style={{ opacity: reportBrandConfig.watermarkOpacity }}
          />
        )}

        <div className="relative z-10 border-b-2 border-slate-900 pb-4 mb-5 flex items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold font-display uppercase">Relatório Central de Credenciamento</h1>
            <p className="text-xs text-zinc-650">Evento: {currentEvent?.name} • Data de Impressão: {new Date().toLocaleString('pt-BR')}</p>
          </div>
          {reportBrandConfig.showLogo && reportBrandConfig.logoUrl && (
            <img
              src={reportBrandConfig.logoUrl}
              alt="Logo do relatório"
              className="max-h-16 max-w-[180px] object-contain"
            />
          )}
        </div>

        <div className="relative z-10 grid grid-cols-4 gap-3 mb-6">
          <div className="border border-zinc-300 rounded p-3">
            <p className="text-[10px] uppercase font-bold text-zinc-500">Total</p>
            <p className="text-xl font-black">{reportSummary.total}</p>
          </div>
          <div className="border border-zinc-300 rounded p-3">
            <p className="text-[10px] uppercase font-bold text-zinc-500">Credenciados</p>
            <p className="text-xl font-black">{reportSummary.checkedIn}</p>
          </div>
          <div className="border border-zinc-300 rounded p-3">
            <p className="text-[10px] uppercase font-bold text-zinc-500">Pendentes</p>
            <p className="text-xl font-black">{reportSummary.pending}</p>
          </div>
          <div className="border border-zinc-300 rounded p-3">
            <p className="text-[10px] uppercase font-bold text-zinc-500">Presença</p>
            <p className="text-xl font-black">{reportSummary.attendanceRate}%</p>
          </div>
        </div>

        <table className="relative z-10 w-full text-left text-xs text-slate-950">
          <thead>
            <tr className="border-b border-black">
              <th className="py-2">Nome</th>
              <th className="py-2">CPF</th>
              <th className="py-2">Categoria</th>
              <th className="py-2">Status</th>
              <th className="py-2">Horário do check-in</th>
              <th className="py-2">Acessos por sala</th>
              <th className="py-2 text-right">Operador</th>
            </tr>
          </thead>
          <tbody>
            {reportParticipants.map(p => {
              const areaAccess = reportParticipantAreaAccess.find(item => item.participantId === p.id);
              return (
                <tr key={p.id} className="border-b border-zinc-200">
                  <td className="py-2 font-semibold">{p.name}</td>
                  <td className="py-2 font-mono">{p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</td>
                  <td className="py-2">{p.category}</td>
                  <td className="py-2">{p.checkedIn ? 'CREDENCIADO' : 'PENDENTE'}</td>
                  <td className="py-2 font-mono">{p.checkedInAt ? new Date(p.checkedInAt).toLocaleString('pt-BR') : '-'}</td>
                  <td className="py-2">
                    {areaAccess && areaAccess.total > 0
                      ? `${areaAccess.allowedAreaNames.length > 0 ? areaAccess.allowedAreaNames.join(', ') : 'Sem liberação'}${areaAccess.deniedCount > 0 ? ` (${areaAccess.deniedCount} negado(s))` : ''}`
                      : '-'}
                  </td>
                  <td className="py-2 text-right">{getReportCheckinOperator(p)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>


      {/* --- DIALOG MODALS --- */}
      
      {/* 1. MODELO EVENT MODAL (CRUD EV) */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 font-display mb-4">
              {eventForm.id ? 'Editar InformaÃ§Ãµes do Evento' : 'Cadastrar Novo Evento'}
            </h3>
            
            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">TÃ­tulo do Evento</label>
                <input
                  type="text"
                  required
                  value={eventForm.name}
                  onChange={e => setEventForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Summit Tecnologia Nordeste 2026"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-8 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Data de RealizaÃ§Ã£o</label>
                <input
                  type="date"
                  required
                  value={eventForm.date}
                  onChange={e => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Local / EndereÃ§o</label>
                <input
                  type="text"
                  required
                  value={eventForm.location}
                  onChange={e => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Ex: Av. Beira Mar, 102 - Fortaleza"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Capacidade de Pessoas</label>
                <input
                  type="number"
                  min="5"
                  required
                  value={eventForm.capacity}
                  onChange={e => setEventForm(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase">MÃƒÂ³dulos do evento</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventForm.enableAccessControl}
                      onChange={e => setEventForm(prev => ({ ...prev, enableAccessControl: e.target.checked }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Salas e acessos
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventForm.enableCloakroom}
                      onChange={e => setEventForm(prev => ({ ...prev, enableCloakroom: e.target.checked }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Chapelaria
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventForm.enableScanner}
                      onChange={e => setEventForm(prev => ({ ...prev, enableScanner: e.target.checked }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Scanner QR
                  </label>
                </div>
              </div>
<div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  Salvar Evento
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* 2. PARTICIPANT MODAL */}
      {isParticipantModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 font-display mb-4">
              {participantForm.id ? 'Editar Participante' : 'Adicionar Participante Manual'}
            </h3>
            
            <form onSubmit={handleSaveParticipant} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={participantForm.name}
                  onChange={e => setParticipantForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Mariana Albuquerque de Barros"
                  className="w-full px-3 py-3.2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-88 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={participantForm.email}
                  onChange={e => setParticipantForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="mariana@exemplo.com"
                  className="w-full px-3 py-3.2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">CPF (Opcional - apenas nÃºmeros)</label>
                <input
                  type="text"
                  maxLength={11}
                  value={participantForm.cpf}
                  onChange={e => setParticipantForm(prev => ({ ...prev, cpf: e.target.value.replace(/\D/g, '') }))}
                  placeholder="Ex: 34567890123"
                  className="w-full px-3 py-3.2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Empresa (Opcional)</label>
                <input
                  type="text"
                  value={participantForm.company || ''}
                  onChange={e => setParticipantForm(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Ex: Nome da Empresa ou Ã“rgÃ£o"
                  className="w-full px-3 py-3.2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Categoria de Acesso</label>
                <select
                  value={participantForm.category}
                  onChange={e => setParticipantForm(prev => ({ ...prev, category: e.target.value as ParticipantCategory }))}
                  className="w-full px-3 py-3.2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm lg:mb-4 mb-2"
                >
                  <option value="Participante">Participante Geral</option>
                  <option value="VIP">Convidado VIP</option>
                  <option value="Palestrante">Palestrante</option>
                  <option value="Expositor">Expositor Credenciado</option>
                  <option value="Staff">Membro de Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Ãreas Autorizadas (Controle de Acesso)</label>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {availableAreas.length === 0 ? (
                    <div className="col-span-3 text-xs text-slate-400 py-1.5 text-center">
                      Nenhuma Ã¡rea configurada para este evento.
                    </div>
                  ) : (
                    availableAreas.map(arr => {
                      const isActive = arr.active !== false && arr.isActive !== false && arr.is_active !== false;
                      const selectedAreas = participantForm.allowedAreaIds || participantForm.allowedAreas || [];
                      const checked = selectedAreas.includes(arr.id);
                      return (
                        <label key={arr.id} className={`flex items-center gap-2 cursor-pointer p-1 rounded-sm hover:bg-slate-100 transition text-xs font-medium text-slate-700 ${!isActive ? 'opacity-50' : ''}`} title={!isActive ? 'Ãrea Inativa' : ''}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const current = participantForm.allowedAreaIds || participantForm.allowedAreas || [];
                              const updated = checked
                                ? current.filter(aid => aid !== arr.id)
                                : [...current, arr.id];
                              setParticipantForm(prev => ({ ...prev, allowedAreaIds: updated, allowedAreas: updated }));
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                          <span>{arr.name} {!isActive && '(Inativa)'}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {participantForm.id ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleDeleteParticipant(participantForm.id);
                      setIsParticipantModalOpen(false);
                    }}
                    className="px-3.5 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    title="Remover participante permanentemente"
                  >
                    <Trash2 size={13} />
                    <span>Excluir</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsParticipantModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
                  >
                    Prestar Cadastro
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* 3. CLOAKROOM ITEM MODAL */}
      {isCloakroomModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 font-display mb-4">
              Registrar Entrada na Chapelaria
            </h3>
            
            <form onSubmit={handleSaveCloakroomItem} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nome do ProprietÃ¡rio / Detentor</label>
                <input
                  type="text"
                  required
                  value={cloakroomForm.participantName}
                  onChange={e => setCloakroomForm(prev => ({ ...prev, participantName: e.target.value }))}
                  placeholder="Ex: Roberta Mendes ou NÃºmero do CPF"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-88 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">EspecificaÃ§Ãµes do Pertence</label>
                <textarea
                  required
                  value={cloakroomForm.itemDescription}
                  onChange={e => setCloakroomForm(prev => ({ ...prev, itemDescription: e.target.value }))}
                  placeholder="Ex: Notebook Asus Preto + Sacola Grande da Loja"
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCloakroomModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium transition cursor-pointer"
                >
                  Retroceder
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  Gerar Etiqueta Sequencial
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* 4. IMPRESSÃƒO DE CRACHÃ / CREDENCIAL MODAL OVERLAY */}
      {activeBadgeParticipant && currentEvent && (
        <PrintCredential
          participant={activeBadgeParticipant}
          event={currentEvent}
          onClose={() => setActiveBadgeParticipant(null)}
          autoPrint={true}
        />
      )}

      {/* 6. INDIVIDUAL PARTICIPANT QR CODE DIALOG MODAL */}
      {selectedQrParticipant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 relative overflow-hidden border border-slate-100">
            <button
              onClick={() => setSelectedQrParticipant(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X size={16} />
            </button>
            
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                <QrCode size={24} />
              </div>

              <div>
                <span className="text-[9px] bg-slate-900 text-white font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                  {selectedQrParticipant.category}
                </span>
                <h3 className="text-sm font-extrabold text-slate-800 font-display mt-2 truncate">
                  {selectedQrParticipant.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium truncate font-sans">{selectedQrParticipant.email}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-center">
                <UserQRCode value={selectedQrParticipant.id} size={150} />
              </div>

              <div className="space-y-1 text-left bg-slate-50 p-3 rounded-lg text-[11px] text-slate-600">
                <p>â€¢ <b>CPF:</b> <span className="font-mono">{selectedQrParticipant.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</span></p>
                <p>â€¢ <b>Ticket:</b> <span className="font-mono">{selectedQrParticipant.ticketCode}</span></p>
                <p>â€¢ <b>ID:</b> <span className="font-mono">{selectedQrParticipant.id}</span></p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => {
                    setActiveBadgeParticipant(selectedQrParticipant);
                    setSelectedQrParticipant(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Imprimir CrachÃ¡</span>
                </button>
                <button
                  onClick={() => setSelectedQrParticipant(null)}
                  className="px-4 py-2 bg-slate-105 hover:bg-slate-200 text-slate-750 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MEU PERFIL E ALTERAÃ‡ÃƒO DE SENHA MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800 font-display mb-2 flex items-center gap-2">
              <Settings className="text-blue-500 animate-spin-slow" size={20} />
              <span>Meu Perfil e Credenciais</span>
            </h3>
            <p className="text-slate-500 text-xs mb-4">Atualize suas credenciais e altere sua senha de acesso ao sistema.</p>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {currentUser && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
                    Seu QR Code de Operador
                  </span>
                  <UserQRCode value={currentUser.id} size={110} />
                  <span className="text-[9px] font-mono text-slate-500 select-all">
                    Ref: {currentUser.id}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Seu nome"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">E-mail de Login</label>
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={e => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Seu e-mail"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nova Senha (Deixe em branco para manter)</label>
                <input
                  type="password"
                  value={profileForm.password}
                  onChange={e => setProfileForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  Atualizar Dados
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. GERENCIAMENTO DE OPERADORES/ADMINISTRADORES MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 font-display mb-1">
              {userForm.id ? 'Editar Dados do Operador' : 'Adicionar Novo Operador'}
            </h3>
            <p className="text-slate-500 text-xs mb-4">
              {userForm.id ? 'Modifique os dados ou redefina a senha do operador.' : 'Cadastre um novo login e senha segura de acesso.'}
            </p>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={e => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do operador"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">E-mail de Acesso</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  {userForm.id ? 'Nova Senha (deixe em branco para manter)' : 'Senha de Login'}
                </label>
                <input
                  type="password"
                  required={!userForm.id}
                  value={userForm.password}
                  onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">NÃ­vel de Acesso</label>
                <select
                  value={userForm.role}
                  onChange={e => setUserForm(prev => ({ ...prev, role: e.target.value as UserRole }))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
                >
                  <option value="ADMIN">Administrador - Acesso total</option>
                  <option value="SUPERVISOR">Operador NÃ­vel 1 - Check-in, cadastro e relatÃ³rios</option>
                  <option value="CHECKIN_CADASTRO">Operador NÃ­vel 2 - Check-in e cadastro</option>
                  <option value="CHECKIN">Operador NÃ­vel 3 - Apenas check-in</option>
                </select>
              </div>

              
              {!userForm.id && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Vincular ao Evento</label>
                    <select
                      value={userForm.eventId}
                      onChange={e => setUserForm(prev => ({ ...prev, eventId: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">Criar sem vínculo agora</option>
                      {events.map(event => (
                        <option key={event.id} value={event.id}>{event.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Permissão no Evento</label>
                    <select
                      value={userForm.eventRole}
                      onChange={e => setUserForm(prev => ({ ...prev, eventRole: e.target.value as EventUserRole }))}
                      disabled={!userForm.eventId}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {(Object.keys(eventUserRoleLabels) as EventUserRole[]).map(role => (
                        <option key={role} value={role}>{eventUserRoleLabels[role]}</option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={userForm.eventActive}
                      onChange={e => setUserForm(prev => ({ ...prev, eventActive: e.target.checked }))}
                      disabled={!userForm.eventId}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                    Vínculo ativo neste evento
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">


                <button


                  type="button"


                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  Salvar Operador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. IMPORT PREVIEW & VALIDATION MODAL */}
      {isImportPreviewModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in animate-duration-200">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 font-display flex items-center gap-2">
                  <FileText className="text-emerald-600" size={22} />
                  <span>Importar Participantes (Preview & ValidaÃ§Ã£o)</span>
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Arquivo carregado: <strong className="text-slate-700">{importFileName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportPreviewModalOpen(false);
                  setImportRows([]);
                  setImportFileName('');
                }}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Resume Banner */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-xs">
                <span className="text-xs text-slate-400 font-medium block">Total de Linhas</span>
                <span className="text-xl font-bold text-slate-800">{importRows.length}</span>
              </div>
              
              <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-600/70 font-medium block">VÃ¡lidas para ImportaÃ§Ã£o</span>
                  <span className="text-xl font-bold text-emerald-600">
                    {importRows.filter(r => r.isValid).length}
                  </span>
                </div>
                <CheckCircle2 className="text-emerald-500" size={24} />
              </div>

              <div className="bg-white p-3 rounded-xl border border-rose-100 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs text-rose-600/70 font-medium block">Linhas com Erros</span>
                  <span className="text-xl font-bold text-rose-600">
                    {importRows.filter(r => !r.isValid).length}
                  </span>
                </div>
                <XCircle className="text-rose-500" size={24} />
              </div>

              <div className="flex items-center">
                {importRows.some(r => !r.isValid) ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-xl text-xs flex gap-2 w-full">
                    <AlertTriangle className="text-amber-500 shrink-0" size={16} />
                    <span>
                      <strong>CorreÃ§Ã£o necessÃ¡ria</strong>: Existem erros na planilha. Corrija o arquivo e tente novamente.
                    </span>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs flex gap-2 w-full">
                    <Sparkles className="text-emerald-500 shrink-0" size={16} />
                    <span>
                      <strong>Tudo limpo!</strong> Todos os participantes sÃ£o vÃ¡lidos e prontos para admissÃ£o.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Body: Scrollable Table */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="max-h-[45vh] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">Nome</th>
                        <th className="py-3 px-4">CPF</th>
                        <th className="py-3 px-4">Tipo/Perfil</th>
                        <th className="py-3 px-4">Ãreas</th>
                        <th className="py-3 px-4">Status & DiagnÃ³stico</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importRows.map((row) => {
                        const rowBgClass = row.isValid 
                          ? 'bg-emerald-50/20 hover:bg-emerald-50/45 text-slate-800 transition' 
                          : 'bg-rose-50/20 hover:bg-rose-50/45 text-slate-800 transition';
                        
                        return (
                          <tr key={row.rowNumber} className={rowBgClass}>
                            <td className="py-3 px-4 text-center font-mono text-xs text-slate-400">
                              {row.rowNumber}
                            </td>
                            
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              {row.nome || <span className="text-rose-400 italic font-normal">Ausente</span>}
                            </td>
                            
                            <td className="py-3 px-4 font-mono text-xs text-slate-700">
                              {row.cpf ? (
                                row.cpf.length === 11 
                                  ? row.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
                                  : row.cpf
                              ) : (
                                <span className="text-rose-400 italic">Ausente</span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {row.profile ? (
                                <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                  {row.profile}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs italic">Nenhum</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-xs">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {row.resolvedAreaNames?.length > 0 ? (
                                  row.resolvedAreaNames.map((a: string, i: number) => (
                                    <span key={i} className="inline-block px-1.5 py-0.5 rounded text-xxs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                      {a}
                                    </span>
                                  ))
                                ) : row.areasText ? (
                                  <span className="text-rose-500 font-medium">{row.areasText} (InvÃ¡lida)</span>
                                ) : (
                                  <span className="text-slate-400 italic">PadrÃ£o</span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              {row.isValid ? (
                                <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                                  <Check className="text-emerald-500" size={14} />
                                  <span>VÃ¡lido</span>
                                </div>
                              ) : (
                                <div className="space-y-0.5 text-xs">
                                  {row.errors.map((err: string, i: number) => (
                                    <div key={i} className="flex items-center gap-1.5 text-rose-600 font-semibold">
                                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0"></span>
                                      <span>{err}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Instant Re-upload zone inside the modal footer */}
              <div className="mt-4 p-4 border border-slate-200 border-dashed rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50">
                <div className="text-xs text-slate-500">
                  Quer substituir a planilha atual? Arraste outro arquivo aqui ou faÃ§a o upload manual.
                </div>
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-705 hover:bg-slate-50 hover:text-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition">
                  <Upload size={14} />
                  <span>Enviar outra planilha</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleExcelUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsImportPreviewModalOpen(false);
                  setImportRows([]);
                  setImportFileName('');
                }}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              
              <button
                type="button"
                disabled={importRows.some(row => !row.isValid) || importRows.length === 0 || isImportingInProgress}
                onClick={confirmBatchImport}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-sm ${
                  importRows.some(row => !row.isValid) || importRows.length === 0 || isImportingInProgress
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-550/10 cursor-pointer'
                }`}
              >
                {isImportingInProgress ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    <span>Processando ImportaÃ§Ã£o...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Confirmar ImportaÃ§Ã£o de {importRows.length} Linhas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
