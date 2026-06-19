import React, { useEffect, useRef } from 'react';
import { Participant, Event, BadgeFieldItem } from '../types';
import UserQRCode from './UserQRCode';
import { Printer, X } from 'lucide-react';
import QRCode from 'qrcode';

interface LabelPrintProps {
  id?: string;
  participant: Participant | null;
  event: Event | null;
  onClose: () => void;
  autoPrint?: boolean;
}

let lastAutoPrintSignature = '';
let lastAutoPrintAt = 0;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

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

  const buildPrintFieldHtml = () => {
    if (!participant || !event) return '';

    return activeFields
      .filter(f => f.visible)
      .map((field) => {
        const fontSize = field.fontSize ? `${field.fontSize}px` : undefined;

        switch (field.id) {
          case 'header':
            if (!config.customHeader) return '';
            return `<span style="font-size: ${fontSize || '8px'}; font-weight: ${field.bold ? 900 : 500}; text-transform: uppercase; line-height: 1;">${escapeHtml(config.customHeader)}</span>`;
          case 'event':
            return `<span style="font-size: ${fontSize || '9px'}; font-weight: ${field.bold ? 900 : 600}; text-transform: uppercase; color: #64748b; line-height: 1.1;">${escapeHtml(event.name)}</span>`;
          case 'category':
            return `<span style="font-size: ${fontSize || '8px'}; font-weight: ${field.bold ? 900 : 600}; text-transform: uppercase; line-height: 1.1;">${escapeHtml(participant.category || '')}</span>`;
          case 'name':
            return `<h1 style="font-size: ${fontSize || fontMultiplierName}; font-weight: ${field.bold ? 900 : 600}; line-height: 1.05; margin: 0;">${escapeHtml(participant.badgeName || participant.name)}</h1>`;
          case 'company':
            if (!participant.company) return '';
            return `<p style="font-size: ${fontSize || fontMultiplierMeta}; font-weight: ${field.bold ? 800 : 500}; margin: 0; text-transform: uppercase; line-height: 1.1;">${escapeHtml(participant.company)}</p>`;
          case 'cpf':
            if (!participant.cpf) return '';
            return `<p style="font-size: ${fontSize || fontMultiplierMeta}; font-weight: ${field.bold ? 700 : 400}; margin: 0; font-family: monospace; line-height: 1.1;">CPF: ${escapeHtml(participant.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'))}</p>`;
          case 'email':
            if (!participant.email) return '';
            return `<p style="font-size: ${fontSize || fontMultiplierMeta}; font-weight: ${field.bold ? 700 : 400}; margin: 0; font-family: monospace; line-height: 1.1;">${escapeHtml(participant.email)}</p>`;
          case 'ticketCode':
            if (!participant.ticketCode) return '';
            return `<p style="font-size: ${fontSize || '7px'}; font-weight: ${field.bold ? 700 : 400}; margin: 0; font-family: monospace; text-transform: uppercase; line-height: 1.1;">Ref: ${escapeHtml(participant.ticketCode)}</p>`;
          default:
            return '';
        }
      })
      .join('');
  };

  const handlePrint = async () => {
    if (!participant || !event) return;

    const printFrame = document.createElement('iframe');
    const frameName = `label-print-${participant.id}-${Date.now()}`;
    printFrame.name = frameName;
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.visibility = 'hidden';

    const qrUrl = config.showQrCode
      ? await QRCode.toDataURL(participant.id, {
          width: Math.max(48, Math.round(config.qrSize * 1.5)),
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        })
      : '';

    const printHtml = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Etiqueta</title>
          <style>
            @page {
              size: ${widthCm}cm ${heightCm}cm;
              margin: 0;
            }
            html,
            body {
              width: ${widthCm}cm;
              height: ${heightCm}cm;
              margin: 0;
              padding: 0;
              overflow: hidden;
              background: #ffffff;
              color: #000000;
              font-family: Arial, Helvetica, sans-serif;
            }
            .label {
              width: ${widthCm}cm;
              height: ${heightCm}cm;
              padding: ${config.padding / 10}cm;
              box-sizing: border-box;
              display: flex;
              flex-direction: ${isQrOnSide ? 'row' : 'column'};
              align-items: center;
              justify-content: space-between;
              gap: 4px;
              page-break-after: avoid;
              page-break-before: avoid;
              page-break-inside: avoid;
              break-after: avoid;
              break-before: avoid;
              break-inside: avoid;
            }
            .fields {
              order: 0;
              align-self: stretch;
              display: flex;
              flex-direction: column;
              justify-content: center;
              flex: 1;
              min-width: 0;
              gap: 2px;
              text-align: ${config.alignment};
            }
            .qr {
              order: ${qrOrder};
              margin: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .qr img {
              display: block;
              width: ${Math.max(48, Math.round(config.qrSize * 1.5))}px;
              height: ${Math.max(48, Math.round(config.qrSize * 1.5))}px;
              border: 0;
              outline: 0;
            }
            * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="fields">${buildPrintFieldHtml()}</div>
            ${qrUrl ? `<div class="qr"><img src="${qrUrl}" alt="QR Code" /></div>` : ''}
          </div>
        </body>
      </html>`;

    document.body.appendChild(printFrame);
    const printDocument = printFrame.contentWindow?.document;

    if (!printDocument || !printFrame.contentWindow) {
      printFrame.remove();
      return;
    }

    printDocument.open();
    printDocument.write(printHtml);
    printDocument.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => printFrame.remove(), 1000);
    }, 250);
  };

  useEffect(() => {
    if (participant && event && autoPrint) {
      const timer = setTimeout(() => {
        if (printCountRef.current < 1) {
          const signature = `${event.id}:${participant.id}`;
          const now = Date.now();

          if (lastAutoPrintSignature === signature && now - lastAutoPrintAt < 2500) {
            return;
          }

          lastAutoPrintSignature = signature;
          lastAutoPrintAt = now;
          printCountRef.current += 1;
          void handlePrint();
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [participant, event, autoPrint]);

  if (!participant || !event) return null;

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
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            width: ${widthCm}cm !important;
            height: ${heightCm}cm !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }
          body * {
            visibility: hidden !important;
          }
          #${id} {
            position: fixed !important;
            inset: 0 auto auto 0 !important;
            display: block !important;
            width: ${widthCm}cm !important;
            height: ${heightCm}cm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: transparent !important;
            backdrop-filter: none !important;
          }
          #label-preview, #label-preview * {
            visibility: visible !important;
          }
          #label-preview {
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
          #label-preview {
            border-radius: 0 !important;
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
            id="label-preview"
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
                          {participant.badgeName || participant.name}
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
                className="shrink-0 flex items-center justify-center"
                style={{
                  order: qrOrder,
                  margin: '4px'
                }}
              >
                <UserQRCode value={participant.id} size={config.qrSize * 1.5} frameless />
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
