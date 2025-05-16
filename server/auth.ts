import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { users, companies, registrationSchema, type SelectUser } from "@db/schema";
import { db, pool } from "@db";
import { sql, eq } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";
import * as WebSocketService from "./services/websocket";
import { invalidateCompanyCache } from "./routes";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const SALT_ROUNDS = 10;
const PostgresSessionStore = connectPg(session);

async function hashPassword(password: string) {
  try {
    console.log('[Auth] Starting to hash password');
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    console.log('[Auth] Password hashed successfully:', {
      hashLength: hashedPassword.length,
      startsWithBcrypt: hashedPassword.startsWith('$2b$'),
      rounds: SALT_ROUNDS
    });
    return hashedPassword;
  } catch (error) {
    console.error('[Auth] Error hashing password:', error);
    throw error;
  }
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    if (!stored) {
      console.error("[Auth] No stored password provided");
      return false;
    }
    console.log('[Auth] Comparing passwords:');
    console.log('[Auth] - Stored hash length:', stored.length);
    console.log('[Auth] - Stored hash format check:', stored.startsWith('$2a$') || stored.startsWith('$2b$'));
    console.log('[Auth] - Supplied password length:', supplied.length);
    console.log('[Auth] - Stored hash:', stored);
    console.log('[Auth] - Supplied password (first 4 chars):', supplied.substring(0, 4));

    // Test the hash generation with the supplied password
    const testHash = await hashPassword(supplied);
    console.log('[Auth] - Test hash generated:', testHash);

    const isValid = await bcrypt.compare(supplied, stored);
    console.log('[Auth] Password comparison result:', isValid);
    return isValid;
  } catch (error) {
    console.error("[Auth] Password comparison error:", error);
    return false;
  }
}

async function getUserByEmail(email: string) {
  try {
    const normalizedEmail = email.toLowerCase();
    console.log('[Auth] Looking up user by email:', normalizedEmail);

    const [user] = await db.select()
      .from(users)
      .where(sql`LOWER(${users.email}) = ${normalizedEmail}`)
      .limit(1);

    console.log('[Auth] User lookup result:', {
      found: !!user,
      userId: user?.id,
      hasPassword: !!user?.password,
      passwordLength: user?.password?.length,
      passwordStart: user?.password?.substring(0, 4)
    });

    return [user];
  } catch (error) {
    console.error('[Auth] Error getting user by email:', error);
    throw error;
  }
}

