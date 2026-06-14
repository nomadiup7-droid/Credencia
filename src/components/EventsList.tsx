import React from 'react';
import { Event } from '../types';
import { motion } from 'motion/react';
import { Calendar, MapPin, Users, Ticket, ArrowRight, AlertCircle } from 'lucide-react';

interface EventsListProps {
  id?: string;
  events: Event[];
  selectedEventId?: string;
  onSelectEvent?: (eventId: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export default function EventsList({
  id,
  events,
  selectedEventId,
  onSelectEvent,
  isLoading = false,
  error = null
}: EventsListProps) {
  
  const formatDateStr = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        // Handle ISO Date representation safely without timezone offsets
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

  if (isLoading) {
    return (
      <div id={id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col h-[400px]">
        <div className="flex justify-between items-center pb-4 border-b border-slate-50">
          <div className="h-5 w-40 bg-slate-200 rounded animate-pulse"></div>
          <div className="h-3 w-16 bg-slate-100 rounded animate-pulse"></div>
        </div>
        <div className="flex-grow mt-4 space-y-4 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 border border-slate-55 border-slate-100 rounded-xl space-y-3 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              <div className="flex gap-4">
                <div className="h-3 bg-slate-150 rounded w-1/4"></div>
                <div className="h-3 bg-slate-150 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div id={id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-center items-center text-center h-[400px]">
        <AlertCircle className="text-rose-500 mb-3" size={36} />
        <h4 className="font-bold text-slate-800 text-sm">Falha ao Carregar Eventos</h4>
        <p className="text-xs text-slate-400 max-w-xs mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div id={id} className="bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col h-[400px]">
      <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30 rounded-t-2xl">
        <div>
          <h3 className="font-bold text-slate-800 tracking-tight text-base font-display">Eventos Cadastrados</h3>
          <p className="text-xs text-slate-500">Lista de eventos cadastrados no portal</p>
        </div>
        <span className="text-[11px] font-bold text-blue-650 bg-blue-50 border border-blue-100/50 px-2.5 py-0.5 rounded-full shrink-0">
          Ativos ({events.length})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <Calendar className="text-slate-300 mb-2 animate-bounce duration-1000" size={36} />
            <p className="text-xs text-slate-400 font-medium">Nenhum evento registrado no sistema.</p>
          </div>
        ) : (
          events.map((event, idx) => {
            const isActive = selectedEventId === event.id;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-4 ${
                  isActive
                    ? 'bg-blue-50/40 border-blue-200 shadow-xs'
                    : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/10'
                }`}
              >
                <div className="flex justify-between items-start gap-3 min-w-0">
                  <div className="min-w-0">
                    <h4 className="text-sm font-extrabold text-slate-800 leading-snug tracking-tight truncate">
                      {event.name}
                    </h4>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                      <div className="flex items-center gap-1.5 text-slate-450 text-[11px] text-slate-500 font-medium">
                        <Calendar size={12} className="text-slate-400 shrink-0" />
                        <span>{formatDateStr(event.date)}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-450 text-[11px] text-slate-505 text-slate-500 font-medium truncate max-w-[180px] sm:max-w-200">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-450 text-[11px] text-slate-500 font-medium">
                        <Users size={12} className="text-slate-400 shrink-0" />
                        <span>Cap. {event.capacity}</span>
                      </div>
                    </div>
                  </div>

                  {isActive && (
                    <span className="text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md self-start shrink-0">
                      Selecionado
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-2 shrink-0">
                  <span className="text-[10px] font-mono text-slate-400 font-semibold flex items-center gap-1">
                    <Ticket size={11} className="text-slate-300" />
                    ID: {event.id}
                  </span>

                  <button
                    onClick={() => onSelectEvent?.(event.id)}
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm hover:bg-blue-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-xs'
                    }`}
                  >
                    <span>{isActive ? 'Gerenciar' : 'Selecionar'}</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
