export function renderSettings(state) {
  const preferences = state.preferences;

  return `
    <section class="grid">
      <article class="card pad span-8">
        <div class="section-title">
          <div>
            <p class="eyebrow">Preferencias</p>
            <h3>Configuracoes da interface</h3>
          </div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="autoRefreshSelect">Auto refresh</label>
            <select id="autoRefreshSelect">
              <option value="true" ${preferences.autoRefresh ? 'selected' : ''}>Ativado</option>
              <option value="false" ${!preferences.autoRefresh ? 'selected' : ''}>Desativado</option>
            </select>
          </div>
          <div class="field">
            <label for="languageSelect">Idioma</label>
            <select id="languageSelect">
              <option value="pt-BR" selected>Portugues brasileiro</option>
            </select>
          </div>
          <div class="field">
            <label for="themeSelect">Tema</label>
            <select id="themeSelect">
              <option value="light" selected>Modo claro</option>
              <option value="dark" disabled>Modo escuro em preparacao</option>
            </select>
          </div>
        </div>
      </article>
    </section>
  `;
}
