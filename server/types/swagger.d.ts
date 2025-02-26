/**
 * Swagger Type Declarations
 * 
 * This file provides type declarations for the swagger utilities
 * to ensure proper type checking and module resolution.
 */

declare module '../utils/swagger' {
  import { Express } from 'express';
  
  export const setupSwagger: (app: Express) => void;
  export const generateSwaggerDocs: () => any;
  export const swaggerUiOptions: {
    explorer: boolean;
    swaggerOptions: {
      persistAuthorization: boolean;
    };
  };
} 