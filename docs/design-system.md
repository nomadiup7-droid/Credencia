# Credencia Design System

Base visual inspirada na marca oficial do Credencia.

## Direcao visual

- Tecnologia premium
- Glassmorphism leve
- Verde escuro e verde neon controlado
- Grafite, preto e branco translucido
- Bordas discretas
- Sombras suaves
- Microinteracoes discretas

## Tokens principais

Os tokens ficam em `src/styles/design-system.css`.

- `--cx-green-500`: verde principal
- `--cx-green-700`: verde escuro
- `--cx-graphite-900`: grafite profundo
- `--cx-paper`: fundo claro
- `--cx-white-glass`: superficie translucida
- `--cx-border`: borda padrao
- `--cx-shadow-card`: sombra de cards

## Classes utilitarias

- `cx-app-shell`
- `cx-glass`
- `cx-card`
- `cx-button-primary`
- `cx-button-secondary`
- `cx-badge`
- `cx-empty-state`
- `cx-skeleton`
- `cx-premium-header`
- `cx-nav-item`
- `cx-nav-active`
- `cx-table-wrap`

## Componentes reutilizaveis

Criados em `src/components/ui`:

- `Button`
- `Card`
- `CardHeader`
- `CardBody`
- `Field`
- `Badge`
- `Skeleton`
- `LoadingState`
- `EmptyState`

## Tema claro e escuro

A estrutura de tokens ja considera `.theme-dark`.

A troca completa de tema ainda nao foi implementada nesta fase; a base visual esta preparada para evoluir sem alterar regras de negocio.
