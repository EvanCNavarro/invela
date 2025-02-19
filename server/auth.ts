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
    console.log('[Auth] Starting password hashing with bcrypt');
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    console.log('[Auth] Password hashed successfully, hash length:', hashedPassword.length);
    return hashedPassword;
  } catch (error) {
    console.error('[Auth] Password hashing error:', error);
    throw new Error('Failed to hash password');
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
    console.log('[Auth] - Stored hash format check:', stored.startsWith('$2b$'));

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

    const users = await db.select()
      .from(users)
      .where(sql`LOWER(${users.email}) = ${normalizedEmail}`)
      .limit(1);

    console.log('[Auth] User lookup result:', {
      found: users.length > 0,
      userId: users[0]?.id,
      hasPassword: !!users[0]?.password,
      passwordLength: users[0]?.password?.length
    });

    return users;
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
        const [user] = await getUserByEmail(email);

        if (!user) {
          console.log('[Auth] User not found:', email);
          return done(null, false, { message: 'Invalid email or password' });
        }

        const isValid = await comparePasswords(password, user.password);
        console.log('[Auth] Password validation result:', isValid);

        if (!isValid) {
          return done(null, false, { message: 'Invalid email or password' });
        }

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

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('[Auth] Deserializing user:', id);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log('[Auth] User not found during deserialization:', id);
        return done(null, false);
      }

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
        return res.status(401).json({ message: info?.message || 'Authentication failed' });
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
    req.logout((err) => {
      if (err) {
        console.error('[Auth] Logout error:', err);
        return next(err);
      }
      console.log('[Auth] Logout successful for user:', userId);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('[Auth] Unauthenticated user session');
      return res.sendStatus(401);
    }
    console.log('[Auth] Returning user session data');
    res.json(req.user);
  });

  console.log('[Auth] Authentication setup completed');
}