/**
 * Risk Score Configuration Data Module
 * 
 * This module provides types, utilities, and default values for risk score configuration.
 * It serves as a source of truth for data structure definitions in the risk score module.
 */

// Risk dimension definition - represents a single dimension for risk calculation
export interface RiskDimension {
  id: string;          // Unique identifier for the dimension
  name: string;        // Display name
  color: string;       // Color for visualizations (hex code)
  value: number;       // Risk value (0-100)
  weight: number;      // Weight in overall calculation (percentage)
  description: string; // Description of what the dimension measures
}

// Risk thresholds define boundaries for risk levels
export interface RiskThresholds {
  low: number;    // Upper boundary for low risk
  medium: number; // Upper boundary for medium risk
  high: number;   // Upper boundary for high risk
  // critical is implicitly > high
}

// Risk priorities data structure used for storing dimension ordering
export interface RiskPriorities {
  dimensions: RiskDimension[];
  riskAcceptanceLevel?: number;
  lastUpdated?: string;
}

// Risk score configuration used for storing the complete risk profile
export interface RiskScoreConfiguration {
  dimensions: RiskDimension[];
  thresholds?: RiskThresholds;
  score?: number;
  riskLevel?: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

// Default risk dimensions with equal weights and values
export const defaultRiskDimensions: RiskDimension[] = [
  {
    id: 'cyber_security',
    name: 'Cyber Security',
    color: '#2196f3',
    value: 50,
    weight: 30,
    description: 'Protection against digital threats and vulnerabilities'
  },
  {
    id: 'financial_stability',
    name: 'Financial Stability',
    color: '#4caf50',
    value: 50,
    weight: 25,
    description: 'Financial health and sustainability of the organization'
  },
  {
    id: 'dark_web_data',
    name: 'Dark Web Data',
    color: '#9c27b0',
    value: 50,
    weight: 20,
    description: 'Presence of sensitive information on the dark web'
  },
  {
    id: 'public_sentiment',
    name: 'Public Sentiment',
    color: '#ffc107',
    value: 50,
    weight: 15,
    description: 'Public perception and reputation in the market'
  },
  {
    id: 'potential_liability',
    name: 'Potential Liability',
    color: '#ff9800',
    value: 50,
    weight: 7,
    description: 'Risk exposure based on transactions, data access, and accounts'
  },
  {
    id: 'data_access_scope',
    name: 'Data Access Scope',
    color: '#009688',
    value: 50,
    weight: 3,
    description: 'Extent and sensitivity of data being accessed'
  }
];

// Default risk thresholds
export const defaultRiskThresholds: RiskThresholds = {
  low: 30,
  medium: 60,
  high: 85
  // critical is implicitly > 85
};

/**
 * Determines the risk level based on a score value
 * @param score Risk score (0-100)
 * @returns Risk level category
 */
export function determineRiskLevel(score: number): 'none' | 'low' | 'medium' | 'high' | 'critical' {
  if (score === 0) return 'none';
  if (score <= defaultRiskThresholds.low) return 'low';
  if (score <= defaultRiskThresholds.medium) return 'medium';
  if (score <= defaultRiskThresholds.high) return 'high';
  return 'critical';
}

/**
 * Gets the color for a risk level
 * @param level Risk level category
 * @returns Hex color code
 */
export function getRiskLevelColor(level: 'none' | 'low' | 'medium' | 'high' | 'critical'): string {
  switch (level) {
    case 'none': return '#9e9e9e'; // Gray
    case 'low': return '#4caf50';  // Green
    case 'medium': return '#ffc107'; // Amber
    case 'high': return '#ff9800';  // Orange
    case 'critical': return '#f44336'; // Red
    default: return '#9e9e9e';
  }
}

/**
 * Gets a color for a score value
 * @param score Risk score (0-100)
 * @returns Hex color code
 */
export function getScoreColor(score: number): string {
  return getRiskLevelColor(determineRiskLevel(score));
}

/**
 * Gets a descriptive label for a risk level
 * @param level Risk level category
 * @returns Human-readable description
 */
export function getRiskLevelDescription(level: 'none' | 'low' | 'medium' | 'high' | 'critical'): string {
  switch (level) {
    case 'none': return 'No Risk Assessment';
    case 'low': return 'Low Risk';
    case 'medium': return 'Medium Risk';
    case 'high': return 'High Risk';
    case 'critical': return 'Critical Risk';
    default: return 'Unknown Risk Level';
  }
}

/**
 * Company comparison interface for benchmark visualization
 */
export interface CompanyComparison {
  id: number;
  name: string;
  companyType: string;
  description: string;
  score: number;
  dimensions: Record<string, number>; // dimension id -> value mapping
}

/**
 * Sample company comparisons for comparative visualization
 * These are industry benchmarks for comparison with the user's company
 */
export const sampleCompanyComparisons: CompanyComparison[] = [
  {
    id: 1,
    name: "Industry Average",
    companyType: "Benchmark",
    description: "Average risk profile across financial services industry",
    score: 42,
    dimensions: {
      cyber_security: 45,
      financial_stability: 40,
      dark_web_data: 35,
      public_sentiment: 50,
      potential_liability: 35,
      data_access_scope: 45
    }
  },
  {
    id: 2,
    name: "Best Practice",
    companyType: "Benchmark",
    description: "Best-in-class risk management profile",
    score: 25,
    dimensions: {
      cyber_security: 20,
      financial_stability: 15,
      dark_web_data: 30,
      public_sentiment: 25,
      potential_liability: 35,
      data_access_scope: 25
    }
  },
  {
    id: 3,
    name: "Regulatory Minimum",
    companyType: "Benchmark",
    description: "Minimum acceptable risk profile per regulations",
    score: 65,
    dimensions: {
      cyber_security: 70,
      financial_stability: 60,
      dark_web_data: 65,
      public_sentiment: 70,
      potential_liability: 60,
      data_access_scope: 65
    }
  }
];

export default {
  defaultRiskDimensions,
  defaultRiskThresholds,
  determineRiskLevel,
  getRiskLevelColor,
  getScoreColor,
  getRiskLevelDescription,
  sampleCompanyComparisons
};