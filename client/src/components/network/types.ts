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
  low: '#C7CCD6',
  medium: '#A1A6B4',
  high: '#655D8A',
  critical: '#3B1E3E'
};

export const centerNodeColor = '#1E3A8A';