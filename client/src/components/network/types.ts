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
  activeConsents?: number; // Number of active consents for FinTechs
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

// Color-coding for company types
export const companyTypeColors: Record<string, string> = {
  'Bank': '#8A4FE0',  // Purple for banks (matches Bank avatar in navbar)
  'Invela': '#4965EC', // Blue for Invela 
  'FinTech': '#48BB78', // Green for FinTechs
  'Default': '#8A4FE0' // Default to Bank purple
};

// Navbar user icon purple color for center node - exact match with Bank avatar
export const centerUserPurple = '#8A4FE0';

export const centerNodeColor = '#4965EC'; // This will be replaced by company type color in the visualization