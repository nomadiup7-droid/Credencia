import type { ImportTargetField } from '../types';

export const IMPORT_TARGET_OPTIONS: Array<{ value: ImportTargetField; label: string }> = [
  { value: 'name', label: 'Nome' },
  { value: 'cpf', label: 'CPF' },
  { value: 'email', label: 'Email' },
  { value: 'company', label: 'Empresa' },
  { value: 'category', label: 'Categoria' },
  { value: 'ticketCode', label: 'Codigo QR / Codigo do ingresso' },
  { value: 'areas', label: 'Area de acesso' },
  { value: 'profile', label: 'Perfil de acesso' },
  { value: 'ignore', label: 'Ignorar coluna' }
];

export const DEFAULT_IMPORT_FIELD_ORDER: ImportTargetField[] = ['name', 'cpf', 'email', 'company', 'category', 'ticketCode', 'areas', 'profile'];
export const IMPORT_TEMPLATES_STORAGE_KEY = 'credencia_import_templates';
