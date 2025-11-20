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
      url: 'http://localhost:3000',
      description: 'Servidor de desarrollo'
    },
    {
      url: 'https://api.iglesia360.com',
      description: 'Servidor de producción'
    }
  ],
  tags: [
    {
      name: 'Health',
      description: 'Endpoints de salud del sistema'
    },
    {
      name: 'Users',
      description: 'Gestión de usuarios'
    }
  ],
  components: {
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
