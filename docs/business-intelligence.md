# Business Intelligence do Credencia

A Fase 8 adiciona uma camada modular de BI ao modulo de relatorios, sem alterar regras de negocio, banco, autenticacao ou APIs existentes.

## Componentes

Criados em `src/components/bi`:

- `BusinessIntelligenceDashboard`
- `BIBarChart`
- `BILineChart`
- `BIPieChart`
- `BIHeatmapPreview`

Os graficos usam CSS/React e nao adicionam dependencias pesadas.

## Indicadores

O painel executivo mostra:

- Participantes inscritos
- Participantes confirmados
- Check-ins realizados
- Check-ins pendentes
- Visitantes por hora
- Eventos ativos
- Eventos encerrados
- Tempo medio de check-in, quando possivel
- Media de permanencia, quando possivel
- Total de acessos por area
- Credenciamentos por operador

## Relatorios preparados

- Eventos
- Participantes
- Check-in
- Controle de acesso
- Etiquetas impressas
- Chapelaria
- Usuarios
- Operadores

## Exportacao

Mantida a exportacao Excel existente.

Adicionado suporte modular para CSV em `src/services/reportExportService.ts`.

PDF continua usando a impressao limpa existente, preparado para geracao PDF futura.

## Tempo real

Foi adicionada uma opcao de polling inteligente na aba de relatorios.

- Sem WebSocket nesta fase
- Intervalo atual: 45 segundos
- So roda quando ativado pelo usuario e quando a aba de relatorios esta aberta

## Performance

A camada reutiliza os dados ja carregados e os filtros atuais.

A arquitetura foi preparada para paginacao e cache em fases futuras, sem alterar banco ou API nesta etapa.
