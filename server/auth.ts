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
    const [hashedStored, salt] = stored.split(".");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    const storedBuf = Buffer.from(hashedStored, "hex");
    return timingSafeEqual(storedBuf, suppliedBuf);
  } catch (error) {
    console.error("Password comparison error:", error);
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
          const [user] = await getUserByEmail(email);
          if (!user) {
            return done(null, false);
          }

          const isValid = await comparePasswords(password, user.password);
          if (!isValid) {
            return done(null, false);
          }

          return done(null, user);
        } catch (error) {
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
        // If user not found, return false instead of error
        return done(null, false);
      }

      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error);
    }
  });

  // Add email check endpoint
  app.post("/api/check-email", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ exists: false });
      }

      const [existingUser] = await getUserByEmail(email);
      return res.json(!!existingUser);
    } catch (error) {
      console.error("Email check error:", error);
      return res.status(500).json({ error: "Failed to check email" });
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
        // For Invela users, automatically set company to Invela
        if (isInvelaEmail) {
          [company] = await db.select()
            .from(companies)
            .where(eq(companies.category, 'Invela'));

          if (!company) {
            return res.status(400).json({ error: "Invela company not found in the system" });
          }
        } else {
          // For other users, create their company as specified
          [company] = await db.insert(companies)
            .values({
              name: result.data.company,
              category: result.data.company.toLowerCase().includes('bank') ? 'Bank' : 'FinTech',
              description: '',  // Optional fields can be updated later
            })
            .returning();
        }
      }

      // Create the user with the company ID and normalized email
      // For Invela users, automatically set onboardingCompleted to true
      const [user] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          fullName: result.data.fullName,
          firstName: result.data.firstName,
          lastName: result.data.lastName,
          password: await hashPassword(result.data.password),
          companyId: company.id,
          onboardingCompleted: isInvelaEmail, // Set to true for Invela users, false otherwise
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