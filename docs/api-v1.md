# Credencia API v1

A API v1 foi adicionada para preparar o Credencia para integracoes futuras sem quebrar o frontend atual.

Os endpoints legados em `/api` continuam ativos. Novas integracoes devem preferir `/api/v1`.

## Documentacao OpenAPI

- HTML simples: `/api/docs`
- JSON OpenAPI: `/api/v1/openapi.json`
- Alias JSON: `/api/docs/openapi.json`

## Autenticacao

Use o token JWT retornado pelo login:

```http
Authorization: Bearer TOKEN
```

## Resposta padrao

Sucesso:

```json
{
  "success": true,
  "data": {},
  "message": "",
  "errors": []
}
```

Erro:

```json
{
  "success": false,
  "data": null,
  "message": "Mensagem segura para o cliente",
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Detalhe do erro",
      "field": "eventId"
    }
  ]
}
```

## Paginacao e filtros

Listagens grandes aceitam, quando aplicavel:

- `page`
- `limit`
- `search`
- `sort`
- `order`

Exemplo:

```http
GET /api/v1/events?page=1&limit=50&search=congresso&sort=date&order=desc
```

Respostas paginadas retornam:

```json
{
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 120,
      "totalPages": 3
    }
  }
}
```

## Endpoints v1 disponiveis

- `GET /api/v1/health`
- `GET /api/v1/openapi.json`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/events`
- `GET /api/v1/events/:eventId/participants`
- `GET /api/v1/areas`
- `GET /api/v1/reports/summary?eventId=...`

## Contratos preparados

Os contratos abaixo estao documentados para integracoes futuras, mas ainda preservam a operacao pelos endpoints legados atuais:

- Check-in: legado em `/api/checkin`
- Scanner/controle de acesso: legado em `/api/access-control/validate`
- Etiquetas e impressao: contratos reservados para Print Manager

## Integracoes futuras

A estrutura `/api/v1` foi preparada para evoluir de forma compativel com:

- Print Manager
- Aplicativo mobile
- Site publico
- Pagamento
- IA
- Marketplace

Nenhuma dessas integracoes foi implementada nesta fase.
