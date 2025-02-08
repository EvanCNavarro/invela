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

    // Now both buffers should be the same length (64 bytes)
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

      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const result = registrationSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).send(error.toString());
      }

      const normalizedEmail = result.data.email.toLowerCase();
      const [existingUser] = await getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).send("Email already registered");
      }

      // First check if company exists (case-insensitive)
      const [existingCompany] = await db.select()
        .from(companies)
        .where(sql`LOWER(${companies.name}) = ${result.data.company.toLowerCase()}`);

      let company;
      if (existingCompany) {
        company = existingCompany;
      } else {
        // Determine company type and category based on the company name
        let type, category;
        const companyNameLower = result.data.company.toLowerCase();

        if (companyNameLower === 'invela') {
          // Check if a System Creator company already exists
          const [systemCreator] = await db.select()
            .from(companies)
            .where(eq(companies.type, 'SYSTEM_CREATOR'));

          if (systemCreator) {
            return res.status(400).send("System Creator company already exists");
          }
          type = 'SYSTEM_CREATOR';
          category = 'INVELA';
        } else {
          // For new companies, determine type based on whether they're a bank
          const isBank = companyNameLower.includes('bank') ||
                        companyNameLower.includes('banking') ||
                        companyNameLower.includes('financial') ||
                        companyNameLower.includes('credit union');

          if (isBank) {
            type = 'WHITE_LABEL';
            category = 'BANK';
          } else {
            type = 'THIRD_PARTY';
            category = 'FINTECH';
          }
        }

        // Create new company
        [company] = await db.insert(companies)
          .values({
            name: result.data.company,
            type,
            category,
            description: '',  // Optional fields can be updated later
          })
          .returning();
      }

      // Then create the user with the company ID and normalized email
      const [user] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          fullName: result.data.fullName,
          firstName: result.data.firstName,
          lastName: result.data.lastName,
          password: await hashPassword(result.data.password),
          companyId: company.id,
        })
        .returning();

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).send("Internal server error during registration");
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