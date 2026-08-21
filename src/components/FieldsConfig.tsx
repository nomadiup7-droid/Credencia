import React, { useState, useEffect } from 'react';
import { ParticipantField } from '../types';
import { 
  Plus, 
  Trash2, 
  Check, 
  X, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  RefreshCw, 
  Sliders, 
  ToggleLeft, 
  ToggleRight, 
  AlertTriangle 
} from 'lucide-react';

interface FieldsConfigProps {
  apiCall: (endpoint: string, options?: RequestInit) => Promise<any>;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  currentUser: any;
}

type FilterKey = 'all' | 'active' | 'inactive' | 'system' | 'custom';

const SYSTEM_FIELD_KEYS: Record<string, string> = {
  f_name: 'name',
  f_badge_name: 'badge_name',
  f_email: 'email',
  f_phone: 'phone',
  f_cpf: 'cpf',
  f_company: 'company',
  f_position: 'position',
  f_category: 'category'
};

const SYSTEM_FIELD_IDS = new Set(Object.keys(SYSTEM_FIELD_KEYS));
const SUPPORTED_TYPES: ParticipantField['type'][] = ['text', 'number', 'email', 'select', 'checkbox'];

const typeLabels: Record<ParticipantField['type'], string> = {
  text: 'Texto',
  number: 'Numero',
  email: 'E-mail',
  select: 'Selecao',
  checkbox: 'Sim/Nao'
};

const sortFields = (list: ParticipantField[]) =>
  [...list].sort((a, b) => (a.order || 0) - (b.order || 0)).map((field, index) => ({ ...field, order: index + 1 }));

const getFieldKey = (field: ParticipantField) => field.key || SYSTEM_FIELD_KEYS[field.id] || field.id;
const isSystemField = (field: ParticipantField) => field.system === true || SYSTEM_FIELD_IDS.has(field.id);
const isEssentialField = (field: ParticipantField) => field.essential === true || field.id === 'f_name';
const hasAnswers = (field: ParticipantField) => Number(field.answerCount || 0) > 0;
const splitOptions = (value: string) => [...new Set(value.split(',').map(opt => opt.trim()).filter(Boolean))];
const createFieldId = (name: string) => {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32) || 'campo';
  const suffix = globalThis.crypto?.randomUUID?.().slice(0, 8) || String(Date.now()).slice(-8);
  return `f_custom_${slug}_${suffix}`;
};

