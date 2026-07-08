export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Credencia API',
    version: '1.0.0',
    description: 'API versionada do Credencia para integrações futuras com painel web, mobile, impressão e serviços externos.'
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1'
    }
  ],
  tags: [
    { name: 'Sistema' },
    { name: 'Login' },
    { name: 'Usuários' },
    { name: 'Eventos' },
    { name: 'Participantes' },
    { name: 'Check-in' },
    { name: 'Scanner' },
    { name: 'Áreas' },
    { name: 'Etiquetas' },
    { name: 'Relatórios' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      ApiSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
          message: { type: 'string', example: 'Operação realizada com sucesso' },
          errors: { type: 'array', items: { type: 'object' } },
          meta: { type: 'object' }
        }
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          data: { nullable: true, example: null },
          message: { type: 'string', example: 'Acesso negado' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                code: { type: 'string', example: '403' },
                message: { type: 'string', example: 'Usuário sem permissão' },
                field: { type: 'string', example: 'eventId' }
              }
            }
          }
        }
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 50 },
              total: { type: 'integer', example: 120 },
              totalPages: { type: 'integer', example: 3 }
            }
          }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'admin@credencia.local' },
          password: { type: 'string', format: 'password' }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'CHECKIN', 'CHECKIN_CADASTRO', 'RELATORIO'] },
          permissions: { type: 'array', items: { type: 'string' } },
          organizationId: { type: 'string' },
          organizationName: { type: 'string' }
        }
      },
      Event: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          date: { type: 'string' },
          location: { type: 'string' },
          capacity: { type: 'number' },
          organizationId: { type: 'string' },
          currentUserRole: { type: 'string' },
          currentUserPermissions: { type: 'array', items: { type: 'string' } }
        }
      },
      Participant: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          eventId: { type: 'string' },
          name: { type: 'string' },
          badgeName: { type: 'string' },
          cpf: { type: 'string' },
          category: { type: 'string' },
          checkedIn: { type: 'boolean' },
          checkedInAt: { type: 'string' },
          ticketCode: { type: 'string' }
        }
      },
      CheckinRequest: {
        type: 'object',
        required: ['eventId', 'search'],
        properties: {
          eventId: { type: 'string' },
          search: { type: 'string', description: 'Nome, CPF ou QR Code' }
        }
      }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Verifica status da API',
        security: [],
        responses: {
          '200': { description: 'API disponível' }
        }
      }
    },
    '/openapi.json': {
      get: {
        tags: ['Sistema'],
        summary: 'Retorna a especificação OpenAPI',
        security: [],
        responses: {
          '200': { description: 'Documento OpenAPI' }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Login'],
        summary: 'Autentica usuário e retorna JWT',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' }
            }
          }
        },
        responses: {
          '200': { description: 'Login realizado' },
          '400': { description: 'Dados inválidos' },
          '401': { description: 'Credenciais inválidas' }
        }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Login', 'Usuários'],
        summary: 'Retorna usuário autenticado',
        responses: {
          '200': { description: 'Usuário autenticado' },
          '401': { description: 'Token ausente ou inválido' }
        }
      }
    },
    '/events': {
      get: {
        tags: ['Eventos'],
        summary: 'Lista eventos acessíveis ao usuário autenticado',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string', example: 'date' } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } }
        ],
        responses: {
          '200': { description: 'Eventos carregados' }
        }
      }
    },
    '/events/{eventId}/participants': {
      get: {
        tags: ['Participantes'],
        summary: 'Lista participantes do evento',
        parameters: [
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['all', 'checkedin', 'pending'] } },
          { name: 'sort', in: 'query', schema: { type: 'string', example: 'name' } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } }
        ],
        responses: {
          '200': { description: 'Participantes carregados' },
          '403': { description: 'Sem acesso ao evento' },
          '404': { description: 'Evento não encontrado' }
        }
      }
    },
    '/areas': {
      get: {
        tags: ['Áreas', 'Scanner'],
        summary: 'Lista áreas de acesso por evento ou organização',
        parameters: [
          { name: 'eventId', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'search', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Áreas carregadas' }
        }
      }
    },
    '/reports/summary': {
      get: {
        tags: ['Relatórios'],
        summary: 'Resumo operacional do evento para relatórios',
        parameters: [
          { name: 'eventId', in: 'query', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Resumo carregado' }
        }
      }
    },
    '/checkin': {
      post: {
        tags: ['Check-in'],
        summary: 'Endpoint documentado para check-in. Contrato legado continua em /api/checkin.',
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CheckinRequest' }
            }
          }
        },
        responses: {
          '200': { description: 'Check-in processado' }
        }
      }
    },
    '/scanner/validate': {
      post: {
        tags: ['Scanner'],
        summary: 'Endpoint documentado para validação de acesso. Contrato legado continua em /api/access-control/validate.',
        responses: {
          '200': { description: 'Acesso validado' }
        }
      }
    },
    '/labels': {
      get: {
        tags: ['Etiquetas'],
        summary: 'Área reservada para contratos futuros de impressão e etiquetas',
        responses: {
          '501': { description: 'Contrato preparado, implementação futura' }
        }
      }
    }
  }
} as const;
