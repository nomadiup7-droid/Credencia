# Credencia Print Manager - Architecture

Este documento alinha a arquitetura completa prevista para o Credencia Print Manager.

A Fase 1 continua simples e funcional, mas a separacao de responsabilidades ja foi definida para permitir evolucao sem refatorar tudo depois.

## Principios

- O agente e um produto separado do sistema web Credencia.
- A API local e a unica porta de comunicacao entre o Credencia Web e o agente.
- A fila nunca deve travar a resposta HTTP.
- O servico de impressao deve ficar isolado da API e da fila.
- Configuracao, logs, fila e impressao devem evoluir em camadas separadas.
- A Fase 1 nao acessa banco de dados e nao depende do frontend atual.
- Todas as futuras integracoes com o Credencia devem ser opcionais e configuraveis por evento.

## Tecnologias

Fase 1:

- Node.js
- Express
- CORS
- fs
- child_process
- JSON local para configuracao
- Fila em memoria

Fase 3:

- Electron para interface local Windows.
- Renderer HTML/CSS/JS consumindo apenas a API local.
- Preload isolado para recursos do sistema, como IP local e acoes futuras.

Fases futuras previstas:

- Electron ou Tauri para interface Windows
- Empacotamento Windows com instalador .exe
- Servico/background process para inicializar com Windows
- Mecanismo de update preparado por versao
- Canal HTTP local/rede local com o sistema Credencia

## Estrutura atual da Fase 1

```text
print-agent/
├── package.json
├── package-lock.json
├── README.md
├── ARCHITECTURE.md
├── config.json
├── server.js
└── src/
    ├── routes/
    │   ├── health.routes.js
    │   ├── printers.routes.js
    │   ├── print.routes.js
    │   └── queue.routes.js
    ├── services/
    │   ├── printer.service.js
    │   ├── queue.service.js
    │   └── config.service.js
    ├── utils/
    │   └── logger.js
    └── app/
        ├── main.js
        ├── preload.js
        └── renderer/
            ├── index.html
            ├── styles.css
            └── app.js
```

## Separacao de responsabilidades

### server.js

Responsavel por:

- Criar o app Express.
- Aplicar CORS e JSON parser.
- Registrar rotas.
- Inicializar a porta configurada.
- Manter a API disponivel na rede local.

Nao deve conter regra de impressao, fila ou configuracao alem da inicializacao.

### routes/

Responsavel por:

- Receber requisicoes HTTP.
- Validar entradas simples.
- Chamar os servicos corretos.
- Retornar respostas padronizadas.

Nao deve executar comandos de impressao diretamente.

### services/queue.service.js

Responsavel por:

- Criar jobs.
- Controlar status: pending, printing, printed, error.
- Processar a fila em segundo plano.
- Permitir retry de jobs com erro.
- Guardar historico basico em memoria na Fase 1.

Evolucao futura:

- Persistencia local em arquivo.
- Limite de historico.
- Cancelamento.
- Priorizacao.
- Reimpressao por job impresso.

### services/printer.service.js

Responsavel por:

- Listar impressoras.
- Enviar conteudo para a impressora.
- Isolar detalhes do Windows.
- Manter modo simulation na Fase 1.

Evolucao futura:

- Impressao RAW/ZPL/EPL.
- Selecao de impressora padrao.
- Impressao de etiquetas, crachas, chapelaria e certificados.
- Validacao por tipo de impressora.

### services/windows-printer.service.js

Responsavel por toda comunicacao com Windows.

Regras:

- Usar PowerShell via `child_process`.
- Preferir `Get-CimInstance Win32_Printer`.
- Nao retornar listas fixas.
- Centralizar diagnostico de impressoras.
- Registrar impressoras encontradas e removidas.

### services/config.service.js

Responsavel por:

- Ler config.json.
- Centralizar configuracoes do agente.
- Preparar reload futuro.

Evolucao futura:

- Edicao pela interface Windows.
- Persistencia segura.
- Configuracoes por dispositivo.
- Chaves para integracao com Credencia.

### utils/logger.js

Responsavel por:

- Registrar logs simples no console.

Evolucao futura:

- Log em arquivo.
- Rotacao de logs.
- Nivel de log configuravel.
- Exibicao na interface grafica.

### src/app/

Responsavel pela interface Electron.

Regras:

