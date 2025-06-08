/**
 * ========================================
 * Session-Based Data Service
 * ========================================
 * 
 * Provides consistent, session-persistent data generation for risk calculations
 * across all application components. Uses seeded random generation to ensure
 * the same company always produces identical values within a browser session.
 * 
 * Key Features:
 * - Session storage persistence
 * - Seeded random generation for consistency
 * - Automatic cleanup on session end
 * - Error handling and debug logging
 * - TypeScript type safety
 * 
 * @module lib/sessionDataService
 * @version 1.0.0
 * @since 2025-06-04
 */

/**
 * Session data structure for company risk information
 */
export interface SessionCompanyData {
  id: number;
  name: string;
  currentScore: number;
  previousScore: number;
  previousScore7Day: number; // Score from 7 days ago
  status: 'Stable' | 'Monitoring' | 'Approaching Block' | 'Blocked';
  trend: 'improving' | 'stable' | 'deteriorating';
  daysInStatus: number;
  category: string;
  sessionGenerated: boolean;
}

/**
 * Session storage configuration
 */
interface SessionConfig {
  storageKey: string;
  version: string;
  maxAge: number; // milliseconds
}

/**
 * Default configuration for session storage
 */
const DEFAULT_CONFIG: SessionConfig = {
  storageKey: 'invela-risk-session-data',
  version: '2.0.0', // Bump version to force cache reset for unified thresholds
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
};

/**
 * Risk calculation thresholds - aligned with unified backend service
 */
const RISK_THRESHOLDS = {
  BLOCKED: 70,
  APPROACHING_BLOCK: 50,
  MONITORING: 30,
  STABLE: 0
};

/**
 * Logger for session data operations
 */
const logSession = (action: string, details?: any) => {
  console.log(`[SessionDataService] ${action}`, details || '');
};

/**
 * Simple seeded random number generator
 * Uses a linear congruential generator for deterministic results
 * 
 * @param seed - Numeric seed value
 * @returns Seeded random function
 */
function createSeededRandom(seed: number) {
  let state = seed;
  
  return function() {
    // Linear congruential generator parameters
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    
    state = (a * state + c) % m;
    return state / m;
  };
}

/**
 * Generate consistent risk data for a company using seeded random
 * 
 * @param company - Company data from API
 * @param seed - Seed for random generation
 * @returns Generated risk data
 */
function generateConsistentRiskData(company: any, seed: number): SessionCompanyData {
  const random = createSeededRandom(seed);
  
  // Use authentic current score if available, otherwise generate
  const currentScore = company.risk_score || company.riskScore || 
    Math.floor(random() * 75 + 20); // Range: 20-95
  
  // Generate previous scores with realistic variation
  // 30-day change (larger variation)
  const variation30Day = (random() - 0.5) * 20; // Range: -10 to +10
  const previousScore = Math.max(20, Math.min(95, currentScore + variation30Day));
  
  // 7-day change (smaller variation, closer to current)
  const variation7Day = (random() - 0.5) * 8; // Range: -4 to +4
  const previousScore7Day = Math.max(20, Math.min(95, currentScore + variation7Day));
  
  // Calculate status based on current score using standard logic (higher score = higher risk)
  let status: SessionCompanyData['status'];
  if (currentScore >= RISK_THRESHOLDS.BLOCKED) {
    status = 'Blocked';
  } else if (currentScore >= RISK_THRESHOLDS.APPROACHING_BLOCK) {
    status = 'Approaching Block';
  } else if (currentScore >= RISK_THRESHOLDS.MONITORING) {
    status = 'Monitoring';
  } else {
    status = 'Stable';
  }
  
  // Calculate trend based on score change (higher score = higher risk)
  const scoreChange = currentScore - previousScore;
  let trend: SessionCompanyData['trend'];
  if (scoreChange > 3) {
    trend = 'deteriorating'; // Higher score = worse risk
  } else if (scoreChange < -3) {
    trend = 'improving'; // Lower score = better risk
  } else {
    trend = 'stable';
  }
  
  // Generate days in status (1-30 days)
  const daysInStatus = Math.floor(random() * 30) + 1;
  
  logSession('Generated consistent data for company', {
    companyId: company.id,
    companyName: company.name,
    currentScore,
    previousScore,
    previousScore7Day,
    change30Day: currentScore - previousScore,
    change7Day: currentScore - previousScore7Day,
    status,
    trend,
    daysInStatus
  });
  
  return {
    id: company.id,
    name: company.name,
    currentScore,
    previousScore,
    previousScore7Day,
    status,
    trend,
    daysInStatus,
    category: company.category || 'FinTech',
    sessionGenerated: true
  };
}

/**
 * Session data wrapper with metadata
 */
interface SessionDataWrapper {
  version: string;
  timestamp: number;
  data: Record<number, SessionCompanyData>;
}

/**
 * Session Data Service Class
 */
