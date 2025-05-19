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

/**
 * Retrieve a user by their email address
 * Uses case-insensitive comparison for better user experience
 * 
 * @param email - The email address to search for
 * @returns Promise resolving to an array of matching users (typically 0 or 1)
 */
async function getUserByEmail(email: string) {
  // Convert email to lowercase for case-insensitive matching
  const normalizedEmail = email.toLowerCase();
  
  // Log the email normalization for debugging
  authLogger.debug('Looking up user with normalized email', { 
    original: email, 
    normalized: normalizedEmail,
    normalized_same: email === normalizedEmail 
  });
  
  return db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
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
      try {
        // Log the authentication attempt (without sensitive data)
        authLogger.info(`Authentication attempt for email: ${email}`);
        
        // Look up the user
        const [user] = await getUserByEmail(email);
        
        // If no user found with this email
        if (!user) {
          authLogger.warn(`No user found with email: ${email}`);
          return done(null, false);
        }
        
        // Attempt password comparison
        const passwordValid = await comparePasswords(password, user.password);
        
        if (!passwordValid) {
          authLogger.warn(`Invalid password for user: ${email}`);
          return done(null, false);
        }
        
        // Successfully authenticated
        authLogger.info(`User authenticated successfully: ${email}`);
        return done(null, user);
      } catch (error) {
        // Log any authentication errors
        authLogger.error('Authentication error', { error, email });
        return done(error);
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
    // Log registration attempt (with sanitized data)
    authLogger.info('Registration attempt received', {
      email: req.body.email,
      hasFirstName: !!req.body.first_name,
      hasLastName: !!req.body.last_name,
      hasFullName: !!req.body.full_name,
      hasCompanyId: !!req.body.company_id,
      hasCompanyName: !!req.body.company_name,
      hasInvitationCode: !!req.body.invitation_code
    });
    
    // Validate the request body against our schema
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      const error = fromZodError(result.error);
      authLogger.warn('Registration validation failed', {
        errorMessage: error.toString(),
        errorDetails: result.error.format()
      });
      return res.status(400).json({
        message: "Validation failed",
        details: error.toString()
      });
    }

    try {
      // Normalize email to lowercase for consistent storage
      const normalizedEmail = result.data.email.toLowerCase();
      
      // Log if email was normalized
      if (normalizedEmail !== result.data.email) {
        authLogger.debug('Email normalized during registration', {
          original: result.data.email,
          normalized: normalizedEmail
        });
      }
      
      // Check for existing user with this email (using our case-insensitive function)
      const [existingUser] = await getUserByEmail(normalizedEmail);
      if (existingUser) {
        authLogger.warn('Registration failed - email already exists', { email: normalizedEmail });
        return res.status(400).json({
          message: "Email already exists",
          code: "EMAIL_EXISTS"
        });
      }
  
      // Handle company information
      // If company_name is provided but no company_id, we could look up or create the company
      // For now, we'll use the provided company_id or default to 1
      let companyId = result.data.company_id || 1;
  
      // Store user with normalized email
      const userData = {
        ...result.data,
        email: normalizedEmail, // Store normalized (lowercase) email
        password: await hashPassword(result.data.password),
        company_id: companyId
      };
      
      authLogger.info('Creating new user account', {
        email: normalizedEmail,
        companyId: companyId
      });
  
      // Create the user in the database
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      
      authLogger.info('User account created successfully', {
        userId: user.id,
        email: user.email
      });
  
      // Attempt to log the user in automatically
      req.login(user, (err) => {
        if (err) {
          // Log the login error but don't fail the registration
          authLogger.error('Auto-login after registration failed', {
            userId: user.id,
            email: user.email,
            error: err
          });
          
          // Return a special status code to indicate successful registration but failed login
          // The client can handle this gracefully
          return res.status(201).json({
            id: user.id,
            email: user.email,
            loginStatus: 'failed',
            message: 'Account created successfully, but automatic login failed. Please log in manually.'
          });
        }
        
        // Successfully registered and logged in
        authLogger.info('User registered and logged in successfully', {
          userId: user.id,
          email: user.email
        });
        
        res.status(201).json({
          ...user,
          loginStatus: 'success'
        });
      });
    } catch (error) {
      // Handle unexpected errors
      authLogger.error('Registration error', { error });
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    // Enhanced login endpoint with better error handling
    // Check if email was provided
    if (!req.body.email) {
      authLogger.warn("Login attempt without email");
      return res.status(400).json({
        message: "Email is required",
        code: "MISSING_EMAIL"
      });
    }
    
    // Log original vs. normalized email for debugging
    const normalizedEmail = req.body.email.toLowerCase();
    if (normalizedEmail !== req.body.email) {
      authLogger.debug("Email normalized during login", { 
        original: req.body.email, 
        normalized: normalizedEmail 
      });
    }
    
    // Update request body with normalized email to ensure case-insensitive matching
    req.body.email = normalizedEmail;
    
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        // If there's a server error
        authLogger.error("Login server error", { err });
        return res.status(500).json({
          message: "An unexpected error occurred. Please try again later.",
          code: "SERVER_ERROR"
        });
      }
      
      if (!user) {
        // Authentication failed
        authLogger.warn("Login failed", { 
          email: req.body.email,
          normalized: normalizedEmail,
          wasNormalized: normalizedEmail !== req.body.email,
          info: info || 'No additional info'
        });
        
        // Provide more specific error feedback
        return res.status(401).json({
          message: "Invalid email or password. Please check your credentials and try again.",
          code: "INVALID_CREDENTIALS"
        });
      }
      
      // Log user in (wrap in promise for async handling)
      req.login(user, (loginErr) => {
        if (loginErr) {
          authLogger.error("Session creation error", { 
            loginErr,
            userId: user.id,
            email: user.email
          });
          
          return res.status(500).json({
            message: "Could not create login session. Please try again.",
            code: "SESSION_ERROR",
            userId: user.id,  // Return user ID to help with troubleshooting
            loginStatus: 'failed'
          });
        }
        
        // Log success
        authLogger.info("Login successful", { 
          id: user.id, 
          email: user.email,
          originalEmail: req.body.email,
          wasNormalized: normalizedEmail !== req.body.original
        });
        
        // Return the user data with login status
        return res.status(200).json({
          ...user,
          loginStatus: 'success'
        });
      });
    })(req, res, next);
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