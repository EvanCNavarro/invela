/**
 * Environment Variables Type Declarations
 * 
 * This file provides type declarations for the environment utilities
 * to ensure proper type checking and module resolution.
 */

declare module '../utils/env' {
  export const env: {
    NODE_ENV: string;
    DATABASE_URL: string;
    PORT: string;
    JWT_SECRET: string;
    OPENAI_API_KEY?: string;
    [key: string]: string | undefined;
  };

  export const getEnv: (key: string) => string;
  export const getEnvOrDefault: (key: string, defaultValue: string) => string;
  export const isDevelopment: boolean;
  export const isProduction: boolean;
  export const isTest: boolean;
} 