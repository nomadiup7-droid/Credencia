import { escapeHtml, formatDateTime } from '../utils/dom.js';

function countByStatus(queue, status) {
  return queue.filter(item => item.status === status).length;
}

export function renderQueue(state) {
  const latest = [...state.queue]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 14);

  return `
    <section class="grid">
      <article class="card metric-card span-3">
        <div class="metric-label">Pendentes</div>
        <div class="metric-value">${countByStatus(state.queue, 'pending')}</div>
      </article>
      <article class="card metric-card span-3">
        <div class="metric-label">Impressos</div>
        <div class="metric-value">${countByStatus(state.queue, 'printed')}</div>
      </article>
      <article class="card metric-card span-3">
        <div class="metric-label">Erros</div>
        <div class="metric-value">${countByStatus(state.queue, 'error')}</div>
      </article>
      <article class="card metric-card span-3">
        <div class="metric-label">Cancelados</div>
        <div class="metric-value">${countByStatus(state.queue, 'canceled')}</div>
      </article>
      <article class="card pad span-12">
        <div class="section-title">
          <div>
            <p class="eyebrow">Fila / Historico</p>
            <h3>Ultimos itens</h3>
          </div>
        </div>
        <div class="list">
          ${latest.length ? latest.map(item => `
            <div class="list-row">
              <div>
                <div class="row-title">${escapeHtml(item.printerName || 'Default Printer')}</div>
                <div class="row-meta">${escapeHtml(item.id)} - ${escapeHtml(item.type)} - copias ${item.copies} - tentativas ${item.attempts}/${item.maxAttempts}</div>
                <div class="row-meta">${formatDateTime(item.updatedAt || item.createdAt)}${item.errorMessage ? ` - ${escapeHtml(item.errorMessage)}` : ''}</div>
              </div>
              <span class="status-pill ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>
            </div>
          `).join('') : '<div class="empty">Nenhum item na fila.</div>'}
        </div>
      </article>
    </section>
  `;
}
