import React, { useState, useEffect } from 'react';
import { Event } from '../types';
import { Save, X, Calendar, MapPin, Users, Info, Sparkles } from 'lucide-react';

interface EventFormProps {
  id?: string;
  event?: Event | null; // null means we are creating a new event
  onSave: (data: {
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
  }) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export default function EventForm({
  id,
  event,
  onSave,
  onCancel,
  isSaving = false
}: EventFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState(150);
  const [credentialType, setCredentialType] = useState<'label' | 'badge'>('badge');
  const [credentialSize, setCredentialSize] = useState<'9x4' | '8x4' | '8x5' | 'A6' | 'A7'>('A6');
  const [showQRCode, setShowQRCode] = useState(true);
  const [enableAccessControl, setEnableAccessControl] = useState(true);
  const [enableCloakroom, setEnableCloakroom] = useState(false);
  const [enableScanner, setEnableScanner] = useState(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Fill form if editing an existing event
  useEffect(() => {
    if (event) {
      setName(event.name || '');
      setDescription(event.description || '');
      setDate(event.date || '');
      setLocation(event.location || '');
      setCapacity(event.capacity || 150);
      setCredentialType(event.credentialType || 'badge');
      setCredentialSize(event.credentialSize || 'A6');
      setShowQRCode(event.showQRCode !== false);
      setEnableAccessControl(event.enableAccessControl !== false);
      setEnableCloakroom(event.enableCloakroom === true);
      setEnableScanner(event.enableScanner !== false);
    } else {
      setName('');
      setDescription('');
      setDate('');
      setLocation('');
      setCapacity(150);
      setCredentialType('badge');
      setCredentialSize('A6');
      setShowQRCode(true);
      setEnableAccessControl(true);
      setEnableCloakroom(false);
      setEnableScanner(true);
    }
    setErrors({});
  }, [event]);

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!name.trim()) errs.name = 'O nome do evento é obrigatório.';
    if (!date) errs.date = 'Selecione a data de realização.';
    if (!location.trim()) errs.location = 'O local do evento é obrigatório.';
    if (!capacity || capacity <= 0) errs.capacity = 'A capacidade deve ser maior do que zero.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    await onSave({
      name: name.trim(),
      description: description.trim(),
      date,
      location: location.trim(),
      capacity: Number(capacity),
      credentialType,
      credentialSize,
      showQRCode,
      enableAccessControl,
      enableCloakroom,
      enableScanner
    });
  };

  return (
    <form id={id} onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-100">
        <div className={`p-2 rounded-lg ${event ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
          <Sparkles size={16} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm font-display">
            {event ? 'Editar Detalhes do Evento' : 'Informações do Novo Evento'}
          </h3>
          <p className="text-xs text-slate-500">Cuidado ao modificar os campos de capacidade e localização.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name - full width */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 text-slate-500 mb-1.5 label-required">
            Nome do Evento <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Summit de Inovação Digital 2026"
            className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl focus:outline-hidden focus:ring-2 transition duration-150 ${
              errors.name 
                ? 'border-rose-350 border-rose-300 focus:border-rose-400 focus:ring-rose-100' 
                : 'border-slate-200 focus:border-blue-500 focus:ring-blue-105 focus:ring-blue-100'
            }`}
          />
          {errors.name && <p className="text-rose-505 text-rose-500 text-[11px] font-medium mt-1">{errors.name}</p>}
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 text-slate-500 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className="text-slate-400" />
              Data de Realização <span className="text-rose-500">*</span>
            </span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl focus:outline-hidden focus:ring-2 transition duration-150 ${
              errors.date 
                ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-105' 
                : 'border-slate-200 focus:border-blue-500 focus:ring-blue-105 focus:ring-blue-100'
            }`}
          />
          {errors.date && <p className="text-rose-500 text-[11px] font-medium mt-1">{errors.date}</p>}
        </div>

        {/* Capacity */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 text-slate-500 mb-1.5 font-sans">
            <span className="flex items-center gap-1.5">
              <Users size={13} className="text-slate-400" />
              Capacidade Máxima <span className="text-rose-500">*</span>
            </span>
          </label>
          <input
            type="number"
            min="1"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            placeholder="Ex: 500"
            className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl focus:outline-hidden focus:ring-2 transition duration-150 ${
              errors.capacity 
                ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-105' 
                : 'border-slate-200 focus:border-blue-500 focus:ring-blue-105 focus:ring-blue-100'
            }`}
          />
          {errors.capacity && <p className="text-rose-500 text-[11px] font-medium mt-1">{errors.capacity}</p>}
        </div>

        {/* Location - full width */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 text-slate-500 mb-1.5">
            <span className="flex items-center gap-1.5">
              <MapPin size={13} className="text-slate-400" />
              Local / Endereço <span className="text-rose-500">*</span>
            </span>
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex: Centro de Convenções Rebouças, São Paulo - SP"
            className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl focus:outline-hidden focus:ring-2 transition duration-150 ${
              errors.location 
                ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-105' 
                : 'border-slate-200 focus:border-blue-500 focus:ring-blue-105 focus:ring-blue-100'
            }`}
          />
          {errors.location && <p className="text-rose-500 text-[11px] font-medium mt-1">{errors.location}</p>}
        </div>

        {/* Description - full width */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 text-slate-500 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Info size={13} className="text-slate-400" />
              Descrição do Evento (Opcional)
            </span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Caso tenha, descreva a programação, público-alvo ou detalhes adicionais..."
            className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl focus:outline-hidden transition duration-150 resize-y"
          />
        </div>

        <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <div>
            <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Módulos do Evento</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Ative apenas o que a equipe vai operar neste evento.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={enableAccessControl}
                onChange={(e) => setEnableAccessControl(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-100 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700">Salas e Acessos</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={enableCloakroom}
                onChange={(e) => setEnableCloakroom(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-100 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700">Chapelaria</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={enableScanner}
                onChange={(e) => setEnableScanner(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-100 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700">Scanner QR</span>
            </label>
          </div>
        </div>

        {/* CONFIGURAÇÃO DE CREDENCIAIS DESTE EVENTO */}
        <div className="md:col-span-2 bg-slate-50 border border-slate-100 rounded-2xl p-4.5 space-y-4">
          <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
              Configurações de Credenciais & Impressão
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Tipo de Credencial */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Tipo de Mídia
              </label>
              <select
                value={credentialType}
                onChange={(e) => {
                  const val = e.target.value as 'label' | 'badge';
                  setCredentialType(val);
                  setCredentialSize(val === 'label' ? '9x4' : 'A6');
                }}
                className="w-full text-xs font-bold font-sans bg-white border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-slate-700 cursor-pointer shadow-xs transition animate-fade-in"
              >
                <option value="badge">Crachá Evento (Visual)</option>
                <option value="label">Etiqueta Térmica (Rápida)</option>
              </select>
            </div>

            {/* Formato / Dimensão */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Dimensões / Formato
              </label>
              <select
                value={credentialSize}
                onChange={(e) => setCredentialSize(e.target.value as any)}
                className="w-full text-xs font-bold font-sans bg-white border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-slate-700 cursor-pointer shadow-xs transition"
              >
                {credentialType === 'label' ? (
                  <>
                    <option value="9x4">9x4 cm (Contínuo)</option>
                    <option value="8x4">8x4 cm</option>
                    <option value="8x5">8x5 cm</option>
                  </>
                ) : (
                  <>
                    <option value="A6">A6 Vertical (10.5x14.8 cm)</option>
                    <option value="A7">A7 Vertical (7.4x10.5 cm)</option>
                  </>
                )}
              </select>
            </div>

            {/* Exibir QR Code */}
            <div className="flex flex-col justify-center">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 select-none">
                QR Code de Validação
              </span>
              <label className="inline-flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={showQRCode}
                  onChange={(e) => setShowQRCode(e.target.checked)}
                  className="rounded border-slate-305 border-slate-300 text-blue-600 focus:ring-blue-100 w-4 h-4 transition cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-bold select-none">Imprimir QR Code</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 text-xs font-bold text-slate-650 text-slate-705 text-slate-700 bg-white border border-slate-201 border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition cursor-pointer disabled:opacity-50"
        >
          Cancelar
        </button>
        
        <button
          type="submit"
          disabled={isSaving}
          className={`flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-extrabold text-white rounded-xl transition cursor-pointer shadow-sm ${
            event 
              ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100/50' 
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100/50'
          } disabled:opacity-50`}
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <Save size={14} />
          )}
          <span>{event ? 'Atualizar Evento' : 'Salvar Evento'}</span>
        </button>
      </div>
    </form>
  );
}
