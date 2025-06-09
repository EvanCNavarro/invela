/**
 * ========================================
 * Dashboard Page Component
 * ========================================
 * 
 * Enterprise dashboard providing comprehensive risk assessment overview,
 * company insights, and real-time monitoring capabilities. Implements
 * responsive design patterns with interactive widgets, tutorial integration,
 * and comprehensive data visualization for executive decision-making support.
 * 
 * Key Features:
 * - Comprehensive risk assessment dashboard with real-time data
 * - Interactive widget system with responsive grid layout
 * - Company snapshot and performance monitoring capabilities
 * - Risk radar and network visualization components
 * - Tutorial integration for user onboarding and guidance
 * - Enterprise-grade authentication and authorization
 * 
 * Dependencies:
 * - DashboardLayout: Layout wrapper for consistent dashboard presentation
 * - Dashboard Widgets: Specialized components for data visualization
 * - UI Components: Professional button, dropdown, and page structure elements
 * - Auth System: User authentication and authorization management
 * - Query Management: React Query for efficient data fetching
 * 
 * @module DashboardPage
 * @version 2.0.0
 * @since 2024-04-15
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for state and lifecycle management
import { useState, useEffect } from "react";
// Routing utilities for navigation management
import { useLocation } from "wouter";

// Layout components for consistent dashboard structure
import { DashboardLayout } from "@/layouts/DashboardLayout";

// Specialized dashboard widget components for data visualization
import { Widget } from "@/components/dashboard/Widget";
import { CompanySnapshot } from "@/components/dashboard/CompanySnapshot";
// Removed obsolete widgets for simplified 3-widget dashboard layout
import { QuickActionsWidget } from "@/components/dashboard/QuickActionsWidget";
import { VisualizerWidget } from "@/components/dashboard/VisualizerWidget";

// UI components for interactive elements and page structure
import { Button } from "@/components/ui/button";
import { InviteButton } from "@/components/ui/invite-button";
import { PageHeader } from "@/components/ui/page-header";
import { PageTemplate } from "@/components/ui/page-template";

// Tutorial system for user guidance and onboarding
import { TutorialManager } from "@/components/tutorial/TutorialManager";

// Icon components for visual consistency and accessibility
import {
  Settings,
  Activity,
  Bell,
  Zap,
  Globe,
  Shield,
  AlertTriangle,
  LayoutGrid,
  User,
  BarChart3,
  FileText
} from "lucide-react";

// Dropdown menu components for navigation and action menus
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// Authentication and data management hooks
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import type { Company } from "@/types/company";
import { InviteModal } from "@/components/playground/InviteModal";
import { cn } from "@/lib/utils";
import { getOptimizedQueryOptions } from "@/lib/queryClient";
import { NetworkVisualization } from "@/components/network";
import { RiskRadarChart } from "@/components/insights/RiskRadarChart";
import { 
  DashboardSkeleton, 
  FinTechDashboardSkeleton 
} from "@/components/dashboard/SkeletonWidgets";

// ========================================
// WIDGET CONFIGURATION INTERFACES
// ========================================

/**
 * Interface defining simplified dashboard widgets for enterprise-grade design
 * Reduced to 3 core widgets for streamlined user experience
 */
interface DashboardWidgets {
  quickActions: boolean;
  companySnapshot: boolean;
  visualizer: boolean;
}

/**
 * Default widget configuration for all company types
 * Unified experience with 3 essential widgets
 */
const DEFAULT_WIDGETS: DashboardWidgets = {
  quickActions: true,
  companySnapshot: true,
  visualizer: true,
};

// Removed obsolete persona-specific configurations - now using unified experience

// ========================================
// MAIN COMPONENT
// ========================================

/**
 * Dashboard Page Component
 * 
 * Comprehensive enterprise dashboard providing risk assessment overview,
 * company insights, and real-time monitoring capabilities. Features
 * responsive widget layout, tutorial integration, and executive-level
 * data visualization for informed decision making.
 * 
 * @returns {JSX.Element} Rendered dashboard page with full feature set
 */
