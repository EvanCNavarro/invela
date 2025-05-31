/**
 * Neon Connection Manager
 * 
 * A specialized connection manager for Neon PostgreSQL that handles:
 * - Proper connection pooling with intelligent reuse
 * - Connection state tracking and health monitoring
 * - Rate limit detection and circuit breaking
 * - Automatic connection recovery
 * 
 * This is designed to work with Neon's serverless architecture which has
 * different connection dynamics than traditional PostgreSQL.
 */

import { Pool, PoolClient } from 'pg';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { logger } from '../utils/logger';
import { sleep } from '../utils/sleep';

// Create a dedicated logger for connection-related events
const connLogger = logger.child({ module: 'NeonConnectionManager' });

// Rate limiting constants
const RATE_LIMIT_BACKOFF_MS = 15000; // 15 seconds
const MAX_RATE_LIMIT_RETRIES = 10;
const MIN_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

// Connection health monitoring - DISABLED to eliminate 60-second timer
const HEALTH_CHECK_INTERVAL_MS = 0; // DISABLED - was causing persistent 60-second batch update calls
const MAX_FAILED_HEALTH_CHECKS = 3;

// Circuit breaker settings
const CIRCUIT_OPEN_DURATION_MS = 30000; // 30 seconds
const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * Connection States
 */
enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RATE_LIMITED = 'rate_limited',
  CIRCUIT_OPEN = 'circuit_open',
  ERROR = 'error'
}

/**
 * Singleton connection manager for Neon PostgreSQL
 */
class NeonConnectionManager {
  private static instance: NeonConnectionManager;
  
  // Connection management
  private pool: Pool | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private lastConnectAttempt: number = 0;
  private consecutiveFailures: number = 0;
  private circuitBreakerTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  
  // Tracking for rate limits
  private rateLimitDetected: boolean = false;
  private rateLimitBackoffUntil: number = 0;
  
  // Singleton pattern
  private constructor() {
    connLogger.info('Initializing Neon Connection Manager');
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): NeonConnectionManager {
    if (!NeonConnectionManager.instance) {
      NeonConnectionManager.instance = new NeonConnectionManager();
    }
    return NeonConnectionManager.instance;
  }
  
  /**
   * Initialize the connection pool with minimal settings
   * to avoid hitting Neon rate limits
   */
  public async initialize(connectionString: string): Promise<void> {
    if (this.pool) {
      connLogger.warn('Connection pool already initialized');
      return;
    }
    
    if (this.state === ConnectionState.CONNECTING) {
      connLogger.warn('Connection already in progress');
      return;
    }
    
    this.state = ConnectionState.CONNECTING;
    logger.info('Creating connection pool');
    
    try {
      // Configure minimal pool to avoid rate limits
      this.pool = new Pool({
        connectionString,
        max: 1, // Strictly limit to single connection
        idleTimeoutMillis: 600000, // 10 minutes idle timeout
        connectionTimeoutMillis: 180000, // 3 minute connection timeout
        allowExitOnIdle: false, // Never exit on idle
      });
      
      // Set up event listeners
      this.setupPoolEventListeners();
      
      // Test connection
      await this.testConnection();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.state = ConnectionState.CONNECTED;
      logger.info('Connection pool initialized successfully');
    } catch (error) {
      this.state = ConnectionState.ERROR;
      this.handleConnectionError(error);
      throw error;
    }
  }
  
  /**
   * Setup event listeners for the connection pool
   */
  private setupPoolEventListeners(): void {
    if (!this.pool) return;
    
    this.pool.on('error', (err) => {
      logger.error('Pool error event:', err);
      this.handleConnectionError(err);
    });
    
    this.pool.on('connect', (client) => {
      logger.info('New client connected to the pool');
      
      client.on('error', (err) => {
        logger.error('Client error:', err);
        this.handleConnectionError(err);
      });
    });
  }
  
