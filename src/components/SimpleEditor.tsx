import React from 'react';
import { LabelConfig, BadgeFieldItem } from '../types';
import { 
  Type, 
  CheckSquare, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  FileText, 
  ArrowUp, 
  ArrowDown, 
  Bold, 
  Eye, 
  EyeOff, 
  Sliders,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface SimpleEditorProps {
  id?: string;
  config: LabelConfig;
  onChange: (updates: Partial<LabelConfig>) => void;
}

export default function SimpleEditor({
  id = 'simple-editor',
  config,
  onChange
}: SimpleEditorProps) {
  
  // Custom align options
  const alignments = [
    { value: 'left' as const, label: 'Esquerda', icon: AlignLeft },
    { value: 'center' as const, label: 'Centro', icon: AlignCenter },
    { value: 'right' as const, label: 'Direita', icon: AlignRight }
  ];

  // Helper size mappings
  const nameSizesMap = [
    { value: 'sm' as const, label: 'Pequeno' },
    { value: 'md' as const, label: 'Médio' },
    { value: 'lg' as const, label: 'Grande' }
  ];

  const qrSizesMap = [
    { value: 20, label: 'Pequeno' },
    { value: 34, label: 'Médio' },
    { value: 48, label: 'Grande' }
  ];

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

  const fields = getNormalizedFields();

  const updateFieldsList = (newFields: BadgeFieldItem[]) => {
    const eventField = newFields.find(f => f.id === 'event');
    const nameField = newFields.find(f => f.id === 'name');
    const companyField = newFields.find(f => f.id === 'company');
    const cpfField = newFields.find(f => f.id === 'cpf');
    const emailField = newFields.find(f => f.id === 'email');
    const ticketField = newFields.find(f => f.id === 'ticketCode');
    const categoryField = newFields.find(f => f.id === 'category');

    onChange({
      fields: newFields,
      showEvent: eventField ? eventField.visible : config.showEvent,
      showName: nameField ? nameField.visible : config.showName,
      showEmail: emailField ? emailField.visible : config.showEmail,
      showCpf: cpfField ? cpfField.visible : config.showCpf,
      showCategory: categoryField ? categoryField.visible : config.showCategory,
      showTicketCode: ticketField ? ticketField.visible : config.showTicketCode,
      showCompany: companyField ? companyField.visible : (config.showCompany !== false),
    });
  };

  const moveFieldUp = (index: number) => {
    if (index === 0) return;
    const newList = [...fields];
    const temp = newList[index];
    newList[index] = newList[index - 1];
    newList[index - 1] = temp;
    updateFieldsList(newList);
  };

  const moveFieldDown = (index: number) => {
    if (index === fields.length - 1) return;
    const newList = [...fields];
    const temp = newList[index];
    newList[index] = newList[index + 1];
    newList[index + 1] = temp;
    updateFieldsList(newList);
  };

  const toggleFieldVisibility = (id: string) => {
    const newList = fields.map(f => f.id === id ? { ...f, visible: !f.visible } : f);
    updateFieldsList(newList);
  };

  const toggleFieldBold = (id: string) => {
    const newList = fields.map(f => f.id === id ? { ...f, bold: !f.bold } : f);
    updateFieldsList(newList);
  };

  const handleToggleContent = (key: keyof LabelConfig) => {
    onChange({ [key]: !config[key] });
  };

  return (
    <div id={id} className="space-y-6 animate-fade-in bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
      
      {/* 1. SEÇÃO CONTEÚDO E REORDENAÇÃO */}
      <div>
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
          <CheckSquare className="w-4.5 h-4.5 text-blue-500" />
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
            Campos, Visibilidade, Negrito e Ordem
          </h3>
        </div>

        <p className="text-[11px] text-slate-500 mb-4 font-medium">
          Personalize a ordem visual, habilite negrito ou oculte informações diretamente na lista abaixo. Os itens na parte superior serão exibidos primeiro no crachá.
        </p>

        {/* List of active fields */}
        <div className="space-y-2 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
          {fields.map((field, idx) => {
            return (
              <div 
                key={field.id}
                className={`flex flex-col p-2.5 rounded-lg border transition ${
                  field.visible 
                    ? 'bg-white border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]' 
                    : 'bg-slate-50/50 border-slate-150 text-slate-400'
                }`}
              >
                {/* Cabeçalho do campo */}
                <div className="flex items-center justify-between w-full">
                  {/* Visual Label Info */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 w-5 h-5 flex items-center justify-center rounded-full leading-none shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className={`text-xs font-bold ${field.visible ? 'text-slate-850' : 'text-slate-400 font-medium'} ${field.bold ? 'font-black' : ''}`}>
                        {field.label}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        ID: {field.id} {field.bold ? '• Negrito' : ''} {field.fontSize ? `• Fonte: ${field.fontSize}px` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Operations */}
                  <div className="flex items-center gap-1.5 select-none text-slate-600">
                    {/* Toggle Visibility */}
                    <button
                      type="button"
                      onClick={() => toggleFieldVisibility(field.id)}
                      className={`p-1.5 rounded-lg border cursor-pointer hover:bg-slate-55 transition ${
                        field.visible 
                          ? 'border-blue-100 bg-blue-50/40 text-blue-600 hover:bg-blue-50' 
                          : 'border-slate-200 bg-white text-slate-400'
                      }`}
                      title={field.visible ? "Ocultar Campo" : "Exibir Campo"}
                    >
                      {field.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>

                    {/* Toggle Bold */}
                    <button
                      type="button"
                      onClick={() => toggleFieldBold(field.id)}
                      className={`p-1.5 rounded-lg border cursor-pointer hover:bg-slate-55 transition ${
                        field.bold 
                          ? 'border-indigo-200 bg-indigo-50/50 text-indigo-700 font-extrabold hover:bg-indigo-50' 
                          : 'border-slate-200 bg-white text-slate-400'
                      }`}
                      title={field.bold ? "Remover Negrito" : "Aplicar Negrito"}
                    >
                      <Bold size={13} strokeWidth={field.bold ? 3.5 : 2} />
                    </button>

                    <div className="w-px h-5 bg-slate-200 mx-0.5"></div>

                    {/* Move Up */}
                    <button
                      type="button"
                      onClick={() => moveFieldUp(idx)}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-slate-100 border border-slate-150 bg-white disabled:opacity-20 disabled:cursor-not-allowed text-slate-500 cursor-pointer"
                      title="Mover para Cima"
                    >
                      <ChevronUp size={14} />
                    </button>

                    {/* Move Down */}
                    <button
                      type="button"
                      onClick={() => moveFieldDown(idx)}
                      disabled={idx === fields.length - 1}
                      className="p-1 rounded hover:bg-slate-100 border border-slate-150 bg-white disabled:opacity-20 disabled:cursor-not-allowed text-slate-500 cursor-pointer"
                      title="Mover para Baixo"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>

                {/* Sub-section for Custom Font Size under physical fields when visible */}
                {field.visible && (
                  <div className="mt-2.5 pt-2 border-t border-dashed border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                        Tamanho da Fonte:
                      </span>
                      <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                        {field.fontSize ? `${field.fontSize} px` : 'Padrão / Auto'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-grow max-w-xs justify-end">
                      <input
                        type="range"
                        min="5"
                        max="80"
                        value={field.fontSize || (field.id === 'name' ? 24 : 10)}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          const newList = fields.map(f => f.id === field.id ? { ...f, fontSize: val } : f);
                          updateFieldsList(newList);
                        }}
                        className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        title="Deslize para calibrar o tamanho da fonte em pixels"
                      />
                      
                      <input
                        type="number"
                        min="5"
                        max="80"
                        value={field.fontSize || ''}
                        onChange={(e) => {
                          let val = parseInt(e.target.value);
                          if (isNaN(val)) {
                            // reset
                            const newList = fields.map(f => f.id === field.id ? { ...f, fontSize: undefined } : f);
                            updateFieldsList(newList);
                          } else {
                            if (val < 5) val = 5;
                            if (val > 80) val = 80;
                            const newList = fields.map(f => f.id === field.id ? { ...f, fontSize: val } : f);
                            updateFieldsList(newList);
                          }
                        }}
                        className="w-12 text-center text-xxs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded px-1 py-0.5"
                        placeholder="px"
                      />

                      {field.fontSize !== undefined && (
                        <button
                          type="button"
                          onClick={() => {
                            const newList = fields.map(f => f.id === field.id ? { ...f, fontSize: undefined } : f);
                            updateFieldsList(newList);
                          }}
                          className="text-[9px] font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-100 px-1.5 py-0.5 rounded cursor-pointer transition select-none shrink-0"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Global QR code toggle quick shortcut */}
        <div className="mt-3.5 pt-1">
          <label className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-150/80 bg-white hover:bg-slate-50 cursor-pointer transition select-none">
            <input
              type="checkbox"
              checked={config.showQrCode}
              onChange={() => handleToggleContent('showQrCode')}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-100 w-4 h-4 cursor-pointer"
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800">Incluir Validador de QR Code</span>
              <span className="text-[10px] text-slate-400 font-medium">Cria o código escaneável para controle de check-in na portaria</span>
            </div>
          </label>
        </div>
      </div>

      {/* 2. SEÇÃO ESTILO */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Type className="w-4.5 h-4.5 text-blue-500" />
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider select-none">
            Estilo e Layout Geral
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Alinhamento */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Alinhamento
            </label>
            <div className="flex bg-slate-50 rounded-xl p-1 border border-slate-150 gap-1">
              {alignments.map((align) => {
                const Icon = align.icon;
                const isSelected = config.alignment === align.value;
                return (
                  <button
                    key={align.value}
                    type="button"
                    onClick={() => onChange({ alignment: align.value })}
                    className={`flex-1 flex justify-center items-center py-2 px-3 rounded-lg text-xs font-black transition cursor-pointer select-none ${
                      isSelected 
                        ? 'bg-white shadow-xs text-blue-600' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon size={14} className="mr-1 shrink-0" />
                    <span>{align.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tamanho do Nome */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 select-none">
              Tamanho do Nome
            </label>
            <div className="flex bg-slate-50 rounded-xl p-1 border border-slate-150 gap-1">
              {nameSizesMap.map((sz) => {
                const isSelected = config.fontSizeName === sz.value;
                return (
                  <button
                    key={sz.value}
                    type="button"
                    onClick={() => onChange({ fontSizeName: sz.value })}
                    className={`flex-1 text-center py-2 px-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer select-none ${
                      isSelected 
                        ? 'bg-white shadow-xs text-blue-600' 
                        : 'text-slate-500 hover:text-slate-850'
                    }`}
                  >
                    {sz.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tamanho do QR Code */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 select-none">
              Tamanho do QR Code
            </label>
            <div className="flex bg-slate-50 rounded-xl p-1 border border-slate-150 gap-1">
              {qrSizesMap.map((sz) => {
                const isSelected = Math.abs(config.qrSize - sz.value) <= 5;
                return (
                  <button
                    key={sz.value}
                    type="button"
                    onClick={() => onChange({ qrSize: sz.value })}
                    className={`flex-1 text-center py-2 px-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer select-none ${
                      isSelected 
                        ? 'bg-white shadow-xs text-emerald-600' 
                        : 'text-slate-500 hover:text-slate-850'
                    }`}
                  >
                    {sz.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dimensões Customizadas da Etiqueta */}
        <div className="mt-5 pt-5 border-t border-slate-100">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-3 font-display">
            Dimensões Personalizadas da Credencial / Etiqueta 
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex justify-between items-center mb-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-150">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Largura (Width)
                </span>
                <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {config.width || 0} mm
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="20"
                  max="500"
                  value={config.width || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    onChange({ width: isNaN(val) ? 0 : val });
                  }}
                  className="w-full text-xs font-black text-slate-800 bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-3.5 py-2 transition"
                  placeholder="Ex: 90"
                />
                <span className="text-xs text-slate-400 font-bold shrink-0">mm</span>
              </div>
              <input
                type="range"
                min="30"
                max="300"
                value={config.width || 90}
                onChange={(e) => onChange({ width: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-2.5"
                title="Arraste para calibrar a largura"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-150">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Altura (Height)
                </span>
                <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {config.height || 0} mm
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="20"
                  max="500"
                  value={config.height || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    onChange({ height: isNaN(val) ? 0 : val });
                  }}
                  className="w-full text-xs font-black text-slate-800 bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-3.5 py-2 transition"
                  placeholder="Ex: 40"
                />
                <span className="text-xs text-slate-400 font-bold shrink-0">mm</span>
              </div>
              <input
                type="range"
                min="30"
                max="300"
                value={config.height || 40}
                onChange={(e) => onChange({ height: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-2.5"
                title="Arraste para calibrar a altura"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2.5 leading-relaxed">
             <strong>Instruções de Mídia:</strong> A alteração deste tamanho recalibra instantaneamente o design principal na tela, a escala de renderização e os drivers térmicos sob demanda.
          </p>
        </div>
      </div>

      {/* 3. SEÇÃO CABEÇALHO */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4.5 h-4.5 text-blue-500" />
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
            Cabeçalho Decorativo
          </h3>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest select-none">
            Texto Superior (ex: PARTICIPANTE, STAFF)
          </label>
          <input
            type="text"
            placeholder="Nenhum"
            value={config.customHeader}
            onChange={(e) => onChange({ customHeader: e.target.value })}
            className="w-full text-xs font-bold text-slate-755 placeholder:text-slate-400 bg-slate-50 border border-slate-205 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-4 py-2.5 transition"
          />
        </div>
      </div>

    </div>
  );
}