export class SessionDataService {
  private config: SessionConfig;
  private cache: Map<number, SessionCompanyData> = new Map();
  
  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logSession('Initialized SessionDataService', { config: this.config });
  }
  
  /**
   * Get session data from storage
   */
  private getSessionData(): SessionDataWrapper | null {
    try {
      const stored = sessionStorage.getItem(this.config.storageKey);
      if (!stored) {
        logSession('No session data found in storage');
        return null;
      }
      
      const parsed: SessionDataWrapper = JSON.parse(stored);
      
      // Check version compatibility
      if (parsed.version !== this.config.version) {
        logSession('Session data version mismatch, clearing', {
          stored: parsed.version,
          expected: this.config.version
        });
        this.clearSessionData();
        return null;
      }
      
      // Check age
      const age = Date.now() - parsed.timestamp;
      if (age > this.config.maxAge) {
        logSession('Session data expired, clearing', { age, maxAge: this.config.maxAge });
        this.clearSessionData();
        return null;
      }
      
      logSession('Retrieved valid session data', {
        companiesCount: Object.keys(parsed.data).length,
        age
      });
      
      return parsed;
    } catch (error) {
      logSession('Error reading session data', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      this.clearSessionData();
      return null;
    }
  }
  
  /**
   * Save session data to storage
   */
  private saveSessionData(data: Record<number, SessionCompanyData>): void {
    try {
      const wrapper: SessionDataWrapper = {
        version: this.config.version,
        timestamp: Date.now(),
        data
      };
      
      sessionStorage.setItem(this.config.storageKey, JSON.stringify(wrapper));
      
      logSession('Saved session data', {
        companiesCount: Object.keys(data).length
      });
    } catch (error) {
      logSession('Error saving session data', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Clear session data
   */
  private clearSessionData(): void {
    try {
      sessionStorage.removeItem(this.config.storageKey);
      this.cache.clear();
      logSession('Cleared session data');
    } catch (error) {
      logSession('Error clearing session data', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Get consistent data for a single company
   */
  public getCompanyData(company: any): SessionCompanyData {
    const companyId = company.id;
    
    // Check session storage first for version compatibility
    const sessionData = this.getSessionData();
    
    // If we have stored data, check if it has the new 7-day field
    if (sessionData && sessionData.data[companyId]) {
      const stored = sessionData.data[companyId];
      
      // Check if the stored data has the new previousScore7Day field
      if ('previousScore7Day' in stored) {
        this.cache.set(companyId, stored);
        logSession('Returning stored data for company (with 7-day field)', { companyId, companyName: company.name });
        return stored;
      } else {
        logSession('Stored data missing 7-day field, regenerating', { companyId, companyName: company.name });
      }
    }
    
    // Check cache for valid data
    if (this.cache.has(companyId)) {
      const cached = this.cache.get(companyId)!;
      if ('previousScore7Day' in cached) {
        logSession('Returning cached data for company (with 7-day field)', { companyId, companyName: company.name });
        return cached;
      } else {
        logSession('Cached data missing 7-day field, regenerating', { companyId, companyName: company.name });
        this.cache.delete(companyId);
      }
    }
    
    // Generate new data with 7-day field
    const generated = generateConsistentRiskData(company, companyId);
    this.cache.set(companyId, generated);
    
    // Update session storage
    const allData = sessionData?.data || {};
    allData[companyId] = generated;
    this.saveSessionData(allData);
    
    logSession('Generated new data for company (with 7-day field)', { companyId, companyName: company.name });
    return generated;
  }
  
  /**
   * Get consistent data for multiple companies
   */
  public getCompaniesData(companies: any[]): SessionCompanyData[] {
    logSession('Phase 3: Session service receiving companies data', { 
      count: companies.length,
      firstFewCompanies: companies.slice(0, 3).map(c => ({
        id: c.id,
        name: c.name,
        currentScore: c.currentScore,
        previousScore: c.previousScore,
        trend: c.trend
      }))
    });
    
    const processed = companies.map(company => this.getCompanyData(company));
    
    logSession('Phase 3: Session service processed companies', {
      processedCount: processed.length,
      deterioratingCount: processed.filter(c => c.trend === 'deteriorating').length,
      improvingCount: processed.filter(c => c.trend === 'improving').length,
      stableCount: processed.filter(c => c.trend === 'stable').length
    });
    
    return processed;
  }
  
  /**
   * Clear all session data (useful for testing or manual reset)
   */
  public reset(): void {
    logSession('Manual reset requested');
    this.clearSessionData();
  }
  
  /**
   * Get session statistics
   */
  public getStats() {
    const sessionData = this.getSessionData();
    const cacheSize = this.cache.size;
    const storageSize = sessionData ? Object.keys(sessionData.data).length : 0;
    
    return {
      cacheSize,
      storageSize,
      hasSessionData: !!sessionData,
      sessionAge: sessionData ? Date.now() - sessionData.timestamp : 0
    };
  }
}

/**
 * Default service instance
 */
export const sessionDataService = new SessionDataService();

/**
 * Debug function to force cache reset (for testing)
 */
export function forceSessionReset() {
  sessionDataService.reset();
  console.log('[SessionData] Cache cleared - new data will be generated on next access');
}

/**
 * Convenience function to get company data
 */
export function getSessionCompanyData(company: any): SessionCompanyData {
  return sessionDataService.getCompanyData(company);
}

/**
 * Calculate score change for different timeframes
 */
export function getScoreChange(sessionData: SessionCompanyData, timeframe: '7day' | '30day'): number {
  const change = timeframe === '7day' 
    ? sessionData.currentScore - sessionData.previousScore7Day
    : sessionData.currentScore - sessionData.previousScore;
    
  console.log(`[SessionData] ${sessionData.name} ${timeframe} change calculation:`, {
    timeframe,
    currentScore: sessionData.currentScore,
    previousScore7Day: sessionData.previousScore7Day,
    previousScore30Day: sessionData.previousScore,
    change7Day: sessionData.currentScore - sessionData.previousScore7Day,
    change30Day: sessionData.currentScore - sessionData.previousScore,
    requestedChange: change
  });
  
  return change;
}

/**
 * Get score change with proper formatting
 */
export function getFormattedScoreChange(sessionData: SessionCompanyData, timeframe: '7day' | '30day'): string {
  const change = getScoreChange(sessionData, timeframe);
  if (change === 0) return '0';
  const sign = change > 0 ? '+' : '';
  return `${sign}${Math.round(change)}`;
}

/**
 * Convenience function to get multiple companies data
 */
export function getSessionCompaniesData(companies: any[]): SessionCompanyData[] {
  return sessionDataService.getCompaniesData(companies);
}