export default function FieldsConfig({ apiCall, addToast, currentUser }: FieldsConfigProps) {
  const [fields, setFields] = useState<ParticipantField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  // New Field Form States
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<ParticipantField['type']>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptionsString, setNewFieldOptionsString] = useState('');

  // Editing state
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editFieldName, setEditFieldName] = useState('');
  const [editFieldRequired, setEditFieldRequired] = useState(false);
  const [editFieldOptionsString, setEditFieldOptionsString] = useState('');

  // Fetch configured fields
  const fetchFields = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await apiCall('/api/fields');
      setFields(sortFields(Array.isArray(data) ? data : []));
    } catch (err: any) {
      const message = err.message || 'Erro ao carregar campos de cadastro';
      setLoadError(message);
      addToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  // Save fields configuration to disk
  const handleSaveFields = async (updatedFieldsList: ParticipantField[]) => {
    setIsSaving(true);
    try {
      const orderedFields = sortFields(updatedFieldsList);
      const response = await apiCall('/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: orderedFields })
      });
      if (response.success) {
        setFields(sortFields(response.fields || orderedFields));
        addToast('Configuração de campos de cadastro salva com sucesso!', 'success');
      } else {
        addToast(response.error || 'Erro ao salvar configurações', 'error');
      }
    } catch (err: any) {
      addToast(err.message || 'Erro ao comunicar com o servidor', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncFields = async () => {
    setIsSyncing(true);
    try {
      const response = await apiCall('/api/fields/sync', { method: 'POST' });
      if (response.success) {
        setFields(sortFields(response.fields || []));
        addToast('Campos de sistema sincronizados sem duplicar dados.', 'success');
      } else {
        addToast(response.error || 'Erro ao sincronizar campos de cadastro', 'error');
      }
    } catch (err: any) {
      addToast(err.message || 'Erro ao sincronizar campos de cadastro', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Add a new custom field
  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) {
      addToast('O nome do campo é obrigatório.', 'warning');
      return;
    }
    if (fields.some(field => field.name.trim().toLowerCase() === newFieldName.trim().toLowerCase())) {
      addToast('Já existe um campo com esse nome.', 'warning');
      return;
    }

    const fieldId = createFieldId(newFieldName);
    
    // Parse options list if type select
    let options: string[] | undefined = undefined;
    if (newFieldType === 'select') {
      options = splitOptions(newFieldOptionsString);
      
      if (options.length === 0) {
        addToast('Campos do tipo seleção exigem pelo menos uma opção separada por vírgulas.', 'warning');
        return;
      }
    }

    const newField: ParticipantField = {
      id: fieldId,
      name: newFieldName.trim(),
      type: newFieldType,
      required: newFieldRequired,
      active: true,
      options,
      order: fields.length + 1
    };

    const updated = [...fields, newField];
    setFields(updated);
    handleSaveFields(updated);

    // Reset Form
    setNewFieldName('');
    setNewFieldType('text');
    setNewFieldRequired(false);
    setNewFieldOptionsString('');
  };

  // Toggle field properties (Active / Required)
  const handleToggleActive = (id: string) => {
    // Prevent disabling critical "Name" field as it is strictly necessary
    const field = fields.find(f => f.id === id);
    if (field && isEssentialField(field)) {
      addToast('O campo "Nome Completo" é obrigatório para funcionamento e emissão do crachá.', 'warning');
      return;
    }

    const updated = fields.map(f => {
      if (f.id === id) {
        return { ...f, active: !f.active };
      }
      return f;
    });
    setFields(updated);
    handleSaveFields(updated);
  };

  const handleToggleRequired = (id: string) => {
    // Prevent setting Name as optional
    const field = fields.find(f => f.id === id);
    if (field && isEssentialField(field)) {
      addToast('O campo "Nome Completo" deve obrigatoriamente ser requerido.', 'warning');
      return;
    }

    const updated = fields.map(f => {
      if (f.id === id) {
        return { ...f, required: !f.required };
      }
      return f;
    });
    setFields(updated);
    handleSaveFields(updated);
  };

  // Delete customized fields
  const handleDeleteField = (id: string) => {
    // Block deleting default fields
    const target = fields.find(f => f.id === id);
    if (!target) return;
    if (isSystemField(target)) {
      addToast('Para segurança do sistema, campos padrão não podem ser deletados (apenas desativados).', 'warning');
      return;
    }
    const confirmed = window.confirm(hasAnswers(target)
      ? 'Este campo possui respostas. Ele será desativado e mantido para preservar o histórico. Deseja continuar?'
      : 'Este campo será desativado e ficará preservado no histórico. Deseja continuar?');
    if (!confirmed) return;
    const updated = fields.map(f => f.id === id ? { ...f, active: false } : f);
    setFields(updated);
    handleSaveFields(updated);
  };

  // Field positioning ordering controls
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newFields = [...fields];
    const temp = newFields[index];
    newFields[index] = newFields[index - 1];
    newFields[index - 1] = temp;

    // re-assign orders
    const updated = newFields.map((f, idx) => ({ ...f, order: idx + 1 }));
    setFields(updated);
    handleSaveFields(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === fields.length - 1) return;
    const newFields = [...fields];
    const temp = newFields[index];
    newFields[index] = newFields[index + 1];
    newFields[index + 1] = temp;

    const updated = newFields.map((f, idx) => ({ ...f, order: idx + 1 }));
    setFields(updated);
    handleSaveFields(updated);
  };

  // Inline editing saving
  const startEditing = (field: ParticipantField) => {
    setEditingFieldId(field.id);
    setEditFieldName(field.name);
    setEditFieldRequired(field.required);
    setEditFieldOptionsString(field.options ? field.options.join(', ') : '');
  };

  const saveEditing = () => {
    if (!editFieldName.trim()) {
      addToast('O nome do campo não pode ser vazio.', 'warning');
      return;
    }
    if (fields.some(field => field.id !== editingFieldId && field.name.trim().toLowerCase() === editFieldName.trim().toLowerCase())) {
      addToast('Já existe um campo com esse nome.', 'warning');
      return;
    }

    const updated = fields.map(f => {
      if (f.id === editingFieldId) {
        let options: string[] | undefined = undefined;
        if (f.type === 'select') {
          options = splitOptions(editFieldOptionsString);
          if (options.length === 0) {
            addToast('Campos do tipo seleção exigem pelo menos uma opção.', 'warning');
            return f;
          }
        }

        return {
          ...f,
          name: editFieldName.trim(),
          required: isEssentialField(f) ? true : editFieldRequired,
          active: isEssentialField(f) ? true : f.active,
          options
        };
      }
      return f;
    });

    setFields(updated);
    handleSaveFields(updated);
    setEditingFieldId(null);
  };

  const counters = {
    total: fields.length,
    active: fields.filter(f => f.active !== false).length,
    inactive: fields.filter(f => f.active === false).length,
    system: fields.filter(isSystemField).length,
    custom: fields.filter(f => !isSystemField(f)).length
  };

  const filterOptions: Array<{ id: FilterKey; label: string; count: number }> = [
    { id: 'all', label: 'Todos', count: counters.total },
    { id: 'active', label: 'Ativos', count: counters.active },
    { id: 'inactive', label: 'Inativos', count: counters.inactive },
    { id: 'system', label: 'Sistema', count: counters.system },
    { id: 'custom', label: 'Personalizados', count: counters.custom }
  ];

  const visibleFields = fields.filter(field => {
    if (filter === 'active') return field.active !== false;
    if (filter === 'inactive') return field.active === false;
    if (filter === 'system') return isSystemField(field);
    if (filter === 'custom') return !isSystemField(field);
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="text-blue-600" size={24} />
            <span>Campos Configuração de Cadastro</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Gerencie quais informações são coletadas dos participantes durante o cadastro de chegada no evento.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={fetchFields}
            disabled={isLoading || isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer select-none disabled:opacity-60"
          >
            {isLoading ? <RefreshCw className="animate-spin" size={12} /> : <RefreshCw size={12} />}
            <span>Recarregar</span>
          </button>
          <button
            onClick={handleSyncFields}
            disabled={isSyncing || isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer select-none disabled:opacity-60"
          >
            {isSyncing ? <RefreshCw className="animate-spin" size={12} /> : <RefreshCw size={12} />}
            <span>Sincronizar sistema</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total</p>
          <p className="text-2xl font-black text-slate-900">{counters.total}</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Ativos</p>
          <p className="text-2xl font-black text-emerald-800">{counters.active}</p>
        </div>
        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">Sistema</p>
          <p className="text-2xl font-black text-blue-900">{counters.system}</p>
        </div>
        <div className="bg-violet-50 rounded-2xl border border-violet-100 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-violet-700">Personalizados</p>
          <p className="text-2xl font-black text-violet-900">{counters.custom}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left segment - Add custom field form */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm h-fit">
          <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider mb-4 font-display flex items-center gap-1.5 pb-2 border-b">
            <span> Criar Novo Campo</span>
          </h3>

          <form onSubmit={handleAddField} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Nome do Campo *
              </label>
              <input
                type="text"
                value={newFieldName}
                onChange={e => setNewFieldName(e.target.value)}
                placeholder="Ex: Celular, Cargo, Refeição"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Tipo do Dado
              </label>
              <select
                value={newFieldType}
                onChange={e => setNewFieldType(e.target.value as ParticipantField['type'])}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
              >
                <option value="text">Texto Simples</option>
                <option value="number">Numérico</option>
                <option value="email">E-mail</option>
                <option value="select">Seleção (Múltiplas opções)</option>
                <option value="checkbox">Sim/Não (Caixa de seleção)</option>
              </select>
            </div>

            {newFieldType === 'select' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Opções de Escolha *
                </label>
                <textarea
                  value={newFieldOptionsString}
                  onChange={e => setNewFieldOptionsString(e.target.value)}
                  placeholder="Opção 1, Opção 2, Opção 3 (separe por vírgula)"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition h-16 resize-none"
                  required
                />
              </div>
            )}

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newFieldRequired}
                  onChange={e => setNewFieldRequired(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer animate-none"
                />
                <span className="text-xs text-slate-705 text-slate-700 font-bold">Definir como campo obrigatório</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-98 disabled:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              {isSaving ? <RefreshCw className="animate-spin" size={13} /> : <Plus size={13} />}
              <span>Adicionar e Ativar Campo</span>
            </button>
          </form>
        </div>

        {/* Right segment - Fields Order and Grid configuring */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider font-display flex items-center gap-1.5">
              <span> Ordem e Moderação de Formulário</span>
            </h3>

            <div className="text-[10px] text-slate-400 font-black">
              CAMPOS ATIVOS: {counters.active} / {counters.total}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterOptions.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition ${
                  filter === option.id
                    ? 'bg-slate-950 text-white border-slate-950'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {option.label} {option.count}
              </button>
            ))}
          </div>

          {loadError ? (
            <div className="text-center py-12 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-bold">
              <AlertTriangle className="mx-auto mb-2" size={24} />
              <p>Não foi possível carregar os campos de cadastro.</p>
              <p className="mt-1 font-medium">{loadError}</p>
              <button onClick={fetchFields} className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl font-black">
                Tentar novamente
              </button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-20 text-slate-400 text-xs">
              <RefreshCw className="animate-spin mx-auto mb-2" size={18} />
              Carregando campos de cadastro...
            </div>
          ) : (
            <div className="space-y-3">
              {visibleFields.map((f, idx) => {
                const isUnderEdit = editingFieldId === f.id;
                const isDefaultField = isSystemField(f);
                const isEssential = isEssentialField(f);

                return (
                  <div 
                    key={f.id} 
                    className={`p-4 border rounded-xl transition duration-150 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white ${
                      f.active ? 'border-slate-150' : 'border-slate-100 bg-slate-50/40 opacity-70'
                    }`}
                  >
                    
                    {/* Position arrows and visual indicators */}
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className="flex flex-col gap-0.5 shrink-0 select-none">
                        <button 
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0 || filter !== 'all'}
                          title="Mover para cima"
                          className="p-1 text-slate-405 text-slate-400 hover:text-slate-800 rounded disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button 
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === visibleFields.length - 1 || filter !== 'all'}
                          title="Mover para baixo"
                          className="p-1 text-slate-405 text-slate-400 hover:text-slate-800 rounded disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>

                      {isUnderEdit ? (
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={editFieldName}
                            onChange={e => setEditFieldName(e.target.value)}
                            className="px-2 py-1 border rounded text-xs font-semibold focus:outline-none w-full max-w-sm"
                          />

                          {f.type === 'select' && (
                            <input
                              type="text"
                              value={editFieldOptionsString}
                              onChange={e => setEditFieldOptionsString(e.target.value)}
                              placeholder="Opção 1, Opção 2 (separado por vírgula)"
                              className="px-2 py-1 border rounded text-xs font-mono w-full max-w-sm"
                            />
                          )}

                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-600">
                              <input
                                type="checkbox"
                                checked={editFieldRequired}
                                onChange={e => setEditFieldRequired(e.target.checked)}
                                className="w-3.5 h-3.5"
                                disabled={f.id === 'f_name'}
                              />
                              <span>Obrigatório</span>
                            </label>

                            <div className="flex items-center gap-1">
                              <button 
                                onClick={saveEditing}
                                className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                Salvar
                              </button>
                              <button 
                                onClick={() => setEditingFieldId(null)}
                                className="px-2 py-1 border rounded text-[10px] text-slate-550 text-slate-500 cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold text-slate-800 truncate block">
                              {f.name}
                            </span>
                            {f.required ? (
                              <span className="text-[8px] uppercase font-black bg-rose-50 text-rose-650 text-rose-500 px-1 py-0.2 rounded tracking-wider">
                                Obrigatório
                              </span>
                            ) : (
                              <span className="text-[8px] uppercase font-black bg-slate-50 text-slate-400 px-1 py-0.2 rounded tracking-wider">
                                Opcional
                              </span>
                            )}
                            {isDefaultField && (
                              <span className="text-[8px] uppercase font-black bg-blue-50 text-blue-600 px-1 py-0.2 rounded tracking-wider select-none">
                                Sistema
                              </span>
                            )}
                            {!isDefaultField && (
                              <span className="text-[8px] uppercase font-black bg-violet-50 text-violet-600 px-1 py-0.2 rounded tracking-wider select-none">
                                Personalizado
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-405 text-slate-400 mt-1 flex flex-wrap gap-2 font-medium">
                            <span>Chave: <b className="font-mono text-slate-600">{getFieldKey(f)}</b></span>
                            <span>Tipo: <b className="font-bold text-slate-600 uppercase">{typeLabels[f.type] || f.type}</b></span>
                            <span>Respostas: <b className="font-bold text-slate-600">{f.answerCount || 0}</b></span>
                            {f.options && (
                              <span className="truncate max-w-[240px]">Opções: <b className="font-mono text-slate-600">{f.options.join(', ')}</b></span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Operational moderation controls */}
                    <div className="flex items-center gap-2 justify-end self-center select-none shrink-0">
                      
                      {/* Active toggle */}
                      <button
                        onClick={() => handleToggleActive(f.id)}
                        disabled={isEssential}
                        className={`p-1 flex items-center gap-1 rounded-lg text-[10px] font-bold uppercase transition border ${
                          f.active 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-150 hover:bg-emerald-100' 
                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                        }`}
                        title={f.active ? "Desativar campo de cadastro" : "Ativar campo de cadastro"}
                      >
                        {f.active ? (
                          <>
                            <Check size={12} />
                            <span>Ativo</span>
                          </>
                        ) : (
                          <>
                            <X size={12} />
                            <span>Inativo</span>
                          </>
                        )}
                      </button>

                      {/* Required toggle */}
                      <button
                        onClick={() => handleToggleRequired(f.id)}
                        className={`p-1 flex items-center gap-1 rounded-lg text-[10px] font-bold uppercase transition border ${
                          f.required 
                            ? 'bg-rose-50 text-rose-600 border-rose-150 hover:bg-rose-100' 
                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                        }`}
                        title={f.required ? "Mudar para Opcional" : "Mudar para Obrigatório"}
                        disabled={isEssential}
                      >
                        <span>REQ</span>
                      </button>

                      {/* Inline edit */}
                      <button
                        onClick={() => startEditing(f)}
                        className="p-1.5 border border-slate-200 text-slate-500 hover:text-blue-500 hover:bg-slate-50 rounded-lg text-xs"
                        title="Editar nome ou opções"
                      >
                        Editar
                      </button>

                      {/* Delete */}
                      {!isDefaultField && (
                        <button
                          onClick={() => handleDeleteField(f.id)}
                          className="p-1.5 border border-transparent text-slate-350 text-slate-450 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg text-xs"
                          title="Remover campo"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}

                    </div>

                  </div>
                );
              })}
              {visibleFields.length === 0 && (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-bold">
                  Nenhum campo encontrado para este filtro.
                </div>
              )}
            </div>
          )}

          {/* Configuration warnings info */}
          <div className="bg-blue-50/50 p-4.5 rounded-2xl border border-blue-105 border-blue-100 text-[11px] text-blue-800 leading-relaxed space-y-1 select-none">
            <h4 className="font-extrabold flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-blue-600 shrink-0" />
              <span>Dicas de Configuração</span>
            </h4>
            <p>
              Qualquer alteração efetuada nos campos será refletida <b>automaticamente</b> no formulário de inclusão rápida (Recepção) e na ficha completa do participante. Para garantir a rastreabilidade do histórico, os campos padrão de sistema não podem ser excluídos, mas você é livre para ativá-los ou desativá-los conforme a complexidade do seu evento.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
