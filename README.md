# Credencia

Sistema de credenciamento para eventos com operadores, participantes, check-in, leitura de QR Code, controle de acesso, chapelaria, relatorios, etiquetas, atividades e certificados.

## Requisitos

- Node.js
- npm
- Variaveis de ambiente configuradas a partir de `.env.example`

## Instalação

```powershell
npm install
```

## Desenvolvimento

```powershell
npm run dev
```

O sistema abre em:

```text
http://localhost:3000
```

## Build

```powershell
npm run build
```

## Produção local

```powershell
npm run build
npm run start
```

## Variaveis de ambiente

Copie `.env.example` para `.env` e configure:

- `JWT_SECRET`: segredo usado para assinar tokens JWT.
- `PORT`: porta do servidor, padrão `3000`.
- `SUPABASE_URL`: URL do projeto Supabase.
- `SUPABASE_SECRET_KEY`: chave secreta do Supabase usada apenas no backend.
- `SUPABASE_SERVICE_ROLE_KEY`: compatibilidade legada; prefira `SUPABASE_SECRET_KEY`.
- `DATABASE_URL`: URL PostgreSQL opcional para ferramentas/adaptadores futuros.

Sem Supabase configurado, o backend usa `db.json` somente em desenvolvimento. Em `NODE_ENV=production`, o servidor falha ao iniciar se o Supabase nao estiver configurado.

## Estrutura principal

```text
src/
  assets/        imagens e arquivos visuais
  components/    componentes reutilizaveis
  constants/     permissoes, navegacao e configuracoes padrão
  pages/         telas principais
  services/      comunicacao com API e servicos de dominio
  utils/         funcoes auxiliares
  App.tsx        composicao principal da aplicacao
  types.ts       tipos compartilhados do frontend

server/
  auth.ts        autenticacao, JWT e permissao ADMIN
  db.ts          camada de persistencia Supabase/db.json

routes/
  checkin.ts     rotas dedicadas de check-in

docs/
  persistence.md documentacao da persistencia atual
  api-v1.md      documentacao da API versionada
```

## API v1

A API versionada para integracoes fica em `/api/v1`.

- Documentacao simples: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/v1/openapi.json`
- Guia local: `docs/api-v1.md`

Os endpoints antigos em `/api` continuam ativos para manter compatibilidade com o frontend atual.

## Serviços

A comunicacao HTTP do frontend deve passar por `src/services/api.ts`.

Servicos de dominio existentes:

- `authService.ts`
- `participantService.ts`
- `checkinService.ts`
- `offlineService.ts` para compatibilidade com codigo offline ja existente

## Qualidade

Antes de enviar alteracoes:

```powershell
npm run lint
npm run build
```

## Observacoes

- Nao commitar `.env` com segredos reais.
- Nao commitar `node_modules`.
- Evitar novas chamadas diretas a `fetch` fora da camada de services.
- Mudancas em permissao, banco ou autenticacao devem ser testadas com usuario ADMIN e usuario operador vinculado a evento.


## Supabase em producao

1. Crie o projeto no Supabase e configure `SUPABASE_URL` e `SUPABASE_SECRET_KEY` no ambiente do backend.
2. Aplique migrations versionadas, sem seed de demonstracao:

```powershell
npx supabase login
npx supabase link
npx supabase db push
```

Nao use `--include-seed` em producao, nao cole chaves no codigo e nao envie `.env` ao GitHub. Depois de adotar migrations, evite alterar o schema remoto manualmente.

Para criar o primeiro administrador, rode em um terminal com Supabase configurado:

```powershell
npm run admin:create
```

Eventos antigos sem `organization_id` devem ser regularizados manualmente com a organizacao correta antes do uso real. Faca backup antes de qualquer migration remota.
