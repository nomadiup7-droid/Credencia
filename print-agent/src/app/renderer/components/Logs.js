import { escapeHtml } from '../utils/dom.js';

export function createLogger() {
  const logs = [];

  function add(type, message) {
    logs.unshift({
      time: new Date().toLocaleTimeString('pt-BR'),
      type,
      message
    });

    return logs.slice(0, 80);
  }

  function clear() {
    logs.splice(0, logs.length);
    return logs;
  }

  function all() {
    return logs;
  }

  return { add, clear, all };
}

export function renderLogs(logs) {
  if (!logs.length) {
    return '<div class="empty">Nenhum log exibido ainda.</div>';
  }

  return `
    <div class="log-panel">
      ${logs.map(log => `
        <div class="log-row">
          <span>${escapeHtml(log.time)}</span>
          <span class="log-type ${escapeHtml(log.type)}">${escapeHtml(log.type)}</span>
          <span>${escapeHtml(log.message)}</span>
        </div>
      `).join('')}
    </div>
  `;
}
