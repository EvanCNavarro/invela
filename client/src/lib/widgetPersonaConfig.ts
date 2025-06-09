/**
 * ========================================
 * Widget Persona Configuration System
 * ========================================
 * 
 * Centralized configuration system for persona-based widget content variants.
 * Defines what content each widget shows based on user persona (Invela, Bank, FinTech)
 * and handles permission-based widget availability.
 * 
 * Key Features:
 * - Persona-based content filtering
 * - Widget permission matrix
 * - Action configuration per persona
 * - Consistent data structure
 * 
 * @module lib/widgetPersonaConfig
 * @version 1.0.0
 * @since 2025-06-09
 */

import { 
  Building2, 
  BarChart3, 
  Upload, 
  UserPlus, 
  CheckSquare, 
  Shield, 
  Users, 
  FileText, 
  TrendingUp, 
  FolderOpen, 
  Network, 
  Activity, 
  Eye, 
  Settings, 
  MessageSquare, 
  BarChart2, 
  AlertTriangle, 
  ListTodo, 
  Plus,
  CreditCard,
  Globe,
  Database,
  Lock,
  Award,
  FileCheck
} from "lucide-react";

// ========================================
// TYPES & INTERFACES
// ========================================

export interface WidgetAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  description?: string;
  variant?: 'default' | 'primary' | 'secondary';
}

export interface PersonaWidgetConfig {
  visible: boolean;
  variant: string;
  actions?: WidgetAction[];
  maxActions?: number;
  priority?: number;
}

export type Persona = 'Invela' | 'Bank' | 'FinTech';

// ========================================
// QUICK ACTIONS CONFIGURATION
// ========================================

export const getQuickActionsForPersona = (persona: Persona, onNavigate: (path: string) => void): WidgetAction[] => {
  const baseActions = {
    companyProfile: {
      id: "company-profile",
      label: "Company Profile",
      icon: Building2,
      onClick: () => onNavigate("/network/company/1"),
      description: "View detailed company information and metrics"
    },
    viewTasks: {
      id: "view-tasks",
      label: "View Tasks",
      icon: ListTodo,
      onClick: () => onNavigate("/task-center"),
      description: "Access task center and manage assignments"
    },
    manageNetwork: {
      id: "manage-network",
      label: "Manage Network",
      icon: Network,
      onClick: () => onNavigate("/network"),
      description: "View and manage company network relationships"
    },
    inviteToNetwork: {
      id: "invite-network",
      label: "Invite to Network",
      icon: UserPlus,
      onClick: () => onNavigate("/network?action=invite"),
      description: "Invite new companies to your network"
    },
    viewInsights: {
      id: "view-insights",
      label: "View Insights",
      icon: BarChart3,
      onClick: () => onNavigate("/insights"),
      description: "Access comprehensive risk analysis and reports"
    },
    uploadFiles: {
      id: "upload-files",
      label: "Upload Files",
      icon: Upload,
      onClick: () => onNavigate("/file-vault"),
      description: "Upload documents to secure file vault"
    },
    manageClaims: {
      id: "manage-claims",
      label: "Manage Claims",
      icon: FileCheck,
      onClick: () => onNavigate("/claims"),
      description: "Create and manage insurance claims"
    },
    viewRiskScore: {
      id: "view-risk-score",
      label: "View Risk Score",
      icon: Shield,
      onClick: () => onNavigate("/network/company/1?tab=risk"),
      description: "View detailed risk assessment and scoring"
    }
  };

  const personaConfigs: Record<Persona, WidgetAction[]> = {
    'Invela': [
      baseActions.companyProfile,
      baseActions.viewTasks,
      baseActions.manageNetwork,
      baseActions.inviteToNetwork,
      baseActions.viewInsights,
      baseActions.uploadFiles,
      baseActions.manageClaims,
      baseActions.viewRiskScore
    ],
    'Bank': [
      baseActions.companyProfile,
      baseActions.viewTasks,
      baseActions.manageNetwork,
      baseActions.viewInsights,
      baseActions.uploadFiles,
      baseActions.viewRiskScore
    ],
    'FinTech': [
      baseActions.viewTasks,
      baseActions.uploadFiles,
      baseActions.viewInsights,
      baseActions.viewRiskScore
    ]
  };

  return personaConfigs[persona] || [];
};

// ========================================
// COMPANY SNAPSHOT CONFIGURATION
// ========================================

export interface CompanyMetric {
  id: string;
  label: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'stable';
  clickable?: boolean;
  status?: 'success' | 'warning' | 'error' | 'neutral';
}

