# Persistencia do Credencia

## Provedor atual

O backend escolhe o provedor em `server/db.ts` exclusivamente por `DATABASE_PROVIDER`.

- `DATABASE_PROVIDER=supabase`: usa Supabase/PostgreSQL. Exige `SUPABASE_URL` e `SUPABASE_SECRET_KEY`. `SUPABASE_SERVICE_ROLE_KEY` continua aceito apenas como compatibilidade legada.
- `DATABASE_PROVIDER=local-json`: usa `db.json` somente em desenvolvimento local explicito.

O padrao e `supabase`. Em producao, `local-json` e bloqueado. Se Supabase estiver selecionado e a URL/chave estiver ausente, ou se a validacao de conexao falhar, o servidor para a inicializacao e nao faz fallback para `db.json`.

O endpoint de saude retorna somente informacao nao sensivel do provedor, por exemplo:

```json
{
  "provider": {
    "provider": "supabase",
    "persistent": true
  }
}
```

Nenhuma URL, chave ou segredo deve ser retornado em health checks ou logs.

`DATABASE_URL` fica documentada no `.env.example` para uso futuro ou ferramentas externas. O backend atual usa o cliente Supabase.

## Dados principais

Os dados abaixo devem persistir no provedor configurado:

- Organizacoes
- Usuarios
- Eventos
- Vinculos usuario/evento
- Participantes
- Check-ins
- Areas de acesso
- Perfis de acesso
- Logs de acesso
- Logs de auditoria
- Chapelaria
- Atividades
- Presencas em atividades
- Certificados
- Templates de certificado
- Inscricoes online
- Campos de cadastro

## localStorage

O `localStorage` deve ficar restrito a token/sessao e preferencias simples de interface, como evento atual, aba ativa, tema e configuracoes visuais locais.

Existe codigo offline/fila local criado em fases anteriores. Ele nao foi expandido nesta fase, porque esta etapa nao implementa modo offline, fila offline ou sincronizacao.

## Isolamento por organizacao

Rotas sensiveis devem filtrar os dados por `organizationId` do usuario autenticado. Consultas que dependem de evento devem validar se o evento pertence a mesma organizacao antes de retornar, criar, atualizar ou excluir dados.

## Signup de usuarios do sistema

O endpoint publico `/api/auth/signup` fica desativado por padrao com `ALLOW_PUBLIC_SIGNUP=false`.

- O primeiro administrador deve ser criado por `npm run admin:create`.
- Operadores devem ser criados por administrador autenticado.
- Mesmo quando `ALLOW_PUBLIC_SIGNUP=true`, o endpoint nao aceita `ADMIN`, `SUPERVISOR` ou permissoes administrativas enviadas pelo navegador.
- O signup publico usa role segura fixa, normaliza e-mail, exige senha forte e impede duplicidade.

A inscricao publica de participantes do evento nao e afetada por essa regra.

## Preparacao segura para Supabase

- O frontend continua chamando apenas `/api`; nenhuma chave privilegiada deve usar prefixo `VITE_`.
- RLS fica habilitado nas tabelas do projeto; o acesso aos dados passa pela API Express usando a chave secreta do backend.
- Tickets de chapelaria sao reservados pela funcao PostgreSQL `create_cloakroom_item_atomic`, com contador por evento iniciando em 101 e unique por `(event_id, tag_number)`.
- Posicoes de chapelaria sao protegidas por `cloakroom_position_claims` e indice unico parcial para posicoes ativas. A devolucao chama `collect_cloakroom_item_atomic` para liberar a posicao sem apagar historico.
- Reset de testes usa `reset_event_test_data` para cancelar registros de teste sem apagar dados oficiais.

### Comandos Supabase

```powershell
npx supabase login
npx supabase link
npx supabase db push
```

Nao execute migrations em producao sem backup e autorizacao explicita. Nao use `--include-seed` em producao.

### Primeiro administrador

```powershell
npm run admin:create
```

O script exige Supabase configurado, valida senha forte, gera bcrypt e nao imprime a senha.
