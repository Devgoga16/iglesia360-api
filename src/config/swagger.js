import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Iglesia 360 API',
    version: '1.0.0',
    description: 'API robusta y minimalista para sistema de gestión de iglesia',
    contact: {
      name: 'API Support',
      email: 'support@iglesia360.com'
    }
  },
  servers: [
    {
      url: process.env.API_URL || 'http://localhost:3000',
      description: 'Servidor de desarrollo'
    },
    ...(process.env.API_URL_PRODUCTION ? [{
      url: process.env.API_URL_PRODUCTION,
      description: 'Servidor de producción v2'
    }] : [])
  ],
  tags: [
    {
      name: 'Health',
      description: 'Endpoints de salud del sistema'
    },
    {
      name: 'Auth',
      description: 'Autenticación y autorización'
    },
    {
      name: 'Persons',
      description: 'Gestión de personas'
    },
    {
      name: 'Roles',
      description: 'Gestión de roles'
    },
    {
      name: 'Modules',
      description: 'Gestión de módulos'
    },
    {
      name: 'Options',
      description: 'Gestión de opciones/permisos'
    },
    {
      name: 'Users',
      description: 'Gestión de usuarios (deprecado)'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Ingrese el token JWT obtenido del login'
      }
    },
    schemas: {
      User: {
        type: 'object',
        required: ['nombre', 'email'],
        properties: {
          _id: {
            type: 'string',
            description: 'ID único del usuario',
            example: '507f1f77bcf86cd799439011'
          },
          nombre: {
            type: 'string',
            description: 'Nombre completo del usuario',
            example: 'Juan Pérez'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Email del usuario',
            example: 'juan@iglesia.com'
          },
          telefono: {
            type: 'string',
            description: 'Número de teléfono',
            example: '+52 123 456 7890'
          },
          rol: {
            type: 'string',
            enum: ['admin', 'pastor', 'lider', 'miembro'],
            description: 'Rol del usuario en la iglesia',
            example: 'miembro'
          },
          activo: {
            type: 'boolean',
            description: 'Estado del usuario',
            example: true
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de creación'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de última actualización'
          }
        }
      },
      BranchAssignmentInput: {
        type: 'object',
        description: 'Asignación de sucursal/roles para una persona',
        required: ['branch', 'roles'],
        properties: {
          branch: {
            type: 'string',
            description: 'ID de la sucursal asignada',
            example: '665b3afcdf2a4e0d9c125b42'
          },
          roles: {
            type: 'array',
            description: 'Listado de roles habilitados en esa sucursal',
            items: {
              type: 'string'
            },
            example: ['665b3afcdf2a4e0d9c125b45', '665b3afcdf2a4e0d9c125b46']
          },
          isPrimary: {
            type: 'boolean',
            description: 'Marca si la sucursal es la principal por defecto',
            example: true
          },
          activo: {
            type: 'boolean',
            description: 'Permite activar/desactivar la asignación',
            example: true
          }
        }
      },
      BranchAssignmentResponse: {
        type: 'object',
        properties: {
          _id: {
            type: 'string'
          },
          branch: {
            type: 'object',
            description: 'Documento de la sucursal poblada'
          },
          roles: {
            type: 'array',
            description: 'Roles poblados',
            items: {
              type: 'object'
            }
          },
          isPrimary: {
            type: 'boolean'
          },
          activo: {
            type: 'boolean'
          },
          permisos: {
            type: 'array',
            description: 'Módulos/opciones derivados de los roles',
            items: {
              type: 'object'
            }
          }
        }
      },
      AuthEnvelope: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            description: 'JWT para futuros requests'
          },
          user: {
            type: 'object',
            description: 'Usuario autenticado incluyendo assignments',
            properties: {
              _id: { type: 'string' },
              username: { type: 'string' },
              email: { type: 'string', format: 'email' },
              assignments: {
                type: 'array',
                items: { $ref: '#/components/schemas/BranchAssignmentResponse' }
              },
              activeAssignment: {
                $ref: '#/components/schemas/BranchAssignmentResponse'
              },
              currentBranchId: {
                type: 'string'
              }
            }
          },
          permisos: {
            type: 'array',
            description: 'Permisos derivados del branch seleccionado',
            items: {
              type: 'object'
            }
          }
        }
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          data: {
            type: 'object'
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'string',
            example: 'Error message'
          }
        }
      }
    },
    responses: {
      NotFound: {
        description: 'Recurso no encontrado',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      BadRequest: {
        description: 'Petición inválida',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      ServerError: {
        description: 'Error interno del servidor',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      }
    }
  }
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.js', './src/index.js']
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
