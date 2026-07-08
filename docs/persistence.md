# Persistencia do Credencia

## Provedor atual

O backend escolhe o provedor em `server/db.ts`:

- Supabase/PostgreSQL: usado quando `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estao configurados.
- `db.json`: fallback local de desenvolvimento quando as variaveis do Supabase nao estao configuradas.

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

Existe codigo offline/fila local criado em fases anteriores. Ele nao foi expandido nesta fase, porque a Fase 3 nao implementa modo offline, fila offline ou sincronizacao.

## Isolamento por organizacao

Rotas sensiveis devem filtrar os dados por `organizationId` do usuario autenticado. Consultas que dependem de evento devem validar se o evento pertence a mesma organizacao antes de retornar, criar, atualizar ou excluir dados.
