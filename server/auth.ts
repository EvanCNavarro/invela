import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcrypt";
import { users, insertUserSchema, type SelectUser } from "@db/schema";
import { db, pool } from "@db";
import { eq } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";

/**
 * Authentication system logging utility
 * Helps with debugging auth-related issues
 */
const authLogger = {
  info: (message: string, meta?: any) => {
    console.log(`[AuthService] ${message}`, meta || '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[AuthService] ${message}`, meta || '');
  },
  error: (message: string, meta?: any) => {
    console.error(`[AuthService] ${message}`, meta || '');
  },
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AuthService:DEBUG] ${message}`, meta || '');
    }
  }
};

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);
const PostgresSessionStore = connectPg(session);

/**
 * Hash a password using the application's current preferred method (bcrypt)
 * 
 * @param password - The plaintext password to hash
 * @returns The hashed password
 */
async function hashPassword(password: string) {
  // Use bcrypt for new passwords since it's what the application is using elsewhere
  authLogger.debug('Hashing password with bcrypt');
  return bcrypt.hash(password, 10); // Standard rounds for bcrypt
}

/**
 * Determines the format of a stored password hash
 * 
 * @param hash - The password hash to check
 * @returns The identified hash format
 */
function identifyPasswordFormat(hash: string): 'bcrypt' | 'scrypt' | 'unknown' {
  // Bcrypt hashes always start with $2a$, $2b$, or $2y$
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    return 'bcrypt';
  }
  
  // Scrypt hashes in our format contain a period separating hash and salt
  if (hash.includes('.')) {
    return 'scrypt';
  }
  
  // Unknown format
  return 'unknown';
}

/**
 * Securely compares a supplied password with a stored password hash
 * Supports multiple hash formats for backward compatibility
 * 
 * @param supplied - The password provided by the user during login
 * @param stored - The hashed password stored in the database
 * @returns boolean indicating if passwords match
 */
async function comparePasswords(supplied: string, stored: string) {
  try {
    // Identify the password hash format
    const hashFormat = identifyPasswordFormat(stored);
    authLogger.debug(`Password format identified as: ${hashFormat}`);
    
    // Handle based on the hash format
    switch (hashFormat) {
      case 'bcrypt':
        // Use bcrypt's built-in compare function
        return await bcrypt.compare(supplied, stored);
        
      case 'scrypt':
        // Handle scrypt format (our custom implementation)
        const [hashed, salt] = stored.split(".");
        
        if (!hashed || !salt) {
          authLogger.warn("Invalid scrypt format", { hasHash: !!hashed, hasSalt: !!salt });
          return false;
        }
        
        // Convert stored hash to buffer
        const hashedBuf = Buffer.from(hashed, "hex");
        
        // Hash the supplied password with the same salt
        const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
        
        // Use constant-time comparison to prevent timing attacks
        return timingSafeEqual(hashedBuf, suppliedBuf);
        
      default:
        // Unknown format, fail securely
        authLogger.warn("Unknown password hash format", { format: hashFormat });
        return false;
    }
  } catch (error) {
    authLogger.error("Password comparison error", { error });
    return false;
  }
}

async function getUserByEmail(email: string) {
  return db.select().from(users).where(eq(users.email, email)).limit(1);
}

async function getUserByUsername(username: string) {
  // In our system, username is actually email
  return getUserByEmail(username);
}

export function setupAuth(app: Express) {
  const store = new PostgresSessionStore({ pool, createTableIfMissing: true });
  
  // Use environment variable for session secret with a secure fallback
  const sessionSecret = process.env.SESSION_SECRET || 'development_session_secret_for_testing_purposes_only';
  
  // Log a warning if using the fallback secret in production
  if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
    console.warn('WARNING: Using fallback session secret in production environment!');
    console.warn('Please set SESSION_SECRET environment variable for better security.');
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax' // Help with CSRF protection
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    }, async (email, password, done) => {
      const [user] = await getUserByEmail(email);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      const error = fromZodError(result.error);
      return res.status(400).send(error.toString());
    }

    const [existingUser] = await getUserByEmail(result.data.email);
    if (existingUser) {
      return res.status(400).send("Email already exists");
    }

    const [user] = await db
      .insert(users)
      .values({
        ...result.data,
        password: await hashPassword(result.data.password),
      })
      .returning();

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}