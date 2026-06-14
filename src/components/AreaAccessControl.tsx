import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, ShieldCheck, ShieldAlert, CheckCircle2, 
  X, RefreshCw, User, Clock, Fingerprint, Calendar,
  Edit2, Trash2, Plus, ToggleLeft, ToggleRight, Check, AlertTriangle
} from 'lucide-react';
import { Event, User as SystemUser, Area, AreaAccessLog, AccessProfile } from '../types';

interface AreaAccessControlProps {
  currentEvent: Event | null;
  currentUser: SystemUser | null;
  apiCall: <T = any>(url: string, options?: RequestInit) => Promise<T>;
  addToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

interface EnrichedAreaLog extends AreaAccessLog {
  participantName: string;
  participantCpf: string;
  areaName: string;
  operatorName: string;
}

export default function AreaAccessControl({
  currentEvent,
  currentUser,
  apiCall,
  addToast
}: AreaAccessControlProps) {
  // States
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [accessLogs, setAccessLogs] = useState<EnrichedAreaLog[]>([]);
  
  // Custom tabs for Admin
  const [subTab, setSubTab] = useState<'validate' | 'manage' | 'profiles'>('validate');

  // Modal Area states
  const [isAreaModalOpen, setIsAreaModalOpen] = useState<boolean>(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [areaFormName, setAreaFormName] = useState<string>('');
  const [areaFormColor, setAreaFormColor] = useState<string>('#00E545');
  const [areaFormActive, setAreaFormActive] = useState<boolean>(true);

  // AccessProfile CRUD states
  const [accessProfiles, setAccessProfiles] = useState<AccessProfile[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [editingProfile, setEditingProfile] = useState<AccessProfile | null>(null);
  const [profileFormName, setProfileFormName] = useState<string>('');
  const [profileFormAreaIds, setProfileFormAreaIds] = useState<string[]>([]);

  // Last validation visual result
  const [validationResult, setValidationResult] = useState<{
    success: boolean | null;
    status: 'ALLOWED' | 'DENIED' | null;
    message: string;
    participant?: {
      name: string;
      cpf: string;
      category: string;
      company?: string;
    };
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const isUserAdmin = currentUser?.role?.toUpperCase() === 'ADMIN' || currentUser?.role === 'admin';
  const normalizeAreaColor = (color?: string) => /^#[0-9A-Fa-f]{6}$/.test(color || '') ? color! : '#00E545';

  // Auto clean result timer
  useEffect(() => {
    if (validationResult) {
      const timer = setTimeout(() => {
        setValidationResult(null);
      }, 7000); // 7s auto reset to let scanner proceed smoothly
      return () => clearTimeout(timer);
    }
  }, [validationResult]);

  // Load basic areas & logs on mount or when event changes
  useEffect(() => {
    fetchAreas();
    fetchLogs();
    fetchAccessProfiles();
  }, [currentEvent]);

  const fetchAccessProfiles = async () => {
    try {
      const url = currentEvent ? `/api/access-profiles?eventId=${currentEvent.id}` : '/api/access-profiles';
      const res = await apiCall<AccessProfile[]>(url);
      if (res && Array.isArray(res)) {
        setAccessProfiles(res);
      }
    } catch (e) {
      console.error('Error fetching access profiles', e);
    }
  };

  const fetchAreas = async () => {
    try {
      const url = currentEvent ? `/api/areas?eventId=${currentEvent.id}` : '/api/areas';
      const res = await apiCall<Area[]>(url);
      if (res && Array.isArray(res)) {
        setAreas(res);
        if (res.length > 0) {
          // Default to the first active area if available, otherwise just first area
          const activeAreas = res.filter(a => a.isActive !== false && a.is_active !== false);
          const defaultArea = activeAreas.length > 0 ? activeAreas[0] : res[0];
          setSelectedAreaId(prev => res.some(a => a.id === prev) ? prev : defaultArea.id);
        } else {
          setSelectedAreaId('');
        }
      }
    } catch (e) {
      console.error('Error fetching areas', e);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await apiCall<EnrichedAreaLog[]>('/api/access-control/logs');
      if (res && Array.isArray(res)) {
        setAccessLogs(res);
      }
    } catch (e) {
      console.error('Error loading access control logs', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleValidate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedAreaId) {
      addToast('Nenhuma área selecionada.', 'warning');
      return;
    }
    if (!searchQuery.trim()) {
      addToast('Por favor, digite um nome, CPF ou escanear um QR Code.', 'warning');
      return;
    }

    setLoading(true);
    setValidationResult(null);

    try {
      const result = await apiCall<{
        allowed: boolean;
        status: 'ALLOWED' | 'DENIED';
        message: string;
        participant?: any;
      }>('/api/access-control/validate', {
        method: 'POST',
        body: JSON.stringify({
          search: searchQuery.trim(),
          areaId: selectedAreaId,
          eventId: currentEvent?.id
        })
      });

      if (result) {
        setValidationResult({
          success: result.allowed,
          status: result.status,
          message: result.message,
          participant: result.participant
        });

        if (result.allowed) {
          addToast(`Acesso LIBERADO para ${result.participant?.name || 'participante'}!`, 'success');
        } else {
          addToast(result.message || 'Acesso NEGADO!', 'error');
        }

        // Clean input for next fast scanner read
        setSearchQuery('');
        // Refetch logs to show the new event
        fetchLogs();
      }
    } catch (error: any) {
      addToast(error.message || 'Erro ao validar controle de acesso', 'error');
      setValidationResult({
        success: false,
        status: 'DENIED',
        message: 'Ocorreu um erro de comunicação com o servidor.'
      });
    } finally {
      setLoading(false);
      // Focus search input for subsequent rapid scans
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingArea(null);
    setAreaFormName('');
    setAreaFormColor('#00E545');
    setAreaFormActive(true);
    setIsAreaModalOpen(true);
  };

  const handleOpenEditModal = (area: Area) => {
    setEditingArea(area);
    setAreaFormName(area.name);
    setAreaFormColor(area.color || '#00E545');
    setAreaFormActive(area.isActive !== false && area.is_active !== false);
    setIsAreaModalOpen(true);
  };

  const handleSubmitArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaFormName.trim()) {
      addToast('O nome da área é obrigatório.', 'warning');
      return;
    }
    try {
      if (editingArea) {
        await apiCall(`/api/areas/${editingArea.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: areaFormName.trim(),
            color: normalizeAreaColor(areaFormColor),
            isActive: areaFormActive,
            is_active: areaFormActive
          })
        });
        addToast('Área editada com sucesso.', 'success');
      } else {
        await apiCall('/api/areas', {
          method: 'POST',
          body: JSON.stringify({
            name: areaFormName.trim(),
            color: normalizeAreaColor(areaFormColor),
            eventId: currentEvent?.id || 'e1',
            event_id: currentEvent?.id || 'e1',
            isActive: areaFormActive,
            is_active: areaFormActive
          })
        });
        addToast('Área criada com sucesso.', 'success');
      }
      setIsAreaModalOpen(false);
      fetchAreas();
    } catch (err: any) {
      addToast(err.message || 'Erro ao salvar área.', 'error');
    }
  };

  const handleToggleAreaActive = async (area: Area) => {
    const nextStatus = !(area.isActive !== false && area.is_active !== false);
    try {
      await apiCall(`/api/areas/${area.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          isActive: nextStatus,
          is_active: nextStatus
        })
      });
      addToast(`Área "${area.name}" foi ${nextStatus ? 'ativada' : 'desativada'}.`, 'success');
      fetchAreas();
    } catch (err: any) {
      addToast(err.message || 'Erro ao alterar status da área.', 'error');
    }
  };

  const handleDeleteArea = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir esta área?')) return;
    try {
      await apiCall(`/api/areas/${id}`, {
        method: 'DELETE'
      });
      addToast('Área excluída com sucesso.', 'success');
      fetchAreas();
    } catch (err: any) {
      addToast(err.message || 'Erro ao deletar área.', 'error');
    }
  };

  // --- AccessProfile CRUD Actions ---
  const handleOpenCreateProfileModal = () => {
    setEditingProfile(null);
    setProfileFormName('');
    setProfileFormAreaIds([]);
    setIsProfileModalOpen(true);
  };

  const handleOpenEditProfileModal = (profile: AccessProfile) => {
    setEditingProfile(profile);
    setProfileFormName(profile.name);
    setProfileFormAreaIds(profile.area_ids || []);
    setIsProfileModalOpen(true);
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileFormName.trim()) {
      addToast('O nome do perfil é obrigatório', 'error');
      return;
    }
    if (!currentEvent) {
      addToast('Nenhum evento ativo selecionado', 'error');
      return;
    }

    try {
      if (editingProfile) {
        await apiCall(`/api/access-profiles/${editingProfile.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: profileFormName,
            area_ids: profileFormAreaIds
          })
        });
        addToast('Perfil de acesso atualizado com sucesso.', 'success');
      } else {
        await apiCall('/api/access-profiles', {
          method: 'POST',
          body: JSON.stringify({
            name: profileFormName,
            area_ids: profileFormAreaIds,
            eventId: currentEvent.id,
            event_id: currentEvent.id
          })
        });
        addToast('Perfil de acesso criado com sucesso.', 'success');
      }
      setIsProfileModalOpen(false);
      fetchAccessProfiles();
    } catch (err: any) {
      addToast(err.message || 'Erro ao salvar perfil de acesso.', 'error');
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este perfil de acesso?')) return;
    try {
      await apiCall(`/api/access-profiles/${id}`, {
        method: 'DELETE'
      });
      addToast('Perfil de acesso excluído com sucesso.', 'success');
      fetchAccessProfiles();
    } catch (err: any) {
      addToast(err.message || 'Erro ao deletar perfil de acesso.', 'error');
    }
  };

  const handleToggleFormAreaId = (areaId: string) => {
    if (profileFormAreaIds.includes(areaId)) {
      setProfileFormAreaIds(profileFormAreaIds.filter(id => id !== areaId));
    } else {
      setProfileFormAreaIds([...profileFormAreaIds, areaId]);
    }
  };

  const selectedArea = areas.find(a => a.id === selectedAreaId);
  const selectedAreaName = selectedArea?.name || 'Área selecionada';
  const selectedAreaIsActive = selectedArea ? (selectedArea.isActive !== false && selectedArea.is_active !== false) : true;

  return (
    <div className="space-y-6" id="area-access-control-module">
      
      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-display">Controle de Portaria por Área</h2>
          <p className="text-sm text-slate-500">
            Validação instantânea e monitoramento em tempo real por salas e ambientes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 text-blue-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-blue-100">
            <Calendar size={13} />
            <span>Evento: {currentEvent?.name || 'Não selecionado'}</span>
          </div>
        </div>
      </div>

      {/* Sub tabs for ADMIN role only */}
      {isUserAdmin && (
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setSubTab('validate')}
            className={`px-4 py-2 border-b-2 font-semibold text-sm transition-all focus:outline-none cursor-pointer ${
              subTab === 'validate' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Terminal Portaria
          </button>
          <button
            onClick={() => setSubTab('manage')}
            className={`px-4 py-2 border-b-2 font-semibold text-sm transition-all focus:outline-none cursor-pointer ${
              subTab === 'manage' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Gerenciar Áreas (Admin)
          </button>
          <button
            onClick={() => setSubTab('profiles')}
            className={`px-4 py-2 border-b-2 font-semibold text-sm transition-all focus:outline-none cursor-pointer ${
              subTab === 'profiles' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Perfis de Acesso (Admin)
          </button>
        </div>
      )}

      {/* RENDER VIEW: CONFIG / CRUD TAB */}
      {isUserAdmin && subTab === 'manage' ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-6 shadow-xs">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-800">Canais e Áreas Ativas do Evento</h3>
              <p className="text-xs text-slate-400">Configure os ambientes monitorados e controle as regras de acesso.</p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Nova Área</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase">
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {areas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-450 text-sm">
                      Nenhuma área cadastrada para este evento.
                    </td>
                  </tr>
                ) : (
                  areas.map(area => {
                    const isActive = area.isActive !== false && area.is_active !== false;
                    return (
                      <tr key={area.id} className="hover:bg-slate-50/50 transition text-sm text-slate-700">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-slate-200 shrink-0"
                              style={{ backgroundColor: area.color || '#00E545' }}
                            />
                            <span>{area.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleAreaActive(area)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                              isActive 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {isActive ? <ToggleRight size={15} className="text-emerald-500" /> : <ToggleLeft size={15} />}
                            {isActive ? 'Ativo' : 'Inativo'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => handleOpenEditModal(area)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteArea(area.id)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Excluir"
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
      ) : isUserAdmin && subTab === 'profiles' ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-6 shadow-xs">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-800">Perfis de Acesso</h3>
              <p className="text-xs text-slate-400">Configure perfis de acesso predefinidos para vincular áreas permitidas automaticamente no momento da importação.</p>
            </div>
            <button
              onClick={handleOpenCreateProfileModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Novo Perfil</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase">
                  <th className="py-3 px-4">Nome do Perfil</th>
                  <th className="py-3 px-4">Áreas Permitidas</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {accessProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500 text-sm">
                      Nenhum perfil de acesso cadastrado para este evento.
                    </td>
                  </tr>
                ) : (
                  accessProfiles.map(profile => {
                    const profileAreas = areas.filter(a => profile.area_ids?.includes(a.id));
                    return (
                      <tr key={profile.id} className="hover:bg-slate-50/50 transition text-sm text-slate-700">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{profile.name}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {profileAreas.length === 0 ? (
                              <span className="text-xs text-slate-400 italic">Sem acesso</span>
                            ) : (
                              profileAreas.map(pa => (
                                <span key={pa.id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: pa.color || '#00E545' }}
                                  />
                                  {pa.name}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => handleOpenEditProfileModal(profile)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteProfile(profile.id)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Excluir"
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
      ) : (
        /* RENDER VIEW: STANDARD PORTARIA TERMINAL */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Controls & Validator (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Card: Area Selection */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Passo 1: Escolha a Área Monitorada
              </h3>
              
              {areas.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs font-medium">
                  <AlertTriangle className="shrink-0 text-amber-600" size={16} />
                  <div>
                    <p className="font-bold">Nenhuma área disponível</p>
                    <p className="text-amber-700 mt-0.5">Cadastre pelo menos uma área ativa antes de iniciar a portaria.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {areas.map(area => {
                    const isSelected = selectedAreaId === area.id;
                    const isActive = area.isActive !== false && area.is_active !== false;
                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => {
                          setSelectedAreaId(area.id);
                          setValidationResult(null);
                        }}
                        className={`p-4 rounded-xl text-center border transition-all cursor-pointer flex flex-col justify-center items-center gap-2 ${
                          isSelected 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10 font-bold' 
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                        } ${!isActive ? 'opacity-50 border-dashed border-red-200 bg-red-50/30' : ''}`}
                      >
                        <span
                          className="w-8 h-8 rounded-full flex items-center justify-center border"
                          style={{
                            backgroundColor: isSelected ? (area.color || '#00E545') : 'transparent',
                            borderColor: area.color || '#00E545'
                          }}
                        >
                          <ShieldCheck size={17} className={isSelected ? 'text-slate-950' : isActive ? 'text-slate-700' : 'text-slate-400'} />
                        </span>
                        <span className="text-sm font-bold block truncate max-w-full">
                          {area.name} {!isActive && '(Inativa)'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Card: Search Input */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Passo 2: Validar Participante em {selectedAreaName}
              </h3>

              {!selectedAreaIsActive && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-800 text-xs font-semibold flex items-center gap-2 mb-2">
                  <AlertTriangle size={15} className="text-red-600 shrink-0" />
                  <span>Atenção: Esta sala/área está INATIVA. Todos os acessos serão AUTOMATICAMENTE NEGADOS.</span>
                </div>
              )}

              <form onSubmit={handleValidate} className="flex gap-2.5">
                <div className="relative flex-1">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Nome, CPF do participante ou insira / escanear QR Code..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-blue-500 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition"
                    disabled={loading || areas.length === 0}
                    autoFocus
                  />
                  <Search size={18} className="text-slate-400 absolute left-3.5 top-3.5" />
                </div>
                <button
                  type="submit"
                  disabled={loading || areas.length === 0}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 cursor-pointer flex items-center gap-2 shrink-0 shadow-sm"
                >
                  {loading ? <RefreshCw className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                  <span>Validar</span>
                </button>
              </form>
            </div>

            {/* Feedback Visual: Grande display informativo do acesso */}
            {validationResult && (
              <div 
                className={`p-6 rounded-2xl border transition-all duration-300 animate-fade-in ${
                  validationResult.status === 'ALLOWED'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 rounded-full shrink-0 ${
                    validationResult.status === 'ALLOWED' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                  }`}>
                    {validationResult.status === 'ALLOWED' ? <CheckCircle2 size={32} /> : <ShieldAlert size={32} />}
                  </div>
                  <div>
                    <h4 className="text-2xl font-black tracking-wide leading-none">
                      {validationResult.status === 'ALLOWED' ? 'ACESSO LIBERADO' : 'ACESSO NEGADO'}
                    </h4>
                    <p className={`text-sm mt-1.5 font-medium ${
                      validationResult.status === 'ALLOWED' ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {validationResult.message}
                    </p>
                  </div>
                </div>

                {validationResult.participant ? (
                  <div className="mt-4 pt-4 border-t border-dashed border-slate-200 grid grid-cols-2 gap-4 text-slate-800 bg-white/50 p-4 rounded-xl">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Nome do Participante</span>
                      <span className="text-sm font-bold text-slate-800 block">{validationResult.participant.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Documento (CPF)</span>
                      <span className="text-sm font-semibold text-slate-700 block">
                        {validationResult.participant.cpf ? validationResult.participant.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : 'Sem CPF cadastrado'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Categoria operacional</span>
                      <span className={`inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        validationResult.participant.category === 'VIP' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        validationResult.participant.category === 'Palestrante' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                        validationResult.participant.category === 'Staff' ? 'bg-red-100 text-red-800 border border-red-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {validationResult.participant.category}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Empresa associada</span>
                      <span className="text-sm text-slate-600 block">{validationResult.participant.company || 'Não identificada'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-rose-600 font-medium font-mono p-2 bg-rose-100/50 rounded-lg">
                    Nenhum registro associado pôde ser localizado para os critérios informados.
                  </div>
                )}
              </div>
            )}

            {/* Neutral Empty State */}
            {!validationResult && (
              <div className="border border-slate-150 border-dashed rounded-2xl p-10 text-center text-slate-400 bg-slate-50/50">
                <ShieldCheck size={42} className="mx-auto mb-3 text-slate-300" />
                <h4 className="text-sm font-bold text-slate-600">Portaria Operacional Ativa</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  Escolha a zona de destino no painel, digite as informações do participante ou passe o leitor de QR Code no campo de busca acima.
                </p>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: Real-Time Access Logs Stream (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden flex flex-col h-[525px]">
              
              {/* Logs Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-700">Histórico Recente</h3>
                </div>
                <button
                  type="button"
                  onClick={fetchLogs}
                  disabled={loadingLogs}
                  className="p-1.5 hover:bg-slate-200 rounded-lg transition disabled:opacity-50 text-slate-500 cursor-pointer"
                  title="Sincronizar log"
                >
                  <RefreshCw size={14} className={loadingLogs ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Logs stats bar */}
              <div className="bg-slate-100/70 p-3 grid grid-cols-2 border-b border-slate-150 text-center gap-2">
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2">
                  <span className="text-[10px] text-emerald-600 block uppercase font-bold tracking-wider">Acessos Permitidos</span>
                  <span className="text-lg font-black text-emerald-700">{accessLogs.filter(l => l.status === 'ALLOWED').length}</span>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-lg p-2">
                  <span className="text-[10px] text-rose-600 block uppercase font-bold tracking-wider">Acessos Negados</span>
                  <span className="text-lg font-black text-rose-700">{accessLogs.filter(l => l.status === 'DENIED').length}</span>
                </div>
              </div>

              {/* Logs dynamic body */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 no-scrollbar">
                {loadingLogs && accessLogs.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 text-xs">
                    <RefreshCw className="animate-spin mx-auto mb-2 text-slate-300" size={18} />
                    <span>Carregando logs de portaria...</span>
                  </div>
                ) : accessLogs.length === 0 ? (
                  <div className="py-20 text-center text-slate-300 text-xs">
                    <span>Nenhum log gravado nesta sessão.</span>
                  </div>
                ) : (
                  accessLogs.map(log => {
                    const isAllowed = log.status === 'ALLOWED';
                    const logTime = new Date(log.timestamp).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    });

                    return (
                      <div key={log.id} className="p-3.5 hover:bg-slate-50/50 transition duration-150 flex items-start gap-3">
                        <div className={`p-1.5 rounded-full shrink-0 mt-0.5 ${
                          isAllowed ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                        }`}>
                          {isAllowed ? <CheckCircle2 size={13} /> : <ShieldAlert size={13} />}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-bold text-slate-700 truncate block">
                              {log.participantName || 'Membro não identificado'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0 font-medium">
                              {logTime}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                            <span className="font-semibold text-slate-600">{log.areaName}</span>
                            <span className="text-slate-300">•</span>
                            <span className="truncate">Op: {log.operatorName}</span>
                          </div>
                        </div>

                        <div className="shrink-0 ml-1">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                            isAllowed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {isAllowed ? 'OK' : 'NEGADO'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ADMIN CONFIGURE/CRUD AREA MODAL */}
      {isAreaModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-800">
                {editingArea ? 'Editar Área Monitorada' : 'Cadastrar Nova Área'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAreaModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg transition text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitArea} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                  Nome da Área
                </label>
                <input
                  type="text"
                  placeholder="Ex: Área VIP, Sala A, Teatro, Buffet..."
                  value={areaFormName}
                  onChange={e => setAreaFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-blue-500 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                  Cor do Setor
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={normalizeAreaColor(areaFormColor)}
                    onChange={e => {
                      const value = e.target.value.toUpperCase();
                      if (/^#[0-9A-F]{0,6}$/.test(value)) setAreaFormColor(value);
                    }}
                    className="w-12 h-11 rounded-xl border border-slate-200 bg-white p-1 cursor-pointer"
                    title="Escolher cor do setor"
                  />
                  <input
                    type="text"
                    value={areaFormColor}
                    onChange={e => setAreaFormColor(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-blue-500 rounded-xl text-sm text-slate-800 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition"
                    placeholder="#00E545"
                    maxLength={7}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-b border-slate-50 bg-slate-50/30 px-2 rounded-xl">
                <div>
                  <span className="block text-xs font-bold text-slate-700">Status Ativo</span>
                  <span className="block text-[10px] text-slate-450 mt-0.5">Permitir validação e check-in nesta área.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAreaFormActive(!areaFormActive)}
                  className="text-blue-600 hover:text-blue-500 transition focus:outline-none cursor-pointer"
                >
                  {areaFormActive ? <ToggleRight size={38} /> : <ToggleLeft size={38} className="text-slate-350" />}
                </button>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAreaModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm shadow-blue-500/10"
                >
                  <Check size={14} />
                  <span>{editingArea ? 'Confirmar Edição' : 'Cadastrar Área'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-800">
                {editingProfile ? 'Editar Perfil de Acesso' : 'Cadastrar Novo Perfil de Acesso'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg transition text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitProfile} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                  Nome do Perfil de Acesso
                </label>
                <input
                  type="text"
                  placeholder="Ex: STAFF, VIP, EXPOSITOR..."
                  value={profileFormName}
                  onChange={e => setProfileFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-blue-500 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Áreas Permitidas para este Perfil
                </label>
                <div className="border border-slate-100 rounded-xl bg-slate-50/50 p-3 max-h-48 overflow-y-auto space-y-2">
                  {areas.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Cadastre áreas primeiro sob o menu "Gerenciar Áreas".</p>
                  ) : (
                    areas.map(area => {
                      const isChecked = profileFormAreaIds.includes(area.id);
                      return (
                        <label key={area.id} className="flex items-center gap-2.5 p-1.5 hover:bg-white rounded-lg transition-all cursor-pointer text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleFormAreaId(area.id)}
                            className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 h-4 w-4"
                          />
                          <span>{area.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm shadow-blue-500/10"
                >
                  <Check size={14} />
                  <span>{editingProfile ? 'Confirmar Edição' : 'Criar Perfil'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
