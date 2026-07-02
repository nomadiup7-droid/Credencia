import { escapeHtml, formatDateTime } from '../utils/dom.js';

function countByStatus(queue, status) {
  return queue.filter(item => item.status === status).length;
}

function lastPrinted(queue) {
  return [...queue]
    .filter(item => item.status === 'printed')
    .sort((a, b) => new Date(b.printedAt || b.updatedAt) - new Date(a.printedAt || a.updatedAt))[0];
}

export function renderDashboard(state) {
  const last = lastPrinted(state.queue);
  const selectedPrinter = state.config?.defaultPrinter || state.config?.defaultPrinterName || 'Nao definida';

  return `
    <section class="grid">
      <article class="card metric-card span-3">
        <div class="metric-label">Status</div>
        <div class="metric-value">${state.online ? 'Online' : 'Offline'}</div>
        <div class="metric-note">Servico local</div>
      </article>
      <article class="card metric-card span-3">
        <div class="metric-label">Versao</div>
        <div class="metric-value">${escapeHtml(state.health?.version || '-')}</div>
        <div class="metric-note">Credencia Print Manager</div>
      </article>
      <article class="card metric-card span-3">
        <div class="metric-label">Porta</div>
        <div class="metric-value">${escapeHtml(state.health?.port || '-')}</div>
        <div class="metric-note">HTTP local</div>
      </article>
      <article class="card metric-card span-3">
        <div class="metric-label">IP</div>
        <div class="metric-value">${escapeHtml(state.localIps.join(', ') || '-')}</div>
        <div class="metric-note">Rede local</div>
      </article>

      <article class="card metric-card span-4">
        <div class="metric-label">Impressora padrao</div>
        <div class="metric-value">${escapeHtml(selectedPrinter)}</div>
        <div class="metric-note">${state.printers.length} impressora(s) encontrada(s)</div>
      </article>
      <article class="card metric-card span-4">
        <div class="metric-label">Fila</div>
        <div class="metric-value">${state.queue.length}</div>
        <div class="metric-note">${countByStatus(state.queue, 'pending')} pendentes, ${countByStatus(state.queue, 'error')} erros</div>
      </article>
      <article class="card metric-card span-4">
        <div class="metric-label">Ultima impressao</div>
        <div class="metric-value">${last ? escapeHtml(last.type) : '-'}</div>
        <div class="metric-note">${last ? formatDateTime(last.printedAt || last.updatedAt) : 'Nenhuma impressao ainda'}</div>
      </article>
      <article class="card pad span-12">
        <div class="section-title">
          <div>
            <p class="eyebrow">Acoes</p>
            <h3>Operacao local</h3>
          </div>
        </div>
        <div class="toolbar">
          <button class="button secondary" data-action="open-logs">Abrir logs</button>
          <button class="button secondary" data-action="restart-service">Reiniciar servico</button>
          <button class="button secondary" data-action="minimize-tray">Minimizar para bandeja</button>
          <button class="button primary" data-action="test-print">Teste de impressao</button>
        </div>
      </article>
    </section>
  `;
}
