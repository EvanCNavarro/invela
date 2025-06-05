/**
 * ========================================
 * Demo Session Management Service
 * ========================================
 * 
 * Comprehensive service for managing demo sessions, entity tracking,
 * and automated cleanup operations. Provides session-based grouping
 * of demo entities for easy bulk management.
 * 
 * Key Features:
 * - Session creation and lifecycle management
 * - Entity tracking and association
 * - Bulk cleanup operations
 * - Comprehensive logging for analytics
 * 
 * @module server/services/demo-session-service
 * @version 1.0.0
 * @since 2025-05-26
 */

import { db } from '../../db/index';
import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// ========================================
// TYPES & INTERFACES
// ========================================

/**
 * Demo session creation parameters
 */
interface CreateDemoSessionParams {
  personaType: string;
  userAgent?: string;
  ipAddress?: string;
  expirationHours?: number;
}

/**
 * Demo entity reference for tracking
 */
interface DemoEntityReference {
  type: 'company' | 'user' | 'task' | 'file';
  id: number | string;
  metadata?: Record<string, any>;
}

/**
 * Demo session details
 */
interface DemoSessionDetails {
  sessionId: string;
  personaType: string;
  status: string;
  createdAt: Date;
  expiresAt: Date;
  entitiesCreated: string[];
  flowDurationMs?: number;
}

/**
 * Cleanup operation result
 */
interface CleanupResult {
  sessionsProcessed: number;
  companiesDeleted: number;
  usersDeleted: number;
  tasksDeleted: number;
  filesDeleted: number;
  errors: Array<{ sessionId: string; error: string }>;
}

// ========================================
// DEMO SESSION SERVICE CLASS
// ========================================

export class DemoSessionService {
  
  /**
   * Creates a new demo session with proper tracking
   * 
   * @param params - Session creation parameters
   * @returns Promise resolving to session ID
   */
  static async createSession(params: CreateDemoSessionParams): Promise<string> {
    const sessionId = `demo_${uuidv4()}`;
    const expirationHours = params.expirationHours || 72; // Default 3 days
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);
    
    console.log('[DemoSessionService] Creating new demo session:', {
      sessionId,
      personaType: params.personaType,
      expiresAt: expiresAt.toISOString(),
      userAgent: params.userAgent ? params.userAgent.substring(0, 100) : 'unknown',
      ipAddress: params.ipAddress || 'unknown'
    });
    
