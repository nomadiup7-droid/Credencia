import React, { useState, useMemo } from 'react';
import { Participant } from '../types';
import { Search, CheckCircle2, X, UserCheck, AlertCircle, Sparkles, QrCode } from 'lucide-react';

interface UserSearchProps {
  id?: string;
  participants: Participant[];
  onCheckIn: (participant: Participant) => Promise<void>;
  isCheckingInId: string | null;
}

export default function UserSearch({
  id,
  participants,
  onCheckIn,
  isCheckingInId
}: UserSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Normalize search for robust match (removes punctuation from CPF and lowercase strings)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[.\-/ ]/g, ''); // remove common separators
  };

  // Filter participants in real-time by Name, CPF or Ticket Code/QR
  const matches = useMemo(() => {
    const query = normalizeText(searchTerm);
    if (!query) return participants;

    return participants.filter(p => {
      const nameMatch = normalizeText(p.name).includes(query);
      const emailMatch = normalizeText(p.email).includes(query);
      const cpfMatch = normalizeText(p.cpf).includes(query);
      const ticketMatch = normalizeText(p.ticketCode).includes(query);
      const companyMatch = p.company ? normalizeText(p.company).includes(query) : false;

      return nameMatch || emailMatch || cpfMatch || ticketMatch || companyMatch;
    });
  }, [participants, searchTerm]);

  return (
    <div id={id} className="space-y-4">
      {/* Search Input Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 font-display">
          Buscar Participante Operacional
        </label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Digite Nome, CPF (apenas números) ou QR Code do ingresso..."
            className="w-full pl-11 pr-10 py-3.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-105 focus:border-blue-500 text-sm font-medium transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-2 font-semibold">
           Dica: Digite o CPF sem pontuações ou use o leitor de código de barras no campo acima.
        </p>
      </div>

      {/* Result list */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {matches.length === 0 ? (
          <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-8 text-center">
            <AlertCircle size={32} className="text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">Participante não localizado</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Não encontramos nenhum participante para "{searchTerm}". Verifique a digitação ou certifique-se de que ele esteja cadastrado.
            </p>
          </div>
        ) : (
          matches.map(p => {
            const isPending = isCheckingInId === p.id;
            return (
              <div
                key={p.id}
                className={`bg-white rounded-xl p-4 border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  p.checkedIn 
                    ? 'border-emerald-100 bg-emerald-50/5 hover:bg-emerald-50/10' 
                    : 'border-slate-100 hover:border-slate-300'
                }`}
              >
                {/* Visual info column */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-extrabold text-slate-800 text-sm truncate font-display">
                      {p.name}
                    </h4>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-mono font-bold leading-none">
                      {p.category}
                    </span>
                    {p.company && (
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-medium leading-none truncate max-w-[120px]">
                        {p.company}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-xs text-slate-500 font-medium">
                    <span className="truncate">Email: <b>{p.email}</b></span>
                    <span>CPF: <b className="font-mono">{p.cpf}</b></span>
                    <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                      <QrCode size={11} /> {p.ticketCode}
                    </span>
                  </div>
                </div>

                {/* Status indicator and action row */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                  {/* Status Indicator */}
                  <div>
                    {p.checkedIn ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100/60 px-2.5 py-1.5 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-505 bg-emerald-500 animate-pulse"></span>
                         Já fez check-in
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-150- bg-slate-100 px-2.5 py-1.5 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                         Não fez check-in
                      </span>
                    )}
                  </div>

                  {/* Operational Big-Sized Button */}
                  <button
                    onClick={() => onCheckIn(p)}
                    disabled={p.checkedIn || isPending}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition shadow-xs select-none active:scale-95 ${
                      p.checkedIn
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100'
                    } disabled:opacity-50`}
                  >
                    {isPending ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <UserCheck size={14} />
                    )}
                    <span>Fazer Check-in</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
