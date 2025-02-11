import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, companies, registrationSchema, type SelectUser } from "@db/schema";
import { db, pool } from "@db";
import { sql, eq } from "drizzle-orm";
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

async function comparePasswords(supplied: string, stored: string) {
  try {
    console.log('Debug - Comparing passwords:');
    console.log('Stored password:', stored);

    // Split stored password into hash and salt
    const [hashedStored, salt] = stored.split(".");

    if (!hashedStored || !salt) {
      console.error("Invalid stored password format - hashedStored:", !!hashedStored, "salt:", !!salt);
      return false;
    }

    // Generate hash from supplied password using same salt
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    const suppliedHex = suppliedBuf.toString('hex');

    console.log('Debug - Password comparison:');
    console.log('Salt:', salt);
    console.log('Stored hash:', hashedStored);
    console.log('Generated hash:', suppliedHex);

    // Compare the hashes directly as hex strings first (for debugging)
    const hexMatch = hashedStored === suppliedHex;
    console.log('Hex string comparison result:', hexMatch);

    // Also do timing-safe comparison of buffers
    const storedBuf = Buffer.from(hashedStored, 'hex');
    const timing = timingSafeEqual(suppliedBuf, storedBuf);
    console.log('Timing-safe buffer comparison result:', timing);

    return timing;
  } catch (error) {
    console.error("Password comparison error:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
    }
    return false;
  }
}

async function getUserByEmail(email: string) {
  const normalizedEmail = email.toLowerCase();
  return db.select()
    .from(users)
    .where(sql`LOWER(${users.email}) = ${normalizedEmail}`)
    .limit(1);
}

export function setupAuth(app: Express) {
  const store = new PostgresSessionStore({ pool, createTableIfMissing: true });
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID!,
    resave: false,
    saveUninitialized: false,
    store,
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          console.log('Debug - Login attempt for email:', email);
          const [user] = await getUserByEmail(email);

          if (!user) {
            console.log('Debug - No user found with email:', email);
            return done(null, false);
          }

          console.log('Debug - User found:', {
            id: user.id,
            email: user.email,
            passwordLength: user.password?.length
          });

          const isValid = await comparePasswords(password, user.password);
          console.log('Debug - Password validation result:', isValid);

          if (!isValid) {
            return done(null, false);
          }

          return done(null, user);
        } catch (error) {
          console.error('Debug - Login error:', error);
          console.error('Debug - Error stack:', error.stack);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return done(null, false);
      }

      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const result = registrationSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.toString() });
      }

      const normalizedEmail = result.data.email.toLowerCase();
      const [existingUser] = await getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Handle Invela users specially
      const isInvelaEmail = normalizedEmail.endsWith('@invela.com');

      // First check if company exists (case-insensitive)
      const [existingCompany] = await db.select()
        .from(companies)
        .where(sql`LOWER(${companies.name}) = ${result.data.company.toLowerCase()}`);

      let company;
      if (existingCompany) {
        company = existingCompany;
      } else {
        if (isInvelaEmail) {
          [company] = await db.select()
            .from(companies)
            .where(eq(companies.category, 'Invela'));

          if (!company) {
            return res.status(400).json({ error: "Invela company not found in the system" });
          }
        } else {
          [company] = await db.insert(companies)
            .values({
              name: result.data.company,
              category: result.data.company.toLowerCase().includes('bank') ? 'Bank' : 'FinTech',
              description: '',
            })
            .returning();
        }
      }

      const [user] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          fullName: result.data.fullName,
          firstName: result.data.firstName,
          lastName: result.data.lastName,
          password: await hashPassword(result.data.password),
          companyId: company.id,
          onboardingUserCompleted: isInvelaEmail,
        })
        .returning();

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error during registration" });
    }
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