    try {
      await db.execute(sql`
        INSERT INTO demo_sessions (
          session_id,
          persona_type,
          user_agent,
          ip_address,
          created_at,
          expires_at,
          status
        ) VALUES (
          ${sessionId},
          ${params.personaType},
          ${params.userAgent || null},
          ${params.ipAddress || null},
          NOW(),
          ${expiresAt.toISOString()},
          'active'
        )
      `);
      
      console.log('[DemoSessionService] ✅ Demo session created successfully:', sessionId);
      return sessionId;
      
    } catch (error) {
      console.error('[DemoSessionService] ❌ Failed to create demo session:', error);
      throw new Error(`Failed to create demo session: ${error.message}`);
    }
  }
  
  /**
   * Associates an entity with a demo session
   * 
   * @param sessionId - Demo session ID
   * @param entity - Entity reference to associate
   */
  static async addEntityToSession(
    sessionId: string, 
    entity: DemoEntityReference
  ): Promise<void> {
    const entityRef = `${entity.type}_id:${entity.id}`;
    
    console.log('[DemoSessionService] Adding entity to session:', {
      sessionId,
      entityType: entity.type,
      entityId: entity.id,
      entityRef
    });
    
    try {
      await db.execute(sql`
        UPDATE demo_sessions 
        SET entities_created = array_append(entities_created, ${entityRef})
        WHERE session_id = ${sessionId}
      `);
      
      console.log('[DemoSessionService] ✅ Entity added to session successfully');
      
    } catch (error) {
      console.error('[DemoSessionService] ❌ Failed to add entity to session:', error);
      // Don't throw here - entity creation should not fail due to tracking issues
    }
  }
  
  /**
   * Marks a demo session as completed
   * 
   * @param sessionId - Demo session ID
   * @param flowDurationMs - Time taken to complete the demo flow
   */
  static async completeSession(sessionId: string, flowDurationMs?: number): Promise<void> {
    console.log('[DemoSessionService] Completing demo session:', {
      sessionId,
      flowDurationMs
    });
    
    try {
      await db.execute(sql`
        UPDATE demo_sessions 
        SET 
          status = 'completed',
          completed_at = NOW(),
          flow_duration_ms = ${flowDurationMs || null}
        WHERE session_id = ${sessionId}
      `);
      
      console.log('[DemoSessionService] ✅ Demo session completed successfully');
      
    } catch (error) {
      console.error('[DemoSessionService] ❌ Failed to complete demo session:', error);
      // Don't throw - session completion tracking is not critical
    }
  }
  
  /**
   * Retrieves demo session details
   * 
   * @param sessionId - Demo session ID
   * @returns Promise resolving to session details or null
   */
  static async getSession(sessionId: string): Promise<DemoSessionDetails | null> {
    try {
      const result = await db.execute(sql`
        SELECT 
          session_id,
          persona_type,
          status,
          created_at,
          expires_at,
          entities_created,
          flow_duration_ms
        FROM demo_sessions 
        WHERE session_id = ${sessionId}
      `);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0] as any;
      return {
        sessionId: row.session_id,
        personaType: row.persona_type,
        status: row.status,
        createdAt: new Date(row.created_at),
        expiresAt: new Date(row.expires_at),
        entitiesCreated: row.entities_created || [],
        flowDurationMs: row.flow_duration_ms
      };
      
    } catch (error) {
      console.error('[DemoSessionService] ❌ Failed to get demo session:', error);
      return null;
    }
  }
  
  /**
   * Lists all demo sessions with optional filtering
   * 
   * @param filters - Optional filters for session listing
   * @returns Promise resolving to array of session details
   */
  static async listSessions(filters?: {
    status?: string;
    personaType?: string;
    expiredOnly?: boolean;
    limit?: number;
  }): Promise<DemoSessionDetails[]> {
    let whereClause = '1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (filters?.status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }
    
    if (filters?.personaType) {
      whereClause += ` AND persona_type = $${paramIndex}`;
      params.push(filters.personaType);
      paramIndex++;
    }
    
    if (filters?.expiredOnly) {
      whereClause += ` AND expires_at < NOW()`;
    }
    
    const limit = filters?.limit || 100;
    
    try {
      const query = `
        SELECT 
          session_id,
          persona_type,
          status,
          created_at,
          expires_at,
          entities_created,
          flow_duration_ms
        FROM demo_sessions 
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      
      const result = await db.execute(sql.raw(query, ...params));
      
      return result.rows.map((row: any) => ({
        sessionId: row.session_id,
        personaType: row.persona_type,
        status: row.status,
        createdAt: new Date(row.created_at),
        expiresAt: new Date(row.expires_at),
        entitiesCreated: row.entities_created || [],
        flowDurationMs: row.flow_duration_ms
      }));
      
    } catch (error) {
      console.error('[DemoSessionService] ❌ Failed to list demo sessions:', error);
      return [];
    }
  }
  
  /**
   * Performs bulk cleanup of expired demo sessions and associated entities
   * 
   * @param dryRun - If true, only reports what would be deleted without actually deleting
   * @returns Promise resolving to cleanup results
   */
  static async cleanupExpiredSessions(dryRun: boolean = false): Promise<CleanupResult> {
    console.log('[DemoSessionService] Starting cleanup of expired demo sessions...', { dryRun });
    
    const result: CleanupResult = {
      sessionsProcessed: 0,
      companiesDeleted: 0,
      usersDeleted: 0,
      tasksDeleted: 0,
      filesDeleted: 0,
      errors: []
    };
    
    try {
      // Get expired sessions that are eligible for cleanup
      const expiredSessions = await this.listSessions({
        expiredOnly: true,
        limit: 50 // Process in batches
      });
      
      console.log(`[DemoSessionService] Found ${expiredSessions.length} expired sessions for cleanup`);
      
      for (const session of expiredSessions) {
        try {
          result.sessionsProcessed++;
          
          if (!dryRun) {
            // Delete associated entities
            const cleanupStats = await this.cleanupSessionEntities(session.sessionId);
            result.companiesDeleted += cleanupStats.companiesDeleted;
            result.usersDeleted += cleanupStats.usersDeleted;
            result.tasksDeleted += cleanupStats.tasksDeleted;
            result.filesDeleted += cleanupStats.filesDeleted;
            
            // Mark session as cleanup completed
            await db.execute(sql`
              UPDATE demo_sessions 
              SET 
                status = 'cleanup_completed',
                cleanup_completed_at = NOW()
              WHERE session_id = ${session.sessionId}
            `);
          }
          
          console.log(`[DemoSessionService] ${dryRun ? 'Would cleanup' : 'Cleaned up'} session: ${session.sessionId}`);
          
        } catch (error) {
          console.error(`[DemoSessionService] ❌ Failed to cleanup session ${session.sessionId}:`, error);
          result.errors.push({
            sessionId: session.sessionId,
            error: error.message
          });
        }
      }
      
      console.log('[DemoSessionService] ✅ Cleanup operation completed:', result);
      return result;
      
    } catch (error) {
      console.error('[DemoSessionService] ❌ Cleanup operation failed:', error);
      throw error;
    }
  }
  
  /**
   * Cleans up entities associated with a specific session
   * 
   * @param sessionId - Demo session ID
   * @returns Promise resolving to cleanup statistics
   */
  private static async cleanupSessionEntities(sessionId: string): Promise<{
    companiesDeleted: number;
    usersDeleted: number;
    tasksDeleted: number;
    filesDeleted: number;
  }> {
    const stats = {
      companiesDeleted: 0,
      usersDeleted: 0,
      tasksDeleted: 0,
      filesDeleted: 0
    };
    
    try {
      // Delete tasks first (to avoid foreign key constraints)
      const tasksResult = await db.execute(sql`
        DELETE FROM tasks 
        WHERE company_id IN (
          SELECT id FROM companies WHERE demo_session_id = ${sessionId}
        )
      `);
      stats.tasksDeleted = tasksResult.rowCount || 0;
      
      // Delete files
      const filesResult = await db.execute(sql`
        DELETE FROM files 
        WHERE company_id IN (
          SELECT id FROM companies WHERE demo_session_id = ${sessionId}
        )
      `);
      stats.filesDeleted = filesResult.rowCount || 0;
      
      // Delete users
      const usersResult = await db.execute(sql`
        DELETE FROM users WHERE demo_session_id = ${sessionId}
      `);
      stats.usersDeleted = usersResult.rowCount || 0;
      
      // Delete companies
      const companiesResult = await db.execute(sql`
        DELETE FROM companies WHERE demo_session_id = ${sessionId}
      `);
      stats.companiesDeleted = companiesResult.rowCount || 0;
      
      console.log('[DemoSessionService] ✅ Session entities cleanup completed:', stats);
      return stats;
      
    } catch (error) {
      console.error('[DemoSessionService] ❌ Failed to cleanup session entities:', error);
      throw error;
    }
  }
  
  /**
   * Generates demo session analytics
   * 
   * @returns Promise resolving to analytics data
   */
  static async getAnalytics(): Promise<{
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    expiredSessions: number;
    personaDistribution: Record<string, number>;
    averageFlowDuration: number;
  }> {
    try {
      const analyticsResult = await db.execute(sql`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
          COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_sessions,
          AVG(flow_duration_ms) as avg_flow_duration
        FROM demo_sessions
      `);
      
      const personaResult = await db.execute(sql`
        SELECT persona_type, COUNT(*) as count
        FROM demo_sessions
        GROUP BY persona_type
      `);
      
      const analytics = analyticsResult.rows[0] as any;
      const personaDistribution: Record<string, number> = {};
      
      personaResult.rows.forEach((row: any) => {
        personaDistribution[row.persona_type] = parseInt(row.count);
      });
      
      return {
        totalSessions: parseInt(analytics.total_sessions),
        activeSessions: parseInt(analytics.active_sessions),
        completedSessions: parseInt(analytics.completed_sessions),
        expiredSessions: parseInt(analytics.expired_sessions),
        personaDistribution,
        averageFlowDuration: parseFloat(analytics.avg_flow_duration) || 0
      };
      
    } catch (error) {
      console.error('[DemoSessionService] ❌ Failed to get analytics:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        completedSessions: 0,
        expiredSessions: 0,
        personaDistribution: {},
        averageFlowDuration: 0
      };
    }
  }
}

export default DemoSessionService;