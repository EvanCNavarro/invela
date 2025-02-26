/**
 * Type declarations for test utilities
 */

declare module '../utils/env' {
  export const env: {
    PORT: number;
    NODE_ENV: string;
    DATABASE_URL: string;
    REFRESH_TOKEN_SECRET: string;
    ACCESS_TOKEN_SECRET: string;
    DEBUG_MODE?: string;
    OPENAI_API_KEY?: string;
    LOG_LEVEL?: string;
    SERVER_URL: string;
    [key: string]: string | number | undefined;
  };
}

declare module '../utils/swagger' {
  export function setupSwagger(app: any): void;
  export function generateSwaggerDocs(): any;
  export const swaggerUiOptions: {
    explorer: boolean;
    swaggerOptions: {
      docExpansion: string;
      filter: boolean;
      showCommonExtensions: boolean;
    };
  };
}

// Add declaration for Express Request extensions
declare namespace Express {
  interface Request {
    task?: any;
    user?: {
      id: number;
      email: string;
      firstName?: string;
      lastName?: string;
      role?: string;
      companyId?: number;
    };
  }
} 