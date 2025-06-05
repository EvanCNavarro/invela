/**
 * Neon Connection Service
 * 
 * A specialized connection service for Neon PostgreSQL that handles:
 * - Single connection pooling to prevent rate limits
 * - Rate limit detection and smart retries
 * - Connection state tracking
 * - Automatic recovery from failures
 * 
 * Designed specifically for Neon's serverless architecture and its unique
 * control plane rate limiting behavior.
 */

import { Pool, PoolClient } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

// Create a dedicated logger for connection-related events
const connLogger = logger.child({ module: 'NeonConnectionService' });

// Sleep utility function for delays
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Connection settings optimized for Neon PostgreSQL
const CONNECTION_SETTINGS = {
  // Keep only a single connection to prevent rate limits
  POOL_SIZE: 1,
  
  // Very long idle timeout to prevent recycling connections
  IDLE_TIMEOUT_MS: 600000, // 10 minutes
  
  // Long connection timeout for slow connections
  CONNECTION_TIMEOUT_MS: 180000, // 3 minutes
  
  // Never exit on idle to maintain persistent connection
  ALLOW_EXIT_ON_IDLE: false,
  
  // Retry settings
  MAX_RETRIES: 10,
  MIN_RETRY_DELAY_MS: 2000,
  MAX_RETRY_DELAY_MS: 30000,
  
  // Rate limit detection
  RATE_LIMIT_BACKOFF_MS: 15000,
};

/**
 * Singleton connection manager for Neon PostgreSQL
 */
class NeonConnectionService {
  private static instance: NeonConnectionService;
  private pool: Pool | null = null;
  private isRateLimited = false;
  private rateLimitBackoffUntil = 0;
  private lastErrorTime = 0;
  private consecutiveErrors = 0;
  
  // Singleton constructor
  private constructor() {
    connLogger.info('Initializing Neon Connection Service');
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): NeonConnectionService {
    if (!NeonConnectionService.instance) {
      NeonConnectionService.instance = new NeonConnectionService();
    }
    return NeonConnectionService.instance;
  }
  
