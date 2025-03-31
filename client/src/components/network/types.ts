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
  high: '#1A365D', // Changed from plum to darker blue
  critical: '#0F172A'  // Darker blue for critical
};

export const centerNodeColor = '#1E3A8A';