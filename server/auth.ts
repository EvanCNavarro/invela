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

  const store = new PostgresSessionStore({
    pool,
    createTableIfMissing: true,
    tableName: 'session'
  });

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

  // Simple in-memory cache for user session data with reduced logging
  const userCache = new Map<number, { user: Express.User, timestamp: number }>();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  // Add counters to reduce excessive logging
  let totalCacheHits = 0;
  let lastLogTimestamp = Date.now();
  const LOG_INTERVAL = 60 * 1000; // Log summary every minute instead of individual hits
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const now = Date.now();
      const cachedData = userCache.get(id);
      
      // Use cached data if it exists and is not expired
      if (cachedData && (now - cachedData.timestamp) < CACHE_TTL) {
        totalCacheHits++;
        
        // Log a summary occasionally rather than individual hits
        if ((now - lastLogTimestamp) > LOG_INTERVAL) {
          console.log(`[Auth] Session cache summary - Hits in last minute: ${totalCacheHits}`);
          lastLogTimestamp = now;
          totalCacheHits = 0;
        }
        
        return done(null, cachedData.user);
      }
      
      // If not in cache or expired, query the database
      console.log('[Auth] Cache miss - Deserializing user:', id);
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
      const clearCompanyCache = () => {
        try {
          // Attempt to import the routes module to get the cache reference
          const routesModule = require('./routes');
          
          // Check if we can access the company cache
          if (routesModule && routesModule.companyCache) {
            if (companyId) {
              // First, try to clear the specific company
              console.log(`[Auth] Clearing company ${companyId} from cache during logout via routes module`);
              routesModule.companyCache.delete(companyId);
            }
            
            // IMPORTANT: Always clear the entire cache on logout to prevent session overlap issues
            console.log(`[Auth] Performing full company cache clear for session separation`);
            const cacheSize = routesModule.companyCache.size;
            routesModule.companyCache.clear();
            console.log(`[Auth] Cleared ${cacheSize} company entries from cache`);
            
            // Use the invalidation function if available - will broadcast WebSocket events
            if (routesModule.invalidateCompanyCache && companyId) {
              try {
                const invalidated = routesModule.invalidateCompanyCache(companyId);
                console.log(`[Auth] Cache invalidation result for company ${companyId}: ${invalidated}`);
              } catch (invalidateError) {
                console.warn('[Auth] Error invalidating company cache:', invalidateError);
              }
            }
            
            return true;
          }
          return false;
        } catch (importError) {
          console.warn('[Auth] Could not import routes module:', importError);
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
        const { broadcastMessage } = require('./services/websocket');
        if (broadcastMessage && typeof broadcastMessage === 'function') {
          console.log(`[Auth] Broadcasting cache invalidation WebSocket message`);
          broadcastMessage('cache_invalidation', {
            type: 'logout',
            userId: userId,
            companyId: companyId,
            timestamp: new Date().toISOString(),
            cache_invalidation: true
          });
        }
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