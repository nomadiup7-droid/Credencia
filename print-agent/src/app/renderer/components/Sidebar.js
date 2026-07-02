const items = [
  ['dashboard', 'Dashboard'],
  ['printers', 'Impressoras'],
  ['queue', 'Fila'],
  ['logs', 'Logs'],
  ['settings', 'Configuracoes'],
  ['about', 'Sobre']
];

export function renderSidebar(activePage) {
  return `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-mark">CP</div>
        <h1>Credencia Print Manager</h1>
        <p class="subtitle">Agente Local de Impressao</p>
      </div>
      <nav class="nav">
        ${items.map(([id, label]) => `
          <button type="button" class="${activePage === id ? 'active' : ''}" data-page="${id}">
            ${label}
          </button>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        Projeto Credencia<br />
        Interface local Windows
      </div>
    </aside>
  `;
}