- Nao deve conter regra de impressao.
- Nao deve manipular fila diretamente.
- Deve consumir a API local via HTTP.
- Deve usar preload apenas para recursos do sistema operacional.

Evolucao futura:

- Bandeja do Windows.
- Logs em tela baseados em arquivo.
- Reinicio real do servico.
- Configuracoes visuais mais completas.

Organizacao da Fase 3.5:

```text
src/app/
├── assets/
│   └── icon.ico
├── main.js
├── preload.js
└── renderer/
    ├── app.js
    ├── components/
    ├── css/
    ├── pages/
    └── utils/
```

`icon.ico` ainda nao precisa existir, mas o caminho ja esta preparado no `main.js`.

## Comunicacao futura com o Credencia Web

O sistema web devera falar com o agente por HTTP:

```text
Credencia Web -> http://IP_DO_DISPOSITIVO:3333
```

Endpoints previstos para integracao:

- GET /health
- GET /printers
- GET /config
- PATCH /config/default-printer
- GET /diagnostics
- POST /print
- GET /queue
- POST /queue/:id/retry
- POST /queue/:id/cancel
- POST /test-print

Na Fase 5, o Credencia podera configurar por evento:

- Modo desativado.
- Modo manual.
- Modo automatico.
- Impressora padrao.
- Teste de conexao.
- Envio de impressao no check-in.

## Fases do produto

### Fase 1 - Arquitetura e motor inicial

Implementado nesta etapa:

- API local.
- Health check.
- Listagem de impressoras com fallback.
- Fila simples.
- Endpoints de teste.
- Configuracao local.
- Logs simples.

Nao implementado nesta etapa:

- Interface grafica.
- Instalador.
- Integracao com Credencia Web.
- Atualizacao automatica.
- Impressao real ativada por padrao.

### Fase 2 - Motor de impressao

Objetivo:

- Fortalecer fila.
- Melhorar status.
- Reimpressao.
- Tratamento de erro.
- Impressao real por tipo de documento.

### Fase 3 - Interface grafica

Objetivo:

- Aplicativo Windows.
- Status online/offline.
- Impressora padrao.
- Teste de impressao.
- Logs.
- Configuracoes.

Status atual:

- Interface Electron criada.
- Painel consome `/health`, `/printers`, `/queue`, `/test-print` e `/config`.
- Acoes de reinicio e bandeja estao preparadas para fase futura.
- Nenhuma regra de impressao foi duplicada na interface.

### Fase 3.5 - UX/UI profissional

Objetivo:

- Profissionalizar a interface Electron.
- Adicionar menu nativo.
- Organizar renderer em componentes.
- Criar sidebar e paginas internas.
- Criar toasts e logs estruturados.
- Preparar tema, idioma e icone.

Status atual:

- Implementado apenas no frontend Electron.
- API, fila e sistema web Credencia preservados.

### Fase 3.8 - Impressoras reais do Windows

Objetivo:

- Remover dados simulados de impressoras.
- Isolar comunicacao com Windows em `WindowsPrinterService`.
- Expor diagnostico local.
- Atualizar a interface apenas consumindo a API.

Status atual:

- `/printers` usa `Get-CimInstance Win32_Printer`.
- `/diagnostics` retorna servico, quantidade, impressora padrao, versao, porta, sistema, hostname e IP.
- Interface atualiza impressoras a cada 5 segundos.

### Fase 4 - Instalador Windows

Objetivo:

- Gerar .exe.
- Inicializar junto com Windows.
- Criar atalho.
- Rodar em segundo plano.

### Fase 5 - Integracao com Credencia

Objetivo:

- Configuracao por evento.
- Modo desativado/manual/automatico.
- Testar conexao.
- Listar impressoras.
- Enviar impressao no check-in.

### Fase 6 - Atualizacoes automaticas

Objetivo:

- Controle de versao.
- Verificacao de nova versao.
- Preparacao para update futuro.

## Contrato de compatibilidade

A API da Fase 1 deve ser preservada nas proximas fases.

Campos e endpoints existentes devem continuar funcionando:

- GET /health
- GET /printers
- GET /config
- PATCH /config/default-printer
- POST /print
- GET /queue
- POST /queue/:id/retry
- POST /queue/:id/cancel
- POST /test-print

Novas fases podem adicionar endpoints, mas nao devem quebrar estes contratos.
