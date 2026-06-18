import React, { useState, useEffect } from 'react';
import { Participant, Event, LabelConfig, BadgeFieldItem } from '../types';
import UserQRCode from './UserQRCode';
import { ZoomIn, ZoomOut, Printer, Users } from 'lucide-react';

interface LivePreviewProps {
  id?: string;
  config: LabelConfig;
  currentEvent: Event | null;
  participants: Participant[];
  onPrintTest: (participant: Participant) => void;
}

const MOCK_PARTICIPANT: Participant = {
  id: 'preview-id-123',
  eventId: 'preview-event',
  name: 'Alexandre Ramos de Oliveira',
  email: 'alexandre.oliveira@empresa.com.br',
  cpf: '45678912300',
  category: 'VIP',
  checkedIn: true,
  checkedInAt: new Date().toISOString(),
  ticketCode: 'TKT-PREVIEW-VIP-7788',
  company: 'Inovação Tech Brasil',
  createdAt: new Date().toISOString()
};

const CATEGORY_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  VIP: { bg: 'bg-amber-100 text-amber-800 border-amber-300', text: 'text-amber-800', border: 'border-amber-400' },
  Palestrante: { bg: 'bg-purple-100 text-purple-800 border-purple-300', text: 'text-purple-800', border: 'border-purple-400' },
  Expositor: { bg: 'bg-teal-100 text-teal-800 border-teal-300', text: 'text-teal-800', border: 'border-teal-400' },
  Participante: { bg: 'bg-blue-100 text-blue-800 border-blue-300', text: 'text-blue-800', border: 'border-blue-400' },
  Staff: { bg: 'bg-rose-100 text-rose-800 border-rose-300', text: 'text-rose-800', border: 'border-rose-400' }
};

