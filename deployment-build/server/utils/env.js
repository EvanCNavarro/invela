"use strict";
/**
 * @file env.ts
 * @description Environment variable validation and type-safe access.
 * Ensures all required environment variables are present and correctly typed.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const zod_validation_error_1 = require("zod-validation-error");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env file
dotenv_1.default.config();
/**
 * Zod schema for validating environment variables.
 * Defines the expected types and constraints for each environment variable.
 */
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.string().transform(val => parseInt(val, 10)).default('5001'),
    DATABASE_URL: zod_1.z.string().min(1, "DATABASE_URL is required"),
    SESSION_SECRET: zod_1.z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
    COOKIE_SECRET: zod_1.z.string().min(32, "COOKIE_SECRET must be at least 32 characters"),
    // Add other required environment variables as needed
});
/**
 * Validates environment variables against the schema.
 * Exits the process with an error if validation fails.
 *
 * @returns The validated environment variables
 */
function validateEnv() {
    try {
        return envSchema.parse(process.env);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const validationError = (0, zod_validation_error_1.fromZodError)(error);
            console.error('\nEnvironment validation failed:');
            console.error(validationError.message);
            process.exit(1);
        }
        throw error;
    }
}
// Validate environment variables and export them
const env = validateEnv();
exports.default = env;
