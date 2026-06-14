import React, { useState } from 'react';
import { Participant, Event } from '../types';
import { Printer, ShieldCheck, Ticket, Sliders, Settings } from 'lucide-react';
import QRCodeGen from './QRCodeGen';

interface BadgeLayoutProps {
  participant: Participant;
  event: Event;
  onClose?: () => void;
}

export default function BadgeLayout({ participant, event, onClose }: BadgeLayoutProps) {
  const [printMode, setPrintMode] = useState<'standard' | 'label'>('standard');

  const [labelConfig, setLabelConfig] = useState(() => {
    const saved = localStorage.getItem('credencia_label_config');
    return saved ? JSON.parse(saved) : {
      width: 76,
      height: 50,
      padding: 4,
      alignment: 'center',
      fontSizeName: 'lg',
      fontSizeMeta: 'xs',
      showEvent: true,
      showName: true,
      showEmail: false,
      showCpf: true,
      showCategory: true,
      showTicketCode: false,
      showQrCode: true,
      qrSize: 32,
      qrPosition: 'right',
      iconStyle: 'circle',
      contrastMode: 'monochrome',
      customHeader: ''
    };
  });

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'VIP':
        return {
          bg: 'bg-amber-500',
          text: 'text-white',
          border: 'border-amber-600',
          indicator: 'bg-amber-100 text-amber-800'
        };
      case 'Palestrante':
        return {
          bg: 'bg-purple-600',
          text: 'text-white',
          border: 'border-purple-700',
          indicator: 'bg-purple-100 text-purple-800'
        };
      case 'Expositor':
        return {
          bg: 'bg-teal-600',
          text: 'text-white',
          border: 'border-teal-700',
          indicator: 'bg-teal-100 text-teal-800'
        };
      case 'Staff':
        return {
          bg: 'bg-rose-600',
          text: 'text-white',
          border: 'border-rose-700',
          indicator: 'bg-rose-100 text-rose-800'
        };
      default:
        return {
          bg: 'bg-blue-600',
          text: 'text-white',
          border: 'border-blue-700',
          indicator: 'bg-blue-100 text-blue-800'
        };
    }
  };

  const colors = getCategoryStyles(participant.category);

  const handlePrint = () => {
    if (printMode === 'label') {
      const printTarget = document.getElementById('modal-print-label-target-wrapper');
      if (!printTarget) return;
      const clone = printTarget.cloneNode(true) as HTMLElement;
      clone.id = 'print-cloned-target';
      clone.style.display = 'block';
      clone.classList.remove('hidden');

      const labelTarget = clone.querySelector('#modal-print-label-target') as HTMLElement;
      if (labelTarget) {
        labelTarget.style.display = 'flex';
      }

      const styleEl = document.createElement('style');
      styleEl.id = 'dynamic-badge-label-print-style';
      styleEl.innerHTML = `
        @media print {
          #root {
            display: none !important;
          }
          @page {
            size: ${labelConfig.width}mm ${labelConfig.height}mm;
            margin: 0;
          }
          body {
            background: white !important;
          }
          #print-cloned-target {
            display: block !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            z-index: 99999999 !important;
          }
          #modal-print-label-target {
            display: flex !important;
            width: 100% !important;
            height: 100% !important;
            box-sizing: border-box !important;
            padding: ${labelConfig.padding}mm !important;
            background: white !important;
            color: black !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `;
      document.head.appendChild(styleEl);
      document.body.appendChild(clone);

      setTimeout(() => {
        window.focus();
        window.print();
        clone.remove();
        const st = document.getElementById('dynamic-badge-label-print-style');
        if (st) st.remove();
      }, 150);
    } else {
      const printTarget = document.getElementById('modal-print-standard-target-wrapper');
      if (!printTarget) return;
      const clone = printTarget.cloneNode(true) as HTMLElement;
      clone.id = 'print-cloned-target';
      clone.style.display = 'block';
      clone.classList.remove('hidden');
      
      const styleEl = document.createElement('style');
      styleEl.id = 'dynamic-badge-standard-print-style';
      styleEl.innerHTML = `
        @media print {
          #root {
            display: none !important;
          }
          @page {
            size: auto;
            margin: 15mm;
          }
          body {
            background: white !important;
          }
          #print-cloned-target {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            z-index: 99999999 !important;
          }
        }
      `;
      document.head.appendChild(styleEl);
      document.body.appendChild(clone);
      
      setTimeout(() => {
        window.focus();
        window.print();
        clone.remove();
        const st = document.getElementById('dynamic-badge-standard-print-style');
        if (st) st.remove();
      }, 150);
    }
  };

  const fontSizesNameStyles = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
    '2xl': 'text-xl'
  };

  const fontSizesMetaStyles = {
    xs: 'text-[9px]',
    sm: 'text-[11px]',
    md: 'text-[13px]'
  };

  const labelAspectRatio = labelConfig.width / labelConfig.height;
  const labelPreviewWidth = 340;
  const labelPreviewHeight = 340 / labelAspectRatio;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto p-4 md:p-10">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col no-print max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 rounded-t-2xl gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 font-display">Impressão do Crachá</h2>
            <p className="text-xs text-gray-500">Selecione o tipo de mídia e clique para imprimir.</p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
            {/* Format segment selector */}
            <div className="flex bg-gray-250 bg-gray-200 p-1 rounded-xl">
              <button
                onClick={() => setPrintMode('standard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  printMode === 'standard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Padrão (Duplo A6)
              </button>
              <button
                onClick={() => setPrintMode('label')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  printMode === 'label' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Etiqueta Térmica ({labelConfig.width}x{labelConfig.height}mm)
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition duration-200 shadow-sm shrink-0"
            >
              <Printer size={16} />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition duration-200 text-sm font-medium shrink-0"
            >
              Fechar
            </button>
          </div>
        </div>

        {/* Modal Body / Previsualização */}
        <div className="p-8 overflow-y-auto flex flex-col items-center justify-center bg-gray-100 gap-6">
          
          {printMode === 'standard' ? (
            <>
              <p className="text-sm text-gray-500 text-center max-w-lg">
                Visualização frente e verso para crachás padrão de eventos (bolsa plástica A6). Organizado para folha de credenciamento duplo.
              </p>

              <div className="flex flex-col md:flex-row items-center justify-center gap-10">
                {/* FRONT OF THE BADGE */}
                <div className="w-[300px] h-[450px] bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col relative overflow-hidden">
                  <div className={`${colors.bg} h-24 flex flex-col items-center justify-center text-center px-4 shrink-0`}>
                    <h3 className="text-white text-[10px] tracking-widest uppercase font-semibold">Credenciamento Oficial</h3>
                    <span className="text-white font-display font-medium text-xs truncate max-w-full">
                      {event.name}
                    </span>
                  </div>

                  {/* Clip Hole Indicator */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-3 bg-gray-300 rounded-full border border-gray-400 opacity-60"></div>

                  {/* Participant zone */}
                  <div className="flex flex-col items-center justify-center flex-1 py-4 text-center px-6">
                    <div className={`w-20 h-20 rounded-full ${colors.bg} flex items-center justify-center text-white mb-3 shadow-md`}>
                      <ShieldCheck size={40} />
                    </div>
                    <h1 className="font-display font-bold text-lg text-gray-900 leading-tight w-full truncate">
                      {participant.name}
                    </h1>
                    <p className="text-xs text-gray-500 font-mono mt-1 select-all">{participant.email}</p>
                    <p className="text-xs text-gray-400 mt-2">CPF: {participant.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</p>
                  </div>

                  {/* QR Code */}
                  <div className="flex items-center justify-center pb-5 shrink-0">
                    <QRCodeGen value={participant.ticketCode} size={110} />
                  </div>

                  <div className={`${colors.bg} py-3 text-center text-white font-bold tracking-widest uppercase text-sm font-display shrink-0`}>
                    {participant.category}
                  </div>
                </div>

                {/* BACK OF THE BADGE */}
                <div className="w-[300px] h-[450px] bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col relative overflow-hidden">
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-3 bg-gray-300 rounded-full border border-gray-400 opacity-60"></div>

                  <div className="flex flex-col items-center justify-between flex-grow p-6 text-center">
                    <div className="mt-8">
                      <Ticket size={36} className="mx-auto text-gray-400" />
                      <h4 className="font-display text-sm font-semibold text-gray-800 mt-2">Acesso e Recomendações</h4>
                    </div>

                    <div className="text-[11px] text-gray-500 space-y-3 leading-relaxed text-left px-2">
                      <p>• Este crachá é pessoal, intransferível e indispensável para permanência no evento.</p>
                      <p>• Mantenha a credencial visível em sua lapela ou pescoço durante o trânsito no local.</p>
                      <p>• Em caso de perda, dirija-se imediatamente à mesa de recepção central de credenciamento.</p>
                      <p>• Participe das avaliações das palestras usando os pontos de coletas digitais.</p>
                    </div>

                    <div className="border-t border-gray-100 pt-4 w-full text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">Organização do Evento</p>
                      <p className="text-xs text-gray-600 font-display font-medium max-w-full truncate">{event.name}</p>
                      <p className="text-[9px] font-mono text-gray-400 mt-1">Data: {new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 text-center max-w-lg">
                Formatado em alta definição para rolos e etiquetas térmicas contínuas ou recortadas de tamanho personalizado.
              </p>

              {/* Dynamic thermal sticker sandbox preview */}
              <div 
                className={`bg-white text-slate-950 rounded shadow-2xl relative border-2 ${
                  labelConfig.contrastMode === 'monochrome' ? 'border-black' : 'border-blue-500'
                }`}
                style={{
                  width: `${labelPreviewWidth}px`,
                  height: `${labelPreviewHeight}px`,
                  boxSizing: 'border-box',
                  padding: `${(labelConfig.padding / labelConfig.height) * labelPreviewHeight}px`,
                  display: 'flex',
                  flexDirection: labelConfig.qrPosition === 'bottom' ? 'column' : labelConfig.qrPosition === 'top' ? 'column-reverse' : 'row',
                  justifyContent: labelConfig.qrPosition === 'side-by-side' ? 'space-between' : 'center',
                  alignItems: labelConfig.alignment === 'center' ? 'center' : labelConfig.alignment === 'right' ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Information blocks */}
                <div style={{
                  textAlign: labelConfig.alignment,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  height: '100%',
                  gap: '2px',
                  flex: 1,
                  overflow: 'hidden',
                  width: labelConfig.qrPosition === 'side-by-side' ? '60%' : '100%'
                }}>
                  {labelConfig.customHeader && (
                    <span className="text-[9px] uppercase tracking-wide font-black text-blue-600 block leading-none select-none mb-1">
                      {labelConfig.customHeader}
                    </span>
                  )}

                  {labelConfig.showEvent && (
                    <span className={`font-display tracking-tight text-slate-500 truncate block leading-tight font-bold ${fontSizesMetaStyles[labelConfig.fontSizeMeta]}`}>
                      {event.name}
                    </span>
                  )}

                  {labelConfig.showCategory && (
                    <div className="w-fit inline-block mb-1 select-none">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest ${
                        labelConfig.contrastMode === 'monochrome' 
                          ? 'border border-black text-black bg-white font-mono' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {participant.category}
                      </span>
                    </div>
                  )}

                  {labelConfig.showName && (
                    <h1 className={`font-bold font-display leading-tight text-slate-950 block ${fontSizesNameStyles[labelConfig.fontSizeName]} truncate`}>
                      {participant.name}
                    </h1>
                  )}

                  {labelConfig.showCpf && (
                    <p className={`font-mono text-slate-700 ${fontSizesMetaStyles[labelConfig.fontSizeMeta]}`}>
                      CPF: {participant.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                    </p>
                  )}

                  {labelConfig.showEmail && (
                    <p className={`font-mono text-slate-600 truncate ${fontSizesMetaStyles[labelConfig.fontSizeMeta]}`}>
                      {participant.email}
                    </p>
                  )}

                  {labelConfig.showTicketCode && (
                    <p className="text-[8px] text-slate-400 font-mono tracking-wider">
                      REF: {participant.ticketCode}
                    </p>
                  )}
                </div>

                {labelConfig.showQrCode && (
                  <div className="shrink-0 flex items-center justify-center m-1 select-none"
                       style={{ order: labelConfig.qrPosition === 'left' ? -1 : 0 }}>
                    <QRCodeGen value={participant.ticketCode} size={labelConfig.qrSize * 2.2} />
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>

      {/* --- PRINT AREA - Only triggered by window.print() --- */}
      {printMode === 'standard' ? (
        <div id="modal-print-standard-target-wrapper" className="hidden">
          <div className="flex flex-col items-center justify-center p-0 gap-10">
            {/* Front badge row */}
            <div className="w-[325px] h-[480px] bg-white border border-dashed border-gray-400 flex flex-col items-center relative p-4 mb-20">
              <div className="w-full h-24 bg-zinc-900 flex flex-col items-center justify-center text-center px-4 rounded-t-lg">
                <h3 className="text-white text-[10px] tracking-widest uppercase font-semibold">Credenciamento Oficial</h3>
                <span className="text-white font-display font-medium text-xs leading-tight line-clamp-2">
                  {event.name}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center flex-grow py-4 text-center w-full">
                <div className="w-16 h-16 rounded-full border-2 border-black flex items-center justify-center mb-2">
                  <ShieldCheck size={32} />
                </div>
                <h1 className="font-display font-bold text-xl text-black leading-tight truncate w-full">
                  {participant.name}
                </h1>
                <p className="text-xs text-zinc-800 font-mono">{participant.email}</p>
                <p className="text-xs text-zinc-700 mt-1">CPF: {participant.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</p>
              </div>

              <div className="flex items-center justify-center pb-4 animate-fade-in font-sans">
                <QRCodeGen value={participant.ticketCode} size={110} showValueText={false} />
              </div>

              <div className="w-full bg-zinc-900 py-3 text-center text-white font-bold tracking-widest uppercase text-sm font-display rounded-b-lg">
                {participant.category}
              </div>
            </div>

            {/* Back badge row */}
            <div className="w-[325px] h-[480px] bg-white border border-dashed border-gray-400 flex flex-col items-center justify-between p-6 relative">
              <div className="mt-8 text-center w-full">
                <Ticket size={36} className="mx-auto text-zinc-950" />
                <h4 className="font-display text-base font-semibold text-black mt-2">Acesso e Recomendações</h4>
              </div>

              <div className="text-[11px] text-zinc-800 space-y-3 leading-relaxed text-left w-full px-2">
                <p>• Este crachá é pessoal, intransferível e indispensável para permanência no evento.</p>
                <p>• Mantenha a credencial visível em sua lapela ou pescoço durante o trânsito no local.</p>
                <p>• Em caso de perda, dirija-se imediatamente à mesa de recepção central de credenciamento.</p>
                <p>• Participe das avaliações das palestras usando os pontos de coletas digitais.</p>
              </div>

              <div className="border-t border-zinc-200 pt-4 w-full text-center">
                <p className="text-[10px] text-zinc-500 uppercase font-semibold">Organização do Evento</p>
                <p className="text-sm text-black font-display font-medium">{event.name}</p>
                <p className="text-[9px] font-mono text-zinc-650 mt-1">Data: {new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Dynamic Thermal Tag Printable Target - completely decoupled from standard document during @media print */
        <div id="modal-print-label-target-wrapper" className="hidden">
          <div 
            id="modal-print-label-target"
            style={{
              width: `${labelConfig.width}mm`,
              height: `${labelConfig.height}mm`,
              boxSizing: 'border-box',
              padding: `${labelConfig.padding}mm`,
              display: 'flex',
              flexDirection: labelConfig.qrPosition === 'bottom' ? 'column' : labelConfig.qrPosition === 'top' ? 'column-reverse' : 'row',
              justifyContent: labelConfig.qrPosition === 'side-by-side' ? 'space-between' : 'center',
              alignItems: labelConfig.alignment === 'center' ? 'center' : labelConfig.alignment === 'right' ? 'flex-end' : 'flex-start',
              backgroundColor: 'white',
              color: 'black',
              fontFamily: 'sans-serif'
            }}
          >
            {/* Information print container */}
            <div style={{
              textAlign: labelConfig.alignment,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              height: '100%',
              gap: '1px',
              flex: 1,
              overflow: 'hidden',
              width: labelConfig.qrPosition === 'side-by-side' ? '65%' : '100%'
            }}>
              {labelConfig.customHeader && (
                <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>
                  {labelConfig.customHeader}
                </span>
              )}

              {labelConfig.showEvent && (
                <span style={{ fontSize: '8px', color: '#444', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {event.name}
                </span>
              )}

              {labelConfig.showCategory && (
                <div style={{ marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '8px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    border: '1px solid black',
                    padding: '1px 4px',
                    borderRadius: '2px',
                    backgroundColor: 'white',
                    color: 'black'
                  }}>
                    {participant.category}
                  </span>
                </div>
              )}

              {labelConfig.showName && (
                <h1 style={{
                  fontSize: labelConfig.fontSizeName === 'sm' ? '12px' : labelConfig.fontSizeName === 'md' ? '14px' : labelConfig.fontSizeName === 'lg' ? '16px' : labelConfig.fontSizeName === 'xl' ? '19px' : '22px',
                  fontWeight: 'bold',
                  margin: '2px 0',
                  lineHeight: '1.1',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {participant.name}
                </h1>
              )}

              {labelConfig.showCpf && (
                <p style={{ fontSize: '9px', fontFamily: 'monospace', margin: '1px 0' }}>
                  CPF: {participant.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                </p>
              )}

              {labelConfig.showEmail && (
                <p style={{ fontSize: '8px', fontFamily: 'monospace', margin: '1px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {participant.email}
                </p>
              )}

              {labelConfig.showTicketCode && (
                <p style={{ fontSize: '8px', fontFamily: 'monospace', color: '#666', margin: '0' }}>
                  REF: {participant.ticketCode}
                </p>
              )}
            </div>

            {labelConfig.showQrCode && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '4mm',
                order: labelConfig.qrPosition === 'left' ? -1 : 0
              }}>
                <QRCodeGen value={participant.ticketCode} size={labelConfig.qrSize * 3.7} showValueText={false} />
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
