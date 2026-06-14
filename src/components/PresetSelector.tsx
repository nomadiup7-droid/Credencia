import React from 'react';
import { Sparkles, Check } from 'lucide-react';

export interface PresetItem {
  id: string;
  name: string;
  width: number;       // in mm
  height: number;      // in mm
  padding: number;     // in mm
  alignment: 'center' | 'left' | 'right';
  fontSizeName: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fontSizeMeta: 'xs' | 'sm' | 'md';
  showEvent: boolean;
  showName: boolean;
  showEmail: boolean;
  showCpf: boolean;
  showCategory: boolean;
  showTicketCode: boolean;
  showQrCode: boolean;
  qrSize: number;       // in mm
  qrPosition: 'left' | 'center' | 'right' | 'top' | 'bottom' | 'side-by-side';
  iconStyle: 'none' | 'shield' | 'circle' | 'minimal';
  contrastMode: 'monochrome' | 'colored';
  customHeader: string;
}

interface PresetSelectorProps {
  id?: string;
  credentialType: 'label' | 'badge' | 'custom';
  selectedSize: string; // e.g. "9x4", "8x4", "8x5", "A6", "A7"
  onChange: (preset: PresetItem, sizeKey: string) => void;
}

export const LABEL_PRESETS: Record<string, PresetItem> = {
  '9x4': {
    id: '9x4',
    name: 'Zebra / Elgin Padrão (9x4 cm)',
    width: 90,
    height: 40,
    padding: 3,
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
    qrSize: 30,
    qrPosition: 'right',
    iconStyle: 'minimal',
    contrastMode: 'monochrome',
    customHeader: 'CREDENCIAMENTO'
  },
  '8x4': {
    id: '8x4',
    name: 'Compacta (8x4 cm)',
    width: 80,
    height: 40,
    padding: 2.5,
    alignment: 'left',
    fontSizeName: 'md',
    fontSizeMeta: 'xs',
    showEvent: false,
    showName: true,
    showEmail: false,
    showCpf: false,
    showCategory: true,
    showTicketCode: false,
    showQrCode: true,
    qrSize: 26,
    qrPosition: 'right',
    iconStyle: 'none',
    contrastMode: 'monochrome',
    customHeader: ''
  },
  '8x5': {
    id: '8x5',
    name: 'Etiqueta Grande (8x5 cm)',
    width: 80,
    height: 50,
    padding: 4,
    alignment: 'center',
    fontSizeName: 'xl',
    fontSizeMeta: 'sm',
    showEvent: true,
    showName: true,
    showEmail: true,
    showCpf: true,
    showCategory: true,
    showTicketCode: true,
    showQrCode: true,
    qrSize: 35,
    qrPosition: 'bottom',
    iconStyle: 'circle',
    contrastMode: 'monochrome',
    customHeader: ''
  }
};

export const BADGE_PRESETS: Record<string, PresetItem> = {
  'A6': {
    id: 'A6',
    name: 'A6 Clássico (10.5x14.8 cm)',
    width: 105,
    height: 148,
    padding: 5,
    alignment: 'center',
    fontSizeName: '2xl',
    fontSizeMeta: 'sm',
    showEvent: true,
    showName: true,
    showEmail: false,
    showCpf: true,
    showCategory: true,
    showTicketCode: true,
    showQrCode: true,
    qrSize: 36,
    qrPosition: 'bottom',
    iconStyle: 'shield',
    contrastMode: 'colored',
    customHeader: 'PARTICIPANTE OFICIAL'
  },
  'A7': {
    id: 'A7',
    name: 'A7 Mini Crachá (7.4x10.5 cm)',
    width: 74,
    height: 105,
    padding: 4,
    alignment: 'center',
    fontSizeName: 'lg',
    fontSizeMeta: 'xs',
    showEvent: true,
    showName: true,
    showEmail: false,
    showCpf: false,
    showCategory: true,
    showTicketCode: false,
    showQrCode: true,
    qrSize: 28,
    qrPosition: 'bottom',
    iconStyle: 'circle',
    contrastMode: 'colored',
    customHeader: ''
  }
};

