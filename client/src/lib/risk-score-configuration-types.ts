// Risk dimension configuration types

export interface RiskDimension {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  weight: number; // percentage weight (0-100)
  value: number; // current threshold value (0-100)
}

export interface RiskThresholds {
  high: number; // Below this value is high risk
  medium: number; // Below this value is medium risk, above is low risk
}

export interface CompanyComparison {
  id: number;
  name: string;
  companyType: string;
  description: string;
  score: number;
  dimensions: Record<string, number>; // dimension id -> value mapping
}

export interface RiskScoreConfiguration {
  dimensions: RiskDimension[];
  thresholds: RiskThresholds;
  score: number;
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

export interface RiskPriorities {
  dimensions: RiskDimension[];
  lastUpdated: string;
}
