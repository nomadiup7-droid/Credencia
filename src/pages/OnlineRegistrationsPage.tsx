import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Copy, Loader2, QrCode, Search, Settings, XCircle } from 'lucide-react';
import UserQRCode from '../components/UserQRCode';
import { Event, OnlineRegistration, OnlineRegistrationConfig, OnlineRegistrationStatus } from '../types';

interface OnlineRegistrationsPageProps {
  events: Event[];
  selectedEventId: string;
  apiCall: (endpoint: string, options?: RequestInit) => Promise<any>;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onParticipantsChanged?: (eventId: string) => void;
}

const statusLabels: Record<OnlineRegistrationStatus, string> = {
  PENDENTE: 'Pendente',
  APROVADA: 'Aprovada',
  REPROVADA: 'Reprovada',
  CANCELADA: 'Cancelada'
};

const statusClasses: Record<OnlineRegistrationStatus, string> = {
  PENDENTE: 'bg-amber-50 text-amber-800 border-amber-200',
  APROVADA: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REPROVADA: 'bg-rose-50 text-rose-800 border-rose-200',
  CANCELADA: 'bg-slate-100 text-slate-600 border-slate-200'
};

const defaultConfig = (event?: Event | null): Partial<OnlineRegistrationConfig> => ({
  enabled: false,
  slug: event?.name ? event.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : '',
  publicTitle: event?.name || '',
  publicDescription: '',
  publicDate: event?.date || '',
  publicLocation: event?.location || '',
  bannerUrl: '',
  maxRegistrations: undefined,
  status: 'PAUSADA',
  approvalMode: 'MANUAL'
});

