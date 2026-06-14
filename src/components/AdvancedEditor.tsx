import React from 'react';
import { LabelConfig } from '../types';
import { Sliders, HelpCircle, RefreshCw, X, Eye } from 'lucide-react';

interface AdvancedEditorProps {
  id?: string;
  config: LabelConfig;
  isOpen: boolean;
  onClose: () => void;
  onChange: (updates: Partial<LabelConfig>) => void;
  onReset: () => void;
}

export default function AdvancedEditor({
  id = 'advanced-editor',
  config,
  isOpen,
  onClose,
  onChange,
  onReset
}: AdvancedEditorProps) {
  if (!isOpen) return null;

  return (
    <div id={id} className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-fade-in">
      {/* Backdrop shade overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slideout panel dynamic container */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 animate-slide-in">
        
        {/* Header bar */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Sliders size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm font-display leading-tight">
                Calibragem Avançada (mm/Ajustes)
              </h3>
              <p className="text-[10px] text-slate-405 font-bold uppercase tracking-wider text-slate-400 leading-none mt-0.5">
                Ajuste fino de mídia e margens
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Configurations Body Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Alert notice */}
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 text-amber-850">
            <HelpCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 font-semibold text-amber-900">
              <p>Calibração Direta Física</p>
              <p className="font-medium text-amber-800 leading-relaxed">
                Essas medidas refletem diretamente as dimensões de saída na bobina ou etiqueta adesiva. Altere apenas caso a impressão padrão apresente cortes ou desalinhamento.
              </p>
            </div>
          </div>

          {/* Dimensões em Milímetros */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              1. Dimensões Físicas (Milímetros)
            </h4>

            {/* Largura mm */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Largura (Width)</span>
                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[10px]">
                  {config.width} mm
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="40"
                  max="150"
                  value={config.width}
                  onChange={(e) => onChange({ width: parseInt(e.target.value) })}
                  className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>

            {/* Altura mm */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Altura (Height)</span>
                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[10px]">
                  {config.height} mm
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="25"
                  max="200"
                  value={config.height}
                  onChange={(e) => onChange({ height: parseInt(e.target.value) })}
                  className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>

            {/* Margens internas mm */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Margens Internas (Padding)</span>
                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[10px]">
                  {config.padding} mm
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="15"
                  value={config.padding}
                  onChange={(e) => onChange({ padding: parseInt(e.target.value) })}
                  className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Posição e Detalhes do QR Code */}
          <div className="space-y-4 pt-5 border-t border-slate-100">
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              2. Customização do QR Code
            </h4>

            {/* Posição QR */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Posicionamento do QR Code
              </label>
              <select
                value={config.qrPosition}
                onChange={(e) => onChange({ qrPosition: e.target.value as any })}
                className="w-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200 rounded-xl px-3.5 py-2.5 cursor-pointer focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              >
                <option value="right">À Direita (Clássico Horizontal)</option>
                <option value="left">À Esquerda</option>
                <option value="bottom">Abaixo das informações (Vertical)</option>
                <option value="top">Acima das informações</option>
                <option value="side-by-side">Lado a Lado (Crachá Duplo)</option>
              </select>
            </div>

            {/* QR Code exact size mm */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600 font-sans">Tamanho do QR real</span>
                <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                  {config.qrSize} mm
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="15"
                  max="70"
                  value={config.qrSize}
                  onChange={(e) => onChange({ qrSize: parseInt(e.target.value) })}
                  className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Estilos Adicionais */}
          <div className="space-y-4 pt-5 border-t border-slate-100">
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider select-none">
              3. Contrastes & Ícones de Identificação
            </h4>

            {/* Modo de contraste */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Modo de Cores / Contraste
              </label>
              <select
                value={config.contrastMode}
                onChange={(e) => onChange({ contrastMode: e.target.value as any })}
                className="w-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-205 rounded-xl px-3.5 py-2.5 cursor-pointer"
              >
                <option value="monochrome">Monocromático Térmico (Preto e Branco Puro)</option>
                <option value="colored">Alta Definição Colorida (Injeção/Jato de Tinta)</option>
              </select>
            </div>

            {/* Ícones de segurança */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Selo de Validação (Ícone)
              </label>
              <select
                value={config.iconStyle}
                onChange={(e) => onChange({ iconStyle: e.target.value as any })}
                className="w-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-205 rounded-xl px-3.5 py-2.5 cursor-pointer"
              >
                <option value="none">Nenhum ícone decorativo</option>
                <option value="minimal">Minimalista (Símbolo Discreto)</option>
                <option value="circle">Selo Circular Profissional</option>
                <option value="shield">Brasão de Portaria Blindado</option>
              </select>
            </div>
          </div>

        </div>

        {/* Footer controls inside slideout drawer */}
        <div className="px-6 py-4.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-red-600 bg-white border border-slate-200 hover:border-red-100 hover:bg-red-50/50 rounded-xl transition cursor-pointer select-none"
          >
            <RefreshCw size={13} />
            <span>Resetar Padrões</span>
          </button>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer select-none"
            >
              Aplicar Ajustes
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
