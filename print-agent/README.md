# Credencia Print Manager

Agente local de impressao do sistema Credencia.

Este modulo e independente do sistema web principal. Ele cria uma API local com fila de impressao, endpoints de teste e servicos preparados para listar impressoras no Windows.

Leia tambem:

```text
ARCHITECTURE.md
```

## Instalacao

```bash
cd print-agent
npm install
npm start
```

Servidor padrao:

```text
http://localhost:3333
```

## Comandos

Rodar somente a API:

```bash
npm start
```

Rodar API + interface Electron:

```bash
npm run dev
```

Abrir somente a interface Electron:

```bash
npm run app
```

Observacao: `npm run app` espera que a API ja esteja disponivel em `http://localhost:3333`. Se a API estiver offline, a interface mostra um aviso claro.

## Fase 3.5

Implementado nesta fase:

- Interface com aparencia mais proxima de software desktop Windows.
- Menu nativo do Electron:
  - Arquivo
  - Configuracoes
  - Ferramentas
  - Ajuda
- Sidebar com paginas:
  - Dashboard
  - Impressoras
  - Fila
  - Logs
  - Configuracoes
  - Sobre
- Cards de dashboard para status, versao, porta, IP, impressora padrao, fila e ultima impressao.
- Refresh automatico de `/health` e `/queue` a cada 2 segundos.
- Toasts elegantes para operacoes da interface.
- Logs estruturados com hora, tipo e mensagem.
- Botao para limpar logs da tela.
- Preferencias locais para tipo de impressao, copias, auto refresh, idioma e tema.
- Estrutura pronta para `icon.ico` em `src/app/assets/icon.ico`.
- CSS preparado para futura troca de tema.

Ainda nao implementado:

- Instalador Windows.
- Bandeja do Windows funcional.
- Reinicio real do servico.
- Modo escuro funcional.
- Auto update.
- Integracao com o sistema web Credencia.

## Fase 3.8

Implementado nesta fase:

- `WindowsPrinterService` isolado para comunicacao com Windows.
- Listagem real de impressoras via PowerShell e `Get-CimInstance Win32_Printer`.
- Remocao do fallback simulado na rota `/printers`.
- Retorno de impressora com `name`, `driver`, `port`, `shared`, `default`, `status`, `isNetwork` e `isLocal`.
- Rota `GET /diagnostics`.
- Interface usando somente dados vindos da API.
- Botao `Usar` salva a impressora em `config.json` como `defaultPrinter`.
- Teste de impressao usa a impressora selecionada no `config.json`.
- Atualizacao automatica das impressoras a cada 5 segundos.
- Logs para impressora encontrada, removida, padrao alterada e falha de comunicacao.

Nao foi alterado:

- API de fila.
- Motor de fila.
- Sistema Credencia web.
- Arquitetura geral.

## Fase 3

Implementado nesta fase:

- Interface Electron local.
- Tela principal "Credencia Print Manager".
- Status online/offline do agente.
- Versao, porta e IP local.
- Impressora padrao configurada.
- Listagem de impressoras.
- Botao para salvar impressora padrao via API.
- Teste de impressao por impressora e tipo.
- Resumo da fila por status.
- Lista dos ultimos itens da fila.
- Acoes preparadas: abrir logs, reiniciar servico e minimizar para bandeja.
- Consumo da API local sem duplicar regra de impressao na interface.

Ainda nao implementado:

- Instalador Windows.
- Auto update.
- Integracao com o sistema web Credencia.
- Login.
- Banco de dados.
- Bandeja do Windows funcional.
- Reinicio real do servico.

## Fase 2

Implementado nesta fase:

- Fila mais robusta.
- Processamento assincrono.
- Historico em memoria.
- Retry de item com erro ou impresso.
- Cancelamento de item pending ou error.
- Filtro da fila por status.
- Servico `sendToPrinter()` preparado para tipos `text`, `zpl`, `epl` e `tspl`.
- Logs para adicao, inicio, sucesso, erro, retry e cancelamento.

Ainda nao implementado:

- Interface grafica.
- Instalador Windows.
- Integracao com o sistema web Credencia.
- Banco de dados.
- Persistencia definitiva em arquivo ou SQLite.

