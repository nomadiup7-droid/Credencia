import React, { useMemo, useState } from 'react';
import * as XLSX from '@e965/xlsx';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Building,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  FolderLock,
  History,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Tag,
  Upload,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import { CATEGORY_TAGS } from '../../constants/categories';
import { DEFAULT_REPORT_BRAND_CONFIG, DEFAULT_REPORT_MODEL_CONFIGS, REPORT_CHART_OPTIONS, REPORT_CONFIG_GROUPS, REPORT_IMAGE_ACCEPT, REPORT_IMAGE_FORMATS, REPORT_MODEL_OPTIONS, REPORT_OPTION_KEYS, REPORT_TABLE_OPTIONS } from '../../constants/reports';
import type { Event, Participant, ReportBrandConfig, ReportConfig, ReportModelConfigMap, ReportOptionKey } from '../../types';
import ReportExportMenu from './ReportExportMenu';
import type { ReportPdfKind } from '../../types/report.types';
import { downloadCsv } from '../../services/reportExportService';
import { fixMojibake } from '../../utils/text';

type ReportMode = 'organization' | 'event';
type ReportEventTab = 'summary' | 'participants' | 'checkin' | 'access' | 'operators' | 'prints' | 'certificates' | 'cloakroom';

type Props = {
  isUserAdmin: boolean;
  events: Event[];
  currentEvent: Event | null;
  selectedEventId: string;
  setSelectedEvent: (eventId: string, role?: string) => void;
  reportMode: ReportMode;
  setReportMode: (mode: ReportMode) => void;
  reportEventTab: ReportEventTab;
  setReportEventTab: (tab: ReportEventTab) => void;
  organizationReport: any | null;
  isOrganizationReportLoading: boolean;
  loadOrganizationReport: () => void;
  organizationReportPeriod: string;
  setOrganizationReportPeriod: (value: any) => void;
  organizationReportStatus: string;
  setOrganizationReportStatus: (value: any) => void;
  organizationReportSearch: string;
  setOrganizationReportSearch: (value: string) => void;
  organizationReportLocation: string;
  setOrganizationReportLocation: (value: string) => void;
  organizationReportCustomStart: string;
  setOrganizationReportCustomStart: (value: string) => void;
  organizationReportCustomEnd: string;
  setOrganizationReportCustomEnd: (value: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedCategoryFilter: string;
  setSelectedCategoryFilter: (value: string) => void;
  selectedPresenceFilter: 'all' | 'present' | 'absent';
  setSelectedPresenceFilter: (value: 'all' | 'present' | 'absent') => void;
  reportConfig: ReportConfig;
  reportBrandConfig: ReportBrandConfig;
  setReportBrandConfig: React.Dispatch<React.SetStateAction<ReportBrandConfig>>;
  reportModelConfigs: ReportModelConfigMap;
  setReportModelConfigs: React.Dispatch<React.SetStateAction<ReportModelConfigMap>>;
  updateReportOption: (key: ReportOptionKey, checked: boolean) => void;
  setAllReportOptions: (checked: boolean) => void;
  resetReportOptions: () => void;
  getReportSelectedOptionCount: () => number;
  getReportSelectedSectionCount: () => number;
  handleReportImageUpload: (file: File | undefined, target: 'logoUrl' | 'watermarkUrl') => void;
  exportParticipantsToExcelWithFilter: (presentOnly: boolean, sourceList?: Participant[], fileLabel?: string) => void;
  exportReportParticipantsToCsv: () => void;
  handleGenerateReportPdf: (kind: ReportPdfKind) => void;
  triggerPrintableReport: () => void;
  reportPdfLoadingLabel: string;
  reportParticipants: Participant[];
  filteredParticipantsList: Participant[];
  reportSummary: { total: number; checkedIn: number; pending: number; attendanceRate: number };
  reportCredentialViewSummary: { viewed: number; notViewed: number; totalOpenings: number };
  reportCheckinsByHour: Array<{ label: string; count: number }>;
  reportParticipantsByCategory: Array<{ label: string; count: number }>;
  reportPresenceBreakdown: Array<{ label: string; count: number; color: string }>;
  reportAreaAccessLogs: any[];
  reportAreaAccessSummary: any[];
  reportParticipantAreaAccess: any[];
  reportCertificates: any[];
  reportCertificateSummary: any;
  reportCloakroomItems: any[];
  reportCloakroomSummary: any;
  reportOperatorSummary: Array<{ label: string; value: number }>;
  reportAverageStayMinutes: number | null;
  reportPrintedLabelsCount: number;
  officialActionLogs: any[];
  isOfficialParticipantCheckin: (participant: Participant) => boolean;
  getReportCheckinOperator: (participant: Participant) => string;
  getCloakroomItemVolumes: (item: any) => any[];
};

const formatStatus = (status: string) => status === 'active' ? 'Ativo' : status === 'future' ? 'Futuro' : 'Encerrado';

export default function ReportsWorkspace(props: Props) {
  const [exportOpen, setExportOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const organizationEvents = useMemo(() => {
    const range = (() => {
      if (props.organizationReportPeriod === 'all') return null;
      if (props.organizationReportPeriod === 'custom') {
        return {
          start: props.organizationReportCustomStart ? new Date(`${props.organizationReportCustomStart}T00:00:00`) : null,
          end: props.organizationReportCustomEnd ? new Date(`${props.organizationReportCustomEnd}T23:59:59`) : null
        };
      }
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      if (props.organizationReportPeriod === '7d') start.setDate(end.getDate() - 6);
      if (props.organizationReportPeriod === '30d') start.setDate(end.getDate() - 29);
      if (props.organizationReportPeriod === 'month') start.setDate(1);
      if (props.organizationReportPeriod === 'year') start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    })();
    const query = props.organizationReportSearch.trim().toLowerCase();
    const location = props.organizationReportLocation.trim().toLowerCase();
    return (props.organizationReport?.events || []).filter((event: any) => {
      const date = new Date(event.date);
      const matchesPeriod = !range || (
        (!range.start || (Number.isFinite(date.getTime()) && date >= range.start)) &&
        (!range.end || (Number.isFinite(date.getTime()) && date <= range.end))
      );
      return matchesPeriod &&
        (props.organizationReportStatus === 'all' || event.status === props.organizationReportStatus) &&
        (!query || event.name.toLowerCase().includes(query)) &&
        (!location || String(event.location || '').toLowerCase().includes(location));
    });
  }, [props.organizationReport, props.organizationReportPeriod, props.organizationReportStatus, props.organizationReportSearch, props.organizationReportLocation, props.organizationReportCustomStart, props.organizationReportCustomEnd]);

  const organizationTotals = useMemo(() => {
    const totals = organizationEvents.reduce((acc: any, event: any) => {
      acc.events += 1;
      acc[event.status] += 1;
      acc.participants += event.participants;
      acc.checkedIn += event.checkedIn;
      acc.pending += event.pending;
      acc.credentialLinksViewed += event.credentialLinksViewed;
      acc.credentialLinkOpenings += event.credentialLinkOpenings;
      acc.areaAccessTotal += event.areaAccessTotal;
      acc.operatorCheckins += event.operatorCheckins;
      return acc;
    }, { events: 0, active: 0, future: 0, closed: 0, participants: 0, checkedIn: 0, pending: 0, credentialLinksViewed: 0, credentialLinkOpenings: 0, areaAccessTotal: 0, operatorCheckins: 0, averageAttendanceRate: 0 });
    totals.averageAttendanceRate = totals.participants > 0 ? Math.round((totals.checkedIn / totals.participants) * 100) : 0;
    return totals;
  }, [organizationEvents]);

  const organizationMonthlyEvolution = useMemo(() => {
    const months = new Map<string, number>();
    organizationEvents.forEach((event: any) => {
      const date = new Date(event.date);
      if (!Number.isFinite(date.getTime())) return;
      const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      months.set(label, (months.get(label) || 0) + 1);
    });
    return Array.from(months.entries()).map(([label, value]) => ({ label, value }));
  }, [organizationEvents]);

  const organizationParticipantsRanking = useMemo(() => (
    [...organizationEvents]
      .sort((a: any, b: any) => b.participants - a.participants)
      .slice(0, 6)
      .map((event: any) => ({ label: event.name, value: event.participants }))
  ), [organizationEvents]);

  const organizationAttendanceRanking = useMemo(() => (
    [...organizationEvents]
      .sort((a: any, b: any) => b.attendanceRate - a.attendanceRate)
      .slice(0, 6)
      .map((event: any) => ({ label: event.name, value: event.attendanceRate }))
  ), [organizationEvents]);

  const organizationOperatorComparison = useMemo(() => (
    [...organizationEvents]
      .sort((a: any, b: any) => b.operatorCheckins - a.operatorCheckins)
      .slice(0, 6)
      .map((event: any) => ({ label: event.name, value: event.operatorCheckins }))
  ), [organizationEvents]);

  const eventTabs = [
    { id: 'summary' as const, label: 'Resumo', icon: BarChart3, available: true },
    { id: 'participants' as const, label: 'Participantes', icon: Users, available: true },
    { id: 'checkin' as const, label: 'Check-in', icon: UserCheck, available: true },
    { id: 'access' as const, label: 'Controle de acesso', icon: ShieldCheck, available: props.currentEvent?.enableAccessControl !== false },
    { id: 'operators' as const, label: 'Operadores', icon: Users, available: true },
    { id: 'prints' as const, label: 'Impressões', icon: Printer, available: true },
    { id: 'certificates' as const, label: 'Certificados', icon: Award, available: true },
    { id: 'cloakroom' as const, label: 'Chapelaria', icon: FolderLock, available: props.currentEvent?.enableCloakroom === true }
  ].filter(tab => tab.available);

  const exportOrganizationExcel = () => {
    const rows = organizationEvents.map((event: any) => ({
      Evento: event.name,
      Data: event.date ? new Date(event.date).toLocaleDateString('pt-BR') : '',
      Status: formatStatus(event.status),
      Participantes: event.participants,
      Checkins: event.checkedIn,
      Pendentes: event.pending,
      Presenca: `${event.attendanceRate}%`,
      Local: event.location || '',
      'Links visualizados': event.credentialLinksViewed
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório Geral');
    XLSX.writeFile(workbook, `Relatorio_Geral_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportOrganizationCsv = () => {
    downloadCsv(organizationEvents.map((event: any) => ({
      Evento: event.name,
      Data: event.date ? new Date(event.date).toLocaleDateString('pt-BR') : '',
      Status: formatStatus(event.status),
      Participantes: event.participants,
      Checkins: event.checkedIn,
      Pendentes: event.pending,
      Presenca: `${event.attendanceRate}%`,
      Local: event.location || '',
      'Links visualizados': event.credentialLinksViewed
    })), `Relatorio_Geral_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const runExport = (kind: 'excel' | 'csv') => {
    setExportOpen(false);
    if (kind === 'excel') {
      props.reportMode === 'organization' ? exportOrganizationExcel() : props.exportParticipantsToExcelWithFilter(false, props.reportParticipants, 'Relatorio_Filtrado');
    }
    if (kind === 'csv') {
      props.reportMode === 'organization' ? exportOrganizationCsv() : props.exportReportParticipantsToCsv();
    }
  };

  const metricCards = [
    { title: 'Total de participantes', value: props.reportSummary.total, icon: Users, color: 'bg-blue-50 text-blue-700 border-blue-100' },
    { title: 'Check-ins realizados', value: props.reportSummary.checkedIn, icon: UserCheck, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { title: 'Participantes pendentes', value: props.reportSummary.pending, icon: Clock, color: 'bg-amber-50 text-amber-700 border-amber-100' },
    { title: 'Percentual de presença', value: `${props.reportSummary.attendanceRate}%`, icon: BarChart3, color: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
    { title: 'Links visualizados', value: props.reportCredentialViewSummary.viewed, icon: Eye, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { title: 'Acessos por área', value: props.reportAreaAccessLogs.length, icon: ShieldCheck, color: 'bg-white text-slate-800 border-slate-200' },
    { title: 'Credenciamentos por operador', value: props.reportOperatorSummary.reduce((sum, item) => sum + item.value, 0), icon: Users, color: 'bg-white text-slate-800 border-slate-200' },
    { title: 'Média de permanência', value: props.reportAverageStayMinutes === null ? '-' : `${props.reportAverageStayMinutes} min`, icon: History, color: 'bg-slate-50 text-slate-800 border-slate-200' }
  ];

  return (
    <div className="report-print-scope space-y-6 animate-fade-in">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Relatórios</p>
          <h2 className="text-2xl font-bold text-slate-900 font-display mt-1">Central de relatórios</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">Escolha entre uma visão geral da organização ou uma visão operacional por evento.</p>
        </div>
        <div className="report-print-controls flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
          <div className="relative">
            <button type="button" onClick={() => setExportOpen(prev => !prev)} title="Exportar os dados filtrados em Excel ou CSV" aria-label="Exportar os dados filtrados em Excel ou CSV" className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition">
              <Download size={15} /> Exportar dados
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <button type="button" onClick={() => runExport('excel')} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold hover:bg-emerald-50"><FileText size={16} />Excel</button>
                <button type="button" onClick={() => runExport('csv')} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold hover:bg-emerald-50"><Download size={16} />CSV</button>
              </div>
            )}
          </div>
          <ReportExportMenu onGeneratePdf={props.handleGenerateReportPdf} onPrintCurrent={props.reportMode === 'organization' ? () => window.print() : props.triggerPrintableReport} loadingLabel={props.reportPdfLoadingLabel} />
          <button type="button" onClick={() => setCustomizeOpen(true)} title="Escolher as informações e a identidade visual dos relatórios" aria-label="Escolher as informações e a identidade visual dos relatórios" className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition">
            <Sliders size={15} /> Personalizar relatórios
          </button>
        </div>
      </div>

      <div className="report-print-controls grid grid-cols-1 lg:grid-cols-2 gap-4">
        {props.isUserAdmin && (
          <button type="button" onClick={() => props.setReportMode('organization')} className={`text-left rounded-2xl border p-5 transition ${props.reportMode === 'organization' ? 'border-emerald-300 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:border-emerald-200'}`}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-emerald-700">Relatório geral</p><h3 className="mt-1 text-lg font-black text-slate-950 font-display">Administração</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">Visão consolidada de todos os eventos da organização, com indicadores administrativos, comparativos e evolução dos resultados.</p></div><Building size={24} className="text-emerald-700" /></div>
          </button>
        )}
        <button type="button" onClick={() => props.setReportMode('event')} className={`text-left rounded-2xl border p-5 transition ${props.reportMode === 'event' ? 'border-emerald-300 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:border-emerald-200'}`}>
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-emerald-700">Relatório por evento</p><h3 className="mt-1 text-lg font-black text-slate-950 font-display">Operação detalhada</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">Visão operacional detalhada dos participantes, check-ins, acessos, equipe e demais atividades de um evento específico.</p></div><Calendar size={24} className="text-emerald-700" /></div>
        </button>
      </div>

      {props.reportMode === 'organization' && props.isUserAdmin ? (
        <div className="space-y-5">
          <div className="report-print-controls bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              <select value={props.organizationReportPeriod} onChange={e => props.setOrganizationReportPeriod(e.target.value)} className="px-3 py-3 bg-white border border-slate-200 rounded-lg text-sm"><option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option><option value="month">Este mês</option><option value="year">Este ano</option><option value="all">Todos os períodos</option><option value="custom">Período personalizado</option></select>
              <select value={props.organizationReportStatus} onChange={e => props.setOrganizationReportStatus(e.target.value)} className="px-3 py-3 bg-white border border-slate-200 rounded-lg text-sm"><option value="all">Todos os status</option><option value="active">Ativos</option><option value="future">Futuros</option><option value="closed">Encerrados</option></select>
              <input value={props.organizationReportSearch} onChange={e => props.setOrganizationReportSearch(e.target.value)} placeholder="Buscar evento" className="px-3 py-3 bg-white border border-slate-200 rounded-lg text-sm" />
              <input value={props.organizationReportLocation} onChange={e => props.setOrganizationReportLocation(e.target.value)} placeholder="Filtrar por local" className="px-3 py-3 bg-white border border-slate-200 rounded-lg text-sm" />
              <button type="button" onClick={props.loadOrganizationReport} disabled={props.isOrganizationReportLoading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><RefreshCw size={16} className={props.isOrganizationReportLoading ? 'animate-spin' : ''} />Atualizar</button>
            </div>
            {props.organizationReportPeriod === 'custom' && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="date" value={props.organizationReportCustomStart} onChange={e => props.setOrganizationReportCustomStart(e.target.value)} className="px-3 py-3 bg-white border border-slate-200 rounded-lg text-sm" />
                <input type="date" value={props.organizationReportCustomEnd} onChange={e => props.setOrganizationReportCustomEnd(e.target.value)} className="px-3 py-3 bg-white border border-slate-200 rounded-lg text-sm" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              ['Total de eventos', organizationTotals.events, Calendar],
              ['Eventos ativos', organizationTotals.active, CheckCircle2],
              ['Eventos futuros', organizationTotals.future, Clock],
              ['Eventos encerrados', organizationTotals.closed, History],
              ['Total de participantes', organizationTotals.participants, Users],
              ['Total de check-ins', organizationTotals.checkedIn, UserCheck],
              ['Participantes pendentes', organizationTotals.pending, AlertTriangle],
              ['Presença média', `${organizationTotals.averageAttendanceRate}%`, BarChart3],
              ['Acessos por área', organizationTotals.areaAccessTotal, ShieldCheck],
              ['Credenciamentos por operadores', organizationTotals.operatorCheckins, Users],
              ['Links visualizados', organizationTotals.credentialLinksViewed, Eye],
              ['Aberturas dos links', organizationTotals.credentialLinkOpenings, QrCode]
            ].map(([title, value, Icon]: any) => <div key={title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{title}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p></div><Icon size={20} className="text-emerald-700" /></div></div>)}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <MiniBars title="Evolução mensal de eventos" items={organizationMonthlyEvolution} />
            <MiniBars title="Ranking por participantes" items={organizationParticipantsRanking} />
            <MiniBars title="Comparativo de presença" items={organizationAttendanceRanking} suffix="%" />
            <MiniBars title="Comparativo por operadores" items={organizationOperatorComparison} />
          </div>
          <EventsTable events={organizationEvents} appEvents={props.events} setSelectedEvent={props.setSelectedEvent} setReportMode={props.setReportMode} setReportEventTab={props.setReportEventTab} />
        </div>
      ) : (
        <div className="space-y-5">
          <EventFilters {...props} />
          {!props.selectedEventId ? <EmptyEvent /> : (
            <>
              <Tabs tabs={eventTabs} active={props.reportEventTab} setActive={props.setReportEventTab} />
              {props.reportEventTab === 'summary' && <SummaryTab cards={metricCards} hours={props.reportCheckinsByHour} categories={props.reportParticipantsByCategory} operators={props.reportOperatorSummary} />}
              {props.reportEventTab === 'participants' && <ParticipantsTable {...props} />}
              {props.reportEventTab === 'checkin' && <CheckinTab {...props} />}
              {props.reportEventTab === 'access' && <AccessTab {...props} />}
              {props.reportEventTab === 'operators' && <OperatorsTab operators={props.reportOperatorSummary} />}
              {props.reportEventTab === 'prints' && <PrintsTab count={props.reportPrintedLabelsCount} logs={props.officialActionLogs} />}
              {props.reportEventTab === 'certificates' && <CertificatesTab certificates={props.reportCertificates} />}
              {props.reportEventTab === 'cloakroom' && <CloakroomTab {...props} />}
            </>
          )}
        </div>
      )}

      {customizeOpen && <ReportEditorPanel {...props} onClose={() => setCustomizeOpen(false)} />}
    </div>
  );
}

function EmptyEvent() {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><Calendar className="mx-auto mb-3 text-slate-300" size={34} /><h3 className="font-display text-lg font-black text-slate-900">Selecione um evento</h3><p className="mt-1 text-sm text-slate-500">O relatório por evento carrega apenas informações do evento escolhido.</p></div>;
}

function EventFilters(props: Props) {
  return <div className="report-print-controls bg-white border border-slate-200 rounded-2xl p-4 shadow-xs"><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3"><select value={props.selectedEventId} onChange={e => { const event = props.events.find(item => item.id === e.target.value); props.setSelectedEvent(e.target.value, event?.currentUserRole); }} className="px-3 py-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold"><option value="">Selecione um evento</option>{props.events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}</select><select value={props.selectedCategoryFilter} onChange={e => props.setSelectedCategoryFilter(e.target.value)} disabled={!props.selectedEventId} className="px-3 py-3 bg-white border border-slate-200 rounded-lg text-sm disabled:bg-slate-100"><option value="all">Todas as categorias</option><option value="VIP">VIP</option><option value="Palestrante">Palestrante</option><option value="Expositor">Expositor</option><option value="Participante">Participante</option><option value="Staff">Staff</option></select><select value={props.selectedPresenceFilter} onChange={e => props.setSelectedPresenceFilter(e.target.value as any)} disabled={!props.selectedEventId} className="px-3 py-3 bg-white border border-slate-200 rounded-lg text-sm disabled:bg-slate-100"><option value="all">Todos</option><option value="present">Credenciados</option><option value="absent">Pendentes</option></select><div className="relative"><Search size={16} className="absolute left-3 top-3.5 text-slate-400" /><input type="text" value={props.searchQuery} onChange={e => props.setSearchQuery(e.target.value)} disabled={!props.selectedEventId} placeholder="Nome, CPF ou QR Code" className="w-full pl-9 pr-3 py-3 bg-white border border-slate-200 rounded-lg text-sm disabled:bg-slate-100" /></div></div></div>;
}

function Tabs({ tabs, active, setActive }: { tabs: Array<{ id: ReportEventTab; label: string; icon: any }>; active: ReportEventTab; setActive: (tab: ReportEventTab) => void }) {
  return <div className="report-print-controls overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xs"><div className="flex min-w-max gap-2">{tabs.map(tab => { const Icon = tab.icon; return <button key={tab.id} type="button" onClick={() => setActive(tab.id)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${active === tab.id ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><Icon size={15} />{tab.label}</button>; })}</div></div>;
}

function SummaryTab({ cards, hours, categories, operators }: any) {
  return <div className="space-y-5"><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{cards.map((card: any) => { const Icon = card.icon; return <div key={card.title} className={`rounded-xl border p-4 shadow-xs ${card.color}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-wider opacity-75">{card.title}</p><p className="mt-2 text-3xl font-black text-slate-950">{card.value}</p></div><Icon size={20} /></div></div>; })}</div><div className="grid grid-cols-1 xl:grid-cols-3 gap-5"><MiniBars title="Check-ins por horário" items={hours.map((item: any) => ({ label: item.label, value: item.count }))} /><MiniBars title="Participantes por categoria" items={categories.map((item: any) => ({ label: item.label, value: item.count }))} /><MiniBars title="Credenciamentos por operador" items={operators} /></div></div>;
}

function MiniBars({ title, items, suffix = '' }: { title: string; items: Array<{ label: string; value: number }>; suffix?: string }) {
  const max = Math.max(...items.map(item => item.value), 1);
  return <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs"><h3 className="text-sm font-black text-slate-900 mb-4">{title}</h3>{items.length === 0 ? <p className="py-6 text-center text-sm font-semibold text-slate-500">Nenhum registro nos filtros atuais.</p> : items.map(item => <div key={item.label} className="mb-3 space-y-1"><div className="flex justify-between gap-3 text-xs font-bold text-slate-600"><span className="truncate">{item.label}</span><span>{item.value}{suffix}</span></div><div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max((item.value / max) * 100, 6)}%` }} /></div></div>)}</div>;
}

function EventsTable({ events, appEvents, setSelectedEvent, setReportMode, setReportEventTab }: any) {
  return <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"><div className="px-4 py-3 border-b border-slate-100"><h3 className="text-sm font-bold text-slate-900 font-display">Tabela consolidada de eventos</h3><p className="text-xs text-slate-500">{events.length} evento(s) nos filtros atuais.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left border-collapse"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Nome do evento</th><th className="p-3">Data</th><th className="p-3">Status</th><th className="p-3 text-right">Participantes</th><th className="p-3 text-right">Check-ins</th><th className="p-3 text-right">Pendentes</th><th className="p-3 text-right">Presença</th><th className="p-3">Local</th><th className="p-3 text-right">Ação</th></tr></thead><tbody>{events.length === 0 ? <tr><td colSpan={9} className="p-8 text-center text-sm font-semibold text-slate-500">Nenhum evento encontrado.</td></tr> : events.map((event: any) => <tr key={event.eventId} className="border-t border-slate-100 hover:bg-slate-50/70"><td className="p-3 font-bold text-slate-900">{event.name}</td><td className="p-3 text-slate-600">{event.date ? new Date(event.date).toLocaleDateString('pt-BR') : '-'}</td><td className="p-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{formatStatus(event.status)}</span></td><td className="p-3 text-right font-bold">{event.participants}</td><td className="p-3 text-right font-bold text-emerald-700">{event.checkedIn}</td><td className="p-3 text-right font-bold text-amber-700">{event.pending}</td><td className="p-3 text-right font-black">{event.attendanceRate}%</td><td className="p-3 text-slate-600">{event.location || '-'}</td><td className="p-3 text-right"><button type="button" onClick={() => { const target = appEvents.find((item: Event) => item.id === event.eventId); setSelectedEvent(event.eventId, target?.currentUserRole); setReportMode('event'); setReportEventTab('summary'); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50">Abrir evento</button></td></tr>)}</tbody></table></div></div>;
}

function ParticipantsTable(props: Props) {
  return <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"><div className="px-4 py-3 border-b border-slate-100"><h3 className="text-sm font-bold text-slate-900 font-display">Participantes</h3><p className="text-xs text-slate-500">{props.filteredParticipantsList.length} registro(s) nos filtros atuais.</p></div><div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[920px]"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Nome</th><th className="p-4">CPF</th><th className="p-4">Categoria</th><th className="p-4">Status</th><th className="p-4">Horário do check-in</th><th className="p-4">Links visualizados</th></tr></thead><tbody>{props.filteredParticipantsList.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-sm font-semibold text-slate-500">Nenhum participante nos filtros atuais.</td></tr> : props.filteredParticipantsList.map(p => <tr key={p.id} className="border-t border-slate-100"><td className="p-4"><div className="font-bold text-slate-800 text-sm">{p.name}</div><div className="text-xs text-slate-400">{p.email || 'E-mail não informado'}</div></td><td className="p-4 font-mono text-xs text-slate-700">{p.cpf ? p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '-'}</td><td className="p-4"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${CATEGORY_TAGS[p.category].bg}`}>{p.category}</span></td><td className="p-4">{props.isOfficialParticipantCheckin(p) ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold"><Check size={12} />Credenciado</span> : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold"><Clock size={12} />Pendente</span>}</td><td className="p-4 font-mono text-xs text-slate-700">{props.isOfficialParticipantCheckin(p) && p.checkedInAt ? new Date(p.checkedInAt).toLocaleString('pt-BR') : '-'}</td><td className="p-4 text-xs font-bold text-slate-700">{p.credentialViewCount || 0}</td></tr>)}</tbody></table></div></div>;
}

function CheckinTab(props: Props) {
  const checked = props.reportParticipants.filter(props.isOfficialParticipantCheckin);
  return <div className="grid grid-cols-1 xl:grid-cols-2 gap-5"><MiniBars title="Check-ins por horário" items={props.reportCheckinsByHour.map(item => ({ label: item.label, value: item.count }))} /><MiniBars title="Check-ins por operador" items={props.reportOperatorSummary} /><div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"><div className="px-4 py-3 border-b border-slate-100"><h3 className="text-sm font-bold text-slate-900 font-display">Check-ins realizados</h3><p className="text-xs text-slate-500">Pendentes: {props.reportSummary.pending}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Participante</th><th className="p-3">Categoria</th><th className="p-3">Horário</th><th className="p-3">Operador</th></tr></thead><tbody>{checked.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-sm font-semibold text-slate-500">Nenhum check-in realizado.</td></tr> : checked.map(p => <tr key={p.id} className="border-t border-slate-100"><td className="p-3 font-bold text-slate-800">{p.name}</td><td className="p-3 text-slate-600">{p.category}</td><td className="p-3 font-mono text-xs">{p.checkedInAt ? new Date(p.checkedInAt).toLocaleString('pt-BR') : '-'}</td><td className="p-3 text-slate-600">{props.getReportCheckinOperator(p)}</td></tr>)}</tbody></table></div></div></div>;
}

function AccessTab(props: Props) {
  return <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs"><div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5"><div><h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2"><ShieldCheck size={17} className="text-slate-500" />Controle de acesso</h3><p className="text-xs text-slate-500 mt-1">Acessos autorizados, negados e totais por área.</p></div><div className="flex gap-3 text-xs font-bold"><span className="text-emerald-700">{props.reportAreaAccessLogs.filter(log => log.status === 'ALLOWED').length} autorizados</span><span className="text-rose-700">{props.reportAreaAccessLogs.filter(log => log.status === 'DENIED').length} negados</span></div></div>{props.reportAreaAccessSummary.length === 0 ? <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50"><ShieldAlert className="mx-auto text-slate-300 mb-2" size={28} /><p className="text-sm font-semibold text-slate-500">Nenhum acesso por sala registrado nos filtros atuais.</p></div> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{props.reportAreaAccessSummary.map((item: any) => <div key={item.areaId} className="border border-slate-100 rounded-lg p-4 bg-slate-50/60"><div className="flex items-center justify-between gap-3 mb-3"><span className="font-bold text-slate-800 text-sm">{item.areaName}</span><span className="text-xs font-black text-slate-500">{item.total} leituras</span></div><div className="flex items-center justify-between text-xs text-slate-600"><span>{item.allowed} liberados</span><span>{item.denied} negados</span></div></div>)}</div>}</div>;
}

function OperatorsTab({ operators }: { operators: Array<{ label: string; value: number }> }) {
  return <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs"><h3 className="text-sm font-black text-slate-900 mb-4">Comparativo de produtividade</h3>{operators.length === 0 ? <p className="py-8 text-center text-sm font-semibold text-slate-500">Sem dados de operador para os filtros atuais.</p> : operators.map(item => <div key={item.label} className="mb-3 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"><span className="font-bold text-slate-800">{item.label}</span><span className="font-black text-emerald-700">{item.value} credenciamento(s)</span></div>)}</div>;
}

function PrintsTab({ count, logs }: { count: number; logs: any[] }) {
  const operators = new Set(logs.filter(log => log.action === 'REPRINT_BADGE' || log.action === 'REPRINT').map(log => log.userId)).size;
  return <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs"><h3 className="text-sm font-black text-slate-900 mb-4">Impressões</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-black uppercase text-slate-500">Total de etiquetas impressas</p><p className="mt-2 text-3xl font-black">{count}</p></div><div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-black uppercase text-slate-500">Reimpressões</p><p className="mt-2 text-3xl font-black">{count}</p></div><div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-black uppercase text-slate-500">Operadores</p><p className="mt-2 text-3xl font-black">{operators}</p></div></div></div>;
}

function CertificatesTab({ certificates }: { certificates: any[] }) {
  return <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs"><h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2 mb-5"><Award size={17} className="text-slate-500" />Certificados</h3><div className="overflow-x-auto border border-slate-100 rounded-lg"><table className="w-full text-sm min-w-[780px]"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left p-3">Código</th><th className="text-left p-3">Participante</th><th className="text-left p-3">Tipo</th><th className="text-left p-3">Atividade</th><th className="text-left p-3">Horas</th><th className="text-left p-3">Emissão</th></tr></thead><tbody>{certificates.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-slate-500 font-semibold">Nenhum certificado emitido para os participantes filtrados.</td></tr> : certificates.map(certificate => <tr key={certificate.id} className="border-t border-slate-100"><td className="p-3 font-mono text-xs font-bold text-slate-700">{certificate.certificateCode}</td><td className="p-3 font-bold text-slate-900">{certificate.participantName}</td><td className="p-3">{certificate.type === 'general' ? 'Geral' : 'Atividade'}</td><td className="p-3 text-slate-700">{certificate.type === 'activity' ? fixMojibake(certificate.activityTitle || '-') : '-'}</td><td className="p-3 font-black text-slate-900">{certificate.totalHours}h</td><td className="p-3 text-slate-600">{new Date(certificate.issuedAt).toLocaleString('pt-BR')}</td></tr>)}</tbody></table></div></div>;
}

function CloakroomTab(props: Props) {
  return <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs"><h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2 mb-5"><FolderLock size={17} className="text-slate-500" />Chapelaria</h3><div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-5">{[['Tickets', props.reportCloakroomSummary.totalTickets], ['Guardados', props.reportCloakroomSummary.stored], ['Retirados', props.reportCloakroomSummary.returned], ['Volumes totais', props.reportCloakroomSummary.totalVolumes], ['Volumes em guarda', props.reportCloakroomSummary.storedVolumes]].map(([title, value]: any) => <div key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p><p className="text-2xl font-black text-slate-950 mt-1">{value}</p></div>)}</div><div className="overflow-x-auto border border-slate-100 rounded-lg"><table className="w-full text-left border-collapse min-w-[980px]"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Ticket</th><th className="p-3">Participante</th><th className="p-3">Volumes</th><th className="p-3">Status</th><th className="p-3">Entrada</th><th className="p-3">Operador entrada</th><th className="p-3">Devolução</th><th className="p-3">Operador retirada</th></tr></thead><tbody>{props.reportCloakroomItems.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-slate-500 font-semibold">Nenhuma movimentação de chapelaria nos filtros atuais.</td></tr> : props.reportCloakroomItems.map(item => <tr key={item.id} className="border-t border-slate-100"><td className="p-3 font-mono text-xs font-black">#{item.tagNumber}</td><td className="p-3 font-bold text-slate-800">{item.participantName}</td><td className="p-3 text-sm font-bold text-slate-700">{props.getCloakroomItemVolumes(item).length}</td><td className="p-3">{item.status === 'retirado' ? 'Retirado' : 'Guardado'}</td><td className="p-3 font-mono text-xs">{new Date(item.registeredAt).toLocaleString('pt-BR')}</td><td className="p-3 text-xs text-slate-600">{item.registeredByName || '-'}</td><td className="p-3 font-mono text-xs">{item.returnedAt ? new Date(item.returnedAt).toLocaleString('pt-BR') : '-'}</td><td className="p-3 text-xs text-slate-600">{item.returnedByName || '-'}</td></tr>)}</tbody></table></div></div>;
}

function ReportEditorPanel(props: Props & { onClose: () => void }) {
  const [activeKind, setActiveKind] = useState<ReportPdfKind>('executive');
  const activeConfig = props.reportModelConfigs[activeKind];
  const optionCount = REPORT_OPTION_KEYS.filter(key => activeConfig.optionConfig[key]).length;

  const updateActiveModel = (updater: (current: typeof activeConfig) => typeof activeConfig) => {
    props.setReportModelConfigs(prev => ({
      ...prev,
      [activeKind]: updater(prev[activeKind])
    }));
  };

  const updateOption = (key: ReportOptionKey, checked: boolean) => {
    updateActiveModel(current => ({
      ...current,
      optionConfig: { ...current.optionConfig, [key]: checked }
    }));
  };

  const moveSection = (section: string, direction: -1 | 1) => {
    updateActiveModel(current => {
      const order = [...current.sectionOrder];
      const index = order.indexOf(section as any);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= order.length) return current;
      [order[index], order[target]] = [order[target], order[index]];
      return { ...current, sectionOrder: order };
    });
  };

  const resetActiveModel = () => {
    props.setReportModelConfigs(prev => ({
      ...prev,
      [activeKind]: DEFAULT_REPORT_MODEL_CONFIGS[activeKind]
    }));
  };

  const modelLabel = REPORT_MODEL_OPTIONS.find(item => item.kind === activeKind)?.label || 'Relatório';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-4">
      <div className="flex h-full max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 bg-slate-950 px-4 py-4 text-white sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-300">Editor de Relatórios</p>
              <h3 className="mt-1 font-display text-xl font-black">Personalizar relatórios</h3>
              <p className="mt-1 text-xs text-slate-300">As configurações ficam salvas para o evento selecionado e preservam os relatórios atuais como padrão.</p>
            </div>
            <button type="button" onClick={props.onClose} className="rounded-lg p-2 text-slate-300 hover:bg-white/10">
              <X size={18} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {REPORT_MODEL_OPTIONS.map(option => (
              <button
                key={option.kind}
                type="button"
                onClick={() => setActiveKind(option.kind)}
                className={`rounded-xl border px-4 py-3 text-left transition ${activeKind === option.kind ? 'border-emerald-300 bg-emerald-400 text-slate-950' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}`}
              >
                <span className="block text-sm font-black">{option.label}</span>
                <span className="mt-1 block text-[11px] opacity-75">{option.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4 border-b border-slate-100 bg-slate-50 p-4 lg:border-b-0 lg:border-r">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-black text-slate-950">Identidade visual</h4>
              <p className="mt-1 text-xs text-slate-500">Compartilhada pelos três modelos.</p>
              <div className="mt-4 space-y-3">
                <input value={props.reportBrandConfig.organizationName || ''} onChange={event => props.setReportBrandConfig(prev => ({ ...prev, organizationName: event.target.value }))} placeholder="Nome da organização no relatório" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={props.reportBrandConfig.showLogo} onChange={event => props.setReportBrandConfig(prev => ({ ...prev, showLogo: event.target.checked }))} />Exibir logo</label>
                <input type="url" value={props.reportBrandConfig.logoUrl} onChange={event => props.setReportBrandConfig(prev => ({ ...prev, logoUrl: event.target.value }))} placeholder="URL da logo" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs font-black text-slate-700">
                  <Upload size={15} /> Upload da logo
                  <input type="file" accept={REPORT_IMAGE_ACCEPT} onChange={event => { props.handleReportImageUpload(event.target.files?.[0], 'logoUrl'); event.currentTarget.value = ''; }} className="hidden" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] font-bold uppercase text-slate-500">Largura<input type="number" min={20} max={120} value={props.reportBrandConfig.logoWidth || 38} onChange={event => props.setReportBrandConfig(prev => ({ ...prev, logoWidth: Number(event.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm normal-case text-slate-900" /></label>
                  <label className="text-[11px] font-bold uppercase text-slate-500">Posição<select value={props.reportBrandConfig.logoPosition || 'left'} onChange={event => props.setReportBrandConfig(prev => ({ ...prev, logoPosition: event.target.value as any }))} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm normal-case text-slate-900"><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></select></label>
                </div>
                <p className="rounded-lg bg-emerald-50 p-3 text-[11px] font-semibold leading-relaxed text-emerald-800">Recomendado: PNG transparente ou SVG. Para PNG, utilizar preferencialmente 1200 px ou mais de largura.</p>
                <button type="button" onClick={() => props.setReportBrandConfig(prev => ({ ...prev, showLogo: false, logoUrl: '' }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Remover logo</button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-black text-slate-950">Marca d'água</h4>
              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={props.reportBrandConfig.showWatermark} onChange={event => props.setReportBrandConfig(prev => ({ ...prev, showWatermark: event.target.checked }))} />Ativar marca d'água</label>
                <input type="url" value={props.reportBrandConfig.watermarkUrl} onChange={event => props.setReportBrandConfig(prev => ({ ...prev, watermarkUrl: event.target.value }))} placeholder="URL da marca d'água" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs font-black text-slate-700">
                  <Upload size={15} /> Upload da marca
                  <input type="file" accept={REPORT_IMAGE_ACCEPT} onChange={event => { props.handleReportImageUpload(event.target.files?.[0], 'watermarkUrl'); event.currentTarget.value = ''; }} className="hidden" />
                </label>
                <label className="block text-[11px] font-bold uppercase text-slate-500">Opacidade: {Math.round((props.reportBrandConfig.watermarkOpacity || 0) * 100)}%<input type="range" min="0" max="0.30" step="0.01" value={props.reportBrandConfig.watermarkOpacity} onChange={event => props.setReportBrandConfig(prev => ({ ...prev, watermarkOpacity: Number(event.target.value) }))} className="mt-1 w-full" /></label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] font-bold uppercase text-slate-500">Tamanho<input type="number" min={40} max={180} value={props.reportBrandConfig.watermarkSize || 118} onChange={event => props.setReportBrandConfig(prev => ({ ...prev, watermarkSize: Number(event.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm normal-case text-slate-900" /></label>
                  <label className="text-[11px] font-bold uppercase text-slate-500">Posição<select value={props.reportBrandConfig.watermarkPosition || 'center'} onChange={event => props.setReportBrandConfig(prev => ({ ...prev, watermarkPosition: event.target.value as any }))} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm normal-case text-slate-900"><option value="center">Centro</option><option value="top">Topo</option><option value="bottom">Rodapé</option><option value="left">Esquerda</option><option value="right">Direita</option></select></label>
                </div>
                <p className="rounded-lg bg-amber-50 p-3 text-[11px] font-semibold leading-relaxed text-amber-800">Recomendado: PNG transparente com pelo menos 1600 x 1600 px quando ocupar grande área da página.</p>
                <button type="button" onClick={() => props.setReportBrandConfig(prev => ({ ...prev, showWatermark: false, watermarkUrl: '' }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Remover marca</button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-black text-slate-950">Cores</h4>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ['primaryColor', 'Principal'],
                  ['secondaryColor', 'Secundária'],
                  ['backgroundColor', 'Fundo capa'],
                  ['titleColor', 'Títulos'],
                  ['textColor', 'Textos']
                ].map(([key, label]) => (
                  <label key={key} className="text-[11px] font-bold uppercase text-slate-500">{label}<input type="color" value={(props.reportBrandConfig as any)[key] || '#101828'} onChange={event => props.setReportBrandConfig(prev => ({ ...prev, [key]: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white" /></label>
                ))}
              </div>
            </div>
          </aside>

          <main className="space-y-4 p-4 sm:p-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Modelo selecionado</p>
                  <h4 className="font-display text-lg font-black text-slate-950">{modelLabel}</h4>
                  <p className="text-xs text-slate-500">{optionCount} informação(ões) ativa(s).</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => updateActiveModel(current => ({ ...current, optionConfig: REPORT_OPTION_KEYS.reduce((acc, key) => ({ ...acc, [key]: true }), {} as ReportConfig) }))} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white">Selecionar tudo</button>
                  <button type="button" onClick={() => updateActiveModel(current => ({ ...current, optionConfig: REPORT_OPTION_KEYS.reduce((acc, key) => ({ ...acc, [key]: false }), {} as ReportConfig) }))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Limpar</button>
                  <button type="button" onClick={resetActiveModel} className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Restaurar padrão</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <h5 className="text-sm font-black text-slate-950">Textos editáveis</h5>
                <div className="mt-3 space-y-3">
                  {[
                    ['title', 'Título'],
                    ['eventName', 'Nome do evento'],
                    ['organizationName', 'Organização'],
                    ['eventDate', 'Data'],
                    ['eventLocation', 'Local'],
                    ['eventStatus', 'Status'],
                    ['filters', 'Filtros'],
                    ['issuedAt', 'Data de emissão'],
                    ['executiveSummary', 'Resumo executivo']
                  ].map(([key, label]) => {
                    const value = (activeConfig as any)[key];
                    return (
                      <div key={key} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-xs font-black text-slate-700">{label}</span>
                          <select value={value.mode} onChange={event => updateActiveModel(current => ({ ...current, [key]: { ...(current as any)[key], mode: event.target.value } as any }))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold">
                            <option value="auto">Automático</option>
                            <option value="custom">Personalizado</option>
                            <option value="hidden">Oculto</option>
                          </select>
                        </div>
                        {value.mode === 'custom' && <textarea value={value.text} onChange={event => updateActiveModel(current => ({ ...current, [key]: { ...(current as any)[key], text: event.target.value } as any }))} placeholder="Texto personalizado apenas para o relatório" className="mt-2 min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />}
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <input type="number" min={7} max={32} value={value.fontSize} onChange={event => updateActiveModel(current => ({ ...current, [key]: { ...(current as any)[key], fontSize: Number(event.target.value) } as any }))} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs" />
                          <select value={value.align} onChange={event => updateActiveModel(current => ({ ...current, [key]: { ...(current as any)[key], align: event.target.value } as any }))} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"><option value="left">Esq.</option><option value="center">Centro</option><option value="right">Dir.</option></select>
                          <label className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-bold"><input type="checkbox" checked={value.bold} onChange={event => updateActiveModel(current => ({ ...current, [key]: { ...(current as any)[key], bold: event.target.checked } as any }))} />Negrito</label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <h5 className="text-sm font-black text-slate-950">Indicadores</h5>
                  <div className="mt-3 space-y-2">
                    {['Participantes inscritos', 'Check-ins realizados', 'Check-ins pendentes', 'Taxa geral de presença', 'Participantes que visualizaram'].map(label => (
                      <div key={label} className="grid grid-cols-[auto_1fr] items-center gap-2 rounded-lg bg-slate-50 p-2">
                        <input type="checkbox" checked={!activeConfig.hiddenMetricIds.includes(label)} onChange={event => updateActiveModel(current => ({ ...current, hiddenMetricIds: event.target.checked ? current.hiddenMetricIds.filter(item => item !== label) : [...new Set([...current.hiddenMetricIds, label])] }))} />
                        <input value={activeConfig.metricTitles[label] || label} onChange={event => updateActiveModel(current => ({ ...current, metricTitles: { ...current.metricTitles, [label]: event.target.value } }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h5 className="text-sm font-black text-slate-950">Gráficos</h5>
                  <div className="mt-3 space-y-2">
                    {REPORT_CHART_OPTIONS.map(chart => (
                      <div key={chart.key} className="grid grid-cols-[auto_1fr] items-center gap-2 rounded-lg bg-slate-50 p-2">
                        <input type="checkbox" checked={!activeConfig.hiddenChartKeys.includes(chart.key)} onChange={event => updateActiveModel(current => ({ ...current, hiddenChartKeys: event.target.checked ? current.hiddenChartKeys.filter(item => item !== chart.key) : [...new Set([...current.hiddenChartKeys, chart.key])] }))} />
                        <input value={activeConfig.chartTitles[chart.key] || chart.label} onChange={event => updateActiveModel(current => ({ ...current, chartTitles: { ...current.chartTitles, [chart.key]: event.target.value } }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h5 className="text-sm font-black text-slate-950">Tabelas detalhadas</h5>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {REPORT_TABLE_OPTIONS.map(table => (
                      <label key={table.key} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                        <input type="checkbox" checked={activeConfig.tableVisibility[table.key]} onChange={event => updateActiveModel(current => ({ ...current, tableVisibility: { ...current.tableVisibility, [table.key]: event.target.checked } }))} />
                        {table.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <h5 className="text-sm font-black text-slate-950">Ordem das seções</h5>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {activeConfig.sectionOrder.map((section, index) => (
                  <div key={section} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <span className="text-xs font-bold text-slate-700">{index + 1}. {section}</span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveSection(section, -1)} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-black">↑</button>
                      <button type="button" onClick={() => moveSection(section, 1)} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-black">↓</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {REPORT_CONFIG_GROUPS.map(group => {
              const selectedCount = group.keys.filter(item => activeConfig.optionConfig[item.key]).length;
              return (
                <div key={group.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h5 className="text-sm font-black text-slate-950">{group.title}</h5>
                      <p className="text-xs text-slate-500">{group.description}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">{selectedCount}/{group.keys.length}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {group.keys.map(item => (
                      <label key={item.key} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                        <input type="checkbox" checked={activeConfig.optionConfig[item.key]} onChange={event => updateOption(item.key, event.target.checked)} />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </main>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-end">
          <button type="button" onClick={props.onClose} className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-700">Salvar</button>
          <button type="button" onClick={props.onClose} className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-700">Visualizar</button>
          <button type="button" onClick={resetActiveModel} className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">Restaurar padrão</button>
          <button type="button" onClick={() => props.handleGenerateReportPdf(activeKind)} className="rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white">Gerar PDF</button>
        </div>
      </div>
    </div>
  );
}

function CustomizePanel(props: Props & { onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/50 p-4"><div className="h-full max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4"><div><h3 className="text-lg font-black text-slate-950 font-display">Personalizar relatório</h3><p className="text-xs text-slate-500">{props.getReportSelectedOptionCount()} informação(ões) selecionada(s).</p></div><button type="button" onClick={props.onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div><div className="p-5 space-y-5"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => props.setAllReportOptions(true)} className="px-3 py-2 rounded-lg bg-slate-950 text-white text-xs font-bold">Selecionar tudo</button><button type="button" onClick={() => props.setAllReportOptions(false)} className="px-3 py-2 rounded-lg bg-white text-slate-700 border border-slate-200 text-xs font-bold">Limpar seleção</button><button type="button" onClick={props.resetReportOptions} className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold">Restaurar padrão</button></div>{REPORT_CONFIG_GROUPS.map(group => { const selectedCount = group.keys.filter(item => props.reportConfig[item.key]).length; return <div key={group.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="text-sm font-black text-slate-900">{group.title}</h4><p className="text-xs text-slate-500 mt-1">{group.description}</p></div><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">{selectedCount}/{group.keys.length}</span></div><div className="mt-3 space-y-2">{group.keys.map(item => <label key={item.key} className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer"><input type="checkbox" checked={props.reportConfig[item.key]} onChange={event => props.updateReportOption(item.key, event.target.checked)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-100" /><span>{item.label}</span></label>)}</div></div>; })}<div className="rounded-xl border border-slate-200 p-4 space-y-3"><div className="flex items-center justify-between"><h4 className="text-sm font-black text-slate-900">Logo e marca d'água</h4><button type="button" onClick={() => props.setReportBrandConfig(DEFAULT_REPORT_BRAND_CONFIG)} className="text-xs font-bold text-slate-500 hover:text-slate-900">Limpar marca</button></div><label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={props.reportBrandConfig.showLogo} onChange={event => props.setReportBrandConfig(prev => ({ ...prev, showLogo: event.target.checked }))} className="rounded border-slate-300" />Exibir logo</label><input type="url" value={props.reportBrandConfig.logoUrl} onChange={event => props.setReportBrandConfig(prev => ({ ...prev, logoUrl: event.target.value }))} placeholder="URL da logo" className="w-full px-3 py-3 bg-white border border-slate-200 rounded-lg text-sm" /><label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={props.reportBrandConfig.showWatermark} onChange={event => props.setReportBrandConfig(prev => ({ ...prev, showWatermark: event.target.checked }))} className="rounded border-slate-300" />Exibir marca d'água</label><input type="url" value={props.reportBrandConfig.watermarkUrl} onChange={event => props.setReportBrandConfig(prev => ({ ...prev, watermarkUrl: event.target.value }))} placeholder="URL da marca d'água" className="w-full px-3 py-3 bg-white border border-slate-200 rounded-lg text-sm" /><div><div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-500 mb-1"><span>Opacidade</span><span>{Math.round(props.reportBrandConfig.watermarkOpacity * 100)}%</span></div><input type="range" min="0.10" max="0.45" step="0.01" value={props.reportBrandConfig.watermarkOpacity} onChange={event => props.setReportBrandConfig(prev => ({ ...prev, watermarkOpacity: Number(event.target.value) }))} className="w-full" /></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><label className="flex items-center justify-center gap-2 px-3 py-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg text-sm font-bold text-slate-700 cursor-pointer"><Upload size={16} /><span>Upload da logo</span><input type="file" accept={REPORT_IMAGE_ACCEPT} onChange={event => { props.handleReportImageUpload(event.target.files?.[0], 'logoUrl'); event.currentTarget.value = ''; }} className="hidden" /></label><label className="flex items-center justify-center gap-2 px-3 py-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg text-sm font-bold text-slate-700 cursor-pointer"><Upload size={16} /><span>Upload da marca</span><input type="file" accept={REPORT_IMAGE_ACCEPT} onChange={event => { props.handleReportImageUpload(event.target.files?.[0], 'watermarkUrl'); event.currentTarget.value = ''; }} className="hidden" /></label></div><p className="text-[11px] text-slate-400">Formatos suportados: {REPORT_IMAGE_FORMATS}. Tamanho máximo: 2 MB.</p></div></div></div></div>;
}
