/**
 * @file swagger.ts
 * @description Swagger/OpenAPI configuration and setup
 */

import { Express } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { version } from '../package.json';
import { API_VERSION } from '@shared/index';

// Swagger definition
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version,
      description: `Documentation for the API endpoints (Current API Version: ${API_VERSION})`,
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: `http://localhost:5001/api/${API_VERSION}`,
        description: 'Development server',
      },
      {
        url: `https://api.example.com/api/${API_VERSION}`,
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session',
        },
      },
      parameters: {
        apiVersion: {
          name: 'X-API-Version',
          in: 'header',
          description: 'API version to use',
          required: false,
          schema: {
            type: 'string',
            default: API_VERSION
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication information is missing or invalid',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Unauthorized',
                  },
                },
              },
            },
          },
        },
        BadRequestError: {
          description: 'Invalid request parameters',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Bad request',
                  },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        path: {
                          type: 'string',
                          example: 'email',
                        },
                        message: {
                          type: 'string',
                          example: 'Email is required',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        NotFoundError: {
          description: 'The requested resource was not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Resource not found',
                  },
                },
              },
            },
          },
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Internal server error',
                  },
                },
              },
            },
          },
        },
        UnsupportedVersionError: {
          description: 'The API version requested is not supported',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'string',
                    example: 'Unsupported API version',
                  },
                  message: {
                    type: 'string',
                    example: 'API version v2 is not supported. Supported versions: v1',
                  },
                  code: {
                    type: 'string',
                    example: 'UNSUPPORTED_API_VERSION',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [
    './server/routes/*.ts',
    './server/docs/*.ts',
    './server/auth.ts',
  ],
};

// Generate Swagger specification
export const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Sets up Swagger UI for the Express application
 * @param app Express application instance
 */
export function setupApiDocs(app: Express): void {
  // Swagger documentation endpoint
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'API Documentation'
  }));
  
  // Endpoint to get the Swagger specification in JSON format
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  console.log('📚 Swagger documentation available at /api-docs');
} 