import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { AlertTriangle, Camera, CheckCircle2, Loader2, Plus, Printer, Search, UserCheck, X } from 'lucide-react';
import { Event, Participant, User } from '../types';

interface CheckinMobilePageProps {
  selectedEvent: Event | null;
  selectedEventId: string;
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  currentUser: User | null;
  canCreateParticipants: boolean;
  apiCall: (endpoint: string, options?: RequestInit) => Promise<any>;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onPrintBadge: (participant: Participant) => void;
  onNewParticipant: () => void;
}

type MobileFeedback =
  | { type: 'success'; title: 'CHECK-IN REALIZADO'; message: string; participant?: Participant }
  | { type: 'warning'; title: 'PARTICIPANTE JA CREDENCIADO'; message: string; participant?: Participant }
  | { type: 'error'; title: 'PARTICIPANTE NAO ENCONTRADO'; message: string; participant?: Participant };

const normalizeSearch = (value?: string) => (value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[._\-+/ ]/g, '');

const getPrintPreferenceKey = (eventId?: string) => `credencia_mobile_checkin_print_${eventId || 'global'}`;

export default function CheckinMobilePage({
  selectedEvent,
  selectedEventId,
  participants,
  setParticipants,
  currentUser,
  canCreateParticipants,
  apiCall,
  addToast,
  onPrintBadge,
  onNewParticipant
}: CheckinMobilePageProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isCheckingInId, setIsCheckingInId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<MobileFeedback | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [shouldPrintAfterCheckin, setShouldPrintAfterCheckin] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const scanLockRef = useRef(false);
  const scannerElementId = 'checkin-mobile-camera-reader';

  useEffect(() => {
    if (!scannerOpen) inputRef.current?.focus();
  }, [selectedEventId]);

  useEffect(() => {
    setShouldPrintAfterCheckin(localStorage.getItem(getPrintPreferenceKey(selectedEventId)) === 'true');
  }, [selectedEventId]);

  useEffect(() => {
    localStorage.setItem(getPrintPreferenceKey(selectedEventId), String(shouldPrintAfterCheckin));
  }, [selectedEventId, shouldPrintAfterCheckin]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
      void stopScanner();
    };
  }, []);

  const matches = useMemo(() => {
    const clean = normalizeSearch(debouncedQuery);
    if (clean.length < 2) return [];

    return participants
      .filter(participant => {
        if (participant.eventId !== selectedEventId) return false;
        const searchable = [
          participant.name,
          participant.badgeName,
          participant.cpf,
          participant.ticketCode,
          participant.id,
          participant.company,
          participant.email
        ].map(normalizeSearch).filter(Boolean);

        return searchable.some(value => value.includes(clean) || clean.includes(value));
      })
      .slice(0, 8);
  }, [debouncedQuery, participants, selectedEventId]);

  const scheduleReset = ({ focusInput = true } = {}) => {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => {
      setQuery('');
      setDebouncedQuery('');
      setFeedback(null);
      if (focusInput) inputRef.current?.focus();
    }, 2800);
  };

  const updateParticipantAsCheckedIn = (participant: Participant, checkedInAt?: string, printed = false) => {
    setParticipants(prev => prev.map(item =>
      item.id === participant.id
        ? { ...item, checkedIn: true, checkedInAt: checkedInAt || item.checkedInAt || new Date().toISOString(), printed: printed ? true : item.printed }
        : item
    ));
  };

  const reprintParticipant = async (participant: Participant) => {
    try {
      await apiCall(`/api/participants/${participant.id}/reprint`, { method: 'POST' });
      setParticipants(prev => prev.map(item => item.id === participant.id ? { ...item, printed: true } : item));
      onPrintBadge({ ...participant, printed: true });
      addToast(`Reimpressao enviada: ${participant.name}`, 'success');
    } catch (error: any) {
      addToast(error.message || 'Erro ao reimprimir credencial.', 'error');
    }
  };

  const performCheckin = async (participant: Participant, { focusInputAfter = true } = {}) => {
    if (!selectedEventId) {
      addToast('Selecione um evento antes de realizar check-in.', 'warning');
      return;
    }

    if (participant.checkedIn) {
      setFeedback({
        type: 'warning',
        title: 'PARTICIPANTE JA CREDENCIADO',
        message: participant.checkedInAt
          ? `${participant.name} ja realizou check-in as ${new Date(participant.checkedInAt).toLocaleTimeString('pt-BR')}.`
          : `${participant.name} ja realizou check-in.`,
        participant
      });
      if (focusInputAfter) inputRef.current?.focus();
      scheduleReset({ focusInput: focusInputAfter });
      return;
    }

    setIsCheckingInId(participant.id);
    try {
      const result = await apiCall('/api/checkin', {
        method: 'POST',
        body: JSON.stringify({
          userId: participant.id,
          eventId: selectedEventId
        })
      });

      if (result.alreadyCheckedIn) {
        const checkedParticipant = { ...participant, checkedIn: true, checkedInAt: result.checkInAt };
        setFeedback({
          type: 'warning',
          title: 'PARTICIPANTE JA CREDENCIADO',
          message: result.message || `${participant.name} ja estava credenciado.`,
          participant: checkedParticipant
        });
        updateParticipantAsCheckedIn(participant, result.checkInAt);
        scheduleReset({ focusInput: focusInputAfter });
        return;
      }

      const checkedInAt = result.checkIn?.checkInAt || result.participant?.checkedInAt || new Date().toISOString();
      const updatedParticipant = { ...participant, checkedIn: true, checkedInAt, printed: shouldPrintAfterCheckin ? true : participant.printed };
      updateParticipantAsCheckedIn(participant, checkedInAt, shouldPrintAfterCheckin);

      if (shouldPrintAfterCheckin) {
        await apiCall(`/api/participants/${participant.id}/reprint`, { method: 'POST' });
        onPrintBadge({ ...updatedParticipant, printed: true });
      }

      setFeedback({
        type: 'success',
        title: 'CHECK-IN REALIZADO',
        message: participant.name,
        participant: updatedParticipant
      });
      addToast(`Check-in realizado: ${participant.name}`, 'success');
      scheduleReset({ focusInput: focusInputAfter });
    } catch (error: any) {
      setFeedback({
        type: 'error',
        title: 'PARTICIPANTE NAO ENCONTRADO',
        message: error.message || 'Nao foi possivel realizar o check-in.',
        participant
      });
      addToast(error.message || 'Erro ao realizar check-in.', 'error');
      scheduleReset({ focusInput: focusInputAfter });
    } finally {
      setIsCheckingInId(null);
    }
  };

  const handleEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (matches[0]) {
      void performCheckin(matches[0]);
    }
  };

  const handleScanResult = async (decodedText: string) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;

    const clean = normalizeSearch(decodedText);
    const participant = participants.find(item =>
      item.eventId === selectedEventId &&
      [item.id, item.ticketCode, item.cpf].map(normalizeSearch).filter(Boolean).some(value => value === clean || value.includes(clean) || clean.includes(value))
    );

    if (!participant) {
      setFeedback({
        type: 'error',
        title: 'PARTICIPANTE NAO ENCONTRADO',
        message: 'Nenhum participante encontrado para o QR Code lido.'
      });
      addToast('Participante nao encontrado.', 'error');
      scheduleReset({ focusInput: false });
      window.setTimeout(() => {
        scanLockRef.current = false;
      }, 1800);
      return;
    }

    await performCheckin(participant, { focusInputAfter: false });
    window.setTimeout(() => {
      scanLockRef.current = false;
    }, 1800);
  };

  const stopScanner = async () => {
    setScannerOpen(false);
    if (!scannerRef.current) return;
    try {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      await scannerRef.current.clear();
    } catch (error) {
      console.warn('Erro ao fechar scanner mobile:', error);
    } finally {
      scannerRef.current = null;
    }
  };

  const startScanner = async () => {
    setScannerError('');
    setScannerOpen(true);
    try {
      await stopScanner();
      setScannerOpen(true);
      await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));
      const scanner = new Html5Qrcode(scannerElementId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 12,
          qrbox: (width, height) => {
            const size = Math.floor(Math.min(width, height) * 0.72);
            return { width: size, height: size };
          }
        },
        decodedText => {
          void handleScanResult(decodedText);
        },
        () => {}
      );
    } catch (error: any) {
      setScannerOpen(false);
      const message = error?.message || 'Nao foi possivel abrir a camera.';
      setScannerError(message.includes('Permission') || message.includes('NotAllowed')
        ? 'Permissao negada. Autorize a camera no navegador.'
        : message);
      addToast('Nao foi possivel ativar a camera.', 'error');
    }
  };

  const feedbackClasses = feedback?.type === 'success'
    ? 'bg-emerald-600 text-white border-emerald-700'
    : feedback?.type === 'warning'
      ? 'bg-amber-400 text-slate-950 border-amber-500'
      : 'bg-rose-600 text-white border-rose-700';

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-y-auto">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 py-5 sm:px-6 sm:py-7">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Check-in Mobile</p>
            <h1 className="mt-1 truncate text-2xl font-black leading-tight sm:text-3xl">
              {selectedEvent?.name || 'Selecione um evento'}
            </h1>
            <p className="mt-1 truncate text-sm font-semibold text-slate-300">
              Operador: {currentUser?.name || 'Operador'}
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
            <UserCheck size={26} strokeWidth={3} />
          </div>
        </header>

        <section className="space-y-3">
          <button
            type="button"
            onClick={startScanner}
            className="flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-400 px-5 py-4 text-lg font-black text-slate-950 shadow-lg transition active:scale-[0.98]"
          >
            <Camera size={24} />
            Escanear QR Code
          </button>

          <label className="flex min-h-14 items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white">
            <span className="text-sm font-black">Imprimir etiqueta ao registrar</span>
            <input
              type="checkbox"
              checked={shouldPrintAfterCheckin}
              onChange={event => setShouldPrintAfterCheckin(event.target.checked)}
              className="h-6 w-6 rounded border-white/30 text-emerald-400 focus:ring-emerald-400"
            />
          </label>

          {scannerOpen && (
            <div className="rounded-2xl border border-emerald-300/40 bg-slate-900 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-black uppercase tracking-wider text-emerald-200">Camera ativa</p>
                <button
                  type="button"
                  onClick={() => void stopScanner()}
                  className="rounded-full bg-white/10 p-2 text-white"
                  title="Fechar scanner"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="relative overflow-hidden rounded-xl bg-black">
                <div id={scannerElementId} className="max-h-[52vh] [&_video]:max-h-[52vh] [&_video]:object-cover" />
                {feedback && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
                    <section className={`w-full max-w-sm rounded-3xl border p-5 text-center shadow-2xl ${feedbackClasses}`}>
                      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                        {feedback.type === 'success' ? <CheckCircle2 size={36} /> : <AlertTriangle size={36} />}
                      </div>
                      <h2 className="text-2xl font-black">{feedback.title}</h2>
                      <p className="mt-2 text-lg font-bold">{feedback.message}</p>
                      {feedback.type === 'warning' && feedback.participant && (
                        <button
                          type="button"
                          onClick={() => void reprintParticipant(feedback.participant!)}
                          className="mt-4 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-base font-black text-white"
                        >
                          <Printer size={21} />
                          Reimprimir
                        </button>
                      )}
                    </section>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white p-3 text-slate-950 shadow-2xl">
          <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
            <Search size={15} />
            Buscar por nome, CPF ou QR Code
          </label>
          <input
            ref={inputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={handleEnter}
            placeholder="Nome, CPF ou QR Code"
            className="h-16 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-2 text-[15px] font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white sm:px-4 sm:text-lg sm:font-bold"
            inputMode="search"
            autoComplete="off"
          />
        </section>

        <section className="grid grid-cols-1 gap-3">
          {canCreateParticipants && (
            <button
              type="button"
              onClick={onNewParticipant}
              className="checkin-new-participant-button cx-button-primary flex min-h-16 items-center justify-center gap-3 rounded-2xl px-5 py-4 text-lg font-black text-slate-950 shadow-lg transition active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #12e000, #8fff86)', color: '#061009' }}
            >
              <Plus size={24} />
              Novo Participante
            </button>
          )}
        </section>

        {scannerError && (
          <div className="rounded-2xl border border-amber-300 bg-amber-100 p-4 text-sm font-bold text-amber-950">
            {scannerError}
          </div>
        )}

        {feedback && !scannerOpen && (
          <section className={`rounded-3xl border p-5 text-center shadow-xl ${feedbackClasses}`}>
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
              {feedback.type === 'success' ? <CheckCircle2 size={36} /> : <AlertTriangle size={36} />}
            </div>
            <h2 className="text-2xl font-black">{feedback.title}</h2>
            <p className="mt-2 text-lg font-bold">{feedback.message}</p>
            {feedback.type === 'warning' && feedback.participant && (
              <button
                type="button"
                onClick={() => void reprintParticipant(feedback.participant!)}
                className="mt-4 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-base font-black text-white"
              >
                <Printer size={21} />
                Reimprimir
              </button>
            )}
          </section>
        )}

        <section className="flex-1 space-y-3 pb-6">
          {debouncedQuery.trim().length >= 2 && matches.length === 0 && !feedback && (
            <div className="rounded-2xl border border-amber-300 bg-amber-100 p-5 text-center text-amber-950">
              <AlertTriangle className="mx-auto mb-2" size={34} />
              <p className="text-xl font-black">PARTICIPANTE NAO ENCONTRADO</p>
            </div>
          )}

          {matches.map(participant => (
            <article
              key={participant.id}
              onClick={() => void performCheckin(participant)}
              className="rounded-2xl border border-white/10 bg-white p-4 text-slate-950 shadow-xl transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-xl font-black leading-tight">{participant.name}</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">{participant.category}</p>
                  {participant.company && (
                    <p className="mt-1 truncate text-sm font-semibold text-slate-600">{participant.company}</p>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                  participant.checkedIn ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {participant.checkedIn ? 'Ja credenciado' : 'Pendente'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {participant.checkedIn ? (
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      void reprintParticipant(participant);
                    }}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
                  >
                    <Printer size={18} />
                    Reimprimir
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isCheckingInId === participant.id}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-60"
                  >
                    {isCheckingInId === participant.id ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                    Fazer Check-in
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
