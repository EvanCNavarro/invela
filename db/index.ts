import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

const MAX_CONNECTION_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const POOL_SIZE = 5; // Reduced from 10 to minimize excessive connections
const IDLE_TIMEOUT = 30000; // Increased from 10000 to reduce connection churn
const MAX_USES = 5000; // Reduced from 7500 for better connection lifecycle

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure the pool with optimized settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: POOL_SIZE,
  idleTimeoutMillis: IDLE_TIMEOUT,
  connectionTimeoutMillis: 30000,
  maxUses: MAX_USES,
});

let retryCount = 0;

// Enhanced error handling for the connection pool
pool.on('error', (err, client) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Database pool error:`, {
    message: err.message,
    stack: err.stack,
  });

  // Attempt to reconnect if it's a connection error
  if (err.message.includes('connection') || err.message.includes('timeout')) {
    if (retryCount < MAX_CONNECTION_RETRIES) {
      retryCount++;
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount - 1);
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${retryCount}/${MAX_CONNECTION_RETRIES})`);

      setTimeout(async () => {
        try {
          await client.connect();
          console.log('Successfully reconnected to database');
          retryCount = 0;
        } catch (error) {
          const reconnectError = error as Error;
          console.error('Failed to reconnect:', reconnectError.message);
        }
      }, delay);
    } else {
      console.error('Maximum connection retry attempts reached');
    }
  }
});

// Reduced noise in connection monitoring
pool.on('connect', (client) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] New client connected to the pool`);
  retryCount = 0;
});

// Only log pool events in development
if (process.env.NODE_ENV === 'development') {
  pool.on('acquire', () => {
    console.debug('Client acquired from pool');
  });

  pool.on('remove', () => {
    console.debug('Client removed from pool');
  });
}

// Create the drizzle db instance with the configured pool
export const db = drizzle({ client: pool, schema });

// Import migrations
import { runMigrations } from './migrations';

// Graceful shutdown handler with improved error handling
async function handleShutdown(signal: string) {
  console.log(`Received ${signal}. Closing pool...`);
  try {
    await pool.end();
    console.log('Database pool closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error closing database pool:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Handle uncaught promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

// Create a simple migration tracker table if it doesn't exist
async function ensureMigrationTable() {
  try {
    // Check if the migration_status table exists
    const tableExistsResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'migration_status'
      );
    `);
    
    const tableExists = tableExistsResult.rows[0].exists;
    
    if (!tableExists) {
      console.log('Creating migration status tracking table');
      // Create the table if it doesn't exist
      await pool.query(`
        CREATE TABLE migration_status (
          id SERIAL PRIMARY KEY,
          last_run TIMESTAMP NOT NULL DEFAULT NOW(),
          version INTEGER NOT NULL,
          status VARCHAR(20) NOT NULL
        );
      `);
      
      // Insert initial record with version 0
      await pool.query(`
        INSERT INTO migration_status (version, status)
        VALUES (0, 'INITIAL');
      `);
      
      return { currentVersion: 0, needsMigration: true };
    } else {
      // Get the current migration version
      const versionResult = await pool.query(`
        SELECT version FROM migration_status
        ORDER BY id DESC LIMIT 1;
      `);
      
      const currentVersion = versionResult.rows[0]?.version || 0;
      return { currentVersion, needsMigration: currentVersion < 1 };
    }
  } catch (error) {
    console.error('Error checking migration status:', error);
    // Default to running migrations if we can't check
    return { currentVersion: 0, needsMigration: true };
  }
}

// Run migrations only if needed
(async () => {
  try {
    const { currentVersion, needsMigration } = await ensureMigrationTable();
    
    if (needsMigration) {
      console.log(`Running database migrations (current version: ${currentVersion})...`);
      await runMigrations();
      
      // Update the migration version
      await pool.query(`
        INSERT INTO migration_status (version, status)
        VALUES (1, 'COMPLETED');
      `);
      
      console.log('Database migrations completed successfully and version updated to 1');
    } else {
      console.log(`Database migrations already up to date (version: ${currentVersion})`);
    }
  } catch (error) {
    console.error('Failed to run migrations:', error);
  }
})();