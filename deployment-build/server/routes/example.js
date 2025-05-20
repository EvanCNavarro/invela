"use strict";
/**
 * Example API Route - Demonstrates TypeScript compilation workflow
 *
 * This file shows how to create a TypeScript API route that will be compiled to JavaScript
 * and imported by the server. It showcases proper typing, error handling, and
 * best practices for Express route handlers.
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
// Define a router instance
const router = express_1.default.Router();
// Define a validation schema for request body
const createItemSchema = z.object({
    name: z.string().min(1, "Name must not be empty"),
    description: z.string().optional(),
    quantity: z.number().int().positive().default(1)
});
/**
 * GET /example
 * Returns a simple message to verify the route is working
 */
router.get('/', (_req, res) => {
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
router.get('/:id', (req, res, next) => {
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
    }
    catch (error) {
        next(error); // Pass any errors to the error handler
    }
});
/**
 * POST /example
 * Creates a new item with validation
 */
router.post('/', async (req, res, next) => {
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
        const data = validationResult.data;
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
    }
    catch (error) {
        next(error); // Pass any errors to the error handler
    }
});
/**
 * Error handler specific to this route
 * This demonstrates how to add route-specific error handling
 */
router.use((err, _req, res, next) => {
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
exports.default = router;
