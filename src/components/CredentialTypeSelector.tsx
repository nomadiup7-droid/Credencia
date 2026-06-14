import React from 'react';
import { Tag, Ticket, Settings } from 'lucide-react';

interface CredentialTypeSelectorProps {
  id?: string;
  value: 'label' | 'badge' | 'custom';
  onChange: (value: 'label' | 'badge' | 'custom') => void;
}

export default function CredentialTypeSelector({
  id = 'credential-type-selector',
  value,
  onChange
}: CredentialTypeSelectorProps) {
  const options = [
    {
      key: 'label' as const,
      icon: Tag,
      title: 'Etiqueta Térmica',
      description: 'Formatada para rolos contínuos de etiquetas. Impressão ultra rápida e direta, ideal para diminuir filas.',
      badge: 'Rápido & Prático',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      iconColor: 'text-emerald-600',
      hoverBorder: 'hover:border-emerald-500 hover:ring-2 hover:ring-emerald-50',
      selectedStyle: 'border-emerald-500 ring-2 ring-emerald-50 bg-emerald-50/15'
    },
    {
      key: 'badge' as const,
      icon: Ticket,
      title: 'Crachá Visual',
      description: 'Crachás de dimensão vertical (A6 ou A7) com layout diagramado, cores corporativas e maior apelo visual.',
      badge: 'Premium & Elegante',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-100',
      iconColor: 'text-blue-600',
      hoverBorder: 'hover:border-blue-500 hover:ring-2 hover:ring-blue-50',
      selectedStyle: 'border-blue-500 ring-2 ring-blue-50 bg-blue-50/15'
    },
    {
      key: 'custom' as const,
      icon: Settings,
      title: 'Personalizado',
      description: 'Controle manual avançado de tamanho (mm), margens, posições do QR Code e contrastes térmicos de cor.',
      badge: 'Ajuste Fino',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      iconColor: 'text-slate-600',
      hoverBorder: 'hover:border-slate-500 hover:ring-2 hover:ring-slate-50',
      selectedStyle: 'border-slate-800 ring-2 ring-slate-100 bg-slate-50/15'
    }
  ];

  return (
    <div id={id} className="space-y-3">
      <div className="flex items-center gap-1.5 pb-1">
        <span className="w-1.5 h-3 bg-blue-600 rounded-full"></span>
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 select-none">
          1. Tipo de Credencial
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = value === opt.key;
          
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              className={`text-left p-4.5 rounded-2xl border bg-white shadow-xs transition duration-200 cursor-pointer flex flex-col justify-between min-h-[145px] relative group select-none ${
                isSelected ? opt.selectedStyle : 'border-slate-200 hover:shadow-md ' + opt.hoverBorder
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2 w-full">
                  <div className={`p-2 rounded-xl bg-slate-50 group-hover:scale-105 transition duration-250 ${isSelected ? 'bg-white shadow-sm' : ''}`}>
                    <Icon className={`w-5 h-5 ${opt.iconColor}`} />
                  </div>
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border tracking-wide uppercase ${opt.badgeColor}`}>
                    {opt.badge}
                  </span>
                </div>
                
                <h4 className="text-sm font-extrabold text-slate-850 font-display mb-1">
                  {opt.title}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2">
                  {opt.description}
                </p>
              </div>

              {/* Selection dots indicators */}
              <div className="absolute bottom-4 right-4 animate-fade-in">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                }`}>
                  {isSelected && (
                    <span className="block w-1.5 h-1.5 rounded-full bg-white"></span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
