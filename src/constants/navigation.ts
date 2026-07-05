import type { ActiveTab } from '../types';

export const ACTIVE_TAB_STORAGE_KEY = 'credencia_active_tab';
export const CURRENT_EVENT_ID_STORAGE_KEY = 'currentEventId';
export const CURRENT_USER_ROLE_STORAGE_KEY = 'currentUserRole';
export const LEGACY_SELECTED_EVENT_ID_STORAGE_KEY = 'credencia_selected_event_id';

export const ACTIVE_TABS: ActiveTab[] = [
  'dashboard',
  'eventos-ativos',
  'evento-dashboard',
  'eventos',
  'participantes',
  'inscricoes-online',
  'checkin',
  'checkin-mobile',
  'checkin-modular',
  'scanner',
  'atividades',
  'presenca-atividade',
  'certificados',
  'areas',
  'chapelaria',
  'relatorios',
  'impressao',
  'etiquetas',
  'usuarios',
  'campos'
];

export const isActiveTab = (value: string | null): value is ActiveTab => {
  return !!value && ACTIVE_TABS.includes(value as ActiveTab);
};