export default function PresetSelector({
  id = 'preset-selector',
  credentialType,
  selectedSize,
  onChange
}: PresetSelectorProps) {
  if (credentialType === 'custom') return null;

  const presets = credentialType === 'label' ? LABEL_PRESETS : BADGE_PRESETS;
  
  return (
    <div id={id} className="space-y-3 animate-fade-in">
      <div className="flex items-center gap-1.5 pb-1">
        <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 select-none">
          2. Presets Recomendados ({credentialType === 'label' ? 'Etiquetas' : 'Crachás'})
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(presets).map(([sizeKey, preset]) => {
          const isSelected = selectedSize === sizeKey;
          
          return (
            <button
              key={sizeKey}
              type="button"
              onClick={() => onChange(preset, sizeKey)}
              className={`text-left p-4.5 rounded-2xl bg-white border shadow-xs hover:shadow-md transition duration-200 cursor-pointer flex gap-4 items-center relative group select-none ${
                isSelected 
                  ? 'border-blue-500 ring-2 ring-blue-50 bg-blue-50/10' 
                  : 'border-slate-200 hover:border-slate-400'
              }`}
            >
              {/* Miniature visual representation of the layout */}
              <div className="w-14 h-18 bg-slate-100 rounded-lg border border-slate-300 flex flex-col justify-between p-1.5 shrink-0 group-hover:scale-105 transition duration-200 shadow-xs relative overflow-hidden">
                {/* Visual indicator of design orientation */}
                {credentialType === 'label' ? (
                  /* Horizontal Layout */
                  <div className="flex flex-row items-center justify-between w-full h-full gap-1">
                    <div className="space-y-1 flex-1">
                      <div className="w-full h-1.5 bg-blue-500/80 rounded-[1px]"></div>
                      <div className="w-2/3 h-1 bg-slate-400/60 rounded-[1px]"></div>
                      <div className="w-1/2 h-1 bg-slate-300/60 rounded-[1px]"></div>
                    </div>
                    <div className="w-4 h-4 bg-slate-900/10 rounded-[1px] border border-dashed border-slate-400/40 shrink-0"></div>
                  </div>
                ) : (
                  /* Vertical Layout */
                  <div className="flex flex-col items-center justify-between w-full h-full text-center">
                    <div className="w-full space-y-1">
                      <div className="w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-[1px]"></div>
                      <div className="w-5/6 h-1.5 bg-slate-800 rounded-[1px] mx-auto"></div>
                      <div className="w-2/3 h-1 bg-slate-400/50 rounded-[1px] mx-auto"></div>
                    </div>
                    <div className="w-4.5 h-4.5 bg-slate-950/20 rounded-[1px] border border-dashed border-slate-400/60 m-auto"></div>
                  </div>
                )}
                
                {/* Recommended Tag banner */}
                {sizeKey === '9x4' && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-[6px] text-white font-black px-1 rounded-bl">
                    REC
                  </div>
                )}
              </div>

              {/* Text metadata */}
              <div className="flex-1 min-w-0 pr-6">
                <h4 className="text-xs font-extrabold text-slate-850 truncate mb-0.5">
                  {preset.name}
                </h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-sans leading-none">
                  Dimensões: {preset.width}x{preset.height} mm
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded leading-none ${
                    preset.alignment === 'center' ? 'bg-slate-100 text-slate-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {preset.alignment === 'center' ? 'Centralizado' : 'Alinhado Esq'}
                  </span>
                  {preset.showQrCode && (
                    <span className="text-[8px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded leading-none">
                      + QR
                    </span>
                  )}
                </div>
              </div>

              {/* Selection Dot */}
              <div className="absolute top-4 right-4">
                {isSelected && (
                  <div className="w-4.5 h-4.5 rounded-full bg-blue-600 text-white flex items-center justify-center animate-fade-in shadow-xs">
                    <Check size={10} strokeWidth={4} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