  /**
   * Initialize database connection pool
   */
  public async initialize(connectionString: string = process.env.DATABASE_URL || ''): Promise<void> {
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    if (this.pool) {
      connLogger.info('Connection pool already initialized');
      return;
    }
    
    connLogger.info('Creating minimal connection pool for Neon PostgreSQL');
    
    try {
      // Create minimal pool to avoid rate limits
      this.pool = new Pool({
        connectionString,
        max: CONNECTION_SETTINGS.POOL_SIZE,
        idleTimeoutMillis: CONNECTION_SETTINGS.IDLE_TIMEOUT_MS,
        connectionTimeoutMillis: CONNECTION_SETTINGS.CONNECTION_TIMEOUT_MS,
        allowExitOnIdle: CONNECTION_SETTINGS.ALLOW_EXIT_ON_IDLE,
      });
      
      // Set up event handlers
      this.setupEventHandlers();
      
      // Test connection
      await this.testConnection();
      
      connLogger.info('Connection pool initialized successfully');
    } catch (error) {
      connLogger.error('Failed to initialize connection pool', error);
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * Setup event handlers for the connection pool
   */
  private setupEventHandlers(): void {
    if (!this.pool) return;
    
    this.pool.on('error', (err) => {
      connLogger.error('Pool error event:', err);
      this.handleError(err);
    });
    
    this.pool.on('connect', () => {
      connLogger.info('New client connected to the pool');
      // Reset consecutive errors on successful connection
      this.consecutiveErrors = 0;
    });
  }
  
  /**
   * Detect if an error is a Neon rate limit error
   */
  private isRateLimitError(error: any): boolean {
    return !!(
      error?.message?.includes('Control plane request failed') ||
      error?.code === 'XX000' ||
      (error?.severity === 'ERROR' && error?.code === '08006') ||
      error?.message?.includes('timeout exceeded when trying to connect')
    );
  }
  
  /**
   * Handle connection errors with special handling for rate limits
   */
  private handleError(error: any): void {
    this.lastErrorTime = Date.now();
    this.consecutiveErrors++;
    
    // Detect Neon rate limit errors
    if (this.isRateLimitError(error)) {
      const backoffTime = Math.min(
        CONNECTION_SETTINGS.MAX_RETRY_DELAY_MS,
        CONNECTION_SETTINGS.MIN_RETRY_DELAY_MS * Math.pow(2, this.consecutiveErrors - 1)
      );
      
      this.isRateLimited = true;
      this.rateLimitBackoffUntil = Date.now() + backoffTime;
      
      connLogger.warn(`Rate limit detected, backing off for ${backoffTime}ms`);
      
      // Schedule automatic reset of rate limit flag
      setTimeout(() => {
        this.isRateLimited = false;
        connLogger.info('Rate limit backoff period ended');
      }, backoffTime);
    }
  }
  
  /**
   * Test database connection
   */
  private async testConnection(): Promise<boolean> {
    try {
      const client = await this.getClient();
      try {
        await client.query('SELECT 1 as test');
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      connLogger.error('Connection test failed:', error);
      this.handleError(error);
      return false;
    }
  }
  
  /**
   * Get a client from the pool with rate limit awareness
   */
  public async getClient(): Promise<PoolClient> {
    // Initialize pool if needed
    if (!this.pool) {
      await this.initialize();
    }
    
    // Handle rate limit backoff
    if (this.isRateLimited) {
      const waitTime = this.rateLimitBackoffUntil - Date.now();
      if (waitTime > 0) {
        connLogger.info(`Waiting for rate limit backoff to expire (${waitTime}ms)`);
        await sleep(waitTime);
      }
      this.isRateLimited = false;
    }
    
    if (!this.pool) {
      throw new Error('Connection pool not initialized');
    }
    
    try {
      return await this.pool.connect();
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * Execute a query with automatic retry logic
   */
  public async executeQuery<T = any>(
    queryFn: (client: PoolClient) => Promise<T>,
    retries = 3
  ): Promise<T> {
    let attempt = 0;
    let lastError: any = null;
    
    while (attempt < retries) {
      let client: PoolClient | null = null;
      
      try {
        client = await this.getClient();
        const result = await queryFn(client);
        
        // Success - reset error counter
        this.consecutiveErrors = 0;
        
        return result;
      } catch (error) {
        lastError = error;
        attempt++;
        
        // Log differently based on error type
        if (this.isRateLimitError(error)) {
          connLogger.warn(`Query failed due to rate limit, attempt ${attempt}/${retries}`);
        } else {
          connLogger.error(`Query failed, attempt ${attempt}/${retries}:`, error);
        }
        
        this.handleError(error);
        
        // Apply exponential backoff before retrying
        const backoffTime = Math.min(
          CONNECTION_SETTINGS.MAX_RETRY_DELAY_MS,
          CONNECTION_SETTINGS.MIN_RETRY_DELAY_MS * Math.pow(2, attempt)
        );
        
        connLogger.info(`Retrying in ${backoffTime}ms...`);
        await sleep(backoffTime);
      } finally {
        if (client) {
          try {
            client.release();
          } catch (releaseError) {
            connLogger.error('Error releasing client:', releaseError);
          }
        }
      }
    }
    
    connLogger.error(`Query failed after ${retries} attempts`);
    throw lastError;
  }
  
  /**
   * Execute a raw SQL query
   */
  public async executeRawQuery<T = any>(
    query: string,
    params: any[] = []
  ): Promise<T> {
    return this.executeQuery(async (client) => {
      // Handle parameterized queries safely
      if (params.length > 0) {
        const result = await client.query(query, params);
        return result.rows as unknown as T;
      } else {
        const result = await client.query(query);
        return result.rows as unknown as T;
      }
    });
  }
  
  /**
   * Get a Drizzle ORM instance for database operations
   * Use this for short-lived operations, as the client is released when done
   */
  public async withDrizzle<T>(
    callback: (db: ReturnType<typeof drizzle>) => Promise<T>
  ): Promise<T> {
    return this.executeQuery(async (client) => {
      const db = drizzle(client);
      return await callback(db);
    });
  }
  
  /**
   * Check if database connection is healthy
   */
  public async isHealthy(): Promise<boolean> {
    if (this.isRateLimited) {
      return false;
    }
    
    try {
      return await this.testConnection();
    } catch (error) {
      connLogger.error('Health check failed:', error);
      return false;
    }
  }
  
  /**
   * Shutdown the connection manager
   */
  public async shutdown(): Promise<void> {
    connLogger.info('Shutting down connection manager');
    
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    
    connLogger.info('Connection manager shut down successfully');
  }
}

// Export singleton instance
export const neonConnection = NeonConnectionService.getInstance();
export default neonConnection;