export default function OnlineRegistrationsPage({
  events,
  selectedEventId,
  apiCall,
  addToast,
  onParticipantsChanged
}: OnlineRegistrationsPageProps) {
  const [eventFilter, setEventFilter] = useState(selectedEventId || events[0]?.id || '');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | OnlineRegistrationStatus>('TODOS');
  const [search, setSearch] = useState('');
  const [registrations, setRegistrations] = useState<OnlineRegistration[]>([]);
  const [config, setConfig] = useState<Partial<OnlineRegistrationConfig>>(defaultConfig(events.find(e => e.id === eventFilter)));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState<OnlineRegistration | null>(null);

  const selectedEvent = events.find(event => event.id === eventFilter) || null;
  const publicUrl = config.slug ? `${window.location.origin}/inscricao/${config.slug}` : '';

  const loadConfig = async (eventId: string) => {
    if (!eventId) return;
    const existing = await apiCall(`/api/events/${eventId}/online-registration-config`).catch(() => null);
    setConfig(existing || defaultConfig(events.find(event => event.id === eventId)));
  };

  const loadRegistrations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (eventFilter) params.set('eventId', eventFilter);
      if (statusFilter !== 'TODOS') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      const data = await apiCall(`/api/online-registrations?${params.toString()}`);
      setRegistrations(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) setEventFilter(selectedEventId);
  }, [selectedEventId]);

  useEffect(() => {
    if (!eventFilter) return;
    loadConfig(eventFilter);
    loadRegistrations();
  }, [eventFilter, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (eventFilter) loadRegistrations();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const summary = useMemo(() => ({
    total: registrations.length,
    pendentes: registrations.filter(item => item.status === 'PENDENTE').length,
    aprovadas: registrations.filter(item => item.status === 'APROVADA').length,
    reprovadas: registrations.filter(item => item.status === 'REPROVADA').length,
    canceladas: registrations.filter(item => item.status === 'CANCELADA').length
  }), [registrations]);

  const saveConfig = async () => {
    if (!eventFilter) return;
    setSaving(true);
    try {
      const saved = await apiCall(`/api/events/${eventFilter}/online-registration-config`, {
        method: 'PUT',
        body: JSON.stringify(config)
      });
      setConfig(saved);
      addToast('Configuração de inscrições online salva.', 'success');
    } finally {
      setSaving(false);
    }
  };

  const copyPublicUrl = async () => {
    if (!publicUrl) return;
    await navigator.clipboard?.writeText(publicUrl);
    addToast('Link público copiado.', 'success');
  };

  const updateStatus = async (registration: OnlineRegistration, action: 'approve' | 'reject' | 'cancel') => {
    const labels = { approve: 'aprovada', reject: 'reprovada', cancel: 'cancelada' };
    const response = await apiCall(`/api/online-registrations/${registration.id}/${action}`, { method: 'POST' });
    addToast(`Inscrição ${labels[action]} com sucesso.`, 'success');
    if (action === 'approve') {
      onParticipantsChanged?.(registration.eventId);
      if (response.registration) setDetails(response.registration);
    }
    await loadRegistrations();
  };

  return (
    <section className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-emerald-600">Novo módulo</p>
          <h1 className="text-2xl font-black text-slate-950 mt-1">Inscrições Online</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl">
            Configure páginas públicas de inscrição e aprove cadastros sem alterar o fluxo atual de participantes.
          </p>
        </div>
        {publicUrl && (
          <button onClick={copyPublicUrl} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <Copy size={16} />
            <span>Copiar link público</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <SummaryCard title="Total" value={summary.total} icon={<QrCode size={18} />} />
        <SummaryCard title="Pendentes" value={summary.pendentes} icon={<Clock size={18} />} />
        <SummaryCard title="Aprovadas" value={summary.aprovadas} icon={<CheckCircle2 size={18} />} />
        <SummaryCard title="Reprovadas" value={summary.reprovadas} icon={<XCircle size={18} />} />
        <SummaryCard title="Canceladas" value={summary.canceladas} icon={<AlertTriangle size={18} />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Settings size={17} className="text-emerald-600" />
            <h2 className="text-sm font-black text-slate-900">Configuração do evento</h2>
          </div>

          <label className="block">
            <span className="text-xs font-black uppercase text-slate-500">Evento</span>
            <select value={eventFilter} onChange={e => setEventFilter(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">
              {events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold">
              <input type="checkbox" checked={config.enabled === true} onChange={e => setConfig(prev => ({ ...prev, enabled: e.target.checked }))} className="accent-emerald-600" />
              Ativa
            </label>
            <label>
              <span className="text-xs font-black uppercase text-slate-500">Status</span>
              <select value={config.status || 'PAUSADA'} onChange={e => setConfig(prev => ({ ...prev, status: e.target.value as any }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">
                <option value="ABERTA">Aberta</option>
                <option value="PAUSADA">Pausada</option>
                <option value="ENCERRADA">Encerrada</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-black uppercase text-slate-500">Modo de aprovação</span>
            <select value={config.approvalMode || 'MANUAL'} onChange={e => setConfig(prev => ({ ...prev, approvalMode: e.target.value as any }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">
              <option value="MANUAL">Manual</option>
              <option value="AUTOMATICA">Automática</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase text-slate-500">Slug público</span>
            <input value={config.slug || ''} onChange={e => setConfig(prev => ({ ...prev, slug: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold" />
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase text-slate-500">Título público</span>
            <input value={config.publicTitle || ''} onChange={e => setConfig(prev => ({ ...prev, publicTitle: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold" />
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase text-slate-500">Descrição pública</span>
            <textarea value={config.publicDescription || ''} onChange={e => setConfig(prev => ({ ...prev, publicDescription: e.target.value }))} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="text-xs font-black uppercase text-slate-500">Data/Horário</span>
              <input value={config.publicDate || ''} onChange={e => setConfig(prev => ({ ...prev, publicDate: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold" />
            </label>
            <label>
              <span className="text-xs font-black uppercase text-slate-500">Limite</span>
              <input type="number" min="0" value={config.maxRegistrations || ''} onChange={e => setConfig(prev => ({ ...prev, maxRegistrations: e.target.value ? Number(e.target.value) : undefined }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-black uppercase text-slate-500">Local público</span>
            <input value={config.publicLocation || ''} onChange={e => setConfig(prev => ({ ...prev, publicLocation: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold" />
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase text-slate-500">Banner URL</span>
            <div className="mt-1 flex flex-col sm:flex-row gap-2">
              <input
                value={config.bannerUrl || ''}
                onChange={e => setConfig(prev => ({ ...prev, bannerUrl: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"
                placeholder="Cole uma URL ou envie uma imagem"
              />
              <label className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-100 cursor-pointer whitespace-nowrap">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={event => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) return;
                    if (!file.type.startsWith('image/')) {
                      addToast('Selecione um arquivo de imagem.', 'error');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      setConfig(prev => ({ ...prev, bannerUrl: String(reader.result || '') }));
                      addToast('Banner carregado. Clique em Salvar configuração.', 'success');
                    };
                    reader.onerror = () => addToast('Não foi possível carregar o banner.', 'error');
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
          </label>

          {publicUrl && <p className="break-all rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs font-semibold text-slate-500">{publicUrl}</p>}

          <button onClick={saveConfig} disabled={saving || !selectedEvent} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">
            {saving && <Loader2 className="animate-spin" size={16} />}
            <span>Salvar configuração</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">
              <option value="TODOS">Todos os status</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="APROVADA">Aprovadas</option>
              <option value="REPROVADA">Reprovadas</option>
              <option value="CANCELADA">Canceladas</option>
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, e-mail ou telefone" className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-sm font-semibold" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3">Contato</th>
                  <th className="text-left p-3">Evento</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Data</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500"><Loader2 className="inline animate-spin mr-2" size={16} />Carregando...</td></tr>
                ) : registrations.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhuma inscrição encontrada.</td></tr>
                ) : registrations.map(registration => {
                  const event = events.find(item => item.id === registration.eventId);
                  return (
                    <tr key={registration.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{registration.name}</td>
                      <td className="p-3 text-slate-600">
                        <div>{registration.email || '-'}</div>
                        <div className="text-xs">{registration.phone}</div>
                      </td>
                      <td className="p-3 text-slate-600">{event?.name || registration.eventId}</td>
                      <td className="p-3"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-black ${statusClasses[registration.status]}`}>{statusLabels[registration.status]}</span></td>
                      <td className="p-3 text-slate-500">{new Date(registration.registeredAt).toLocaleString('pt-BR')}</td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setDetails(registration)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold">Detalhes</button>
                          {registration.status === 'PENDENTE' && <button onClick={() => updateStatus(registration, 'approve')} className="rounded-lg bg-emerald-500 px-2 py-1 text-xs font-black text-slate-950">Aprovar</button>}
                          {registration.status === 'PENDENTE' && <button onClick={() => updateStatus(registration, 'reject')} className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-bold text-rose-700">Reprovar</button>}
                          {registration.status !== 'CANCELADA' && <button onClick={() => updateStatus(registration, 'cancel')} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600">Cancelar</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {details && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4" onClick={() => setDetails(null)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-950">{details.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{statusLabels[details.status]}</p>
              </div>
              <button onClick={() => setDetails(null)} className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-bold">Fechar</button>
            </div>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Info label="E-mail" value={details.email || '-'} />
              <Info label="Telefone" value={details.phone} />
              <Info label="Empresa" value={details.company || '-'} />
              <Info label="Cargo" value={details.position || '-'} />
              <Info label="CPF" value={details.cpf || '-'} />
              <Info label="Inscrição" value={new Date(details.registeredAt).toLocaleString('pt-BR')} />
            </div>
            {details.status === 'APROVADA' && details.qrToken && (
              <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-5 flex flex-col items-center gap-3">
                <UserQRCode value={details.qrToken} size={170} frameless />
                <p className="text-xs font-black uppercase text-slate-500">QR Code válido para check-in</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-xs font-black uppercase">{title}</span>
        {icon}
      </div>
      <div className="text-3xl font-black text-slate-950 mt-3">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
      <div className="text-[10px] font-black uppercase text-slate-400">{label}</div>
      <div className="text-sm font-bold text-slate-800 mt-1 break-words">{value}</div>
    </div>
  );
}
