import { RiskDimension, RiskThresholds, CompanyComparison } from './risk-score-configuration-types';

// Default risk dimensions with initial values
export const defaultRiskDimensions: RiskDimension[] = [
  {
    id: 'cyber_security',
    name: 'Cyber Security',
    description: 'Protection against digital threats and vulnerabilities',
    weight: 25.0,
    value: 50,
    color: '#2196f3' // blue
  },
  {
    id: 'financial_stability',
    name: 'Financial Stability',
    description: 'Financial health and sustainability of the organization',
    weight: 22.0,
    value: 50,
    color: '#4caf50' // green
  },
  {
    id: 'dark_web_data',
    name: 'Dark Web Data',
    description: 'Presence of sensitive information on the dark web',
    weight: 18.0,
    value: 50,
    color: '#9c27b0' // purple
  },
  {
    id: 'public_sentiment',
    name: 'Public Sentiment',
    description: 'Public perception and reputation in the market',
    weight: 15.0,
    value: 50,
    color: '#ffc107' // amber
  },
  {
    id: 'potential_liability',
    name: 'Potential Liability',
    description: 'Risk exposure based on transactions, data access, and accounts',
    weight: 12.0,
    value: 50,
    color: '#ff9800' // orange
  },
  {
    id: 'data_access_scope',
    name: 'Data Access Scope',
    description: 'Extent and sensitivity of data being accessed',
    weight: 8.0,
    value: 50,
    color: '#009688' // teal
  }
];

// Default risk thresholds
export const defaultRiskThresholds: RiskThresholds = {
  high: 30, // Below 30 is high risk
  medium: 70 // Below 70 is medium risk, above is low risk
};

// Sample company comparisons for the comparative visualization
export const sampleCompanyComparisons: CompanyComparison[] = [
  {
    id: 1,
    name: 'Industry Average',
    companyType: 'Benchmark',
    description: 'Average risk configuration across the financial industry',
    score: 65,
    dimensions: {
      physical_security: 70,
      cyber_security: 65,
      financial_stability: 68,
      dark_web_data: 55,
      public_sentiment: 72,
      potential_liability: 60,
      supply_chain_issues: 58,
      data_access_scope: 62
    }
  },
  {
    id: 2,
    name: 'Wealthfront',
    companyType: 'FinTech',
    description: 'Automated investment service and robo-advisor',
    score: 80,
    dimensions: {
      physical_security: 82,
      cyber_security: 85,
      financial_stability: 83,
      dark_web_data: 78,
      public_sentiment: 88,
      potential_liability: 75,
      supply_chain_issues: 70,
      data_access_scope: 64
    }
  },
  {
    id: 3,
    name: 'Betterment',
    companyType: 'FinTech',
    description: 'Online investment and financial advisory service',
    score: 78,
    dimensions: {
      physical_security: 75,
      cyber_security: 82,
      financial_stability: 80,
      dark_web_data: 76,
      public_sentiment: 84,
      potential_liability: 72,
      supply_chain_issues: 68,
      data_access_scope: 65
    }
  },
  {
    id: 4,
    name: 'Robinhood',
    companyType: 'FinTech',
    description: 'Commission-free stock trading and investing platform',
    score: 74,
    dimensions: {
      physical_security: 70,
      cyber_security: 79,
      financial_stability: 75,
      dark_web_data: 72,
      public_sentiment: 68,
      potential_liability: 76,
      supply_chain_issues: 72,
      data_access_scope: 68
    }
  }
];

// Helper function to calculate total risk score based on dimension weights and values
export function calculateRiskScore(dimensions: RiskDimension[]): number {
  if (!dimensions.length) return 0;
  
  const weightedSum = dimensions.reduce((sum, dimension) => {
    return sum + (dimension.weight * dimension.value / 100);
  }, 0);
  
  return Math.round(weightedSum);
}

// Helper function to determine risk level based on score and thresholds
export function determineRiskLevel(score: number): 'none' | 'low' | 'medium' | 'high' | 'critical' {
  if (score === 0) return 'none';
  if (score === 100) return 'critical';
  if (score < 34) return 'low';
  if (score < 67) return 'medium';
  return 'high';
}
