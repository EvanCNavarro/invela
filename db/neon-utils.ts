import { Pool, PoolClient, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { setTimeout } from 'timers/promises';

// Configure Neon with WebSockets
neonConfig.webSocketConstructor = ws;

// Logging level configuration
type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'none';
let currentLogLevel: LogLevel = 'info';

// Configuration constants
export const NEON_CONFIG = {
  // Retry configuration
  MAX_RETRIES: 5,
  INITIAL_RETRY_DELAY_MS: 500, // Start with 500ms delay
  MAX_RETRY_DELAY_MS: 10000, // Max 10 seconds
  JITTER_FACTOR: 0.3, // Add randomness to avoid thundering herd
  
  // Connection pool settings - keeping minimal to avoid exceeding Neon's limits
  POOL_SIZE: 5, // Reduced pool size for Neon serverless
  IDLE_TIMEOUT_MS: 30000, // 30 seconds
  CONNECTION_TIMEOUT_MS: 30000, // 30 seconds
  MAX_USES: 5000, // Number of times a client can be used before being replaced
  
  // Operation timeouts
  QUERY_TIMEOUT_MS: 15000, // 15 seconds
};

/**
 * Set the log level for database operations
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
  logMessage('info', `Neon database log level set to: ${level}`);
}

/**
 * Log a message based on the current log level
 */
function logMessage(level: LogLevel, message: string, data?: any): void {
  const levels: Record<LogLevel, number> = {
    'debug': 0,
    'info': 1,
    'warn': 2,
    'error': 3,
    'none': 4
  };
  
  // Don't log if current level is higher than the message level
  if (levels[currentLogLevel] > levels[level]) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const prefix = `[NeonDB][${level.toUpperCase()}][${timestamp}]`;
  
  switch (level) {
    case 'error':
      console.error(`${prefix} ${message}`, data || '');
      break;
    case 'warn':
      console.warn(`${prefix} ${message}`, data || '');
      break;
    case 'info':
      console.info(`${prefix} ${message}`, data || '');
      break;
    case 'debug':
      console.debug(`${prefix} ${message}`, data || '');
      break;
  }
}

/**
 * Calculate exponential backoff time with jitter
 */
export function calculateBackoff(retryCount: number): number {
  // Base exponential backoff: initialDelay * 2^retryCount
  const expBackoff = NEON_CONFIG.INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
  
  // Apply max delay cap
  const cappedBackoff = Math.min(expBackoff, NEON_CONFIG.MAX_RETRY_DELAY_MS);
  
  // Add jitter: random value between 0 and jitterFactor * cappedBackoff
  const jitter = Math.random() * NEON_CONFIG.JITTER_FACTOR * cappedBackoff;
  
  // Final backoff is capped value plus jitter
  return cappedBackoff + jitter;
}

/**
 * Create a configured Neon pool with optimal settings
 */
export function createNeonPool(connectionString: string): Pool {
  if (!connectionString) {
    throw new Error('DATABASE_URL must be set');
  }

  logMessage('info', 'Creating Neon database pool', {
    poolSize: NEON_CONFIG.POOL_SIZE,
    idleTimeout: NEON_CONFIG.IDLE_TIMEOUT_MS,
    connectionTimeout: NEON_CONFIG.CONNECTION_TIMEOUT_MS,
    maxUses: NEON_CONFIG.MAX_USES
  });

  const pool = new Pool({
    connectionString,
    max: NEON_CONFIG.POOL_SIZE,
    idleTimeoutMillis: NEON_CONFIG.IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: NEON_CONFIG.CONNECTION_TIMEOUT_MS,
    maxUses: NEON_CONFIG.MAX_USES,
  });
  
  // Set up event listeners for the pool
  pool.on('error', (err) => {
    logMessage('error', 'Pool error occurred', err);
  });
  
  pool.on('connect', () => {
    logMessage('debug', 'New client connected to the pool');
  });
  
  return pool;
}

/**
 * Executes an operation with retry logic specifically designed for Neon serverless
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    retries?: number;
    onRetry?: (error: Error, attempt: number, delay: number) => void;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    retries = NEON_CONFIG.MAX_RETRIES,
    onRetry = (error, attempt, delay) => {
      logMessage(
        'warn',
        `Retry attempt ${attempt}/${retries} after error: ${error.message}. Retrying in ${Math.round(delay)}ms`
      );
    },
    shouldRetry = (error) => {
      // Retry on connection errors, timeout errors, and specific Neon errors
      return (
        error.message.includes('timeout') ||
        error.message.includes('connection') ||
        error.message.includes('too many connections') ||
        error.message.includes('rate limit') ||
        error.message.includes('socket hang up') ||
        error.message.includes('database is starting up') ||
        error.message.includes('failed to send') ||
        error.message.includes('Connection terminated')
      );
    },
  } = options;

  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const startTime = Date.now();
      const result = await operation();
      const duration = Date.now() - startTime;
      
      // Log successful query duration for potential performance tuning
      logMessage('debug', `Operation completed in ${duration}ms`, {
        attempt: attempt + 1,
        duration
      });
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      logMessage('error', `Operation failed on attempt ${attempt + 1}/${retries + 1}`, {
        error: lastError.message,
        stack: lastError.stack
      });
      
      // Don't retry on the last attempt or if we shouldn't retry this error
      if (attempt >= retries || !shouldRetry(lastError)) {
        throw lastError;
      }
      
      const delay = calculateBackoff(attempt);
      onRetry(lastError, attempt + 1, delay);
      
      // Wait before the next retry
      await setTimeout(delay);
    }
  }
  
  // This should never be reached due to the throw in the loop, but TypeScript needs it
  throw lastError;
}

/**
 * Executes a database query with retry logic specifically optimized for Neon
 */
export async function executeWithRetry<T>(
  pool: Pool,
  queryFn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  return withRetry(async () => {
    logMessage('debug', 'Acquiring connection from pool');
    const client = await pool.connect();
    try {
      logMessage('debug', 'Connection acquired, executing query function');
      return await queryFn(client);
    } finally {
      logMessage('debug', 'Releasing connection back to pool');
      client.release();
    }
  });
}

/**
 * Simpler database query execution with retry logic for common queries
 */
export async function queryWithRetry<T>(
  pool: Pool,
  queryText: string,
  params: any[] = []
): Promise<T> {
  logMessage('debug', 'Executing query with retry', {
    query: queryText,
    paramCount: params.length
  });
  
  return withRetry(async () => {
    const client = await pool.connect();
    try {
      const result = await client.query(queryText, params);
      logMessage('debug', 'Query completed successfully', {
        rowCount: result.rowCount
      });
      return result.rows as T;
    } finally {
      client.release();
    }
  });
}

/**
 * Handle graceful database pool shutdown
 */
export async function shutdownPool(pool: Pool): Promise<void> {
  try {
    logMessage('info', 'Closing database pool...');
    await pool.end();
    logMessage('info', 'Database pool closed successfully');
  } catch (error) {
    logMessage('error', 'Error closing database pool', error);
    throw error;
  }
} 