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
  Lock
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
    insights: {
      id: "insights",
      label: "Risk Insights",
      icon: BarChart3,
      onClick: () => onNavigate("/insights"),
      description: "Access comprehensive risk analysis and reports"
    },
    uploadFile: {
      id: "upload-file",
      label: "Upload Files",
      icon: Upload,
      onClick: () => onNavigate("/file-vault"),
      description: "Upload documents to secure file vault"
    },
    inviteRecipient: {
      id: "invite-recipient",
      label: "Invite Companies",
      icon: UserPlus,
      onClick: () => {}, // Will be handled by modal
      description: "Invite data recipients to the platform"
    },
    taskCenter: {
      id: "task-center",
      label: "Task Center",
      icon: CheckSquare,
      onClick: () => onNavigate("/task-center"),
      description: "Manage compliance and onboarding tasks"
    },
    riskScore: {
      id: "risk-score",
      label: "Risk Assessment",
      icon: Shield,
      onClick: () => onNavigate("/network/company/1?tab=risk"),
      description: "View detailed risk scoring and analysis"
    },
    network: {
      id: "network",
      label: "Network View",
      icon: Network,
      onClick: () => onNavigate("/network"),
      description: "Explore company relationship network"
    },
    claims: {
      id: "claims",
      label: "Create Claim",
      icon: Plus,
      onClick: () => onNavigate("/claims"),
      description: "Submit new compliance or risk claims"
    },
    systemSettings: {
      id: "system-settings",
      label: "System Settings",
      icon: Settings,
      onClick: () => onNavigate("/settings"),
      description: "Configure platform and user settings"
    },
    compliance: {
      id: "compliance",
      label: "Compliance Hub",
      icon: Lock,
      onClick: () => onNavigate("/compliance"),
      description: "Access compliance tools and reporting"
    },
    analytics: {
      id: "analytics",
      label: "Analytics",
      icon: TrendingUp,
      onClick: () => onNavigate("/analytics"),
      description: "View platform usage and performance metrics"
    },
    support: {
      id: "support",
      label: "Support Center",
      icon: MessageSquare,
      onClick: () => onNavigate("/support"),
      description: "Get help and access documentation"
    }
  };

  const personaConfigs = {
    'Invela': [
      baseActions.systemSettings,
      baseActions.analytics,
      baseActions.network,
      baseActions.inviteRecipient,
      baseActions.insights,
      baseActions.compliance,
      baseActions.uploadFile,
      baseActions.support
    ],
    'Bank': [
      baseActions.companyProfile,
      baseActions.compliance,
      baseActions.riskScore,
      baseActions.network,
      baseActions.uploadFile,
      baseActions.support
    ],
    'FinTech': [
      baseActions.taskCenter,
      baseActions.companyProfile,
      baseActions.uploadFile,
      baseActions.support
    ]
  };

  return personaConfigs[persona] || [];
};

// ========================================
// WIDGET PERMISSION MATRIX
// ========================================

export const WIDGET_PERMISSIONS: Record<Persona, Record<string, PersonaWidgetConfig>> = {
  'Invela': {
    quickActions: { 
      visible: true, 
      variant: 'admin',
      maxActions: 8,
      priority: 1 
    },
    companySnapshot: { 
      visible: true, 
      variant: 'comprehensive',
      priority: 2 
    },
    networkVisualization: { 
      visible: true, 
      variant: 'platform-wide',
      priority: 3 
    },
    riskRadar: { 
      visible: true, 
      variant: 'detailed',
      priority: 4 
    },
    riskMonitoring: { 
      visible: true, 
      variant: 'admin',
      priority: 5 
    },
    taskSummary: { 
      visible: true, 
      variant: 'management',
      priority: 6 
    },
    systemOverview: { 
      visible: true, 
      variant: 'platform',
      priority: 7 
    }
  },
  'Bank': {
    quickActions: { 
      visible: true, 
      variant: 'banking',
      maxActions: 6,
      priority: 1 
    },
    companySnapshot: { 
      visible: true, 
      variant: 'institutional',
      priority: 2 
    },
    networkVisualization: { 
      visible: true, 
      variant: 'relationships',
      priority: 3 
    },
    riskMonitoring: { 
      visible: true, 
      variant: 'compliance',
      priority: 4 
    }
  },
  'FinTech': {
    quickActions: { 
      visible: true, 
      variant: 'self-service',
      maxActions: 4,
      priority: 1 
    },
    companySnapshot: { 
      visible: true, 
      variant: 'company-focused',
      priority: 2 
    },
    riskRadar: { 
      visible: true, 
      variant: 'self-assessment',
      priority: 3 
    },
    taskSummary: { 
      visible: true, 
      variant: 'personal',
      priority: 4 
    }
  }
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Get available widgets for a specific persona
 */
export const getAvailableWidgets = (persona: Persona): string[] => {
  const permissions = WIDGET_PERMISSIONS[persona];
  return Object.entries(permissions)
    .filter(([_, config]) => config.visible)
    .sort((a, b) => (a[1].priority || 999) - (b[1].priority || 999))
    .map(([widgetKey]) => widgetKey);
};

/**
 * Check if a widget is available for a persona
 */
export const isWidgetAvailable = (persona: Persona, widgetKey: string): boolean => {
  return WIDGET_PERMISSIONS[persona]?.[widgetKey]?.visible || false;
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
  return WIDGET_PERMISSIONS[persona]?.[widgetKey]?.variant || 'default';
};