import React, { useState, useEffect } from 'react';
import { Participant, Event, LabelConfig } from '../types';
import { Sliders, HelpCircle, RefreshCw, Sparkles, Check, CloudLightning, Save, Printer } from 'lucide-react';
import CredentialTypeSelector from './CredentialTypeSelector';
import PresetSelector, { LABEL_PRESETS, BADGE_PRESETS, PresetItem } from './PresetSelector';
import SimpleEditor from './SimpleEditor';
import AdvancedEditor from './AdvancedEditor';
import LivePreview from './LivePreview';
import PrintCredential from './PrintCredential';

interface LabelConfigTabProps {
  participants: Participant[];
  currentEvent: Event | null;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  apiCall?: (endpoint: string, options?: RequestInit) => Promise<any>;
  onUpdateEvent?: (updatedEvent: Event) => void;
  onPrintBadge?: (participant: Participant) => void;
}

const DEFAULT_CONFIG: LabelConfig = {
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
  textSpacing: 2,
  iconStyle: 'shield',
  contrastMode: 'colored',
  customHeader: 'CREDENCIAL PARTICIPANTE',
  showCompany: true,
  fields: [
    { id: 'header', label: 'Cabeçalho Decorativo', visible: true, bold: true },
    { id: 'event', label: 'Nome do Evento', visible: true, bold: false },
    { id: 'category', label: 'Categoria (Crachá)', visible: true, bold: true },
    { id: 'name', label: 'Nome do Participante', visible: true, bold: true },
    { id: 'company', label: 'Empresa', visible: true, bold: false },
    { id: 'cpf', label: 'CPF do Participante', visible: true, bold: false },
    { id: 'email', label: 'E-mail do Participante', visible: false, bold: false },
    { id: 'ticketCode', label: 'Ref/Ticket de Inscrição', visible: true, bold: false }
  ]
};

