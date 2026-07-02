import { renderSidebar } from './components/Sidebar.js';
import { renderHeader } from './components/Header.js';
import { renderFooter } from './components/Footer.js';
import { renderDashboard } from './components/Dashboard.js';
import { renderQueue } from './components/Queue.js';
import { renderPrinter } from './components/Printer.js';
import { createLogger, renderLogs } from './components/Logs.js';
import { createToast } from './components/Toast.js';
import { renderSettings } from './pages/Settings.js';
import { renderAbout } from './pages/About.js';

const API_BASE = 'http://localhost:3333';
const root = document.getElementById('app');
const toast = createToast(document.getElementById('toastRoot'));
const logger = createLogger();

const defaultPreferences = {
  printType: 'text',
  copies: 1,
  autoRefresh: true,
  language: 'pt-BR',
  theme: 'light'
};

const state = {
  page: 'dashboard',
  online: false,
  health: null,
  config: null,
  printers: [],
  queue: [],
  localIps: [],
  lastUpdate: null,
  preferences: loadPreferences()
};

let lastPrintedIds = new Set();
let lastErrorIds = new Set();
let lastPrinterNames = new Set();
let refreshTimer = null;
let printerRefreshTimer = null;

function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem('credenciaPrintManagerPreferences') || '{}');
    return { ...defaultPreferences, ...saved };
  } catch {
    return defaultPreferences;
  }
}

