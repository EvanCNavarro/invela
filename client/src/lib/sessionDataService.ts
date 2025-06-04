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
  version: '1.0.0',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
};

/**
 * Risk calculation thresholds
 */
const RISK_THRESHOLDS = {
  blocked: 40,
  approaching: 50,
  monitoring: 60
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
  
  // Generate previous score with realistic variation
  const variation = (random() - 0.5) * 20; // Range: -10 to +10
  const previousScore = Math.max(20, Math.min(95, currentScore + variation));
  
  // Calculate status based on current score
  let status: SessionCompanyData['status'];
  if (currentScore < RISK_THRESHOLDS.blocked) {
    status = 'Blocked';
  } else if (currentScore < RISK_THRESHOLDS.approaching) {
    status = 'Approaching Block';
  } else if (currentScore < RISK_THRESHOLDS.monitoring) {
    status = 'Monitoring';
  } else {
    status = 'Stable';
  }
  
  // Calculate trend based on score change
  const scoreChange = currentScore - previousScore;
  let trend: SessionCompanyData['trend'];
  if (scoreChange > 3) {
    trend = 'improving';
  } else if (scoreChange < -3) {
    trend = 'deteriorating';
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
    status,
    trend,
    daysInStatus
  });
  
  return {
    id: company.id,
    name: company.name,
    currentScore,
    previousScore,
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
    
    // Check cache first
    if (this.cache.has(companyId)) {
      const cached = this.cache.get(companyId)!;
      logSession('Returning cached data for company', { companyId, companyName: company.name });
      return cached;
    }
    
    // Check session storage
    const sessionData = this.getSessionData();
    if (sessionData && sessionData.data[companyId]) {
      const stored = sessionData.data[companyId];
      this.cache.set(companyId, stored);
      logSession('Returning stored data for company', { companyId, companyName: company.name });
      return stored;
    }
    
    // Generate new data
    const generated = generateConsistentRiskData(company, companyId);
    this.cache.set(companyId, generated);
    
    // Update session storage
    const allData = sessionData?.data || {};
    allData[companyId] = generated;
    this.saveSessionData(allData);
    
    logSession('Generated new data for company', { companyId, companyName: company.name });
    return generated;
  }
  
  /**
   * Get consistent data for multiple companies
   */
  public getCompaniesData(companies: any[]): SessionCompanyData[] {
    logSession('Getting data for multiple companies', { count: companies.length });
    
    return companies.map(company => this.getCompanyData(company));
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
 * Convenience function to get company data
 */
export function getSessionCompanyData(company: any): SessionCompanyData {
  return sessionDataService.getCompanyData(company);
}

/**
 * Convenience function to get multiple companies data
 */
export function getSessionCompaniesData(companies: any[]): SessionCompanyData[] {
  return sessionDataService.getCompaniesData(companies);
}