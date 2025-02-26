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

import express, { Request, Response, NextFunction } from 'express';
import * as z from 'zod';

const router = express.Router();

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

// Type for login request
type LoginRequest = z.infer<typeof loginSchema>;

// Type for registration request
type RegisterRequest = z.infer<typeof registerSchema>;

/**
 * POST /auth/login
 * Authenticates a user and returns a token
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
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
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/register
 * Registers a new user
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
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
  } catch (error) {
    next(error);
  }
});

/**
 * GET /auth/check
 * Checks if the user is authenticated
 */
router.get('/check', (req: Request, res: Response) => {
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
router.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
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

export default router; 