import React, { useEffect, useRef } from 'react';
import { Participant, Event, BadgeFieldItem } from '../types';
import UserQRCode from './UserQRCode';
import { Printer, X } from 'lucide-react';

interface LabelPrintProps {
  id?: string;
  participant: Participant | null;
  event: Event | null;
  onClose: () => void;
  autoPrint?: boolean;
}

export default function LabelPrint({
  id = 'label-print-component',
  participant,
  event,
  onClose,
  autoPrint = true
}: LabelPrintProps) {
  const printCountRef = useRef(0);

  // Parse layoutConfig if present, otherwise fallback
  const config = event?.layoutConfig || {
    width: event?.credentialSize === '8x4' ? 80 : event?.credentialSize === '8x5' ? 80 : 90,
    height: event?.credentialSize === '8x4' ? 40 : event?.credentialSize === '8x5' ? 50 : 40,
    padding: 4,
    alignment: 'center',
    fontSizeName: 'lg',
    fontSizeMeta: 'sm',
    showEvent: true,
    showName: true,
    showEmail: false,
    showCpf: true,
    showCategory: true,
    showTicketCode: true,
    showQrCode: event?.showQRCode !== false,
    qrSize: 32,
    qrPosition: 'right',
    iconStyle: 'shield',
    contrastMode: 'colored',
    customHeader: '',
    showCompany: true,
    fields: [
      { id: 'header', label: 'Cabeçalho Decorativo', visible: false, bold: true },
      { id: 'event', label: 'Nome do Evento', visible: true, bold: false },
      { id: 'category', label: 'Categoria (Crachá)', visible: true, bold: true },
      { id: 'name', label: 'Nome do Participante', visible: true, bold: true },
      { id: 'company', label: 'Empresa', visible: true, bold: false },
      { id: 'cpf', label: 'CPF do Participante', visible: true, bold: false },
      { id: 'email', label: 'E-mail do Participante', visible: false, bold: false },
      { id: 'ticketCode', label: 'Ref/Ticket de Inscrição', visible: true, bold: false }
    ]
  };

  const printableRef = useRef<HTMLDivElement>(null);

  const size = event?.credentialSize || '9x4';
  const widthCm = config.width ? config.width / 10 : 9;
  const heightCm = config.height ? config.height / 10 : 4;

  const fontMultiplierName = config.fontSizeName === 'sm' ? '11px' : config.fontSizeName === 'md' ? '13px' : config.fontSizeName === 'lg' ? '15px' : config.fontSizeName === 'xl' ? '18px' : '22px';
  const fontMultiplierMeta = config.fontSizeMeta === 'xs' ? '8px' : config.fontSizeMeta === 'sm' ? '10px' : '12px';

  // Layout parameters
  const isQrOnSide = config.qrPosition === 'left' || config.qrPosition === 'right' || config.qrPosition === 'side-by-side';
  const qrOrder = (config.qrPosition === 'top' || config.qrPosition === 'left') ? -1 : 1;

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  useEffect(() => {
    if (participant && event && autoPrint) {
      const timer = setTimeout(() => {
        if (printCountRef.current < 1) {
          printCountRef.current += 1;
          handlePrint();
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [participant, event, autoPrint]);

  if (!participant || !event) return null;

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

  // Layout parameters
  const getAlignmentClass = () => {
    switch (config.alignment) {
      case 'left': return 'items-start text-left';
      case 'right': return 'items-end text-right';
      default: return 'items-center text-center';
    }
  };

  return (
    <div id={id} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <style>{`
        @media print {
          @page {
            size: ${widthCm}cm ${heightCm}cm;
            margin: 0 !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: ${widthCm}cm !important;
            height: ${heightCm}cm !important;
            overflow: hidden !important;
            background-color: white !important;
          }
          #root {
            height: 0 !important;
            max-height: 0 !important;
            min-height: 0 !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            float: left !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-credential, #printable-credential * {
            visibility: visible !important;
          }
          #printable-credential {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: ${widthCm}cm !important;
            height: ${heightCm}cm !important;
            margin: 0 !important;
            padding: ${config.padding / 10}cm !important;
            box-sizing: border-box !important;
            background-color: white !important;
            color: black !important;
            display: flex !important;
            flex-direction: ${isQrOnSide ? 'row' : 'column'} !important;
            align-items: center !important;
            justify-content: space-between !important;
            z-index: 99999999 !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col border border-slate-100 animate-fade-in">
        {/* Header toolbar */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded-full uppercase">
              Etiqueta {widthCm}x{heightCm}cm
            </span>
            <h3 className="font-extrabold text-slate-800 text-sm font-display leading-none">
              Pronta para Impressão
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal body Content & Preview Area */}
        <div className="p-6 space-y-5 flex flex-col items-center justify-center bg-slate-100/50">
          <p className="text-xs text-slate-500 text-center font-medium max-w-sm">
            Formatada com precisão para rolos térmicos de <b>{widthCm * 10}mm x {heightCm * 10}mm</b>. O comando de impressão foi disparado.
          </p>

          {/* Interactive preview container */}
          <div 
            ref={printableRef}
            id="printable-credential"
            style={{ 
              width: `${widthCm * 44}px`, 
              height: `${heightCm * 44}px`,
              padding: `${config.padding}px`,
              display: 'flex',
              flexDirection: isQrOnSide ? 'row' : 'column',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
            className="bg-white text-slate-900 border border-slate-300 shadow-md rounded-lg flex items-center justify-between gap-4 text-left font-sans select-none overflow-hidden shrink-0"
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
                gap: '2px'
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
                          style={{ fontSize: '8px', ...customFontSizeStyle }}
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
                          style={{ fontSize: '9px', ...customFontSizeStyle }}
                          className={`text-slate-400 uppercase tracking-tight break-words leading-tight block w-full ${
                            field.bold ? 'font-black' : 'font-semibold'
                          }`}
                        >
                          {event.name}
                        </span>
                      );
                    case 'category':
                      return (
                        <div key={field.id} className="my-0.5">
                          <span 
                            style={{ fontSize: '8px', ...customFontSizeStyle }}
                            className={`inline-block font-black uppercase tracking-widest px-1.5 py-0.2 ml-0 rounded border text-slate-800 border-slate-300 bg-slate-50 ${
                              field.bold ? 'font-black' : 'font-semibold'
                            }`}
                          >
                            {participant.category}
                          </span>
                        </div>
                      );
                    case 'name':
                      return (
                        <h1 
                          key={field.id}
                          style={{ fontSize: fontMultiplierName, ...customFontSizeStyle }}
                          className={`text-slate-950 leading-tight block break-words w-full ${
                            field.bold ? 'font-black tracking-tight' : 'font-semibold'
                          }`}
                        >
                          {participant.name}
                        </h1>
                      );
                    case 'company':
                      if (!participant.company) return null;
                      return (
                        <p 
                          key={field.id}
                          style={{ fontSize: fontMultiplierMeta, ...customFontSizeStyle }}
                          className={`text-slate-705 break-words leading-tight uppercase tracking-wide w-full ${
                            field.bold ? 'font-extrabold text-slate-950' : 'font-medium text-slate-500'
                          }`}
                        >
                          {participant.company}
                        </p>
                      );
                    case 'cpf':
                      if (!participant.cpf) return null;
                      return (
                        <p 
                          key={field.id}
                          style={{ fontSize: fontMultiplierMeta, ...customFontSizeStyle }}
                          className={`font-mono text-slate-600 break-words w-full ${
                            field.bold ? 'font-bold' : 'font-normal'
                          }`}
                        >
                          CPF: {participant.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                        </p>
                      );
                    case 'email':
                      if (!participant.email) return null;
                      return (
                        <p 
                          key={field.id}
                          style={{ fontSize: fontMultiplierMeta, ...customFontSizeStyle }}
                          className={`font-mono text-slate-500 break-words w-full ${
                            field.bold ? 'font-bold' : 'font-normal'
                          }`}
                        >
                          {participant.email}
                        </p>
                      );
                    case 'ticketCode':
                      if (!participant.ticketCode) return null;
                      return (
                        <p 
                          key={field.id}
                          style={{ fontSize: '7px', ...customFontSizeStyle }}
                          className={`text-slate-400 font-mono tracking-wider uppercase break-words w-full ${
                            field.bold ? 'font-bold text-slate-600' : 'font-normal'
                          }`}
                        >
                          Ref: {participant.ticketCode}
                        </p>
                      );
                    default:
                      return null;
                  }
                })}
            </div>

            {/* QR Code */}
            {config.showQrCode && (
              <div 
                className="shrink-0 flex items-center justify-center p-0.5 bg-white border border-slate-100 rounded shadow-xs"
                style={{
                  order: qrOrder,
                  margin: '4px'
                }}
              >
                <UserQRCode value={participant.id} size={config.qrSize * 1.5} />
              </div>
            )}
          </div>
        </div>

        {/* Footer controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition cursor-pointer select-none"
          >
            <span>Imprimir Novamente</span>
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 rounded-xl transition cursor-pointer select-none"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
}