## Configuracao

Arquivo:

```text
config.json
```

Por seguranca, o agente inicia em modo simulado:

```json
"printMode": "simulation"
```

Nesse modo, a fila processa os jobs e marca como impressos sem enviar dados para a impressora.

Para permitir acesso pela rede local, o servidor escuta em:

```json
"host": "0.0.0.0"
```

## Endpoints

### GET /health

Verifica se o agente esta online.

```bash
curl http://localhost:3333/health
```

Resposta esperada:

```json
{
  "status": "online",
  "app": "Credencia Print Manager",
  "version": "1.0.0",
  "port": 3333
}
```

### GET /printers

Lista impressoras reais disponiveis no Windows.

```bash
curl http://localhost:3333/printers
```

Resposta:

```json
{
  "printers": [
    {
      "name": "Brother QL-820NWB",
      "driver": "Brother",
      "port": "USB001",
      "default": true,
      "shared": false,
      "status": "Online",
      "isNetwork": false,
      "isLocal": true
    }
  ]
}
```

### GET /diagnostics

Retorna diagnostico do agente local.

```bash
curl http://localhost:3333/diagnostics
```

### GET /config

Retorna configuracoes publicas do agente.

```bash
curl http://localhost:3333/config
```

### PATCH /config/default-printer

Salva a impressora padrao usada pela interface.

```bash
curl -X PATCH http://localhost:3333/config/default-printer \
  -H "Content-Type: application/json" \
  -d "{\"printerName\":\"Zebra ZD230\"}"
```

### POST /print

Adiciona um item na fila e responde rapido com status HTTP 202.

Tipos aceitos:

- text
- zpl
- epl
- tspl

Exemplo:

```bash
curl -X POST http://localhost:3333/print \
  -H "Content-Type: application/json" \
  -d "{\"printerName\":\"Zebra ZD230\",\"content\":\"CREDENCIA TESTE\",\"type\":\"text\",\"copies\":1}"
```

Payload completo:

```json
{
  "printerName": "Zebra ZD230",
  "content": "CREDENCIA TESTE",
  "type": "text",
  "copies": 1,
  "maxAttempts": 3
}
```

### GET /queue

Retorna a fila completa.

```bash
curl http://localhost:3333/queue
```

### GET /queue?status=printed

Filtra a fila por status.

Status aceitos:

- pending
- printing
- printed
- error
- canceled

Exemplos:

```bash
curl http://localhost:3333/queue?status=printed
curl http://localhost:3333/queue?status=error
curl http://localhost:3333/queue?status=pending
```

### POST /queue/:id/retry

Reprocessa um item com status `error` ou `printed`.

```bash
curl -X POST http://localhost:3333/queue/JOB_ID/retry
```

Observacao:

- Jobs com erro respeitam `maxAttempts`.
- Jobs impressos podem ser enviados novamente como reimpressao.

### POST /queue/:id/cancel

Cancela item com status `pending` ou `error`.

```bash
curl -X POST http://localhost:3333/queue/JOB_ID/cancel
```

### POST /test-print

Cria uma impressao simples de teste.

```bash
curl -X POST http://localhost:3333/test-print \
  -H "Content-Type: application/json" \
  -d "{\"printerName\":\"Zebra ZD230\",\"type\":\"text\"}"
```

Conteudo gerado:

```text
CREDENCIA PRINT MANAGER
TESTE DE IMPRESSAO
DATA/HORA
```

## Estrutura de um job

```json
{
  "id": "job_...",
  "printerName": "Zebra ZD230",
  "content": "CREDENCIA TESTE",
  "type": "text",
  "copies": 1,
  "status": "printed",
  "attempts": 1,
  "maxAttempts": 3,
  "createdAt": "2026-07-02T00:00:00.000Z",
  "updatedAt": "2026-07-02T00:00:00.000Z",
  "printedAt": "2026-07-02T00:00:00.000Z",
  "errorMessage": null
}
```

## Observacoes

- Nao acessa banco de dados.
- Nao depende do frontend do Credencia.
- Nao altera telas existentes.
- Nao cria instalador.
- Nao integra ainda com o sistema web.
