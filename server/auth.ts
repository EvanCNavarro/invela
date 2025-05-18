import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type SelectUser } from "@db/schema";
import { db, pool } from "@db";
import { eq } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);
const PostgresSessionStore = connectPg(session);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Securely compares a supplied password with a stored password hash
 * Uses a constant-time comparison to prevent timing attacks
 * 
 * @param supplied - The password provided by the user during login
 * @param stored - The hashed password stored in the database (format: "hash.salt")
 * @returns boolean indicating if passwords match
 */
async function comparePasswords(supplied: string, stored: string) {
  try {
    // Split the stored password into hash and salt components
    const [hashed, salt] = stored.split(".");
    
    if (!hashed || !salt) {
      console.warn("Password comparison failed: Invalid password format", { 
        hasHash: !!hashed, 
        hasSalt: !!salt 
      });
      return false;
    }
    
    // Convert stored hash to buffer
    const hashedBuf = Buffer.from(hashed, "hex");
    
    // Hash the supplied password with the same salt
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    // Use constant-time comparison to prevent timing attacks
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Password comparison error:", error);
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
    try {
      // Log registration attempt (without sensitive data)
      console.log('[Auth] Registration attempt for email:', req.body.email);
      
      // Validate the incoming request body against our schema
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        console.warn('[Auth] Registration validation failed:', error.toString());
        return res.status(400).send(error.toString());
      }

      // Check if user already exists
      const [existingUser] = await getUserByEmail(result.data.email);
      if (existingUser) {
        console.warn('[Auth] Registration failed - email already exists:', result.data.email);
        return res.status(400).send("Email already exists");
      }

      // Hash the password and create the user
      const hashedPassword = await hashPassword(result.data.password);
      
      // Insert user into database
      const [user] = await db
        .insert(users)
        .values({
          ...result.data,
          password: hashedPassword,
        })
        .returning();

      console.log('[Auth] User registered successfully:', user.id);

      // Log the user in automatically
      req.login(user, (err) => {
        if (err) {
          console.error('[Auth] Error logging in after registration:', err);
          return next(err);
        }
        
        // Respond with the user data (excluding password)
        const { password, ...userData } = user;
        res.status(201).json(userData);
      });
    } catch (error) {
      console.error('[Auth] Registration error:', error);
      res.status(500).send('An error occurred during registration. Please try again.');
    }
  });

  app.post("/api/login", (req, res, next) => {
    // Log login attempt (without password)
    console.log('[Auth] Login attempt for email:', req.body.email);
    
    passport.authenticate('local', (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        console.error('[Auth] Login error:', err);
        return next(err);
      }
      
      if (!user) {
        console.warn('[Auth] Login failed for email:', req.body.email);
        return res.status(401).send('Invalid email or password');
      }
      
      // Log the user in
      req.login(user, (loginErr: Error | null) => {
        if (loginErr) {
          console.error('[Auth] Session creation error:', loginErr);
          return next(loginErr);
        }
        
        console.log('[Auth] Login successful for user:', user.id);
        
        // Return the user object (excluding password)
        const { password, ...userData } = user as (Express.User & { password: string });
        res.status(200).json(userData);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).send('Not logged in');
    }
    
    // Log logout attempt
    const userId = req.user?.id;
    console.log('[Auth] Logout attempt for user:', userId);
    
    req.logout((err: Error | null) => {
      if (err) {
        console.error('[Auth] Logout error:', err);
        return next(err);
      }
      
      // Clear the session
      req.session.destroy((sessionErr: Error | null) => {
        if (sessionErr) {
          console.error('[Auth] Session destruction error:', sessionErr);
          // Continue anyway, as the authentication is already cleared
        }
        
        console.log('[Auth] User logged out successfully:', userId);
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        console.log('[Auth] Unauthenticated request to /api/user');
        return res.sendStatus(401);
      }
      
      // Return user data without the password
      const user = req.user;
      if (!user) {
        console.error('[Auth] No user data found for authenticated session');
        return res.status(500).send('Session error');
      }
      
      // Remove sensitive data before sending the response
      const { password, ...userData } = user as (Express.User & { password: string });
      
      console.log('[Auth] User data requested for user:', user.id);
      res.json(userData);
    } catch (error: unknown) {
      // Safely log error details
      if (error instanceof Error) {
        console.error('[Auth] Error in /api/user route:', error.message);
      } else {
        console.error('[Auth] Unknown error in /api/user route:', error);
      }
      
      res.status(500).send('An error occurred');
    }
  });
}