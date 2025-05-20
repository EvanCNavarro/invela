"use strict";
// import "tsconfig-paths/register";
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
exports.requireAuth = requireAuth;
exports.setupAuth = setupAuth;
const passport_1 = __importDefault(require("passport"));
const passport_local_1 = require("passport-local");
const express_session_1 = __importDefault(require("express-session"));
const connect_pg_simple_1 = __importDefault(require("connect-pg-simple"));
const bcrypt_1 = __importDefault(require("bcrypt"));
// Use top-level await and dynamic imports for ES modules
// These will need to be dynamically imported
// import { users, companies, registrationSchema } from "../db/schema";
// import { db, pool, executeWithNeonRetry, queryWithNeonRetry } from "../db";
const drizzle_orm_1 = require("drizzle-orm");
const token_1 = require("./services/token");
// These will need to be dynamically imported
// import { AuthError } from "../shared/utils/errors";
// import type { LoginData } from "../shared/types/auth";
// Initialize these to be populated during setup
let users;
let companies;
let registrationSchema;
let db;
let pool;
let executeWithNeonRetry;
let queryWithNeonRetry;
let AuthError;
let LoginData;
// Function to initialize all dynamic imports
async function initializeImports() {
    try {
        // Import DB schema and utilities
        const dbSchema = await Promise.resolve().then(() => __importStar(require("../db/schema")));
        const dbModule = await Promise.resolve().then(() => __importStar(require("../db")));
        const sharedErrors = await Promise.resolve().then(() => __importStar(require("../shared/utils/errors")));
        const sharedAuthTypes = await Promise.resolve().then(() => __importStar(require("../shared/types/auth")));
        // Assign imported values to variables
        users = dbSchema.users;
        companies = dbSchema.companies;
        registrationSchema = dbSchema.registrationSchema;
        db = dbModule.db;
        pool = dbModule.pool;
        executeWithNeonRetry = dbModule.executeWithNeonRetry;
        queryWithNeonRetry = dbModule.queryWithNeonRetry;
        AuthError = sharedErrors.AuthError;
        console.log('[Auth] Dynamic imports loaded successfully');
        return true;
    }
    catch (error) {
        console.error('[Auth] Error loading dynamic imports:', error);
        throw error;
    }
}
const SALT_ROUNDS = 10;
const PostgresSessionStore = (0, connect_pg_simple_1.default)(express_session_1.default);
// Middleware to require authentication
function requireAuth(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            message: "Authentication required",
            code: "AUTH_REQUIRED"
        });
    }
    next();
}
async function hashPassword(password) {
    try {
        console.log('[Auth] Starting to hash password');
        const hashedPassword = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        console.log('[Auth] Password hashed successfully:', {
            hashLength: hashedPassword.length,
            startsWithBcrypt: hashedPassword.startsWith('$2b$'),
            rounds: SALT_ROUNDS
        });
        return hashedPassword;
    }
    catch (error) {
        console.error('[Auth] Error hashing password:', error);
        throw error;
    }
}
async function comparePasswords(supplied, stored) {
    try {
        if (!stored) {
            console.error("[Auth] No stored password provided");
            return false;
        }
        if (!supplied) {
            console.error("[Auth] No supplied password provided");
            return false;
        }
        console.log('[Auth] Comparing passwords:');
        console.log('[Auth] - Stored hash length:', stored.length);
        console.log('[Auth] - Stored hash format check:', stored.startsWith('$2a$') || stored.startsWith('$2b$'));
        console.log('[Auth] - Stored hash type:', typeof stored);
        console.log('[Auth] - Supplied password length:', supplied.length);
        console.log('[Auth] - Stored hash (first 10 chars):', stored.substring(0, 10) + '...');
        console.log('[Auth] - Supplied password (first 2 chars):', supplied.substring(0, 2) + '...');
        // Test the hash generation with the supplied password
        try {
            const testHash = await hashPassword(supplied);
            console.log('[Auth] - Test hash generated:', testHash.substring(0, 10) + '...');
        }
        catch (hashError) {
            console.error('[Auth] - Error generating test hash:', hashError);
        }
        // Perform the actual comparison with detailed error handling
        try {
            const isValid = await bcrypt_1.default.compare(supplied, stored);
            console.log('[Auth] Password comparison result:', isValid);
            return isValid;
        }
        catch (compareError) {
            console.error('[Auth] Error during bcrypt.compare:', compareError);
            // Log detailed error information
            if (compareError instanceof Error) {
                console.error('[Auth] Error details:', {
                    name: compareError.name,
                    message: compareError.message,
                    stack: compareError.stack
                });
            }
            return false;
        }
    }
    catch (error) {
        console.error("[Auth] Password comparison error:", error);
        // Log additional details about the error
        if (error instanceof Error) {
            console.error('[Auth] Error name:', error.name);
            console.error('[Auth] Error message:', error.message);
            console.error('[Auth] Error stack:', error.stack);
        }
        return false;
    }
}
async function getUserByEmail(email) {
    try {
        const normalizedEmail = email.toLowerCase();
        console.log('[Auth] Looking up user by email:', normalizedEmail);
        console.log('[Auth] Database URL configured:', !!process.env.DATABASE_URL);
        console.log('[Auth] About to execute database query with retry logic');
        // Using the Neon-optimized retry logic for this critical operation
        const result = await executeWithNeonRetry(async (client) => {
            // Convert SQL statement to string format accepted by PoolClient
            const query = `SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1`;
            const queryResult = await client.query(query, [normalizedEmail]);
            return queryResult.rows;
        });
        console.log('[Auth] Database query completed with retry mechanism');
        console.log('[Auth] Query result:', {
            resultType: typeof result,
            isArray: Array.isArray(result),
            length: result?.length || 0,
            rawResult: JSON.stringify(result)
        });
        const [user] = result;
        console.log('[Auth] User lookup result:', {
            found: !!user,
            userId: user?.id,
            userEmail: user?.email,
            normalizedLookupEmail: normalizedEmail,
            hasPassword: !!user?.password,
            passwordLength: user?.password?.length,
            passwordStart: user?.password?.substring(0, 4)
        });
        return [user];
    }
    catch (error) {
        console.error('[Auth] Error getting user by email (DETAILED):', error);
        // Log additional details about the error
        if (error instanceof Error) {
            console.error('[Auth] Error name:', error.name);
            console.error('[Auth] Error message:', error.message);
            console.error('[Auth] Error stack:', error.stack);
        }
        // Return empty result to avoid hanging the authentication process
        console.warn('[Auth] Returning empty result due to error');
        return [null];
    }
}
async function setupAuth(app) {
    console.log('[Auth] Setting up authentication...');
    // Load dynamic imports first
    await initializeImports();
    // Session configuration
    let sessionSettings;
    if (process.env.NODE_ENV === 'development') {
        console.log('[Auth] Using in-memory session store for development');
        sessionSettings = {
            secret: process.env.SESSION_SECRET || process.env.REPL_ID,
            resave: false,
            saveUninitialized: false,
            name: 'sid',
            cookie: {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            }
        };
    }
    else {
        // Production uses PostgreSQL session store
        try {
            /*
             * PostgreSQL session store with Neon-optimized settings
             */
            const store = new PostgresSessionStore({
                pool: pool, // Cast to any to bypass type checking
                createTableIfMissing: true,
                tableName: 'session'
            });
            sessionSettings = {
                store,
                secret: process.env.SESSION_SECRET || process.env.REPL_ID,
                resave: false,
                saveUninitialized: false,
                name: 'sid',
                cookie: {
                    httpOnly: true,
                    secure: app.get('env') === 'production',
                    sameSite: 'lax',
                    maxAge: 24 * 60 * 60 * 1000 // 24 hours
                }
            };
            console.log('[Auth] PostgreSQL session store configured successfully with Neon optimizations');
        }
        catch (error) {
            // Fallback to in-memory session store if PostgreSQL setup fails
            console.log('[Auth] Failed to set up PostgreSQL session store, falling back to in-memory store:', error);
            sessionSettings = {
                secret: process.env.SESSION_SECRET || process.env.REPL_ID,
                resave: false,
                saveUninitialized: false,
                name: 'sid',
                cookie: {
                    httpOnly: true,
                    secure: app.get('env') === 'production',
                    sameSite: 'lax',
                    maxAge: 24 * 60 * 60 * 1000 // 24 hours
                }
            };
            console.log('[Auth] In-memory session store configured as fallback');
        }
    }
    if (app.get('env') === 'production') {
        app.set('trust proxy', 1);
    }
    app.use((0, express_session_1.default)(sessionSettings));
    app.use(passport_1.default.initialize());
    app.use(passport_1.default.session());
    passport_1.default.use(new passport_local_1.Strategy({
        usernameField: 'email',
        passwordField: 'password'
    }, async (email, password, done) => {
        try {
            console.log('[Auth] Authenticating user:', email);
            console.log('[Auth] Password provided (length):', password?.length || 0);
            let users;
            try {
                console.log('[Auth] Calling getUserByEmail function');
                users = await getUserByEmail(email);
                console.log('[Auth] User lookup completed, result type:', typeof users, 'Array?:', Array.isArray(users));
                console.log('[Auth] User array length:', users?.length || 0);
            }
            catch (e) {
                console.error('[Auth] User lookup error:', e);
                return done(null, false, { message: 'Authentication error during user lookup' });
            }
            if (!users || !Array.isArray(users) || users.length === 0) {
                console.log('[Auth] User lookup returned invalid result:', users);
                return done(null, false, { message: 'User not found' });
            }
            const user = users[0];
            if (!user) {
                console.log('[Auth] User not found:', email);
                return done(null, false, { message: 'User not found' });
            }
            console.log('[Auth] Found user object:', {
                id: user.id,
                email: user.email,
                hasPassword: !!user.password,
                passwordLength: user.password?.length,
            });
            console.log('[Auth] Attempting password comparison');
            const isValid = await comparePasswords(password, user.password || '');
            console.log('[Auth] Password comparison result:', isValid);
            if (!isValid) {
                console.log('[Auth] Invalid password for user:', email);
                return done(null, false, { message: 'Invalid password' });
            }
            // Remove password before serializing
            const { password: _, ...userWithoutPassword } = user;
            console.log('[Auth] Authentication successful for user:', email);
            return done(null, userWithoutPassword);
        }
        catch (error) {
            console.error('[Auth] Authentication error (DETAILED):', error);
            // Log additional details about the error
            if (error instanceof Error) {
                console.error('[Auth] Error name:', error.name);
                console.error('[Auth] Error message:', error.message);
                console.error('[Auth] Error stack:', error.stack);
            }
            return done(error);
        }
    }));
    passport_1.default.serializeUser((user, done) => {
        console.log('[Auth] Serializing user:', user.id);
        done(null, user.id);
    });
    passport_1.default.deserializeUser(async (id, done) => {
        try {
            console.log('[Auth] Deserializing user:', id);
            // Using Neon-optimized retry logic for this critical operation
            const result = await executeWithNeonRetry(async (client) => {
                const query = `SELECT * FROM users WHERE id = $1 LIMIT 1`;
                const queryResult = await client.query(query, [id]);
                return queryResult.rows;
            });
            if (!result || result.length === 0) {
                console.log('[Auth] User not found during deserialization:', id);
                return done(null, false);
            }
            const user = result[0];
            done(null, user);
        }
        catch (error) {
            console.error('[Auth] Deserialization error:', error);
            done(error);
        }
    });
    app.post("/api/login", (req, res, next) => {
        console.log('[Auth] Processing login request');
        console.log('[Auth] Login request body:', {
            email: req.body.email,
            hasPassword: !!req.body.password,
            passwordLength: req.body.password?.length
        });
        passport_1.default.authenticate('local', async (err, user, info) => {
            if (err) {
                console.error('[Auth] Login error:', err);
                return next(err);
            }
            if (!user) {
                console.log('[Auth] Login failed:', info?.message);
                return res.status(401).json({ message: info?.message || 'Authentication failed' });
            }
            req.login(user, async (loginErr) => {
                if (loginErr) {
                    console.error('[Auth] Session creation error:', loginErr);
                    return next(loginErr);
                }
                try {
                    // Generate refresh token
                    const refreshToken = await (0, token_1.generateRefreshToken)(user.id);
                    // Send refresh token as HTTP-only cookie
                    res.cookie('refresh_token', refreshToken, {
                        httpOnly: true,
                        secure: app.get('env') === 'production',
                        sameSite: 'strict',
                        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
                    });
                    console.log('[Auth] Login successful for user:', user.id);
                    res.json(user);
                }
                catch (error) {
                    console.error('[Auth] Refresh token generation error:', error);
                    next(error);
                }
            });
        })(req, res, next);
    });
    app.post("/api/refresh", async (req, res, next) => {
        try {
            const refreshToken = req.cookies.refresh_token;
            if (!refreshToken) {
                throw new AuthError("No refresh token provided", "REFRESH_TOKEN_MISSING");
            }
            const userId = await (0, token_1.verifyRefreshToken)(refreshToken);
            if (!userId) {
                res.clearCookie('refresh_token');
                throw new AuthError("Invalid or expired refresh token", "REFRESH_TOKEN_INVALID");
            }
            // Look up user with Neon-optimized retry logic
            const userResult = await executeWithNeonRetry(async (client) => {
                const query = `SELECT * FROM users WHERE id = $1 LIMIT 1`;
                const queryResult = await client.query(query, [userId]);
                return queryResult.rows;
            });
            if (!userResult || userResult.length === 0) {
                res.clearCookie('refresh_token');
                throw new AuthError("User not found", "USER_NOT_FOUND");
            }
            const user = userResult[0];
            // Login the user
            req.login(user, async (err) => {
                if (err) {
                    throw new AuthError("Error logging in user", "LOGIN_ERROR");
                }
                // Generate new refresh token and revoke old one
                await (0, token_1.revokeRefreshToken)(refreshToken);
                const newRefreshToken = await (0, token_1.generateRefreshToken)(user.id);
                // Set new refresh token cookie
                res.cookie('refresh_token', newRefreshToken, {
                    httpOnly: true,
                    secure: app.get('env') === 'production',
                    sameSite: 'strict',
                    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
                });
                return res.json(user);
            });
        }
        catch (error) {
            next(error);
        }
    });
    app.post("/api/logout", (req, res, next) => {
        try {
            // Log complete request details to diagnose the issue
            console.log('[Auth] Logout Request DEBUG:', {
                isAuthenticated: req.isAuthenticated(),
                hasUser: !!req.user,
                userId: req.user?.id,
                cookies: req.cookies,
                hasCookieProperty: !!req.cookies,
                cookieIsObject: typeof req.cookies === 'object',
                sessionID: req.sessionID
            });
            // Always clear cookies first thing - regardless of other conditions
            res.clearCookie('refresh_token');
            res.clearCookie('sid');
            console.log('[Auth] Cookies cleared');
            // Only try to revoke token if user is authenticated
            if (req.isAuthenticated() && req.cookies && typeof req.cookies === 'object' && req.cookies.refresh_token) {
                // Wrap in try-catch to isolate any token revocation issues
                try {
                    console.log('[Auth] Found refresh token, attempting to revoke it');
                    (0, token_1.revokeRefreshToken)(req.cookies.refresh_token)
                        .catch(e => console.error('[Auth] Async token revocation error:', e));
                }
                catch (tokenError) {
                    console.error('[Auth] Error during token revocation:', tokenError);
                    // Continue despite errors
                }
            }
            else {
                console.log('[Auth] No valid refresh token to revoke');
            }
            // Skip session logout if user not authenticated
            if (!req.isAuthenticated()) {
                console.log('[Auth] User already logged out - skipping session termination');
                return res.status(200).json({ message: "Already logged out" });
            }
            // Log user out of session
            req.logout((logoutErr) => {
                if (logoutErr) {
                    console.error('[Auth] Session termination error:', logoutErr);
                }
                else {
                    console.log('[Auth] Session terminated successfully');
                }
                // Always return 200 to client
                return res.status(200).json({
                    message: "Logged out successfully",
                    // Include debug info in development
                    debug: process.env.NODE_ENV !== 'production' ? {
                        hadLogoutError: !!logoutErr,
                        cookiesCleared: true
                    } : undefined
                });
            });
        }
        catch (error) {
            console.error('[Auth] Unexpected logout error:', error);
            // Still try to send success response to client
            return res.status(200).json({
                message: "Logout attempted with errors",
                debug: process.env.NODE_ENV !== 'production' ? {
                    error: error instanceof Error ? error.message : String(error)
                } : undefined
            });
        }
    });
    // Add a debug endpoint to check cookies (development only)
    if (process.env.NODE_ENV !== 'production') {
        app.get("/api/debug/auth", (req, res) => {
            res.json({
                isAuthenticated: req.isAuthenticated(),
                hasUser: !!req.user,
                userId: req.user?.id,
                cookies: req.cookies ? {
                    hasRefreshToken: 'refresh_token' in req.cookies,
                    hasSid: 'sid' in req.cookies,
                    // Don't reveal actual tokens
                    cookieKeys: Object.keys(req.cookies)
                } : null,
                session: {
                    exists: !!req.session,
                    id: req.sessionID
                }
            });
        });
        // Add a database connectivity check endpoint
        app.get("/api/debug/db", async (req, res) => {
            try {
                console.log('[Debug] Testing database connection');
                // Test with a simple query
                const startTime = Date.now();
                const result = await db.execute((0, drizzle_orm_1.sql) `SELECT NOW() as time`);
                const duration = Date.now() - startTime;
                console.log('[Debug] Database query successful', result);
                // Fix the type issue with explicit type assertion
                const dbResult = result;
                res.json({
                    status: 'success',
                    message: 'Database connection successful',
                    dbTimeCheck: dbResult[0]?.time,
                    queryDurationMs: duration
                });
            }
            catch (error) {
                console.error('[Debug] Database connection test failed:', error);
                let errorDetails = { message: 'Unknown error' };
                if (error instanceof Error) {
                    errorDetails = {
                        message: error.message,
                        name: error.name,
                        stack: error.stack
                    };
                }
                res.status(500).json({
                    status: 'error',
                    message: 'Database connection test failed',
                    error: errorDetails
                });
            }
        });
        // Add a specific user lookup endpoint for debugging
        app.get("/api/debug/user/:email", async (req, res) => {
            try {
                const email = req.params.email;
                console.log('[Debug] Looking up user by email:', email);
                if (!email) {
                    return res.status(400).json({ error: 'Email parameter required' });
                }
                const users = await getUserByEmail(email);
                const user = users?.[0];
                if (!user) {
                    return res.status(404).json({
                        message: 'User not found',
                        searchedEmail: email,
                        isAuthenticated: req.isAuthenticated()
                    });
                }
                // Return sanitized user data (no password)
                const { password, ...userData } = user;
                res.json({
                    message: 'User found',
                    user: userData,
                    authCheck: {
                        isAuthenticated: req.isAuthenticated(),
                        currentUserId: req.user?.id
                    }
                });
            }
            catch (error) {
                console.error('[Debug] User lookup error:', error);
                let errorDetails = { message: 'Unknown error' };
                if (error instanceof Error) {
                    errorDetails = {
                        message: error.message,
                        name: error.name,
                        stack: error.stack
                    };
                }
                res.status(500).json({
                    status: 'error',
                    message: 'User lookup failed',
                    error: errorDetails
                });
            }
        });
        // Add this endpoint near the other debug endpoints
        app.get("/api/debug/auth-status", (req, res) => {
            const debug = process.env.NODE_ENV !== 'production';
            const isAuthenticated = req.isAuthenticated();
            console.log("[Auth] Debug endpoint - Auth status:", {
                isAuthenticated: isAuthenticated,
                hasSessionCookie: !!req.cookies?.sid,
                hasRefreshToken: !!req.cookies?.refresh_token,
                sessionID: req.sessionID
            });
            // Return safe information about token status without exposing the tokens themselves
            return res.json({
                isAuthenticated: isAuthenticated,
                hasSessionCookie: !!req.cookies?.sid,
                hasRefreshToken: !!req.cookies?.refresh_token,
                sessionID: debug ? req.sessionID : undefined // Only include in dev mode
            });
        });
    }
    app.get("/api/auth/user", (req, res) => {
        console.log('[Auth] Processing /api/auth/user request');
        console.log('[Auth] Request authentication state:', {
            isAuthenticated: req.isAuthenticated(),
            hasUser: !!req.user,
            sessionID: req.sessionID
        });
        if (!req.isAuthenticated()) {
            console.log('[Auth] Unauthenticated user session');
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User not authenticated'
            });
        }
        console.log('[Auth] Returning user session data:', {
            id: req.user?.id,
            email: req.user?.email,
            company_id: req.user?.company_id
        });
        res.json(req.user);
    });
    app.get("/api/user", (req, res) => {
        if (!req.isAuthenticated()) {
            console.log('[Auth] Unauthenticated user session');
            return res.sendStatus(401);
        }
        console.log('[Auth] Returning user session data');
        res.json(req.user);
    });
    app.post("/api/auth/test-password", async (req, res) => {
        try {
            const { password } = req.body;
            if (!password) {
                return res.status(400).json({ error: "Password required" });
            }
            console.log('[Auth] Testing password hashing');
            const hashedPassword = await hashPassword(password);
            console.log('[Auth] Test hash generated:', {
                hashLength: hashedPassword.length,
                startsWithBcrypt: hashedPassword.startsWith('$2b$')
            });
            const isValid = await comparePasswords(password, hashedPassword);
            console.log('[Auth] Test comparison result:', isValid);
            res.json({
                success: true,
                hashLength: hashedPassword.length,
                startsWithBcrypt: hashedPassword.startsWith('$2b$'),
                comparisonResult: isValid
            });
        }
        catch (error) {
            console.error('[Auth] Test endpoint error:', error);
            res.status(500).json({ error: "Password test failed" });
        }
    });
    // Define health check endpoint for both versioned and non-versioned paths
    app.get("/api/health", (req, res) => {
        console.log('[Auth] Health check request received');
        res.json({ status: 'ok' });
    });
    // Add versioned endpoint for health check
    app.get("/api/v1/health", (req, res) => {
        console.log('[Auth] Health check request received (versioned)');
        res.json({ status: 'ok' });
    });
    console.log('[Auth] Authentication setup completed');
}
