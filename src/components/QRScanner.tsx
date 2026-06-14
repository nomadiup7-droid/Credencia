import React, { useState } from 'react';
import { Camera, Scan, AlertTriangle, CheckCircle, Search, HelpCircle } from 'lucide-react';
import { Participant } from '../types';

interface QRScannerProps {
  onScanSuccess: (code: string) => Promise<{ success: boolean; message: string; participant?: Participant }>;
  availableParticipants?: Participant[];
}

export default function QRScanner({ onScanSuccess, availableParticipants = [] }: QRScannerProps) {
  const [manualCode, setManualCode] = useState('');
  const [selectedSimParticipant, setSelectedSimParticipant] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [cameraActive, setCameraActive] = useState(true);

  // Filter out already checked in participants for simulation dropdown list to make it clean
  const waitingParticipants = availableParticipants.filter(p => !p.checkedIn);

  const triggerScan = async (codeToScan: string) => {
    if (!codeToScan.trim()) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await onScanSuccess(codeToScan);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `${res.message} - ${res.participant?.name || ''}`
        });
        setManualCode('');
        setSelectedSimParticipant('');
      } else {
        setFeedback({
          type: 'error',
          message: res.message
        });
      }
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: e.message || 'Erro de comunicação ao processar leitura do QR Code'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerScan(manualCode);
  };

  const handleSimulatedScan = () => {
    if (!selectedSimParticipant) return;
    const participant = availableParticipants.find(p => p.id === selectedSimParticipant);
    if (participant) {
      triggerScan(participant.ticketCode);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
          <Scan size={18} />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 font-display">Simulador de Leitura QR Code</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Mock Camera Interface */}
        <div className="flex flex-col items-center justify-center bg-gray-900 rounded-xl p-6 relative overflow-hidden min-h-[300px]">
          {cameraActive ? (
            <>
              {/* Laser Line Scanning effect */}
              <div className="absolute left-0 right-0 h-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-bounce z-10 w-full" style={{ animationDuration: '4s' }}></div>
              
              {/* Target bracket focus */}
              <div className="relative w-48 h-48 border-4 border-emerald-500/30 rounded-2xl flex items-center justify-center">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-xl"></div>

                <div className="flex flex-col items-center space-y-2 text-emerald-400">
                  <Camera size={40} className="animate-pulse" />
                  <span className="text-[10px] tracking-widest uppercase font-semibold text-emerald-300">Scanner Ativo</span>
                </div>
              </div>
              
              <p className="text-xs text-gray-400 mt-4 text-center px-4">
                Aponte o crachá do participante para o leitor ou use as ferramentas à direita para simular.
              </p>
            </>
          ) : (
            <div className="text-center py-10">
              <Camera size={44} className="mx-auto text-gray-700 mb-2" />
              <p className="text-sm font-medium text-gray-400">Câmera desativada</p>
            </div>
          )}

          <button
            onClick={() => setCameraActive(!cameraActive)}
            className="absolute bottom-3 right-3 px-2 py-1 bg-zinc-800 text-zinc-350 hover:bg-zinc-700 rounded text-[10px] uppercase tracking-wider font-semibold transition"
          >
            {cameraActive ? 'Apagar Leitor' : 'Ligar Leitor'}
          </button>
        </div>

        {/* Right Side: Operations Control Pane */}
        <div className="flex flex-col justify-between space-y-4">
          
          {/* Simulation Tool */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center space-x-1 mb-2">
              <HelpCircle size={14} className="text-emerald-600" />
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Ação Sem Crachá Físico</h4>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Selecione um participante aguardando check-in para simular o escaneamento do seu QR Code correspondente:
            </p>
            
            <div className="flex gap-2">
              <select
                value={selectedSimParticipant}
                onChange={(e) => setSelectedSimParticipant(e.target.value)}
                className="flex-grow rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">-- Escolha um Participante --</option>
                {waitingParticipants.map(wp => (
                  <option key={wp.id} value={wp.id}>
                    {wp.name} ({wp.category})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleSimulatedScan}
                disabled={!selectedSimParticipant || loading}
                className="flex items-center space-x-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 text-sm font-medium shrink-0 transition"
              >
                <span>Escanear</span>
              </button>
            </div>
          </div>

          {/* Manual input search tool */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Entrada Manual por Código ou CPF
              </label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Ex: TKT-E1-PAL-12345 ou CPF"
                    className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                </div>
                <button
                  type="submit"
                  disabled={!manualCode.trim() || loading}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg disabled:opacity-50 text-sm font-medium transition shrink-0"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </form>

          {/* Feedback Output Panel */}
          <div className="min-h-[70px] flex items-center justify-center">
            {loading && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"></div>
                <span>Processando leitura...</span>
              </div>
            )}

            {!loading && feedback && (
              <div className={`w-full p-3 rounded-lg flex items-start space-x-2 text-sm ${
                feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'
              }`}>
                {feedback.type === 'success' ? (
                  <CheckCircle size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {!loading && !feedback && (
              <p className="text-xs text-gray-450 italic text-center">
                Aguardando leitura de credencial para check-in automático.
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