export default function LivePreview({
  id = 'live-preview-box',
  config,
  currentEvent,
  participants,
  onPrintTest
}: LivePreviewProps) {
  const [scale, setScale] = useState<number>(1.0);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant>(() => {
    return participants.length > 0 ? participants[0] : MOCK_PARTICIPANT;
  });
  const [isHighlighting, setIsHighlighting] = useState<boolean>(false);

  // Sync preview participant if database updates
  useEffect(() => {
    if (participants.length > 0 && selectedParticipant.id === 'preview-id-123') {
      setSelectedParticipant(participants[0]);
    }
  }, [participants]);

  // Flash highlight effect when config changes
  useEffect(() => {
    setIsHighlighting(true);
    const timer = setTimeout(() => setIsHighlighting(false), 500);
    return () => clearTimeout(timer);
  }, [config]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 1.6));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.6));

  const isLabel = currentEvent?.credentialType === 'label';
  const widthCm = config.width ? config.width / 10 : (isLabel ? 9 : 10.5);
  const heightCm = config.height ? config.height / 10 : (isLabel ? 4 : 14.8);
  const scaleMultiplier = isLabel ? 44 : 28;

  const widthPx = widthCm * scaleMultiplier;
  const heightPx = heightCm * scaleMultiplier;

  // Exact Font size matches with templates
  const getNameFontSize = () => {
    if (isLabel) {
      switch (config.fontSizeName) {
        case 'sm': return '11px';
        case 'md': return '13px';
        case 'lg': return '15px';
        case 'xl': return '18px';
        default: return '22px'; // '2xl'
      }
    } else {
      switch (config.fontSizeName) {
        case 'sm': return '12px';
        case 'md': return '14px';
        case 'lg': return '18px';
        case 'xl': return '22px';
        default: return '26px'; // '2xl'
      }
    }
  };

  const getMetaFontSize = () => {
    if (isLabel) {
      switch (config.fontSizeMeta) {
        case 'xs': return '8px';
        case 'sm': return '10px';
        default: return '12px'; // 'md'
      }
    } else {
      switch (config.fontSizeMeta) {
        case 'xs': return '10px';
        case 'sm': return '12px';
        default: return '14px'; // 'md'
      }
    }
  };

  const getQrSizePx = () => {
    const qrFactor = isLabel ? 1.5 : 2.2;
    return config.qrSize * qrFactor;
  };

  // Safe fields list normalization
  const getNormalizedFields = (): BadgeFieldItem[] => {
    if (config.fields && Array.isArray(config.fields) && config.fields.length > 0) {
      const existingIds = config.fields.map(f => f.id);
      const defaults: BadgeFieldItem[] = [
        { id: 'header', label: 'Cabeçalho Decorativo', visible: !!config.customHeader, bold: true },
        { id: 'event', label: 'Nome do Evento', visible: config.showEvent !== false, bold: false },
        { id: 'category', label: 'Categoria (Crachá)', visible: config.showCategory !== false, bold: true },
        { id: 'name', label: 'Nome do Participante', visible: config.showName !== false, bold: true },
        { id: 'company', label: 'Empresa', visible: config.showCompany !== false, bold: false },
        { id: 'cpf', label: 'CPF do Participante', visible: config.showCpf !== false, bold: false },
        { id: 'email', label: 'E-mail do Participante', visible: config.showEmail === true, bold: false },
        { id: 'ticketCode', label: 'Ref/Ticket de Inscrição', visible: config.showTicketCode !== false, bold: false }
      ];
      const merged = [...config.fields];
      defaults.forEach(d => {
        if (!existingIds.includes(d.id)) {
          merged.push(d);
        }
      });
      return merged;
    }

    return [
      { id: 'header', label: 'Cabeçalho Decorativo', visible: !!config.customHeader, bold: true },
      { id: 'event', label: 'Nome do Evento', visible: config.showEvent !== false, bold: false },
      { id: 'category', label: 'Categoria (Crachá)', visible: config.showCategory !== false, bold: true },
      { id: 'name', label: 'Nome do Participante', visible: config.showName !== false, bold: true },
      { id: 'company', label: 'Empresa', visible: config.showCompany !== false, bold: false },
      { id: 'cpf', label: 'CPF do Participante', visible: config.showCpf !== false, bold: false },
      { id: 'email', label: 'E-mail do Participante', visible: config.showEmail === true, bold: false },
      { id: 'ticketCode', label: 'Ref/Ticket de Inscrição', visible: config.showTicketCode !== false, bold: false }
    ];
  };

  const activeFields = getNormalizedFields();
  const catStyle = CATEGORY_STYLE[selectedParticipant.category] || CATEGORY_STYLE.Participante;

  // Determine QR Code alignment and layout properties on the card
  const isQrOnSide = config.qrPosition === 'left' || config.qrPosition === 'right' || config.qrPosition === 'side-by-side';
  const qrOrder = (config.qrPosition === 'top' || config.qrPosition === 'left') ? -1 : 1;

  // Alignment classes
  const getAlignmentClass = () => {
    switch (config.alignment) {
      case 'left': return 'items-start text-left';
      case 'right': return 'items-end text-right';
      default: return 'items-center text-center';
    }
  };

  return (
    <div id={id} className="bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col items-center">
      
      {/* Upper toolbar */}
      <div className="w-full flex justify-between items-center mb-5 pb-3 border-b border-slate-800/80">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span>Pré-Visualização em Tempo Real</span>
        </span>
        
        {/* Zoom controls */}
        <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700">
          <button
            onClick={handleZoomOut}
            disabled={scale <= 0.6}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Diminuir Zoom"
          >
            <ZoomOut size={13} />
          </button>
          <span className="text-[10px] font-mono w-10 text-center font-bold text-slate-300">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={scale >= 1.6}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Aumentar Zoom"
          >
            <ZoomIn size={13} />
          </button>
        </div>
      </div>

      {/* Simulator canvas boundary wrapper */}
      <div className="w-full bg-slate-950/80 rounded-2xl border border-slate-850 p-6 flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
        
        {/* Inner dynamic style scale holder */}
        <div 
          style={{ 
            transform: `scale(${scale})`, 
            transition: 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          className="origin-center flex items-center justify-center"
        >
          {/* Authentic CSS thermal label representing the output with fixed layout */}
          <div
            className={`bg-white text-slate-900 shadow-2xl relative select-none rounded-xl transition-all duration-300 overflow-hidden ${
              isHighlighting ? 'ring-2 ring-yellow-400 bg-yellow-50/20' : ''
            } ${
              config.contrastMode === 'monochrome' ? 'border-2 border-black' : 'border border-slate-200'
            }`}
            style={{
              width: `${widthPx}px`,
              height: `${heightPx}px`,
              padding: `${config.padding}px`,
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: isQrOnSide ? 'row' : 'column',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            {/* Elements container flow */}
            <div 
              style={{
                order: 0,
                alignSelf: 'stretch',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                flex: 1,
                minWidth: 0,
                gap: isLabel ? '2px' : '4px'
              }}
              className={`w-full ${getAlignmentClass()}`}
            >
              {activeFields
                .filter(f => f.visible)
                .map((field) => {
                  const customFontSizeStyle = field.fontSize ? { fontSize: `${field.fontSize}px` } : {};
                  
                  switch (field.id) {
                    case 'header':
                      if (!config.customHeader) return null;
                      return (
                        <span 
                          key={field.id}
                          style={{ fontSize: isLabel ? '8px' : '10px', ...customFontSizeStyle }}
                          className={`uppercase tracking-widest block leading-none text-blue-600 break-words w-full ${
                            field.bold ? 'font-black' : 'font-medium'
                          }`}
                        >
                          {config.customHeader}
                        </span>
                      );
                    case 'event':
                      return (
                        <span 
                          key={field.id}
                          style={{ fontSize: isLabel ? '9px' : '11px', ...customFontSizeStyle }}
                          className={`text-slate-400 uppercase tracking-tight break-words leading-tight block w-full ${
                            field.bold ? 'font-black' : 'font-semibold'
                          }`}
                        >
                          {currentEvent?.name || 'Evento Conectado'}
                        </span>
                      );
                    case 'category':
                      return (
                        <div key={field.id} className={isLabel ? 'my-0.5' : 'my-1'}>
                          <span 
                            style={{ fontSize: isLabel ? '8px' : '9px', ...customFontSizeStyle }}
                            className={`inline-block font-black uppercase tracking-widest px-1.5 py-0.2 rounded border text-slate-800 border-slate-300 bg-slate-50 ${
                              field.bold ? 'font-black' : 'font-semibold'
                            }`}
                          >
                            {selectedParticipant.category}
                          </span>
                        </div>
                      );
                    case 'name':
                      return (
                        <h1 
                          key={field.id}
                          style={{ fontSize: getNameFontSize(), ...customFontSizeStyle }}
                          className={`text-slate-950 leading-tight block break-words w-full ${
                            field.bold ? 'font-black tracking-tight' : 'font-semibold'
                          }`}
                        >
                          {selectedParticipant.badgeName || selectedParticipant.name}
                        </h1>
                      );
                    case 'company':
                      if (!selectedParticipant.company) return null;
                      return (
                        <p 
                          key={field.id}
                          style={{ fontSize: getMetaFontSize(), ...customFontSizeStyle }}
                          className={`text-slate-705 break-words leading-tight uppercase tracking-wide w-full ${
                            field.bold ? 'font-extrabold text-slate-950' : 'font-medium text-slate-500'
                          }`}
                        >
                          {selectedParticipant.company}
                        </p>
                      );
                    case 'cpf':
                      if (!selectedParticipant.cpf) return null;
                      return (
                        <p 
                          key={field.id}
                          style={{ fontSize: getMetaFontSize(), ...customFontSizeStyle }}
                          className={`font-mono text-slate-600 break-words w-full ${
                            field.bold ? 'font-bold' : 'font-normal'
                          }`}
                        >
                          CPF: {selectedParticipant.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                        </p>
                      );
                    case 'email':
                      if (!selectedParticipant.email) return null;
                      return (
                        <p 
                          key={field.id}
                          style={{ fontSize: getMetaFontSize(), ...customFontSizeStyle }}
                          className={`font-mono text-slate-500 break-words w-full ${
                            field.bold ? 'font-bold' : 'font-normal'
                          }`}
                        >
                          {selectedParticipant.email}
                        </p>
                      );
                    case 'ticketCode':
                      if (!selectedParticipant.ticketCode) return null;
                      return (
                        <p 
                          key={field.id}
                          style={{ fontSize: isLabel ? '7px' : '8px', ...customFontSizeStyle }}
                          className={`text-slate-400 font-mono tracking-wider uppercase break-words w-full ${
                            field.bold ? 'font-bold text-slate-600' : 'font-normal'
                          }`}
                        >
                          Ref: {selectedParticipant.ticketCode}
                        </p>
                      );
                    default:
                      return null;
                  }
                })}
            </div>

            {/* QR Position Renderer */}
            {config.showQrCode && (
              <div 
                className="shrink-0 flex items-center justify-center"
                style={{
                  order: qrOrder,
                  margin: isLabel ? '4px' : '6px'
                }}
              >
                <UserQRCode value={selectedParticipant.id} size={getQrSizePx()} frameless />
              </div>
            )}
          </div>
        </div>

        {/* Real Dimensions display */}
        <div className="absolute bottom-3 left-3 text-[10px] bg-slate-900/60 text-slate-400 border border-slate-800 px-2 py-0.5 rounded font-mono font-medium">
          Tamanho Físico: {config.width} x {config.height} mm
        </div>
      </div>

      {/* Select participant preview selector */}
      <div className="w-full space-y-4 mt-5">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1 select-none">
            <span>Selecione um integrante para testar campos</span>
          </label>
          <select
            value={selectedParticipant.id}
            onChange={(e) => {
              const matched = participants.find(p => p.id === e.target.value);
              if (matched) setSelectedParticipant(matched);
            }}
            className="w-full text-xs font-bold bg-slate-800 border border-slate-700 text-slate-200 focus:text-white rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {participants.length === 0 ? (
              <option value={MOCK_PARTICIPANT.id}>[Simulado] {MOCK_PARTICIPANT.name}</option>
            ) : (
              participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category})
                </option>
              ))
            )}
          </select>
        </div>

        {/* Dynamic print button */}
        <button
          type="button"
          onClick={() => onPrintTest(selectedParticipant)}
          className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2 select-none"
        >
          <Printer size={15} />
          <span>Imprimir Credencial de Teste</span>
        </button>
      </div>

    </div>
  );
}
