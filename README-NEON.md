# Neon PostgreSQL Optimization Guide

This document provides an overview of the optimizations and best practices implemented for working with Neon serverless PostgreSQL in our application.

## Key Optimizations

1. **Retry Logic with Exponential Backoff**
   - Implemented in `db/neon-utils.ts`
   - Handles cold starts and connection interruptions
   - Uses jitter to prevent thundering herd problems

2. **Connection Management**
   - Reduced pool size to stay within Neon's connection limits
   - Added proper error handling for connection failures
   - Implemented idle timeout optimization to recycle connections

3. **Query Execution**
   - Added helper functions for resilient query execution
   - Implemented timeout handling to prevent hanging queries
   - Optimized parameter binding for security and performance

## Usage Examples

### Basic Query with Retry Logic

```typescript
import { queryWithNeonRetry } from '@db';

async function getUserById(id: number) {
  const users = await queryWithNeonRetry<User[]>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return users[0] || null;
}
```

### Complex Transaction with Retry Logic

```typescript
import { executeWithNeonRetry } from '@db';

async function createUserWithCompany(userData, companyData) {
  return executeWithNeonRetry(async (client) => {
    // Start transaction
    await client.query('BEGIN');
    
    try {
      // Create company
      const companyResult = await client.query(
        'INSERT INTO companies (name) VALUES ($1) RETURNING id',
        [companyData.name]
      );
      
      const companyId = companyResult.rows[0].id;
      
      // Create user with company_id
      const userResult = await client.query(
        'INSERT INTO users (email, password, company_id) VALUES ($1, $2, $3) RETURNING id',
        [userData.email, userData.password, companyId]
      );
      
      // Commit the transaction
      await client.query('COMMIT');
      
      return {
        userId: userResult.rows[0].id,
        companyId
      };
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      throw error;
    }
  });
}
```

### Health Check

```typescript
import { checkDatabaseHealth } from '@db';

async function performHealthCheck() {
  const healthStatus = await checkDatabaseHealth();
  
  if (!healthStatus.isHealthy) {
    console.error('Database health check failed:', healthStatus.message);
    // Implement alerting or fallback strategy
  }
  
  return healthStatus;
}
```

## Configuration Options

The following configuration options are available in `db/neon-utils.ts`:

| Option | Default | Description |
|--------|---------|-------------|
| `MAX_RETRIES` | 5 | Maximum number of retry attempts |
| `INITIAL_RETRY_DELAY_MS` | 500 | Initial delay before first retry (ms) |
| `MAX_RETRY_DELAY_MS` | 10000 | Maximum delay between retries (ms) |
| `JITTER_FACTOR` | 0.3 | Random factor to add to delay for retry timing |
| `POOL_SIZE` | 5 | Maximum number of connections in the pool |
| `IDLE_TIMEOUT_MS` | 30000 | Time before idle connections are closed (ms) |
| `CONNECTION_TIMEOUT_MS` | 30000 | Timeout for connection attempts (ms) |
| `MAX_USES` | 5000 | Maximum number of queries per connection |
| `QUERY_TIMEOUT_MS` | 15000 | Default timeout for queries (ms) |

## Best Practices

1. **Use Individual Connections**
   - For simple operations, consider using individual connections instead of the pool
   - This helps stay within Neon's connection limits

2. **Handle Cold Starts**
   - Always use the retry logic for critical database operations
   - First query after a period of inactivity may take longer

3. **Optimize Connection Pooling**
   - Keep pool size small (5 or less) for Neon
   - Set appropriate idle timeouts to release unused connections
   - Implement max connection age/uses to prevent connection issues

4. **Use Prepared Statements**
   - Always use parameterized queries to prevent SQL injection
   - Avoid dynamic SQL when possible

5. **Implement Circuit Breakers**
   - Consider adding circuit breakers for non-critical operations
   - This prevents cascading failures during database issues

## Troubleshooting

### Common Issues

1. **Connection Timeouts**
   - Usually indicates cold start or connection limit reached
   - Wait and retry with backoff

2. **Too Many Connections**
   - Reduce pool size or active connections
   - Check for connection leaks in your code

3. **Database is Starting Up**
   - This is normal for Neon cold starts
   - The retry logic will handle this automatically

4. **Query Timeouts**
   - Review query performance and add indexes if needed
   - Consider using materialized views for complex queries

### Debugging

The Neon utilities include detailed logging to help diagnose issues:

```typescript
// Enable debug logging
import { setLogLevel } from '@db/neon-utils';
setLogLevel('debug');
```

## Further Reading

- [Neon Serverless Documentation](https://neon.tech/docs/introduction)
- [PostgreSQL Connection Pooling Best Practices](https://www.postgresql.org/docs/current/pool-standby.html)
- [Understanding Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff) 