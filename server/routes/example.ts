/**
 * Example API Route - Demonstrates TypeScript compilation workflow
 * 
 * This file shows how to create a TypeScript API route that will be compiled to JavaScript
 * and imported by the server. It showcases proper typing, error handling, and
 * best practices for Express route handlers.
 */

import express, { Request, Response, NextFunction } from 'express';
import * as z from 'zod';

// Define a router instance
const router = express.Router();

// Type definition for request with parameters
interface ParamRequest extends Request {
  params: {
    id: string;
  };
}

// Define a validation schema for request body
const createItemSchema = z.object({
  name: z.string().min(1, "Name must not be empty"),
  description: z.string().optional(),
  quantity: z.number().int().positive().default(1)
});

// Type derived from validation schema
type CreateItemRequest = z.infer<typeof createItemSchema>;

/**
 * GET /example
 * Returns a simple message to verify the route is working
 */
router.get('/', (_req: Request, res: Response) => {
  console.log('[Example API] GET / called');
  res.json({
    message: 'Example API is working correctly',
    compiled: true,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /example/:id
 * Returns information about a specific item by ID
 */
router.get('/:id', (req: ParamRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    console.log(`[Example API] GET /${id} called`);
    
    // For demo purposes, we'll just return the ID
    res.json({
      id,
      name: `Example Item ${id}`,
      description: 'This is an example item returned from a compiled TypeScript route',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error); // Pass any errors to the error handler
  }
});

/**
 * POST /example
 * Creates a new item with validation
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('[Example API] POST / called with body:', req.body);
    
    // Validate request body
    const validationResult = createItemSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request data',
        errors: validationResult.error.errors
      });
    }
    
    // Extract validated data
    const data: CreateItemRequest = validationResult.data;
    
    // In a real application, we would save this to a database
    // For this example, we'll just echo it back
    res.status(201).json({
      status: 'success',
      message: 'Item created successfully',
      data: {
        id: 'new-' + Date.now(),
        ...data,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error); // Pass any errors to the error handler
  }
});

/**
 * Error handler specific to this route
 * This demonstrates how to add route-specific error handling
 */
router.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
  console.error('[Example API] Error:', err);
  
  // If headers have already been sent, let the default error handler deal with it
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(500).json({
    status: 'error',
    message: 'An error occurred in the example API',
    error: err.message,
    timestamp: new Date().toISOString()
  });
});

export default router; 