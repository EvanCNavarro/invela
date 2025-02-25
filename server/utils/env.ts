/**
 * @file env.ts
 * @description Environment variable validation and type-safe access.
 * Ensures all required environment variables are present and correctly typed.
 */

import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Zod schema for validating environment variables.
 * Defines the expected types and constraints for each environment variable.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(val => parseInt(val, 10)).default('5001'),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  COOKIE_SECRET: z.string().min(32, "COOKIE_SECRET must be at least 32 characters"),
  // Add other required environment variables as needed
});

/**
 * Type definition for the validated environment variables.
 */
type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables against the schema.
 * Exits the process with an error if validation fails.
 * 
 * @returns The validated environment variables
 */
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      console.error('\nEnvironment validation failed:');
      console.error(validationError.message);
      process.exit(1);
    }
    throw error;
  }
}

// Validate environment variables and export them
const env = validateEnv();
export default env; 