export default function LabelConfigTab({
  participants,
  currentEvent,
  addToast,
  apiCall,
  onUpdateEvent,
  onPrintBadge
}: LabelConfigTabProps) {
  // Track selected credential type mode ('label' | 'badge' | 'custom')
  const [credentialType, setCredentialType] = useState<'label' | 'badge' | 'custom'>(() => {
    if (currentEvent?.credentialType) return currentEvent.credentialType as any;
    return 'badge';
  });

  // Track size preset
  const [selectedSize, setSelectedSize] = useState<string>(() => {
    if (currentEvent?.credentialSize) return currentEvent.credentialSize;
    return 'A6';
  });

  // Main config state
  const [config, setConfig] = useState<LabelConfig>(() => {
    if (currentEvent?.layoutConfig) {
      return { ...DEFAULT_CONFIG, ...currentEvent.layoutConfig };
    }
    const saved = localStorage.getItem('credencia_label_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activePrintRecord, setActivePrintRecord] = useState<{ participant: Participant; event: Event } | null>(null);

  // Sync state if selected event changes
  useEffect(() => {
    if (currentEvent) {
      if (currentEvent.credentialType) {
        setCredentialType(currentEvent.credentialType as any);
      }
      if (currentEvent.credentialSize) {
        setSelectedSize(currentEvent.credentialSize);
      }
      if (currentEvent.layoutConfig) {
        setConfig({ ...DEFAULT_CONFIG, ...currentEvent.layoutConfig });
      }
    }
  }, [currentEvent?.id]);

  // Sync local changes to parent and database automatically on change
  useEffect(() => {
    if (!currentEvent) return;

    const normalizedType = credentialType === 'custom' ? 'badge' : credentialType;

    // Check if there is really a change from the current stored event configuration
    const hasTypeChange = currentEvent.credentialType !== normalizedType;
    const hasSizeChange = currentEvent.credentialSize !== selectedSize;
    const hasQrChange = currentEvent.showQRCode !== config.showQrCode;
    const hasLayoutChange = JSON.stringify(currentEvent.layoutConfig) !== JSON.stringify(config);

    if (!hasTypeChange && !hasSizeChange && !hasQrChange && !hasLayoutChange) {
      return;
    }

    // 1. Notify parent immediately so participants and checkin views get updated config in real-time
    const simulatedEvent: Event = {
      ...currentEvent,
      credentialType: normalizedType as any,
      credentialSize: selectedSize as any,
      showQRCode: config.showQrCode,
      layoutConfig: config
    };
    if (onUpdateEvent) {
      onUpdateEvent(simulatedEvent);
    }

    // 2. Perform background autosave to API with a small delay (debounce)
    const timeoutId = setTimeout(async () => {
      if (apiCall) {
        setIsSaving(true);
        try {
          await apiCall(`/api/events/${currentEvent.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              credentialType: normalizedType,
              credentialSize: selectedSize,
              showQRCode: config.showQrCode,
              layoutConfig: config
            })
          });
        } catch (err) {
          console.error('Autosave background persistence error:', err);
        } finally {
          setIsSaving(false);
        }
      }
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [config, credentialType, selectedSize, currentEvent?.id]);

  // Merge updates to config helper
  const handleConfigChange = (updates: Partial<LabelConfig>) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    localStorage.setItem('credencia_label_config', JSON.stringify(updated));
  };

  // Preset selected handler
  const handlePresetSelect = (preset: PresetItem, sizeKey: string) => {
    setSelectedSize(sizeKey);
    const updated: LabelConfig = {
      ...config,
      width: preset.width,
      height: preset.height,
      padding: preset.padding,
      alignment: preset.alignment,
      fontSizeName: preset.fontSizeName,
      fontSizeMeta: preset.fontSizeMeta,
      showEvent: preset.showEvent,
      showName: preset.showName,
      showEmail: preset.showEmail,
      showCpf: preset.showCpf,
      showCategory: preset.showCategory,
      showTicketCode: preset.showTicketCode,
      showQrCode: preset.showQrCode,
      qrSize: preset.qrSize,
      qrPosition: preset.qrPosition,
      textSpacing: config.textSpacing ?? DEFAULT_CONFIG.textSpacing,
      iconStyle: preset.iconStyle,
      contrastMode: preset.contrastMode,
      customHeader: preset.customHeader
    };
    setConfig(updated);
    localStorage.setItem('credencia_label_config', JSON.stringify(updated));
    addToast(`Preset "${preset.name}" aplicado com sucesso!`, 'success');
  };

  // Change credential type mode (Thermal vs Badge Card vs Custom)
  const handleTypeChange = (type: 'label' | 'badge' | 'custom') => {
    setCredentialType(type);
    if (type === 'label') {
      const defaultLabelKey = '9x4';
      setSelectedSize(defaultLabelKey);
      const preset = LABEL_PRESETS[defaultLabelKey];
      if (preset) {
        handlePresetSelect(preset, defaultLabelKey);
      }
    } else if (type === 'badge') {
      const defaultBadgeKey = 'A6';
      setSelectedSize(defaultBadgeKey);
      const preset = BADGE_PRESETS[defaultBadgeKey];
      if (preset) {
        handlePresetSelect(preset, defaultBadgeKey);
      }
    } else {
      // Keep existing configs but highlight advanced panel
      setIsAdvancedOpen(true);
      addToast('Modo customizado habilitado! Calibre as dimensões abaixo.', 'info');
    }
  };

  // Perform a test print with mock layout overlay
  const handlePrintTest = (participant: Participant) => {
    if (!currentEvent) {
      addToast('Selecione um evento antes de imprimir', 'error');
      return;
    }

    if (onPrintBadge) {
      onPrintBadge(participant);
    } else {
      // Force parameters on the active event so the test printing exactly replicates the screen settings
      const simulatedEvent: Event = {
        ...currentEvent,
        credentialType: credentialType === 'custom' ? 'badge' : (credentialType as any),
        credentialSize: selectedSize as any,
        showQRCode: config.showQrCode,
        // Map layoutConfig settings
        layoutConfig: config
      };

      setActivePrintRecord({
        participant,
        event: simulatedEvent
      });
    }
  };

  // Save current credential profile back into the event database on the backend
  const handleSaveToEvent = async () => {
    if (!currentEvent) {
      addToast('Selecione um evento ativo para salvar', 'error');
      return;
    }

    if (!apiCall) {
      addToast('Sistema de sincronização indisponível.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const updatedEvent = await apiCall(`/api/events/${currentEvent.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          credentialType: credentialType === 'custom' ? 'badge' : credentialType,
          credentialSize: selectedSize,
          showQRCode: config.showQrCode,
          layoutConfig: config
        })
      });

      if (onUpdateEvent) {
        onUpdateEvent(updatedEvent);
      }
      addToast('Configurações de layout vinculadas com sucesso ao evento!', 'success');
    } catch (err) {
      console.error('Save to event failed:', err);
      addToast('Erro ao salvar configurações no servidor.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.setItem('credencia_label_config', JSON.stringify(DEFAULT_CONFIG));
    addToast('Calibragens restauradas para o original.', 'info');
  };

  return (
    <div className="space-y-8 animate-fade-in no-print pb-16">
      
      {/* 4. Overlay test printing renderer */}
      {activePrintRecord && (
        <PrintCredential
          participant={activePrintRecord.participant}
          event={activePrintRecord.event}
          onClose={() => setActivePrintRecord(null)}
          autoPrint={true}
        />
      )}

      {/* Header section with description and direct save status buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-205 pb-5">
        <div>
          <h2 className="text-xl font-black text-slate-800 font-display flex items-center gap-2">
            <Sliders size={22} className="text-blue-600" />
            <span>Configurador de Credenciais Profissionais</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Calibre a disposição visual de crachás ou rolos de papel térmico de forma simples e intuitiva.
          </p>
        </div>

        {currentEvent && (
          <div className="flex gap-2">
            <button
              onClick={handleSaveToEvent}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Sincronizando...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Salvar no Evento</span>
                </>
              )}
            </button>
            
            <button
              onClick={() => setIsAdvancedOpen(true)}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer select-none flex items-center gap-1.5"
            >
              <Sliders size={13} className="text-slate-500" />
              <span>Calibração Fina (mm)</span>
            </button>
          </div>
        )}
      </div>

      {/* LEVEL 1: SELEÇÃO DO TIPO DE CREDENCIAL */}
      <CredentialTypeSelector
        value={credentialType}
        onChange={handleTypeChange}
      />

      {/* LEVEL 2: SELEÇÃO DE PRESETS RECOMENDADOS (Se não for manual/customizado) */}
      {credentialType !== 'custom' && (
        <PresetSelector
          credentialType={credentialType}
          selectedSize={selectedSize}
          onChange={handlePresetSelect}
        />
      )}

      {/* LEVEL 3: ÁREA DE CONFIGURAÇÃO (COLUNAS EDIT VERSUS PREVIEW) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUNA ESQUERDA: EDITOR SIMPLES */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
              3. Customização Simples de Informações
            </h3>
            
            {/* Advanced slider toggle */}
            <button
              onClick={() => setIsAdvancedOpen(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer select-none"
            >
               Exibir Configuração Avançada
            </button>
          </div>

          <SimpleEditor
            config={config}
            onChange={handleConfigChange}
          />

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-3 text-emerald-850">
            <CloudLightning size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 font-semibold text-emerald-900">
              <p>Operação Rápida em Alto Fluxo</p>
              <p className="font-medium text-emerald-800 leading-relaxed">
                As alterações realizadas aqui são aplicadas <b>instantaneamente</b> para todos os computadores e tablets vinculados na recepção e scanners de portaria.
              </p>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: PREVIEW PREMIUM */}
        <div className="lg:col-span-5">
          <LivePreview
            config={config}
            currentEvent={currentEvent}
            participants={participants}
            onPrintTest={handlePrintTest}
          />
        </div>

      </div>

      {/* PANEL: DRAWER MODAL PARA CONFIGURES AVANÇADAS */}
      <AdvancedEditor
        config={config}
        isOpen={isAdvancedOpen}
        onClose={() => setIsAdvancedOpen(false)}
        onChange={handleConfigChange}
        onReset={handleReset}
      />

    </div>
  );
}