  /**
   * Test the database connection
   */
  private async testConnection(): Promise<boolean> {
    try {
      const client = await this.getClient();
      try {
        const result = await client.query('SELECT 1 as test');
        return result.rows.length > 0 && result.rows[0].test === 1;
      } finally {
        client.release();
      }
    } catch (error) {
      this.handleConnectionError(error);
      return false;
    }
  }
  
  /**
   * Start regular health checks
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    // Skip health monitoring if interval is disabled (set to 0)
    if (HEALTH_CHECK_INTERVAL_MS <= 0) {
      logger.info('Health check monitoring disabled');
      return;
    }
    
    this.healthCheckTimer = setInterval(async () => {
      logger.debug('Running connection health check');
      
      try {
        // Skip health check if we're already in a rate-limited state
        if (this.rateLimitDetected) {
          logger.info('Skipping health check - rate limited');
          return;
        }
        
        const isHealthy = await this.testConnection();
        
        if (isHealthy) {
          this.consecutiveFailures = 0;
          logger.debug('Health check passed');
        } else {
          this.consecutiveFailures++;
          logger.warn(`Health check failed (${this.consecutiveFailures}/${MAX_FAILED_HEALTH_CHECKS})`);
          
          if (this.consecutiveFailures >= MAX_FAILED_HEALTH_CHECKS) {
            logger.error('Too many failed health checks, recreating pool');
            await this.recreatePool();
          }
        }
      } catch (error) {
        logger.error('Error in health check:', error);
      }
    }, HEALTH_CHECK_INTERVAL_MS);
  }
  
  /**
   * Handle connection errors with special handling for rate limits
   */
  private handleConnectionError(error: any): void {
    this.consecutiveFailures++;
    
    // Detect Neon rate limit errors
    if (
      error?.message?.includes('Control plane request failed') ||
      error?.code === 'XX000' ||
      (error?.severity === 'ERROR' && error?.code === '08006')
    ) {
      logger.warn('Rate limit detected on Neon PostgreSQL connection');
      this.rateLimitDetected = true;
      this.state = ConnectionState.RATE_LIMITED;
      
      // Calculate backoff time with exponential backoff
      const backoffTime = Math.min(
        MAX_BACKOFF_MS,
        MIN_BACKOFF_MS * Math.pow(2, this.consecutiveFailures - 1)
      );
      
      this.rateLimitBackoffUntil = Date.now() + backoffTime;
      
      logger.warn(`Backing off for ${backoffTime}ms due to rate limiting`);
      
      // Schedule automatic retry after backoff
      setTimeout(() => {
        this.rateLimitDetected = false;
        this.state = ConnectionState.DISCONNECTED;
        logger.info('Rate limit backoff period ended');
      }, backoffTime);
    }
    
    // Implement circuit breaker pattern for persistent failures
    if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      this.openCircuitBreaker();
    }
  }
  
  /**
   * Open circuit breaker to prevent cascading failures
   */
  private openCircuitBreaker(): void {
    if (this.state === ConnectionState.CIRCUIT_OPEN) {
      return;
    }
    
    logger.warn(`Opening circuit breaker for ${CIRCUIT_OPEN_DURATION_MS}ms`);
    this.state = ConnectionState.CIRCUIT_OPEN;
    
    if (this.circuitBreakerTimer) {
      clearTimeout(this.circuitBreakerTimer);
    }
    
    this.circuitBreakerTimer = setTimeout(() => {
      logger.info('Circuit breaker timeout ended, resetting connection');
      this.closeCircuitBreaker();
    }, CIRCUIT_OPEN_DURATION_MS);
  }
  
  /**
   * Close circuit breaker and attempt reconnection
   */
  private async closeCircuitBreaker(): Promise<void> {
    logger.info('Closing circuit breaker');
    this.state = ConnectionState.DISCONNECTED;
    this.consecutiveFailures = 0;
    
    try {
      await this.recreatePool();
    } catch (error) {
      logger.error('Failed to recreate pool after circuit breaker reset:', error);
    }
  }
  
  /**
   * Recreate the connection pool
   */
  private async recreatePool(): Promise<void> {
    if (!this.pool) return;
    
    logger.info('Recreating connection pool');
    
    try {
      // End existing pool
      const oldPool = this.pool;
      this.pool = null;
      
      // Wait for old pool to end
      await oldPool.end();
      
      // The actual reconnection happens when the next query needs it
      this.state = ConnectionState.DISCONNECTED;
    } catch (error) {
      logger.error('Error ending old connection pool:', error);
    }
  }
  
  /**
   * Get a client from the pool with rate limit awareness
   */
  public async getClient(): Promise<PoolClient> {
    // Check if we're rate limited
    if (this.rateLimitDetected) {
      const waitTime = this.rateLimitBackoffUntil - Date.now();
      if (waitTime > 0) {
        logger.info(`Waiting for rate limit backoff: ${waitTime}ms remaining`);
        await sleep(waitTime);
      }
      this.rateLimitDetected = false;
    }
    
    // Check circuit breaker
    if (this.state === ConnectionState.CIRCUIT_OPEN) {
      throw new Error('Circuit breaker open - database connections temporarily disabled');
    }
    
    // Initialize pool if needed
    if (!this.pool && this.state !== ConnectionState.CONNECTING) {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is not set');
      }
      
      await this.initialize(connectionString);
    }
    
    // Get client from pool
    if (!this.pool) {
      throw new Error('Connection pool not initialized');
    }
    
    try {
      return await this.pool.connect();
    } catch (error) {
      this.handleConnectionError(error);
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
        
        // Success - reset failure count
        this.consecutiveFailures = 0;
        
        return result;
      } catch (error) {
        lastError = error;
        attempt++;
        
        // Don't log stack trace for rate limit errors
        if (
          error?.message?.includes('Control plane request failed') ||
          error?.code === 'XX000'
        ) {
          logger.warn(`Query failed due to rate limit, attempt ${attempt}/${retries}`);
        } else {
          logger.error(`Query failed, attempt ${attempt}/${retries}:`, error);
        }
        
        // Handle rate limiting separately
        this.handleConnectionError(error);
        
        // Apply backoff before retrying
        const backoffTime = Math.min(
          MAX_BACKOFF_MS,
          MIN_BACKOFF_MS * Math.pow(2, attempt)
        );
        
        logger.info(`Retrying in ${backoffTime}ms...`);
        await sleep(backoffTime);
      } finally {
        if (client) {
          try {
            client.release();
          } catch (releaseError) {
            logger.error('Error releasing client:', releaseError);
          }
        }
      }
    }
    
    logger.error(`Query failed after ${retries} attempts`);
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
      const result = await client.query(query, params);
      return result.rows as unknown as T;
    });
  }
  
  /**
   * Create a Drizzle ORM instance using the current connection
   */
  public async getDrizzle() {
    const client = await this.getClient();
    return drizzle(client);
  }
  
  /**
   * Shutdown the connection manager
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down connection manager');
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    if (this.circuitBreakerTimer) {
      clearTimeout(this.circuitBreakerTimer);
      this.circuitBreakerTimer = null;
    }
    
    if (this.pool) {
      logger.info('Ending connection pool');
      await this.pool.end();
      this.pool = null;
    }
    
    this.state = ConnectionState.DISCONNECTED;
    logger.info('Connection manager shut down');
  }
  
  /**
   * Check if database connection is healthy
   */
  public async isHealthy(): Promise<boolean> {
    // Fast-path checks based on current state
    if (this.state === ConnectionState.RATE_LIMITED || 
        this.state === ConnectionState.CIRCUIT_OPEN) {
      return false;
    }
    
    try {
      return await this.testConnection();
    } catch (error) {
      logger.error('Health check failed:', error);
      return false;
    }
  }
  
  /**
   * Get current connection state
   */
  public getState(): ConnectionState {
    return this.state;
  }
}

export const neonConnectionManager = NeonConnectionManager.getInstance();
export default neonConnectionManager;