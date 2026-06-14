import React from 'react';
import { Event, User } from '../types';
import { motion } from 'motion/react';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  Ticket, 
  ArrowRight,
  Info
} from 'lucide-react';

interface EventListProps {
  id?: string;
  events: Event[];
  selectedEventId: string;
  onSelect: (eventId: string) => void;
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
  currentUser: User | null;
}

export default function EventList({
  id,
  events,
  selectedEventId,
  onSelect,
  onEdit,
  onDelete,
  currentUser
}: EventListProps) {
  
  const formatDateStr = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        // Safe standard date parsing without zone skewing
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        return `${day}/${month}/${year}`;
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const userRole = String(currentUser?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERVISOR' || currentUser?.role === 'admin';

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center flex flex-col items-center justify-center">
        <Calendar size={48} className="text-slate-350 text-slate-300 mb-3 animate-pulse" />
        <h3 className="font-extrabold text-slate-800 text-base font-display">Nenhum evento registrado</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-1">
          Você precisa cadastrar seu primeiro evento corporativo ou conferência para poder gerenciar credenciamentos.
        </p>
      </div>
    );
  }

  return (
    <div id={id} className="space-y-4">
      {/* 1. Mobile Cards view */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:hidden">
        {events.map((ev, idx) => {
          const isSelected = selectedEventId === ev.id;
          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className={`bg-white rounded-2xl p-5 border shadow-xs relative flex flex-col gap-4 transition-all duration-200 ${
                isSelected 
                  ? 'border-blue-500 ring-4 ring-blue-500/5 bg-blue-50/5' 
                  : 'border-slate-100 hover:border-slate-300'
              }`}
            >
              <div className="flex-grow">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-mono font-bold text-slate-400">ID: {ev.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase ${
                    isSelected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isSelected ? 'Event Selecionado' : 'Disponível'}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <h3 className="font-extrabold text-slate-850 text-slate-900 text-base leading-tight font-display pr-6">
                    {ev.name}
                  </h3>
                  {ev.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mt-1">
                      {ev.description}
                    </p>
                  )}
                  {ev.credentialType && (
                    <div className="flex items-center gap-1.5 mt-2 pl-0.5 text-[10px] font-bold text-blue-600">
                      <Ticket size={11} className="text-blue-500 shrink-0" />
                      <span>{ev.credentialType === 'label' ? 'Etiqueta térmica' : 'Crachá'} ({ev.credentialSize}){ev.showQRCode ? ' + QR' : ''}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 text-xs text-slate-500 font-medium mt-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={13} className="text-slate-400 shrink-0" />
                    <span>{formatDateStr(ev.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{ev.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={13} className="text-slate-400 shrink-0" />
                    <span>Capacidade: <b>{ev.capacity}</b></span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-50 pt-4 flex items-center justify-between">
                <button
                  onClick={() => onSelect(ev.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                    isSelected 
                      ? 'bg-emerald-500 text-white shadow-xs' 
                      : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <CheckCircle2 size={13} />
                      <span>Selecionado</span>
                    </>
                  ) : (
                    <>
                      <span>Selecionar</span>
                      <ArrowRight size={12} />
                    </>
                  )}
                </button>

                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onEdit(ev)}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition cursor-pointer"
                      title="Editar Evento"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(ev.id)}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-rose-600 transition cursor-pointer"
                      title="Excluir Evento"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 2. Desktop High-Density tabular display */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse table-auto">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              <th className="py-4 px-6">ID & Nome</th>
              <th className="py-4 px-6 w-32">Data</th>
              <th className="py-4 px-6 max-w-xs">Localização</th>
              <th className="py-4 px-6 w-28">Capacidade</th>
              <th className="py-4 px-6 w-40 text-center">Status</th>
              <th className="py-4 px-6 w-28 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.map((ev, idx) => {
              const isSelected = selectedEventId === ev.id;
              return (
                <motion.tr
                  key={ev.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.03 }}
                  className={`group hover:bg-slate-50/35 transition-colors ${
                    isSelected ? 'bg-blue-50/15' : ''
                  }`}
                >
                  {/* ID & Name & Description */}
                  <td className="py-4 px-6">
                    <div className="flex flex-col gap-0.5 max-w-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase leading-none">
                          {ev.id}
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-800 leading-snug tracking-tight">
                          {ev.name}
                        </h4>
                      </div>
                      {ev.description ? (
                        <p className="text-[11px] text-slate-500 leading-relaxed truncate mt-1 pl-1">
                          {ev.description}
                        </p>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic pl-1 mt-1">Sem descrição disponível</span>
                      )}
                      {ev.credentialType && (
                        <div className="flex items-center gap-1.5 mt-1.5 pl-1 text-[10px] font-extrabold text-blue-600 block">
                          <Ticket size={11} className="text-blue-400 shrink-0" />
                          <span>Mídia: {ev.credentialType === 'label' ? 'Etiqueta térmica' : 'Crachá'} ({ev.credentialSize}){ev.showQRCode ? ' + QR' : ''}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Date */}
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold font-mono">
                      <Calendar size={13} className="text-slate-400" />
                      <span>{formatDateStr(ev.date)}</span>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="py-4 px-6 max-w-xs">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium truncate">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate" title={ev.location}>{ev.location}</span>
                    </div>
                  </td>

                  {/* Capacity */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                      <Users size={12} className="text-slate-400" />
                      <span>{ev.capacity}</span>
                    </div>
                  </td>

                  {/* Status / Selection */}
                  <td className="py-4 px-6 text-center whitespace-nowrap">
                    <button
                      onClick={() => onSelect(ev.id)}
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border-2 active:scale-95 transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 shadow-xs'
                          : 'bg-white hover:bg-blue-50 border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 size={12} />
                          <span>Ativo</span>
                        </>
                      ) : (
                        <>
                          <span>Selecionar</span>
                          <ArrowRight size={11} />
                        </>
                      )}
                    </button>
                  </td>

                  {/* Operations (Edit / Delete) */}
                  <td className="py-4 px-6 text-right">
                    {isAdmin ? (
                      <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEdit(ev)}
                          className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-500 transition cursor-pointer"
                          title="Editar"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => onDelete(ev.id)}
                          className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-500 transition cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 block pr-2">-</span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
