"use strict";
/**
 * Authentication Routes - Handles user authentication
 *
 * This file provides endpoints for user authentication, including login and registration.
 * It demonstrates proper validation, error handling, and security best practices
 * in a TypeScript environment.
 *
 * Best practices implemented:
 * 1. Input validation with Zod
 * 2. Comprehensive error handling
 * 3. Secure authentication patterns
 * 4. Type safety with TypeScript
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const z = __importStar(require("zod"));
const router = express_1.default.Router();
// Input validation schemas
const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters")
});
const registerSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must include at least one uppercase letter")
        .regex(/[0-9]/, "Password must include at least one number")
});
/**
 * POST /auth/login
 * Authenticates a user and returns a token
 */
router.post('/login', async (req, res, next) => {
    try {
        console.log('[Auth] Login attempt');
        // Validate request body
        const validationResult = loginSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid login credentials',
                errors: validationResult.error.errors
            });
        }
        const { email, password } = validationResult.data;
        // In a real application, we would verify credentials against the database
        // For this example, we'll just simulate successful authentication
        // Simulate auth delay
        await new Promise(resolve => setTimeout(resolve, 500));
        // Return mock token
        res.json({
            status: 'success',
            message: 'Authentication successful',
            data: {
                token: `mock-token-${Date.now()}`,
                user: {
                    id: 'user-123',
                    email,
                    name: 'Example User'
                }
            }
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /auth/register
 * Registers a new user
 */
router.post('/register', async (req, res, next) => {
    try {
        console.log('[Auth] Registration attempt');
        // Validate request body
        const validationResult = registerSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid registration data',
                errors: validationResult.error.errors
            });
        }
        const userData = validationResult.data;
        // In a real application, we would save the user to the database
        // For this example, we'll just simulate successful registration
        // Simulate registration delay
        await new Promise(resolve => setTimeout(resolve, 800));
        // Return mock user
        res.status(201).json({
            status: 'success',
            message: 'User registered successfully',
            data: {
                id: `user-${Date.now()}`,
                email: userData.email,
                name: userData.name,
                createdAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /auth/check
 * Checks if the user is authenticated
 */
router.get('/check', (req, res) => {
    // In a real application, we would verify the token from Authorization header
    // For this example, we'll just return an unauthenticated response
    res.json({
        status: 'success',
        authenticated: false,
        message: 'Not authenticated'
    });
});
/**
 * Auth-specific error handler
 */
router.use((err, _req, res, next) => {
    console.error('[Auth] Error in authentication routes:', err);
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).json({
        status: 'error',
        message: 'An error occurred during authentication',
        error: err.message
    });
});
exports.default = router;
