export type RiskBucket = 'low' | 'medium' | 'high' | 'critical';

export interface NetworkNode {
  id: number;
  name: string;
  relationshipId: number;
  relationshipType: string;
  relationshipStatus: string;
  riskScore: number;
  riskBucket: RiskBucket;
  accreditationStatus: string;
  revenueTier: string;
  category: string;
}

export interface NetworkCenter {
  id: number;
  name: string;
  riskScore: number;
  riskBucket: RiskBucket;
  accreditationStatus: string;
  revenueTier: string;
  category: string;
}

export interface NetworkVisualizationData {
  center: NetworkCenter;
  nodes: NetworkNode[];
}

export interface NetworkFilters {
  riskBuckets: RiskBucket[];
  accreditationStatus: string[];
}

export const riskBucketColors: Record<RiskBucket, string> = {
  low: '#DFE3EA',
  medium: '#B3B8C6',
  high: '#7B74A8', // Reverted to match legacy key colors in legend
  critical: '#4C2F54' // Reverted to match legacy key colors in legend
};

export const centerNodeColor = '#4965EC';