/**
 * Company type definitions
 */

export interface Company {
  id: number;
  name: string;
  category?: string;
  is_demo?: boolean;
  revenue_tier?: string;
  risk_score?: number;
  chosen_score?: number;
  onboarding_completed?: boolean;
  created_at?: Date;
  updated_at?: Date;
  metadata?: Record<string, any>;
  // Available tabs denoting unlocked features
  available_tabs?: string[];
}