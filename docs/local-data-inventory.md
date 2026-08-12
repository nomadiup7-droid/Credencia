# Inventario local do db.json

Gerado em 2026-07-16 para preparar a validacao da conexao real com Supabase.

Este arquivo contem somente contagens. Nao inclui senhas, hashes, PINs completos, nomes, e-mails, CPFs ou outros dados pessoais. Nenhum dado foi migrado, apagado ou alterado.

## Contagens locais

| Registro | Quantidade |
| --- | ---: |
| Organizacoes | 1 |
| Usuarios | 3 |
| Vinculos usuario/evento | 1 |
| Eventos | 1 |
| Participantes | 513 |
| Chapelaria | 0 |
| Check-ins | 27 |
| Logs de check-in | 60 |
| Logs de auditoria | 538 |
| Atividades | 0 |
| Presencas em atividades | 0 |
| Certificados | 0 |
| Templates de certificado | 1 |
| Configuracoes de inscricao online | 0 |
| Inscricoes online | 0 |
| Campos de cadastro | 5 |
| Areas | 2 |
| Logs de acesso por area | 8 |
| Perfis de acesso | 0 |

## Pontos a comparar com Supabase

Antes de qualquer migracao, comparar as tabelas remotas com estas categorias locais:

- Organizacoes e usuarios do sistema em `public.organizations` e `public.users`.
- Evento ativo e seus participantes.
- Check-ins, logs de check-in e logs de auditoria.
- Template de certificado existente.
- Campos de cadastro e areas de acesso.
- Logs de acesso por area.

Possiveis lacunas devem ser tratadas em uma migration/carga planejada e revisada separadamente. Esta etapa nao executa migracao automatica do `db.json`.

## Comparacao remota somente leitura

Consulta realizada contra o projeto Supabase vinculado em 2026-07-16, sem alterar dados:

| Registro | Local db.json | Supabase remoto |
| --- | ---: | ---: |
| Organizacoes | 1 | 1 |
| Usuarios | 3 | 1 |
| Eventos | 1 | 0 |
| Participantes | 513 | 0 |
| Check-ins | 27 | 0 |
| Logs de check-in | 60 | 0 |
| Logs de auditoria | 538 | 0 |
| Templates de certificado | 1 | 0 |
| Campos de cadastro | 5 | 0 |
| Areas | 2 | 0 |
| Logs de acesso por area | 8 | 0 |

Possiveis dados locais ainda nao existentes no Supabase: usuarios adicionais, evento ativo, participantes, check-ins, logs, template de certificado, campos de cadastro, areas e logs de acesso por area. A organizacao e pelo menos um administrador existem no Supabase.
