import React, { useState } from 'react';
import { ChevronRight, FileText, Loader2, Printer } from 'lucide-react';
import type { ReportPdfKind } from '../../types/report.types';

interface ReportExportMenuProps {
  onGeneratePdf: (kind: ReportPdfKind) => void;
  onPrintCurrent: () => void;
  loadingLabel?: string;
  compact?: boolean;
}

const options: Array<{ kind: ReportPdfKind; label: string; description: string }> = [
  { kind: 'executive', label: 'Relatório Executivo', description: 'Indicadores e gráficos para o cliente.' },
  { kind: 'complete', label: 'Relatório Completo', description: 'Inclui tabelas detalhadas para auditoria.' },
  { kind: 'summary', label: 'Relatório Resumido', description: 'Versão rápida para envio.' }
];

export default function ReportExportMenu({ onGeneratePdf, onPrintCurrent, loadingLabel, compact = false }: ReportExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isLoading = Boolean(loadingLabel);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(value => !value)}
        disabled={isLoading}
        className={`inline-flex items-center justify-center gap-2 rounded-xl text-xs font-black transition cursor-pointer disabled:cursor-wait ${
          compact ? 'cx-button-primary px-4 py-3' : 'bg-slate-900 hover:bg-slate-800 text-white px-4 py-3'
        }`}
      >
        {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
        <span>{isLoading ? loadingLabel : 'PDF/Imprimir'}</span>
      </button>

      {isOpen && !isLoading && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Exportação PDF</p>
          </div>
          <div className="p-2">
            {options.map(option => (
              <button
                key={option.kind}
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onGeneratePdf(option.kind);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-emerald-50"
              >
                <span>
                  <span className="block text-sm font-black text-slate-950">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{option.description}</span>
                </span>
                <ChevronRight size={16} className="text-slate-400" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onPrintCurrent();
              }}
              className="mt-1 flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-left hover:bg-slate-100"
            >
              <span>
                <span className="block text-sm font-black text-slate-950">Imprimir relatório atual</span>
                <span className="mt-0.5 block text-xs text-slate-500">Mantém a impressão já existente da tela.</span>
              </span>
              <FileText size={16} className="text-slate-500" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
