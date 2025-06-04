/**
 * ========================================
 * Network Creation Logger Utility
 * ========================================
 * 
 * Centralized logging utility for network relationship creation processes.
 * Provides structured, consistent logging for debugging and monitoring
 * network creation workflows in the demo system.
 * 
 * Key Features:
 * - Structured log formatting with timestamps
 * - Error categorization and tracking
 * - Performance metrics logging
 * - Debug context preservation
 * 
 * @module server/utils/network-logger
 * @version 1.0.0
 * @since 2025-05-28
 */

// ========================================
// TYPES & INTERFACES
// ========================================

interface NetworkLogContext {
  companyId: number;
  companyName: string;
  persona: string;
  networkSize: number;
  sessionId?: string;
}

interface BatchLogContext {
  batchNumber: number;
  totalBatches: number;
  batchSize: number;
  totalRelationships: number;
}

interface ErrorLogContext {
  errorType: 'SYNTAX_ERROR' | 'CONSTRAINT_ERROR' | 'CONNECTION_ERROR' | 'UNKNOWN_ERROR';
  operation: string;
  details?: any;
}

// ========================================
// LOGGING UTILITY CLASS
// ========================================

export class NetworkLogger {
  private static formatTimestamp(): string {
    return new Date().toISOString();
  }

  private static formatContext(context: any): string {
    return JSON.stringify(context, null, 2);
  }

  /**
   * Log network creation initialization
   */
  static logNetworkStart(context: NetworkLogContext): void {
    console.log(`[${this.formatTimestamp()}] [NetworkCreation] 🚀 Starting network creation process`);
    console.log(`[NetworkCreation] Context:`, this.formatContext(context));
  }

  /**
   * Log batch processing operations
   */
  static logBatchStart(batchContext: BatchLogContext): void {
    console.log(`[NetworkCreation] 📦 Processing batch ${batchContext.batchNumber}/${batchContext.totalBatches}`);
    console.log(`[NetworkCreation] Batch details: ${batchContext.batchSize} relationships of ${batchContext.totalRelationships} total`);
  }

  /**
   * Log successful batch completion
   */
  static logBatchSuccess(batchNumber: number, createdCount: number): void {
    console.log(`[NetworkCreation] ✅ Batch ${batchNumber} completed successfully - ${createdCount} relationships created`);
  }

  /**
   * Log batch failures with detailed error information
   */
  static logBatchError(batchNumber: number, error: any, errorContext: ErrorLogContext): void {
    console.error(`[NetworkCreation] ❌ Batch ${batchNumber} failed`);
    console.error(`[NetworkCreation] Error type: ${errorContext.errorType}`);
    console.error(`[NetworkCreation] Operation: ${errorContext.operation}`);
    console.error(`[NetworkCreation] Error details:`, error);
    
    if (errorContext.details) {
      console.error(`[NetworkCreation] Additional context:`, this.formatContext(errorContext.details));
    }
  }

  /**
   * Log individual relationship creation attempts
   */
  static logIndividualInsert(finTechId: number, finTechName: string, success: boolean): void {
    const status = success ? '✅' : '❌';
    const action = success ? 'created' : 'failed';
    console.log(`[NetworkCreation] ${status} Individual relationship ${action}: ${finTechName} (ID: ${finTechId})`);
  }

  /**
   * Log final network creation summary
   */
  static logNetworkComplete(
    totalCreated: number, 
    totalRequested: number, 
    companyName: string,
    durationMs?: number
  ): void {
    console.log(`[NetworkCreation] 🎉 Network creation completed for "${companyName}"`);
    console.log(`[NetworkCreation] Results: ${totalCreated}/${totalRequested} relationships created`);
    
    if (durationMs) {
      console.log(`[NetworkCreation] Duration: ${durationMs}ms`);
    }
    
    const successRate = (totalCreated / totalRequested * 100).toFixed(1);
    console.log(`[NetworkCreation] Success rate: ${successRate}%`);
  }

  /**
   * Log SQL query attempts for debugging
   */
  static logSqlQuery(operation: string, query: any): void {
    console.log(`[NetworkCreation] 🔍 SQL ${operation}:`);
    console.log(`[NetworkCreation] Query structure:`, this.formatContext(query));
  }

  /**
   * Log FinTech company availability
   */
  static logFinTechAvailability(requested: number, available: number, companies: any[]): void {
    console.log(`[NetworkCreation] 🏢 FinTech availability check:`);
    console.log(`[NetworkCreation] Requested: ${requested}, Available: ${available}`);
    
    if (available > 0) {
      const sampleNames = companies.slice(0, 3).map(c => c.name);
      console.log(`[NetworkCreation] Sample available FinTechs: ${sampleNames.join(', ')}${available > 3 ? '...' : ''}`);
    }
  }

  /**
   * Log constraint validation errors specifically
   */
  static logConstraintError(error: any, relationshipData: any): void {
    console.error(`[NetworkCreation] 🚫 Database constraint violation detected`);
    console.error(`[NetworkCreation] Constraint error:`, error.message || error);
    console.error(`[NetworkCreation] Problematic relationship data:`, this.formatContext(relationshipData));
    
    // Check for common constraint issues
    if (error.message?.includes('duplicate key')) {
      console.error(`[NetworkCreation] 💡 Hint: Duplicate relationship detected - check for existing connections`);
    }
    
    if (error.message?.includes('foreign key')) {
      console.error(`[NetworkCreation] 💡 Hint: Foreign key constraint - verify company IDs exist`);
    }
    
    if (error.message?.includes('syntax error')) {
      console.error(`[NetworkCreation] 💡 Hint: SQL syntax issue - check column names and data types`);
    }
  }
}