export const getCompanySnapshotForPersona = (
  persona: Persona, 
  companyData: any
): CompanyMetric[] => {
  const baseMetrics = {
    riskScore: {
      id: "risk-score",
      label: "Risk Score",
      value: companyData?.risk_score || companyData?.riskScore || "N/A",
      description: "Current risk assessment score",
      icon: Shield,
      clickable: true,
      status: "neutral" as const
    },
    employees: {
      id: "employees",
      label: "Employees",
      value: companyData?.num_employees || "N/A",
      description: "Total number of employees",
      icon: Users,
      clickable: true,
      status: "neutral" as const,
      trend: "stable" as const
    },
    revenue: {
      id: "revenue",
      label: "Revenue Tier",
      value: companyData?.revenue_tier || "N/A",
      description: "Company revenue classification",
      icon: TrendingUp,
      clickable: true,
      status: "neutral" as const
    },
    compliance: {
      id: "compliance",
      label: "Compliance Status",
      value: companyData?.certifications_compliance ? "Certified" : "Pending",
      description: "Current compliance and certification status",
      icon: Award,
      clickable: true,
      status: "neutral" as const
    }
  };

  const personaConfigs: Record<Persona, CompanyMetric[]> = {
    'Invela': [
      baseMetrics.riskScore,
      baseMetrics.employees,
      baseMetrics.revenue,
      baseMetrics.compliance
    ],
    'Bank': [
      baseMetrics.riskScore,
      baseMetrics.employees,
      baseMetrics.revenue,
      baseMetrics.compliance
    ],
    'FinTech': [
      baseMetrics.riskScore,
      baseMetrics.employees,
      baseMetrics.revenue,
      baseMetrics.compliance
    ]
  };

  return personaConfigs[persona] || [];
};

// ========================================
// WIDGET PERMISSIONS & AVAILABILITY
// ========================================

export const WIDGET_PERMISSIONS: Record<Persona, Record<string, PersonaWidgetConfig>> = {
  'Invela': {
    'quickActions': { visible: true, variant: 'full', maxActions: 8, priority: 1 },
    'companySnapshot': { visible: true, variant: 'detailed', priority: 2 },
    'riskRadar': { visible: true, variant: 'admin', priority: 3 },
    'taskSummary': { visible: true, variant: 'full', priority: 4 },
    'systemOverview': { visible: true, variant: 'admin', priority: 5 },
    'networkHealth': { visible: true, variant: 'detailed', priority: 6 },
    'complianceTracker': { visible: true, variant: 'full', priority: 7 }
  },
  'Bank': {
    'quickActions': { visible: true, variant: 'standard', maxActions: 6, priority: 1 },
    'companySnapshot': { visible: true, variant: 'standard', priority: 2 },
    'riskRadar': { visible: true, variant: 'readonly', priority: 3 },
    'taskSummary': { visible: true, variant: 'standard', priority: 4 },
    'systemOverview': { visible: false, variant: 'hidden', priority: 0 },
    'networkHealth': { visible: true, variant: 'standard', priority: 5 },
    'complianceTracker': { visible: true, variant: 'readonly', priority: 6 }
  },
  'FinTech': {
    'quickActions': { visible: true, variant: 'minimal', maxActions: 4, priority: 1 },
    'companySnapshot': { visible: true, variant: 'basic', priority: 2 },
    'riskRadar': { visible: true, variant: 'readonly', priority: 3 },
    'taskSummary': { visible: true, variant: 'basic', priority: 4 },
    'systemOverview': { visible: false, variant: 'hidden', priority: 0 },
    'networkHealth': { visible: false, variant: 'hidden', priority: 0 },
    'complianceTracker': { visible: true, variant: 'basic', priority: 5 }
  }
};

export const getAvailableWidgets = (persona: Persona): string[] => {
  const permissions = WIDGET_PERMISSIONS[persona];
  return Object.keys(permissions).filter(widgetKey => permissions[widgetKey].visible);
};

/**
 * Check if a widget is available for a persona
 */
export const isWidgetAvailable = (persona: Persona, widgetKey: string): boolean => {
  const config = WIDGET_PERMISSIONS[persona]?.[widgetKey];
  return config ? config.visible : false;
};

/**
 * Get widget configuration for a specific persona
 */
export const getWidgetConfig = (persona: Persona, widgetKey: string): PersonaWidgetConfig | null => {
  return WIDGET_PERMISSIONS[persona]?.[widgetKey] || null;
};

/**
 * Get widget variant for a specific persona
 */
export const getWidgetVariant = (persona: Persona, widgetKey: string): string => {
  const config = getWidgetConfig(persona, widgetKey);
  return config ? config.variant : 'default';
};