function savePreferences(patch) {
  state.preferences = { ...state.preferences, ...patch };
  localStorage.setItem('credenciaPrintManagerPreferences', JSON.stringify(state.preferences));
  logger.add('success', 'Preferencia salva.');
  toast.success('Configuracao salva.');
  render();
  configureAutoRefresh();
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Erro HTTP ${response.status}`);
  }

  return data;
}

async function loadHealth(showLog = false) {
  try {
    const data = await request('/health');
    state.online = true;
    state.health = data;
    if (showLog) logger.add('success', 'Status do servico atualizado.');
  } catch (error) {
    state.online = false;
    state.health = null;
    logger.add('error', `API local offline: ${error.message}`);
  }
}

async function loadQueue() {
  try {
    const data = await request('/queue');
    state.queue = data.queue || [];
    watchQueueChanges();
  } catch (error) {
    state.queue = [];
    logger.add('error', `Falha ao atualizar fila: ${error.message}`);
  }
}

async function loadConfig() {
  try {
    const data = await request('/config');
    state.config = data.config;
    if (data.config?.ui && !localStorage.getItem('credenciaPrintManagerPreferences')) {
      state.preferences = { ...state.preferences, ...data.config.ui };
    }
  } catch (error) {
    logger.add('warn', `Configuracao indisponivel: ${error.message}`);
  }
}

async function loadPrinters(showToast = false) {
  try {
    const data = await request('/printers');
    state.printers = data.printers || [];
    watchPrinterChanges();
    if (showToast) toast.success('Impressoras atualizadas.');
  } catch (error) {
    state.printers = [];
    logger.add('error', `Erro ao listar impressoras: ${error.message}`);
    if (showToast) toast.error('Erro ao listar impressoras.');
  }
}

function watchPrinterChanges() {
  const currentNames = new Set(state.printers.map(printer => printer.name));

  state.printers.forEach(printer => {
    if (!lastPrinterNames.has(printer.name)) {
      logger.add('info', `Impressora encontrada: ${printer.name}`);
    }
  });

  lastPrinterNames.forEach(name => {
    if (!currentNames.has(name)) {
      logger.add('warn', `Impressora removida: ${name}`);
    }
  });

  lastPrinterNames = currentNames;
}

async function loadLocalIps() {
  try {
    const rows = await window.credenciaAgent.getLocalIps();
    state.localIps = rows.map(item => item.address);
  } catch {
    state.localIps = [];
  }
}

async function refreshAll(showToast = false) {
  await Promise.all([
    loadHealth(showToast),
    loadQueue(),
    loadConfig(),
    loadPrinters(false),
    loadLocalIps()
  ]);
  state.lastUpdate = new Date().toISOString();
  if (showToast) toast.success('Status atualizado.');
  render();
}

function watchQueueChanges() {
  const printedIds = new Set(state.queue.filter(item => item.status === 'printed').map(item => item.id));
  const errorIds = new Set(state.queue.filter(item => item.status === 'error').map(item => item.id));

  printedIds.forEach(id => {
    if (!lastPrintedIds.has(id)) {
      toast.success('Impressao concluida.');
      logger.add('success', `Impressao concluida: ${id}`);
    }
  });

  errorIds.forEach(id => {
    if (!lastErrorIds.has(id)) {
      toast.error('Erro de impressao.');
      logger.add('error', `Erro de impressao: ${id}`);
    }
  });

  lastPrintedIds = printedIds;
  lastErrorIds = errorIds;
}

async function saveDefaultPrinter() {
  const input = document.getElementById('defaultPrinterInput');
  const select = document.getElementById('testPrinterSelect');
  const printerName = input?.value.trim() || select?.value?.trim();

  if (!printerName) {
    toast.warn('Informe uma impressora.');
    return;
  }

  try {
    const data = await request('/config/default-printer', {
      method: 'PATCH',
      body: JSON.stringify({ printerName })
    });
    state.config = data.config;
    state.preferences = { ...state.preferences, defaultPrinter: printerName };
    localStorage.setItem('credenciaPrintManagerPreferences', JSON.stringify(state.preferences));
    toast.success('Configuracao salva.');
    logger.add('success', `Impressora padrao salva: ${printerName}`);
    render();
  } catch (error) {
    toast.error('Falha ao salvar configuracao.');
    logger.add('error', `Falha ao salvar impressora: ${error.message}`);
  }
}

async function sendTestPrint() {
  const printerName = state.config?.defaultPrinter
    || state.config?.defaultPrinterName
    || document.getElementById('testPrinterSelect')?.value
    || 'Default Printer';
  const type = document.getElementById('printTypeSelect')?.value || state.preferences.printType;
  const copies = Number(document.getElementById('copiesInput')?.value || state.preferences.copies || 1);

  savePreferences({ printType: type, copies });

  try {
    const data = await request('/test-print', {
      method: 'POST',
      body: JSON.stringify({ printerName, type, copies })
    });
    toast.success('Impressao enviada.');
    logger.add('success', `Teste enviado: ${data.job.id}`);
    await loadQueue();
    render();
  } catch (error) {
    toast.error('Erro ao enviar impressao.');
    logger.add('error', `Falha no teste: ${error.message}`);
  }
}

function configureAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  if (printerRefreshTimer) {
    clearInterval(printerRefreshTimer);
    printerRefreshTimer = null;
  }

  if (state.preferences.autoRefresh) {
    refreshTimer = setInterval(async () => {
      await loadHealth(false);
      await loadQueue();
      state.lastUpdate = new Date().toISOString();
      render();
    }, 2000);

    printerRefreshTimer = setInterval(async () => {
      await loadPrinters(false);
      render();
    }, 5000);
  }
}

function pageContent() {
  if (state.page === 'dashboard') return renderDashboard(state);
  if (state.page === 'printers') return renderPrinter(state);
  if (state.page === 'queue') return renderQueue(state);
  if (state.page === 'logs') return `
    <section class="grid">
      <article class="card pad span-12">
        <div class="section-title">
          <div>
            <p class="eyebrow">Logs rapidos</p>
            <h3>Eventos da interface</h3>
          </div>
          <button class="button secondary" data-action="clear-logs">Limpar tela</button>
        </div>
        ${renderLogs(logger.all())}
      </article>
    </section>
  `;
  if (state.page === 'settings') return renderSettings(state);
  if (state.page === 'about') return renderAbout(state);
  return renderDashboard(state);
}

function render() {
  root.innerHTML = `
    ${renderSidebar(state.page)}
    <section class="main">
      ${renderHeader(state)}
      <main class="content">
        ${pageContent()}
      </main>
      ${renderFooter(state)}
    </section>
  `;

  bindDomEvents();
}

function bindDomEvents() {
  root.querySelectorAll('[data-page]').forEach(button => {
    button.addEventListener('click', () => {
      state.page = button.dataset.page;
      render();
    });
  });

  root.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', () => runAction(button.dataset.action, button));
  });

  const autoRefresh = document.getElementById('autoRefreshSelect');
  if (autoRefresh) {
    autoRefresh.addEventListener('change', event => savePreferences({ autoRefresh: event.target.value === 'true' }));
  }

  const language = document.getElementById('languageSelect');
  if (language) {
    language.addEventListener('change', event => savePreferences({ language: event.target.value }));
  }

  const theme = document.getElementById('themeSelect');
  if (theme) {
    theme.addEventListener('change', event => savePreferences({ theme: event.target.value }));
  }

  const printType = document.getElementById('printTypeSelect');
  if (printType) {
    printType.addEventListener('change', event => savePreferences({ printType: event.target.value }));
  }

  const copies = document.getElementById('copiesInput');
  if (copies) {
    copies.addEventListener('change', event => savePreferences({ copies: Math.max(Number(event.target.value || 1), 1) }));
  }

  const defaultPrinter = document.getElementById('defaultPrinterInput');
  if (defaultPrinter) {
    defaultPrinter.addEventListener('change', () => saveDefaultPrinter());
  }

  const testPrinter = document.getElementById('testPrinterSelect');
  if (testPrinter) {
    testPrinter.addEventListener('change', event => {
      const input = document.getElementById('defaultPrinterInput');
      if (input) input.value = event.target.value;
      saveDefaultPrinter();
    });
  }
}

async function runAction(action, sourceElement = null) {
  if (action === 'refresh') return refreshAll(true);
  if (action === 'list-printers') return loadPrinters(true).then(render);
  if (action === 'save-printer') return saveDefaultPrinter();
  if (action === 'use-printer') {
    const printerName = sourceElement?.dataset?.printer;
    if (printerName) {
      const input = document.getElementById('defaultPrinterInput');
      if (input) input.value = printerName;
      const select = document.getElementById('testPrinterSelect');
      if (select) select.value = printerName;
      return saveDefaultPrinter();
    }
  }
  if (action === 'test-print') return sendTestPrint();
  if (action === 'clear-logs') {
    logger.clear();
    toast.info('Logs limpos.');
    render();
  }
  if (action === 'open-logs') {
    await window.credenciaAgent.openLogs();
    logger.add('info', 'Pasta do agente aberta.');
    render();
  }
  if (action === 'restart-service') {
    const result = await window.credenciaAgent.restartServicePrepared();
    toast.info(result.message);
    logger.add('info', result.message);
    render();
  }
  if (action === 'minimize-tray') {
    const result = await window.credenciaAgent.minimizeToTrayPrepared();
    toast.info(result.message);
    logger.add('info', result.message);
    render();
  }
}

window.credenciaAgent.onMenuAction(action => {
  if (action === 'page-printers') state.page = 'printers';
  if (action === 'page-settings') state.page = 'settings';
  if (action === 'page-about') state.page = 'about';
  if (action === 'open-logs') runAction('open-logs');
  if (action === 'test-print') {
    state.page = 'printers';
    render();
  }
  if (action === 'refresh') runAction('refresh');
  if (action === 'restart-service') runAction('restart-service');
  render();
});

logger.add('info', 'Interface iniciada.');
render();
refreshAll(false).then(() => {
  configureAutoRefresh();
  render();
});