export default function DashboardPage(): JSX.Element {
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  // Navigation state for routing management
  const [location, navigate] = useLocation();
  
  // Authentication context for user management
  const { user } = useAuth();
  
  // Modal state management for user interactions
  const [openFinTechModal, setOpenFinTechModal] = useState(false);
  
  // Simplified widget visibility state for 3-widget dashboard
  const [visibleWidgets, setVisibleWidgets] = useState<DashboardWidgets>(DEFAULT_WIDGETS);
  
  // ========================================
  // DATA FETCHING
  // ========================================
  
  // Company data retrieval with optimized caching
  const { data: companyData, isLoading: isCompanyLoading, error: companyError } = useQuery<Company>({
    queryKey: ['/api/companies/current'],
    refetchInterval: 180000,      // 3 minutes - poll for permission changes
    refetchOnWindowFocus: true,   // Fetch when tab becomes active
    staleTime: 60000,             // 1 minute - keep data fresh
    retry: false,
    gcTime: 5 * 60 * 1000,        // 5 minutes - garbage collection time
    refetchOnReconnect: true,     // Refetch on reconnect
    refetchOnMount: true,         // Refetch on mount
  });

  // ========================================
  // EFFECTS
  // ========================================

  // Debug logging for simplified dashboard structure
  useEffect(() => {
    if (companyData) {
      console.log('[Dashboard] Company loaded:', {
        name: companyData.name,
        category: companyData.category,
        widgets: visibleWidgets
      });
    }
  }, [companyData, visibleWidgets]);

  // ========================================
  // EVENT HANDLERS
  // ========================================

  /**
   * Toggle widget visibility with type-safe implementation
   * @param {keyof DashboardWidgets} widgetKey - Key of the widget to toggle
   */
  const toggleWidget = (widgetKey: keyof DashboardWidgets) => {
    setVisibleWidgets(prev => ({
      ...prev,
      [widgetKey]: !prev[widgetKey]
    }));
  };

  /**
   * Handle quick action navigation
   * @param {string} path - Target navigation path
   */
  const handleQuickAction = (path: string) => {
    navigate(path);
  };

  // ========================================
  // LOADING STATES
  // ========================================

  // ========================================
  // LOADING STATE MANAGEMENT
  // ========================================
  
  /**
   * Enhanced loading state management following enterprise standards
   * Implements proper data availability checks to ensure dashboard renders
   * when company data is successfully loaded from authenticated sources
   * 
   * Loading Logic:
   * - Show loading skeleton only when actively fetching AND no data exists
   * - Prioritize data availability over loading state to prevent infinite loading
   * - Maintain enterprise UX standards with proper skeleton display
   */
  const shouldShowLoading = isCompanyLoading && !companyData;

  // Debug dashboard rendering
  useEffect(() => {
    console.log('🔍 DASHBOARD RENDER DEBUG:', {
      companyData,
      category: companyData?.category,
      visibleWidgets,
      shouldShowLoading,
      isInvelaCompany: companyData?.category === 'Invela'
    });
  }, [companyData, visibleWidgets, shouldShowLoading]);
  
  if (shouldShowLoading) {
    return (
      <DashboardLayout>
        <PageTemplate
          title="Dashboard"
          description="Enterprise risk assessment and monitoring overview"
        >
          <DashboardSkeleton />
        </PageTemplate>
      </DashboardLayout>
    );
  }

  // Handle error states with proper enterprise error display
  if (companyError) {
    return (
      <DashboardLayout>
        <PageTemplate
          title="Dashboard"
          description="Enterprise risk assessment and monitoring overview"
        >
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Unable to load company data
              </h3>
              <p className="text-gray-600">
                Please refresh the page or contact support if the issue persists.
              </p>
            </div>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  // Error state handling
  if (companyError) {
    return (
      <DashboardLayout>
        <PageTemplate
          title="Dashboard"
          description="Enterprise risk assessment and monitoring overview"
        >
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Unable to Load Dashboard</h3>
              <p className="text-muted-foreground">
                There was an error loading your company data. Please try refreshing the page.
              </p>
            </div>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <DashboardLayout>
      <TutorialManager tabName="dashboard">
        <PageTemplate
          title="Dashboard"
          description="Enterprise risk assessment and monitoring overview"
          headerActions={null}
        >


          {/* Main Dashboard Content */}
          <div className="space-y-6">
            {/* Quick Actions Widget - Available for all personas when enabled */}
            {visibleWidgets.quickActions && (
              <div className="widget-entrance-animation widget-entrance-stagger-1">
                <QuickActionsWidget
                  onToggle={() => toggleWidget('quickActions')}
                  isVisible={visibleWidgets.quickActions}
                />
              </div>
            )}
            
            {/* Unified Layout for All Company Types - Simplified 3-Widget Structure */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Company Snapshot Widget - 1 column */}
              {visibleWidgets.companySnapshot && (
                <div className="lg:col-span-1 widget-entrance-animation widget-entrance-stagger-2">
                  <CompanySnapshot
                    companyData={companyData}
                    onToggle={() => toggleWidget('companySnapshot')}
                    isVisible={visibleWidgets.companySnapshot}
                    animationDelay={200}
                  />
                </div>
              )}

              {/* Dynamic Visualizer Widget - 2 columns */}
              {visibleWidgets.visualizer && (
                <div className="lg:col-span-2 widget-entrance-animation widget-entrance-stagger-3">
                  <VisualizerWidget
                    onToggle={() => toggleWidget('visualizer')}
                    isVisible={visibleWidgets.visualizer}
                  />
                </div>
              )}
            </div>
            


          </div>

        </PageTemplate>

        <InviteModal
          variant="fintech"
          open={openFinTechModal}
          onOpenChange={setOpenFinTechModal}
        />
      </TutorialManager>
    </DashboardLayout>
  );
}