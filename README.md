# Credencia

Sistema de credenciamento para eventos com operadores, participantes, check-in, leitura de QR Code, controle de acesso, chapelaria, relatorios, etiquetas, atividades e certificados.

## Requisitos

- Node.js
- npm
- Variaveis de ambiente configuradas a partir de `.env.example`

## Instalacao

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

Para testar camera no celular em rede local, use o modo HTTPS local:

```powershell
npm run dev:https
```

## Build

```powershell
npm run build
```

## Producao local

```powershell
npm run build
npm run start
```

## Variaveis de ambiente

Copie `.env.example` para `.env` e configure:

- `JWT_SECRET`: segredo usado para assinar tokens JWT.
- `PORT`: porta do servidor, padrao `3000`.
- `APP_URL`: URL publica/local da aplicacao.
- `DATABASE_PROVIDER`: provedor explicito de banco. Use `supabase` para o banco real. Use `local-json` apenas em desenvolvimento local intencional.
- `SUPABASE_URL`: URL do projeto Supabase.
- `SUPABASE_SECRET_KEY`: chave secreta do Supabase usada apenas no backend. Este e o nome principal recomendado.
- `SUPABASE_SERVICE_ROLE_KEY`: compatibilidade legada; prefira `SUPABASE_SECRET_KEY`.
- `ALLOW_PUBLIC_SIGNUP`: deve ficar `false` por padrao. Administradores devem ser criados com `npm run admin:create`; operadores devem ser criados por um administrador autenticado.
- `DATABASE_URL`: URL PostgreSQL opcional para ferramentas/adaptadores futuros.

Com `DATABASE_PROVIDER=supabase`, o backend exige `SUPABASE_URL` e `SUPABASE_SECRET_KEY` (ou `SUPABASE_SERVICE_ROLE_KEY` apenas como legado). Se a conexao ou o schema esperado falhar, o servidor para e nao cai para `db.json`.

Com `DATABASE_PROVIDER=local-json`, o backend usa `db.json` somente em desenvolvimento local explicito. Em `NODE_ENV=production`, `local-json` e bloqueado.

## Estrutura principal

```text
src/
  assets/        imagens e arquivos visuais
  components/    componentes reutilizaveis
  constants/     permissoes, navegacao e configuracoes padrao
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

## Servicos

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
- Nao commitar certificados locais nem arquivos em `.cert`.
- Evitar novas chamadas diretas a `fetch` fora da camada de services.
- Mudancas em permissao, banco ou autenticacao devem ser testadas com usuario ADMIN e usuario operador vinculado a evento.

## Supabase em producao

1. Crie o projeto no Supabase e configure `DATABASE_PROVIDER=supabase`, `SUPABASE_URL` e `SUPABASE_SECRET_KEY` no ambiente do backend.
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

O endpoint publico `/api/auth/signup` fica bloqueado por padrao (`ALLOW_PUBLIC_SIGNUP=false`). Mesmo quando habilitado temporariamente, ele nao aceita `ADMIN`, `SUPERVISOR` nem permissoes administrativas enviadas pelo navegador.

Eventos antigos sem `organization_id` devem ser regularizados manualmente com a organizacao correta antes do uso real. Faca backup antes de qualquer migration remota.
