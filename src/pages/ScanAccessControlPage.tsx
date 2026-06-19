import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { AlertTriangle, Camera, CheckCircle2, Fingerprint, Search, ShieldCheck, Square, XCircle } from 'lucide-react';
import { Area, Event, User } from '../types';

interface ScanAccessControlPageProps {
  currentEvent: Event | null;
  currentUser: User | null;
  apiCall: <T = any>(endpoint: string, options?: RequestInit) => Promise<T>;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

type ScanFeedback = {
  status: 'idle' | 'allowed' | 'denied' | 'not-found';
  title: string;
  message: string;
  participantName?: string;
};

export default function ScanAccessControlPage({
  currentEvent,
  currentUser,
  apiCall,
  addToast
}: ScanAccessControlPageProps) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [feedback, setFeedback] = useState<ScanFeedback>({
    status: 'idle',
    title: 'Aguardando leitura',
    message: 'Selecione uma área e leia o QR Code, CPF ou nome do participante.'
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<Html5Qrcode | null>(null);
  const cameraContainerId = 'scan-access-camera-reader';

  const selectedArea = useMemo(() => {
    return areas.find(area => area.id === selectedAreaId) || null;
  }, [areas, selectedAreaId]);

  const isAreaActive = (area: Area) => area.active !== false && area.isActive !== false && area.is_active !== false;

  useEffect(() => {
    const loadAreas = async () => {
      if (!currentEvent?.id) {
        setAreas([]);
        setSelectedAreaId('');
        return;
      }

      try {
        const data = await apiCall<Area[]>(`/api/areas?eventId=${currentEvent.id}`);
        setAreas(data || []);
        const firstActiveArea = (data || []).find(isAreaActive) || data?.[0];
        setSelectedAreaId(prev => (data || []).some(area => area.id === prev) ? prev : firstActiveArea?.id || '');
      } catch (error) {
        setAreas([]);
      }
    };

    loadAreas();
  }, [currentEvent?.id]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [selectedAreaId, feedback.status]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const resetFeedbackSoon = () => {
    window.setTimeout(() => {
      setFeedback({
        status: 'idle',
        title: 'Aguardando leitura',
        message: 'Pronto para a próxima leitura.'
      });
      inputRef.current?.focus();
    }, 4200);
  };

  const validateAccess = async (searchValue: string) => {
    const search = searchValue.trim();
    if (!currentEvent?.id) {
      addToast('Selecione um evento antes de iniciar o scan.', 'warning');
      return;
    }
    if (!selectedAreaId) {
      addToast('Selecione uma área para validar o acesso.', 'warning');
      return;
    }
    if (!search) {
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const result = await apiCall<{
        allowed: boolean;
        status: 'ALLOWED' | 'DENIED';
        message: string;
        participant?: { name?: string };
      }>('/api/access-control/validate', {
        method: 'POST',
        body: JSON.stringify({
          search,
          areaId: selectedAreaId,
          eventId: currentEvent.id
        })
      });

      if (result.allowed) {
        setFeedback({
          status: 'allowed',
          title: 'ACESSO LIBERADO',
          message: selectedArea ? `Entrada autorizada em ${selectedArea.name}.` : 'Entrada autorizada.',
          participantName: result.participant?.name
        });
        addToast(`Acesso liberado${result.participant?.name ? `: ${result.participant.name}` : ''}`, 'success');
      } else {
        const isNotFound = !result.participant || /n[a\u00e3]o registrado|n[a\u00e3]o encontrado|n[a\u00e3]o localizado/i.test(result.message || '');
        setFeedback({
          status: isNotFound ? 'not-found' : 'denied',
          title: isNotFound ? 'PARTICIPANTE NÃO ENCONTRADO' : 'ACESSO NEGADO',
          message: result.message || 'Participante sem permissão para esta área.',
          participantName: result.participant?.name
        });
        addToast(isNotFound ? 'Participante não encontrado.' : 'Acesso negado.', 'error');
      }

      setQuery('');
      resetFeedbackSoon();
    } catch (error: any) {
      setFeedback({
        status: 'denied',
        title: 'ACESSO NEGADO',
        message: error.message || 'Erro ao validar acesso.'
      });
      addToast(error.message || 'Erro ao validar acesso.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    await validateAccess(query);
  };

  const stopCamera = async () => {
    setCameraActive(false);
    if (!cameraRef.current) return;
    try {
      if (cameraRef.current.isScanning) {
        await cameraRef.current.stop();
      }
      await cameraRef.current.clear();
    } catch (error) {
      console.warn('Erro ao interromper câmera do scan:', error);
    } finally {
      cameraRef.current = null;
    }
  };

  const startCamera = async () => {
    if (!selectedAreaId) {
      addToast('Selecione uma área antes de ligar a câmera.', 'warning');
      return;
    }

    setCameraError('');
    setFeedback({
      status: 'idle',
      title: 'Câmera ativa',
      message: 'Aponte a câmera do celular para o QR Code.'
    });

    try {
      await stopCamera();
      const scanner = new Html5Qrcode(cameraContainerId);
      cameraRef.current = scanner;
      setCameraActive(true);

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 12,
          qrbox: (width, height) => {
            const size = Math.floor(Math.min(width, height) * 0.72);
            return { width: size, height: size };
          }
        },
        async decodedText => {
          await stopCamera();
          setQuery(decodedText);
          await validateAccess(decodedText);
        },
        () => {}
      );
    } catch (error: any) {
      setCameraActive(false);
      const message = error?.message || 'Não foi possível acessar a câmera do celular.';
      setCameraError(
        message.includes('Permission') || message.includes('NotAllowed')
          ? 'Permissão negada. Autorize o uso da câmera no navegador do celular.'
          : message
      );
      addToast('Não foi possível ativar a câmera.', 'error');
    }
  };

  const feedbackStyle = {
    idle: 'bg-white border-slate-200 text-slate-900',
    allowed: 'bg-emerald-600 border-emerald-700 text-white',
    denied: 'bg-rose-600 border-rose-700 text-white',
    'not-found': 'bg-amber-500 border-amber-600 text-slate-950'
  }[feedback.status];

  const FeedbackIcon = feedback.status === 'allowed'
    ? CheckCircle2
    : feedback.status === 'idle'
      ? Fingerprint
      : feedback.status === 'not-found'
        ? AlertTriangle
        : XCircle;

  return (
    <section className="max-w-6xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Scan / Controle de Acesso</p>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-950 font-display mt-1">Validador por área</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 break-words">
            Evento: <b>{currentEvent?.name || 'Não selecionado'}</b> - Operador: <b>{currentUser?.name || 'Operador'}</b>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 sm:gap-5">
        <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Área de destino</label>
            <select
              value={selectedAreaId}
              onChange={event => setSelectedAreaId(event.target.value)}
              className="w-full px-3 py-4 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg text-base sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione a área</option>
              {areas.map(area => (
                <option key={area.id} value={area.id}>
                  {area.name}{isAreaActive(area) ? '' : ' (inativa)'}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Nome, CPF ou QR Code</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Aguardando scanner físico ou câmera..."
                className="w-full pl-10 pr-3 py-4 bg-white border border-slate-300 rounded-lg text-base font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !selectedAreaId}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-4 sm:py-3 bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-lg text-base sm:text-sm font-bold transition cursor-pointer disabled:cursor-not-allowed"
            >
              <ShieldCheck size={17} />
              <span>{loading ? 'Validando...' : 'Validar Acesso'}</span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <button
              type="button"
              onClick={cameraActive ? stopCamera : startCamera}
              disabled={!selectedAreaId}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-4 sm:py-3 rounded-lg text-base sm:text-sm font-bold transition cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white ${
                cameraActive ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {cameraActive ? <Square size={17} /> : <Camera size={17} />}
              <span>{cameraActive ? 'Parar Câmera' : 'Ler pela Câmera do Celular'}</span>
            </button>
            {cameraError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                {cameraError}
              </div>
            )}
          </div>
        </div>

        <div className={`min-h-[420px] sm:min-h-[360px] rounded-lg border p-4 sm:p-8 flex flex-col items-center justify-center text-center transition ${feedbackStyle}`}> 
          <div
            id={cameraContainerId}
            className={`mb-5 w-full max-w-sm aspect-square overflow-hidden rounded-lg bg-slate-950 [&_video]:!w-full [&_video]:!h-full [&_video]:!object-cover ${cameraActive ? 'block' : 'hidden'}`}
          />
          <FeedbackIcon size={56} className="mb-4 sm:mb-5 sm:w-[78px] sm:h-[78px]" />
          <h2 className="text-2xl sm:text-5xl font-black tracking-wide break-words">{feedback.title}</h2>
          {feedback.participantName && (
            <p className="mt-4 text-lg sm:text-2xl font-extrabold break-words">{feedback.participantName}</p>
          )}
          <p className="mt-4 text-sm sm:text-lg font-semibold max-w-2xl opacity-90 break-words">{feedback.message}</p>
          {selectedArea && (
            <div className="mt-6 sm:mt-8 inline-flex max-w-full items-center gap-2 rounded-md px-4 py-2 bg-black/10 text-sm font-bold">
              <ShieldCheck size={16} />
              <span className="truncate">{selectedArea.name}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
