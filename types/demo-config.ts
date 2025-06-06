/**
 * ========================================
 * Demo Configuration Constants
 * ========================================
 * 
 * Centralized configuration for demo system limits and constraints.
 * This ensures consistency across frontend slider, backend creation,
 * and random generation functions.
 */

export const DEMO_CONFIG = {
  // Network size configuration
  NETWORK_SIZE: {
    MIN: 5,
    MAX: 1000,
    DEFAULT: 25
  },
  
  // Risk profile configuration  
  RISK_PROFILE: {
    MIN: 0,
    MAX: 100,
    DEFAULT: 50
  }
} as const;

// Type exports for TypeScript support
export type DemoNetworkSizeConfig = typeof DEMO_CONFIG.NETWORK_SIZE;
export type DemoRiskProfileConfig = typeof DEMO_CONFIG.RISK_PROFILE;