import { escapeHtml } from '../utils/dom.js';

export function renderPrinter(state) {
  const preferences = state.preferences;
  const selectedPrinter = state.config?.defaultPrinter || state.config?.defaultPrinterName || preferences.defaultPrinter || '';

  return `
    <section class="grid">
      <article class="card pad span-6">
        <div class="section-title">
          <div>
            <p class="eyebrow">Configuracao da Impressora</p>
            <h3>Impressora padrao</h3>
          </div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="defaultPrinterInput">Nome da impressora</label>
            <input id="defaultPrinterInput" value="${escapeHtml(selectedPrinter)}" placeholder="Selecione uma impressora" readonly />
          </div>
          <div class="field">
            <label for="copiesInput">Quantidade de copias</label>
            <input id="copiesInput" type="number" min="1" max="99" value="${preferences.copies}" />
          </div>
          <div class="field">
            <label for="printTypeSelect">Tipo de impressao</label>
            <select id="printTypeSelect">
              ${['text', 'zpl', 'epl', 'tspl'].map(type => `<option value="${type}" ${preferences.printType === type ? 'selected' : ''}>${type}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="testPrinterSelect">Impressora para teste</label>
            <select id="testPrinterSelect">
              ${state.printers.length
                ? state.printers.map(printer => `<option value="${escapeHtml(printer.name)}" ${selectedPrinter === printer.name ? 'selected' : ''}>${escapeHtml(printer.name)}</option>`).join('')
                : '<option value="">Nenhuma impressora encontrada</option>'}
            </select>
          </div>
        </div>
        <div class="toolbar">
          <button class="button secondary" data-action="list-printers">Listar impressoras</button>
          <button class="button primary" data-action="test-print">Imprimir teste</button>
        </div>
      </article>

      <article class="card pad span-6">
        <div class="section-title">
          <div>
            <p class="eyebrow">Status das Impressoras</p>
            <h3>${state.printers.length} encontrada(s)</h3>
          </div>
        </div>
        <div class="list">
          ${state.printers.length ? state.printers.map(printer => `
            <div class="list-row">
              <div>
                <div class="row-title">${escapeHtml(printer.name)}</div>
                <div class="row-meta">Driver: ${escapeHtml(printer.driver || '-')} - Porta: ${escapeHtml(printer.port || '-')}</div>
                <div class="row-meta">${printer.default ? 'Padrao do Windows' : 'Nao padrao'} - ${printer.shared ? 'Compartilhada' : 'Nao compartilhada'} - ${printer.isNetwork ? 'Rede' : 'Local'}</div>
              </div>
              <div class="toolbar">
                <span class="status-pill ${printer.status === 'Online' ? 'printed' : 'error'}">${escapeHtml(printer.status || 'Unknown')}</span>
                <button class="button secondary" data-action="use-printer" data-printer="${escapeHtml(printer.name)}">Usar</button>
              </div>
            </div>
          `).join('') : '<div class="empty">Nenhuma impressora listada.</div>'}
        </div>
      </article>
    </section>
  `;
}
