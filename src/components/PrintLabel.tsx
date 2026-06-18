import React, { useEffect, useRef } from 'react';
import { Participant, Event } from '../types';
import UserQRCode from './UserQRCode';
import { Printer, X, ShieldAlert } from 'lucide-react';

interface PrintLabelProps {
  id?: string;
  participant: Participant | null;
  event: Event | null;
  onClose: () => void;
  autoPrint?: boolean;
}

export default function PrintLabel({
  id,
  participant,
  event,
  onClose,
  autoPrint = true
}: PrintLabelProps) {
  const printCountRef = useRef(0);

  useEffect(() => {
    if (participant && event && autoPrint) {
      // Small timeout to allow QR code image encoding & rendering to complete before prompt triggers
      const timer = setTimeout(() => {
        if (printCountRef.current < 1) {
          printCountRef.current += 1;
          window.print();
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [participant, event, autoPrint]);

  if (!participant || !event) return null;

  return (
    <div id={id} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Printable CSS configuration applied directly */}
      <style>{`
        @media print {
          /* Hide everything in the page, showing only the print label container */
          body * {
            visibility: hidden !important;
          }
          #printable-label-wrapper, #printable-label-wrapper * {
            visibility: visible !important;
          }
          #printable-label-wrapper {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 4mm !important;
            background: white !important;
            color: black !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            z-index: 9999999 !important;
          }
          @page {
            size: 80mm 50mm;
            margin: 0;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col border border-slate-100">
        {/* Header toolbar */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
            <h3 className="font-extrabold text-slate-800 text-sm font-display">Etiqueta Pronta para Impressão</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal content body & Preview card */}
        <div className="p-6 space-y-6 flex flex-col items-center justify-center bg-slate-100/50">
          <p className="text-xs text-slate-505 text-slate-500 text-center font-medium max-w-xs">
            Esta etiqueta é formatada para rolos contínuos de 80mm x 50mm. O disparador de impressão foi ativado no sistema.
          </p>

          {/* Interactive preview area */}
          <div 
            id="printable-label-wrapper"
            className="w-[340px] h-[212px] bg-white text-slate-900 border border-slate-350 shadow-md p-4 rounded-lg flex items-center justify-between gap-3 text-left font-sans select-none"
          >
            {/* Visual identification metadata */}
            <div className="flex-1 flex flex-col gap-1.5 min-w-0 h-full justify-center">
              <div>
                <span className="text-[9px] bg-slate-900 text-white font-black uppercase tracking-wider px-1.5 py-0.5 rounded leading-none">
                  {participant.category}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
                  {event.name}
                </span>
                <h2 className="text-base font-extrabold text-slate-900 leading-tight block truncate mt-0.5">
                  {participant.name}
                </h2>
              </div>

              <div className="text-[9px] text-slate-500 leading-normal font-medium font-sans">
                {participant.company && (
                  <p className="truncate">Cia: <b>{participant.company}</b></p>
                )}
                <p>CPF: <span className="font-mono">{participant.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</span></p>
                <p className="text-[8px] font-mono text-slate-400">ID: {participant.id}</p>
              </div>
            </div>

            {/* QR Code section */}
            <div className="shrink-0 flex items-center justify-center pl-2">
              <UserQRCode value={participant.id} size={110} frameless />
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="px-6 py-4.5 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition cursor-pointer select-none"
          >
            <Printer size={14} />
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
