export function renderFooter(state) {
  const lastUpdate = state.lastUpdate ? new Date(state.lastUpdate).toLocaleTimeString('pt-BR') : '-';

  return `
    <footer class="footer">
      <span>API: http://localhost:3333</span>
      <span>Ultima atualizacao: ${lastUpdate}</span>
    </footer>
  `;
}
