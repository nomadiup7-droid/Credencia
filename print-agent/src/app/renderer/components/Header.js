export function renderHeader(state) {
  const online = state.online;

  return `
    <header class="topbar">
      <div>
        <h2>Credencia Print Manager</h2>
        <p>Agente Local de Impressao</p>
      </div>
      <div class="topbar-actions">
        <span class="badge ${online ? 'online' : 'offline'}">${online ? 'Online' : 'Offline'}</span>
        <button class="button secondary" data-action="refresh">Atualizar status</button>
      </div>
    </header>
  `;
}
