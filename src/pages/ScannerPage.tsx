import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Event, Participant, User } from '../types';
import PrintCredential from '../components/PrintCredential';
import { 
  Camera, 
  RotateCcw, 
  Settings, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Volume2, 
  VolumeX, 
  HelpCircle,
  Clock,
  Printer
} from 'lucide-react';

interface ScannerPageProps {
  id?: string;
  events: Event[];
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
  apiCall: (endpoint: string, options?: RequestInit) => Promise<any>;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  participants: Participant[];
  currentUser: User | null;
}

export default function ScannerPage({
  id,
  events,
  selectedEventId,
  onSelectEvent,
  apiCall,
  addToast,
  setParticipants,
  participants,
  currentUser
}: ScannerPageProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    alreadyCheckedIn?: boolean;
    message: string;
    decodedText?: string;
    user?: { id?: string; name: string; email: string; cpf?: string; category?: string; company?: string; ticketCode?: string };
    event?: { name: string };
  } | null>(null);
  
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activePrintRecord, setActivePrintRecord] = useState<{ participant: Participant; event: Event } | null>(null);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-reader-viewport";

  // Web Audio API Beep Synthesizer for instant feedback
  const playBeep = (type: 'success' | 'error') => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'success') {
        // High pitched pleasant beep
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } else {
        // Lower failure tone
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3 note
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      console.warn('Som indisponível no navegador:', e);
    }
  };

  // Perform Haptic Vibration if supported
  const triggerVibrate = (type: 'success' | 'error') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (type === 'success') {
        navigator.vibrate(100);
      } else {
        navigator.vibrate([100, 50, 100]);
      }
    }
  };

  // Initialize/Start the html5Qrcode camera scanning
  const startCamera = async () => {
    if (!selectedEventId) {
      addToast('Por favor, selecione o evento ativo antes de iniciar a câmera.', 'warning');
      return;
    }
    
    setCameraPermissionError(null);
    setScanResult(null);

    // Ensure scanner is clean
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
      } catch (e) {
        console.warn('Erro ao restaurar scanner:', e);
      }
    }

    try {
      const scanner = new Html5Qrcode(scannerContainerId);
      qrScannerRef.current = scanner;

      setIsScanning(true);

      await scanner.start(
        { facingMode: 'environment' }, // Default to rear camera on phones
        {
          fps: 15,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size };
          }
        },
        async (decodedText) => {
          // Success Callback: stop scanning immediately to prevent duplicate check-ins
          await stopCamera();
          playBeep('success');
          triggerVibrate('success');
          handleCheckInCode(decodedText);
        },
        (errorMessage) => {
          // Silent failure on raw frame decoding failures - normal behavior during live tracking
        }
      );
    } catch (err: any) {
      console.error('Falha de acesso à câmera:', err);
      setIsScanning(false);
      
      const userFriendlyMsg = err.message || '';
      if (userFriendlyMsg.includes('NotAllowedError') || userFriendlyMsg.includes('Permission')) {
        setCameraPermissionError('Permissão Negada: Por favor conceda acesso à câmera do seu dispositivo nas configurações do navegador.');
      } else {
        setCameraPermissionError(`Não foi possível acessar a câmera do dispositivo: ${err.message || 'Erro desconhecido'}`);
      }
      addToast('Não foi possível ativar fluxo de câmera', 'error');
    }
  };

  // Stop current camera streaming
  const stopCamera = async () => {
    setIsScanning(false);
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
      } catch (err) {
        console.warn('Erro ao interromper scanner:', err);
      }
    }
  };

  // Check-In API Handler
  const handleCheckInCode = async (code: string) => {
    if (!selectedEventId) return;

    try {
      // POST payload matching requested spec:
      // http://localhost:3000/api/checkin
      // Body: { userId: code, eventId: selectedEventId }
      const res = await apiCall('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: code.trim(),
          eventId: selectedEventId
        })
      });

      // API replied with rich object containing full participant and event context
      if (res.success && res.user) {
        const isAlready = !!res.alreadyCheckedIn;
        setScanResult({
          success: true,
          alreadyCheckedIn: isAlready,
          message: isAlready 
            ? 'Participante já credenciado. Deseja imprimir a etiqueta novamente?' 
            : 'Check-in realizado com sucesso!',
          decodedText: code,
          user: res.user,
          event: res.event
        });

        // Update global React context so checkin stats and participant table sync in other tabs
        const participantId = res.participant?.id || res.user.id;
        if (participantId) {
          setParticipants(prev => 
            prev.map(p => p.id === participantId ? { ...p, checkedIn: true, checkedInAt: res.participant?.checkedInAt || res.checkInAt || p.checkedInAt } : p)
          );
        }

        if (!isAlready) {
          // Set target elements to raise PrintLabel window print dialogue immediately
          const activeEvent = events.find(e => e.id === selectedEventId);
          setActivePrintRecord({
            participant: res.participant || {
              id: res.user.id || '',
              eventId: selectedEventId,
              name: res.user.name,
              email: res.user.email,
              cpf: res.user.cpf || '',
              category: (res.user.category as any) || 'Participante',
              ticketCode: res.user.ticketCode || '',
              company: res.user.company,
              checkedIn: true,
              checkedInAt: res.checkInAt || new Date().toISOString(),
              createdAt: new Date().toISOString()
            },
            event: activeEvent || {
              id: res.event.id || selectedEventId,
              name: res.event.name,
              date: new Date().toISOString().split('T')[0],
              location: 'Evento',
              capacity: 1000,
              createdAt: new Date().toISOString()
            }
          });
          
          addToast(` Presença confirmada: ${res.user.name}`, 'success');
        } else {
          addToast(` Participante já credenciado: ${res.user.name}`, 'warning');
        }
      } else {
        throw new Error(res.message || 'Erro desconhecido durante check-in');
      }
    } catch (err: any) {
      console.error('Check-in scanner API integration error:', err);
      
      const isOfflineError = !navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('comunicação') || err.message?.includes('network') || err.message?.includes('offline');
      if (isOfflineError) {
        // Find inside cached participants list
        const cleanCode = code.trim().toLowerCase();
        const found = participants.find(p => 
          p.id.toLowerCase() === cleanCode || 
          (p.ticketCode && p.ticketCode.toLowerCase() === cleanCode) || 
          (p.cpf && p.cpf.replace(/[.\-/ ]/g, '') === cleanCode.replace(/[.\-/ ]/g, ''))
        );

        if (found) {
          if (found.checkedIn) {
            setScanResult({
              success: true,
              alreadyCheckedIn: true,
              message: 'Check-in já realizado (visto no cache offline)',
              decodedText: code,
              user: found,
              event: { id: selectedEventId, name: 'Evento Offline' }
            });
            addToast(` [Offline] Já credenciado: ${found.name}`, 'warning');
            playBeep('error');
            return;
          }

          // Enqueue check-in
          const queueKey = 'credencia_checkins_queue';
          const queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
          const timestamp = new Date().toISOString();
          const newItem = {
            participantId: found.id,
            eventId: selectedEventId,
            organizationId: currentUser?.organizationId || 'org1',
            checkedInAt: timestamp
          };
          queue.push(newItem);
          localStorage.setItem(queueKey, JSON.stringify(queue));

          // Update parent state and local cache
          setParticipants(prev => {
            const updated = prev.map(p => p.id === found.id ? { ...p, checkedIn: true, checkedInAt: timestamp, printed: true } : p);
            localStorage.setItem(`credencia_participants_cache_${selectedEventId}`, JSON.stringify(updated));
            return updated;
          });

          setScanResult({
            success: true,
            alreadyCheckedIn: false,
            message: '[Offline] Check-in salvo localmente!',
            decodedText: code,
            user: found,
            event: { id: selectedEventId, name: 'Evento Offline' }
          });

          addToast(` [Offline] Check-in de ${found.name} salvo na fila local!`, 'success');
          playBeep('success');
          triggerVibrate('success');

          // Trigger print label window
          const activeEvent = events.find(e => e.id === selectedEventId);
          setActivePrintRecord({
            participant: { ...found, checkedIn: true, printed: true, checkedInAt: timestamp },
            event: activeEvent || {
              id: selectedEventId,
              name: 'Evento Offline',
              date: new Date().toISOString().split('T')[0],
              location: 'Evento',
              capacity: 1000,
              createdAt: new Date().toISOString()
            }
          });
          return;
        }
      }

      playBeep('error');
      triggerVibrate('error');

      const failedMsg = err.message || 'Erro de rede ou participante não registrado';
      
      // Look up fallback participant info if client-side matching is possible, to show human details on failed check-ins
      setScanResult({
        success: false,
        message: failedMsg,
        decodedText: code
      });

      addToast(` Falha: ${failedMsg}`, 'error');
    }
  };

  // Clean-up scanner on component unmount
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        if (qrScannerRef.current.isScanning) {
          qrScannerRef.current.stop().catch(err => console.warn('Erro ao desmontar scanner:', err));
        }
      }
    };
  }, []);

  // Monitor selectedEventId changes to stop camera safely and reset page
  useEffect(() => {
    stopCamera();
    setScanResult(null);
    setCameraPermissionError(null);
  }, [selectedEventId]);

  return (
    <div id={id} className="space-y-6">
      {/* Target Printing modal layer */}
      {activePrintRecord && (
        <PrintCredential
          participant={activePrintRecord.participant}
          event={activePrintRecord.event}
          onClose={() => setActivePrintRecord(null)}
          autoPrint={true}
        />
      )}

      {/* Header Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-display flex items-center gap-2">
            <Camera className="text-blue-600 animate-pulse" size={24} />
            <span>Leitor de QR Code (Câmera)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium font-sans">
            Aponte o celular ou webcam para o ingresso/credencial para validar e imprimir a etiqueta de entrada automaticamente.
          </p>
        </div>

        {/* Global Toolbar and Event Selection widget */}
        <div className="shrink-0 max-w-xs self-start sm:self-auto flex items-center gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-display">
              Evento do Credenciamento
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => onSelectEvent(e.target.value)}
              className="w-full text-xs font-bold font-sans bg-white border border-slate-200/95 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-105 focus:border-blue-500 text-slate-700 cursor-pointer shadow-xs transition"
            >
              <option value="">-- Selecione o Evento --</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({new Date(ev.date + 'T12:00:00').toLocaleDateString('pt-BR')})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className={`p-2.5 rounded-xl border mt-5 transition cursor-pointer ${
              soundEnabled 
                ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' 
                : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600'
            }`}
            title={soundEnabled ? "Sons de confirmação ativos" : "Sons de confirmação desativados"}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      {/* Grid view containing layout zones */}
      {!selectedEventId ? (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-10 text-center max-w-lg mx-auto space-y-4 shadow-xs">
          <AlertCircle size={44} className="text-amber-500 mx-auto animate-bounce" />
          <h3 className="font-extrabold text-amber-900 text-base font-display">Câmera Bloqueada</h3>
          <p className="text-xs text-amber-700 leading-relaxed font-semibold">
            Você deve selecionar um evento no seletor acima para configurar e habilitar o fluxo automático de câmera do credenciamento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* LEFT ZONE: Video Scanner Viewport */}
          <div className="md:col-span-7 bg-slate-950 text-white rounded-3xl p-6 border border-slate-850 shadow-2xl relative">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-blue-400 block leading-none">
                  Estação Portaria
                </span>
                <h3 className="text-sm font-bold font-display text-slate-200 mt-1">Câmera de Leitura Direta</h3>
              </div>
              
              {isScanning && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full animate-pulse uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  LIVE CAMERA
                </span>
              )}
            </div>

            {/* Error banner */}
            {cameraPermissionError && (
              <div className="mb-4 bg-rose-500/15 border border-rose-500/20 text-rose-300 text-xs p-4 rounded-2xl flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p className="font-medium">{cameraPermissionError}</p>
              </div>
            )}

            {/* HTML5 QR Code target rendering layer */}
            <div className="relative w-full aspect-video md:aspect-square bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
              {/* Pulsing indicator laser effect */}
              {isScanning && (
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-rose-500/80 shadow-[0_0_15px_3px_rgba(239,68,68,0.7)] z-10 animate-[bounce_3s_infinite]" />
              )}

              {/* Underlying canvas container */}
              <div 
                id={scannerContainerId} 
                className={`w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full`}
              />

              {/* Placeholder backdrop when scanner is offline */}
              {!isScanning && !scanResult && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-center p-8 space-y-4">
                  <div className="p-4 bg-slate-900 border border-slate-850 rounded-2xl text-slate-500">
                    <Camera size={36} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-300 font-display">Câmera offline</h4>
                    <p className="text-xs text-slate-500 max-w-xs mt-1">
                      Inicie a câmera para decodificar QR codes de crachás ou celulares em tempo real.
                    </p>
                  </div>
                  <button
                    onClick={startCamera}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition active:scale-95 cursor-pointer selection:none"
                  >
                    Ativar Câmera Scanner
                  </button>
                </div>
              )}

              {/* Complete scan result screen filling visual */}
              {scanResult && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-4 z-20 ${
                  scanResult.success 
                    ? (scanResult.alreadyCheckedIn ? 'bg-amber-950/95 text-white' : 'bg-emerald-950/95 text-white') 
                    : 'bg-rose-950/95 text-white'
                }`}>
                  <div className={`p-4 rounded-full ${
                    scanResult.success 
                      ? (scanResult.alreadyCheckedIn ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-950/50' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-950') 
                      : 'bg-rose-500 text-white shadow-lg shadow-rose-950'
                  }`}>
                    {scanResult.success ? (scanResult.alreadyCheckedIn ? <AlertCircle size={36} /> : <CheckCircle2 size={36} />) : <AlertCircle size={36} />}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                      Resultado de Varredura
                    </span>
                    <h3 className="text-lg font-extrabold font-display leading-tight">
                      {scanResult.success 
                        ? (scanResult.alreadyCheckedIn ? ' Participante já credenciado' : ' Check-in realizado com sucesso!') 
                        : ' Falha no Check-in'}
                    </h3>
                    <p className="text-xs text-white/80 max-w-sm font-medium mt-1">
                      {scanResult.message}
                    </p>
                  </div>

                  {/* Scanned Person info snippet for fast verification */}
                  {scanResult.success && scanResult.user && (
                    <div className="bg-white/10 rounded-2xl p-4 border border-white/10 text-left text-xs max-w-xs w-full space-y-1">
                      <p className="truncate"> Nome: <b className={scanResult.alreadyCheckedIn ? 'text-amber-300' : 'text-emerald-300'}>{scanResult.user.name}</b></p>
                      <p className="truncate"> E-mail: <span className="font-mono">{scanResult.user.email}</span></p>
                      {scanResult.user.cpf && (
                        <p> CPF: <span className="font-mono">{scanResult.user.cpf}</span></p>
                      )}
                      {scanResult.user.category && (
                        <p> Categoria: <b>{scanResult.user.category}</b></p>
                      )}
                      <div className="pt-2 border-t border-white/10 flex items-center gap-1.5 text-[10px] text-white/70 font-bold">
                        <Printer size={12} className={scanResult.alreadyCheckedIn ? '' : 'animate-pulse'} />
                        <span>
                          {scanResult.alreadyCheckedIn 
                            ? 'Deseja reimprimir a credencial?' 
                            : 'Etiqueta térmica foi enviada para impressão...'}
                        </span>
                      </div>
                    </div>
                  )}

                  {!scanResult.success && scanResult.decodedText && (
                    <div className="bg-white/10 rounded-xl p-3 border border-white/5 text-xs max-w-xs w-full">
                      <p className="font-mono text-slate-300 truncate">Código lido: {scanResult.decodedText}</p>
                    </div>
                  )}

                  {/* Action row to restart scanning */}
                  <div className="pt-2 flex flex-wrap gap-2.5 justify-center">
                    <button
                      onClick={startCamera}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 border border-transparent rounded-xl text-xs font-extrabold shadow-sm hover:bg-slate-100 transition cursor-pointer select-none"
                    >
                      <RotateCcw size={14} />
                      <span>{scanResult.alreadyCheckedIn ? 'Cancelar / Escanear outro' : 'Escanear novamente'}</span>
                    </button>
                    {scanResult.success && scanResult.user && (
                      <button
                        onClick={() => {
                          const activeEvent = events.find(e => e.id === selectedEventId);
                          if (scanResult.user) {
                            setActivePrintRecord({
                              participant: {
                                id: scanResult.user.id || '',
                                eventId: selectedEventId,
                                name: scanResult.user.name,
                                email: scanResult.user.email,
                                cpf: scanResult.user.cpf || '',
                                category: (scanResult.user.category as any) || 'Participante',
                                ticketCode: scanResult.user.ticketCode || '',
                                company: scanResult.user.company,
                                checkedIn: true,
                                checkedInAt: new Date().toISOString(),
                                createdAt: new Date().toISOString()
                              },
                              event: activeEvent || {
                                id: selectedEventId,
                                name: scanResult.event?.name || 'Evento',
                                date: new Date().toISOString().split('T')[0],
                                location: 'Evento',
                                capacity: 1000,
                                createdAt: new Date().toISOString()
                              }
                            });
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer select-none ${
                          scanResult.alreadyCheckedIn 
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold'
                        }`}
                      >
                        <Printer size={14} />
                        <span>Imprimir novamente</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT ZONE: Quick Guidelines & Station Configuration */}
          <div className="md:col-span-5 bg-white rounded-3xl border border-slate-150 p-6 space-y-4 shadow-xs">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-sm font-display">Instruções Operacionais</h3>
              <p className="text-xs text-slate-400">Guia rápido para controle de fluxo de recepção.</p>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 font-sans leading-relaxed">
              <div className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-black flex items-center justify-center shrink-0">1</span>
                <div>
                  <p className="font-bold text-slate-750 text-slate-800">Selecione o Evento Ativo</p>
                  <p className="text-slate-500 text-[11px]">Selecione o evento no dropdown para carregar as credenciais da base correspondente.</p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-black flex items-center justify-center shrink-0">2</span>
                <div>
                  <p className="font-bold text-slate-750 text-slate-800">Conceda Permissão</p>
                  <p className="text-slate-500 text-[11px]">Certifique-se de autorizar o acesso à câmera para o aplicativo. A câmera traseira é acionada por default em smartphones.</p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-black flex items-center justify-center shrink-0">3</span>
                <div>
                  <p className="font-bold text-slate-750 text-slate-800">Leitor Instantâneo</p>
                  <p className="text-slate-500 text-[11px]">Aponte a câmera ao código de barra ou QR do ingresso. O sistema lerá e encerrará o fluxo de câmera para registrar no banco.</p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-black flex items-center justify-center shrink-0">4</span>
                <div>
                  <p className="font-bold text-slate-750 text-slate-800">Impressão Térmica Automática</p>
                  <p className="text-slate-500 text-[11px]">Se habilitado, após o sucesso o crachá é gerado e o spool de impressão térmica (window.print) do navegador abre instantaneamente.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs">
              <h4 className="font-bold text-slate-700 flex items-center gap-1">
                <Settings size={14} className="text-slate-400" />
                <span>Simulador de Teste Rápido</span>
              </h4>
              <p className="text-slate-500 text-[11px] leading-normal">
                Você pode gerar e exibir um PDF/Imagem contendo o QR Code do perfil do participante em outro smartphone, ou imprimir uma lista para testar o escaneamento físico com o visor da câmera.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
