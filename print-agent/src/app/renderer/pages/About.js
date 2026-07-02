import { escapeHtml } from '../utils/dom.js';

export function renderAbout(state) {
  return `
    <section class="grid">
      <article class="card pad span-8">
        <p class="eyebrow">Sobre</p>
        <h3>Credencia Print Manager</h3>
        <p class="row-meta">Agente Local de Impressao</p>
        <div class="list" style="margin-top: 16px;">
          <div class="list-row">
            <div>
              <div class="row-title">Versao</div>
              <div class="row-meta">${escapeHtml(state.health?.version || '1.0.0')}</div>
            </div>
          </div>
          <div class="list-row">
            <div>
              <div class="row-title">Autor</div>
              <div class="row-meta">Credencia</div>
            </div>
          </div>
          <div class="list-row">
            <div>
              <div class="row-title">Projeto</div>
              <div class="row-meta">Projeto Credencia</div>
            </div>
          </div>
        </div>
      </article>
    </section>
  `;
}
