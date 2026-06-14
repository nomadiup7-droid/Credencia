import React from 'react';
import { Mail, Clock, ShieldCheck, FileText, QrCode } from 'lucide-react';

export interface PresentAttendee {
  id: string;
  userId: string;
  eventId: string;
  checkInAt: string;
  name: string;
  email: string;
  cpf: string;
  category: string;
  ticketCode: string;
  company?: string;
}

interface CheckinListProps {
  id?: string;
  presentUsers: PresentAttendee[];
  isLoading: boolean;
  onRefresh?: () => void;
}

export default function CheckinList({
  id,
  presentUsers,
  isLoading,
  onRefresh
}: CheckinListProps) {
  
  const formatTime = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium font-sans">Carregando lista de presentes...</p>
      </div>
    );
  }

  if (presentUsers.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center flex flex-col items-center justify-center">
        <ShieldCheck size={48} className="text-slate-300 mb-3 animate-pulse" />
        <h3 className="font-extrabold text-slate-800 text-base font-display">Sem presenças confirmadas</h3>
        <p className="text-sm text-slate-505 text-slate-500 max-w-sm mt-1">
          Nenhum participante realizou o check-in presencial neste evento até o momento.
        </p>
      </div>
    );
  }

  return (
    <div id={id} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm font-display">
            Lista de Presentes ({presentUsers.length})
          </h3>
          <p className="text-xs text-slate-500">Participantes devidamente credenciados na portaria.</p>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 rounded-xl transition cursor-pointer select-none"
          >
            Sincronizar Lista
          </button>
        )}
      </div>

      {/* Grid of present users */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {/* Mobile View */}
        <div className="block md:hidden divide-y divide-slate-100">
          {presentUsers.map((user) => (
            <div key={user.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-slate-850 text-slate-900 text-sm font-display">{user.name}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Mail size={12} className="text-slate-400" />
                    <span>{user.email}</span>
                  </p>
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-700 font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full shrink-0">
                  PRESENTE
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded leading-none">
                  {user.category}
                </span>

                <div className="flex items-center gap-1.5 text-slate-500 font-semibold font-mono">
                  <Clock size={12} className="text-emerald-500" />
                  <span>{formatTime(user.checkInAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View (Tabular) */}
        <table className="w-full text-left border-collapse table-auto hidden md:table">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              <th className="py-4 px-6">Nome / Categoria</th>
              <th className="py-4 px-6">Email & CPF</th>
              <th className="py-4 px-6">Empresa</th>
              <th className="py-4 px-6">Código QR</th>
              <th className="py-4 px-6 text-right w-44">Horário Check-in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {presentUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/20 transition-colors">
                {/* Name / Category */}
                <td className="py-4 px-6">
                  <div className="flex flex-col gap-0.5">
                    <h4 className="text-sm font-extrabold text-slate-800 leading-snug tracking-tight">
                      {user.name}
                    </h4>
                    <div className="flex mt-1">
                      <span className="text-[10px] bg-slate-100 text-slate-650 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold leading-none">
                        {user.category}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Email / CPF */}
                <td className="py-4 px-6 text-xs text-slate-650">
                  <div className="flex flex-col gap-1 text-slate-600">
                    <span className="font-medium">{user.email}</span>
                    <span className="font-mono text-slate-400">CPF: {user.cpf}</span>
                  </div>
                </td>

                {/* Company */}
                <td className="py-4 px-6">
                  {user.company ? (
                    <span className="text-xs text-slate-700 font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">
                      {user.company}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Sem empresa</span>
                  )}
                </td>

                {/* Ticket code */}
                <td className="py-4 px-6">
                  <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-mono bg-slate-50 border border-slate-200/50 px-2 py-1 rounded">
                    <QrCode size={11} className="text-slate-400" />
                    <span>{user.ticketCode}</span>
                  </div>
                </td>

                {/* Timestamps */}
                <td className="py-4 px-6 text-right whitespace-nowrap">
                  <div className="flex flex-col items-end gap-1">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold font-mono text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                      <Clock size={12} />
                      <span>{formatTime(user.checkInAt)}</span>
                    </div>
                    {formatDate(user.checkInAt) && (
                      <span className="text-[10px] text-slate-450 text-slate-400 mr-1.5">{formatDate(user.checkInAt)}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