export function setupAuth(app: Express) {
  console.log('[Auth] Setting up authentication...');

  // Create an in-memory session store as fallback when database session store fails
  // This is useful for development and allows the application to function even when
  // there are database connectivity issues
  let store;
  
  try {
    console.log('[Auth] Setting up PostgreSQL session store');
    // Use direct database connection string instead of pool object
    // This avoids compatibility issues with connect-pg-simple
    store = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
      },
      createTableIfMissing: true,
      tableName: 'session',
      // Add error handling for session store
      errorLog: (err) => console.error('[Session Store] Error:', err)
    });
    console.log('[Auth] PostgreSQL session store initialized successfully');
  } catch (error) {
    console.error('[Auth] Error setting up PostgreSQL session store, using in-memory store as fallback:', error);
    // When Neon DB connectivity fails, use in-memory session store as fallback
    // This allows the app to function even when the database is unavailable
    store = new session.MemoryStore();
  }

  const sessionSettings: session.SessionOptions = {
    store,
    secret: process.env.SESSION_SECRET || process.env.REPL_ID!,
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

  if (app.get('env') === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        console.log('[Auth] Login attempt for:', email);
        console.log('[Auth] Password received (first 4 chars):', password.substring(0, 4));

        const [user] = await getUserByEmail(email);

        if (!user) {
          console.log('[Auth] User not found:', email);
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Accept both $2a$ and $2b$ bcrypt formats
        if (!user.password || !(user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
          console.log('[Auth] Invalid stored password format:', {
            exists: !!user.password,
            format: user.password?.substring(0, 4)
          });
          return done(null, false, { message: 'Invalid password format' });
        }

        console.log('[Auth] Found user, checking password');
        const isValid = await comparePasswords(password, user.password);
        console.log('[Auth] Password validation result:', isValid);

        if (!isValid) {
          console.log('[Auth] Login failed: Invalid password');
          return done(null, false, { message: 'Invalid email or password' });
        }

        console.log('[Auth] Login successful for user:', user.id);
        return done(null, user);
      } catch (error) {
        console.error('[Auth] Login error:', error);
        return done(error);
      }
    }
  ));

  passport.serializeUser((user, done) => {
    console.log('[Auth] Serializing user:', user.id);
    done(null, user.id);
  });

  /**
   * Enhanced session cache with proper TTL and minimal database access
   * 
   * This implementation addresses excessive database queries by:
   * 1. Implementing a proper TTL-based cache for user data
   * 2. Using a request-based throttling mechanism to reduce deserializer calls
   * 3. Completely eliminating logging for normal cache operations
   * 4. Using a separate debugging flag for development troubleshooting
   */
  const userCache = new Map<number, { user: Express.User, timestamp: number }>();
  const CACHE_TTL = 30 * 60 * 1000; // 30 minutes - longer cache to reduce DB load
  
  // Request deduplication to prevent multiple deserializer calls in the same request cycle
  // This is the key improvement: we track recently processed user IDs to avoid duplicate processing
  const recentlyProcessed = new Set<number>();
  const DEDUPE_TTL = 2000; // 2 seconds to prevent duplicate deserializer calls
  
  // Debug mode flag - set to false in production
  const DEBUG_AUTH = process.env.NODE_ENV === 'development' && false; // disable even in dev by default
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      // Skip deserializing if this user was just processed (deduplication)
      if (recentlyProcessed.has(id)) {
        // Silent fast-path - no logging at all for recently processed users
        const cachedData = userCache.get(id);
        if (cachedData) {
          return done(null, cachedData.user);
        }
      }
      
      const now = Date.now();
      const cachedData = userCache.get(id);
      
      // Use cached data if it exists and is not expired
      if (cachedData && (now - cachedData.timestamp) < CACHE_TTL) {
        // Add to recently processed set with automatic cleanup
        recentlyProcessed.add(id);
        setTimeout(() => recentlyProcessed.delete(id), DEDUPE_TTL);
        
        // No logging for normal cache hits
        return done(null, cachedData.user);
      }
      
      // Cache miss or expired - query the database
      if (DEBUG_AUTH) console.log('[Auth] Cache miss - Deserializing user:', id);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log('[Auth] User not found during deserialization:', id);
        return done(null, false);
      }

      // Update the cache
      userCache.set(id, { user, timestamp: now });
      
      done(null, user);
    } catch (error) {
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

    passport.authenticate('local', (err: Error, user: Express.User, info: { message: string }) => {
      if (err) {
        console.error('[Auth] Login error:', err);
        return next(err);
      }
      if (!user) {
        console.log('[Auth] Login failed:', info?.message);
        
        // Provide a user-friendly error message
        let userFriendlyMessage = "We couldn't sign you in. Please check your email and password and try again.";
        
        // Only use specific error messages for specific known errors
        if (info?.message === "Invalid password format") {
          userFriendlyMessage = "There was a problem with your account. Please contact support.";
        }
        
        // Use plain text error response instead of JSON to avoid client-side JSON parsing issues
        return res.status(401).send(userFriendlyMessage);
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('[Auth] Session creation error:', loginErr);
          return next(loginErr);
        }
        console.log('[Auth] Login successful for user:', user.id);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    console.log('[Auth] Processing logout request');
    const userId = req.user?.id;
    const companyId = req.user?.company_id;
    
    // Clear user from cache before logout
    if (userId && userCache.has(userId)) {
      console.log(`[Auth] Clearing user ${userId} from cache during logout`);
      userCache.delete(userId);
    }
    
    // Clear company from cache
    try {
      // Try to get companyCache from routes module or the global scope
      // Since we now directly import invalidateCompanyCache, no need for complex logic
      const clearCompanyCache = () => {
        try {
          if (companyId) {
            // Clear the specific company
            console.log(`[Auth] Clearing company ${companyId} from cache during logout`);
            // Use the imported invalidate function
            const invalidated = invalidateCompanyCache(companyId);
            console.log(`[Auth] Cache invalidation result for company ${companyId}: ${invalidated}`);
          }
          return true;
        } catch (error) {
          console.warn('[Auth] Error invalidating company cache:', error);
          return false;
        }
      };
      
      // Try to clear the cache, log result
      const cleared = clearCompanyCache();
      if (!cleared) {
        console.log(`[Auth] No company cache found to clear during logout`);
      }
      
      // Broadcast WebSocket event to inform clients of cache invalidation
      try {
        console.log(`[Auth] Broadcasting cache invalidation WebSocket message`);
        WebSocketService.broadcastMessage('cache_invalidation', {
          type: 'logout',
          userId: userId,
          companyId: companyId,
          timestamp: new Date().toISOString(),
          cache_invalidation: true
        });
      } catch (broadcastError) {
        console.warn('[Auth] Error broadcasting cache invalidation:', broadcastError);
      }
    } catch (e) {
      console.warn('[Auth] Error during company cache clearing:', e);
    }
    
    req.logout((err) => {
      if (err) {
        console.error('[Auth] Logout error:', err);
        return next(err);
      }
      console.log('[Auth] Logout successful for user:', userId);
      
      // Completely destroy the session to ensure clean state
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error('[Auth] Session destruction error:', sessionErr);
        } else {
          console.log('[Auth] Session successfully destroyed');
        }
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    console.log('[Auth] Processing /api/auth/user request');
    console.log('[Auth] Request authentication state:', {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      sessionID: req.sessionID
    });

    if (!req.isAuthenticated()) {
      console.log('[Auth] Unauthenticated user session');
      // Use plain text error response for consistency
      return res.status(401).send('Your session has expired. Please sign in again.');
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
      // Use plain text error response for consistency
      return res.status(401).send("Your session has expired. Please sign in again.");
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
    } catch (error) {
      console.error('[Auth] Test endpoint error:', error);
      res.status(500).json({ error: "Password test failed" });
    }
  });

  console.log('[Auth] Authentication setup completed');
}