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
import { RiskRadarWidget } from "@/components/dashboard/RiskRadarWidget";
import { TaskSummaryWidget } from "@/components/dashboard/TaskSummaryWidget";
import { NetworkVisualizationWidget } from "@/components/dashboard/NetworkVisualizationWidget";
import RiskMonitoringWidget from "@/components/dashboard/RiskMonitoringWidget";
import { SystemOverviewWidget } from "@/components/dashboard/SystemOverviewWidget";
import { RiskMeter } from "@/components/dashboard/RiskMeter";
import { WidgetCustomizationDropdown } from "@/components/dashboard/WidgetCustomizationDropdown";
import { QuickActionsWidget } from "@/components/dashboard/QuickActionsWidget";

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
 * Interface defining all available dashboard widgets
 * Ensures type safety and consistent widget management across company types
 */
interface DashboardWidgets {
  companySnapshot: boolean;
  networkVisualization: boolean;
  riskRadar: boolean;
  riskMonitoring: boolean;
  taskSummary: boolean;
  systemOverview: boolean;
  quickActions: boolean;
}

/**
 * Widget configuration for FinTech companies (Data Recipients)
 * Simplified layout focusing on core risk assessment features
 */
const FINTECH_WIDGETS: DashboardWidgets = {
  companySnapshot: true,
  networkVisualization: false,
  riskRadar: true,
  riskMonitoring: false,
  taskSummary: true,
  systemOverview: false,
  quickActions: true,
};

/**
 * Widget configuration for Bank companies (Data Providers)
 * Enhanced monitoring capabilities for data contribution oversight
 */
const BANK_WIDGETS: DashboardWidgets = {
  companySnapshot: true,
  networkVisualization: true,
  riskRadar: false,
  riskMonitoring: true,
  taskSummary: false,
  systemOverview: false,
  quickActions: true,
};

/**
 * Function to get all available widgets for Admin/Invela users
 * Automatically includes any new widgets added to the system
 */
const getAdminWidgets = (): DashboardWidgets => {
  return {
    companySnapshot: true,
    networkVisualization: true,
    riskRadar: true,
    riskMonitoring: true,
    taskSummary: true,
    systemOverview: true,
    quickActions: true,
  };
};

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
  
  // Widget visibility state with proper type declaration and dynamic initialization
  const [visibleWidgets, setVisibleWidgets] = useState<DashboardWidgets>(getAdminWidgets());
  
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

  // Update widget visibility based on company type
  useEffect(() => {
    if (companyData) {
      const isFinTech = companyData.category === 'FinTech';
      const isInvela = companyData.category === 'Invela';
      const isBank = companyData.category === 'Bank';
      
      // Company-specific widget configurations
      if (isInvela) {
        setVisibleWidgets(getAdminWidgets()); // Admin gets all available widgets
      } else if (isFinTech) {
        setVisibleWidgets(FINTECH_WIDGETS); // Data Recipients: limited widget set
      } else if (isBank) {
        setVisibleWidgets(BANK_WIDGETS); // Data Providers: monitoring-focused widgets
      } else {
        // Fallback to admin widgets for unknown categories
        setVisibleWidgets(getAdminWidgets());
      }
    }
  }, [companyData]);

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
          headerActions={
            <div className="flex items-center gap-2">
              <WidgetCustomizationDropdown
                visibleWidgets={visibleWidgets}
                onToggleWidget={toggleWidget}
                companyCategory={companyData?.category}
              />
            </div>
          }
        >


          {/* Main Dashboard Content */}
          <div className="space-y-6">
            {/* Quick Actions Widget - Available for all personas when enabled */}
            {visibleWidgets.quickActions && (
              <QuickActionsWidget
                onToggle={() => toggleWidget('quickActions')}
                isVisible={visibleWidgets.quickActions}
              />
            )}
            
            {/* Debug logging moved to useEffect for proper React rendering */}
            
            {/* Invela Company Layout - Optimized for Invela Trust Network */}
            {companyData?.category === 'Invela' && (
              <div className="space-y-6">
                {/* Company Snapshot - Full width since Quick Actions moved to top */}
                {visibleWidgets.companySnapshot && (
                  <div>
                    <CompanySnapshot
                      companyData={companyData}
                      onToggle={() => toggleWidget('companySnapshot')}
                      isVisible={visibleWidgets.companySnapshot}
                    />
                  </div>
                )}

                {/* Network Visualization for Invela */}
                {visibleWidgets.networkVisualization && (
                  <div className="h-[600px]">
                    <NetworkVisualizationWidget
                      onToggle={() => toggleWidget('networkVisualization')}
                      isVisible={visibleWidgets.networkVisualization}
                    />
                  </div>
                )}

                {/* Risk Radar and Task Summary for Invela */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Risk Radar for Invela */}
                  {visibleWidgets.riskRadar && companyData && (
                    <div className="h-[320px]">
                      <RiskRadarWidget
                        companyId={companyData?.id || 0}
                        onToggle={() => toggleWidget('riskRadar')}
                        isVisible={visibleWidgets.riskRadar}
                      />
                    </div>
                  )}

                  {/* Task Summary for Invela */}
                  {visibleWidgets.taskSummary && (
                    <div className="h-[320px]">
                      <TaskSummaryWidget
                        onToggle={() => toggleWidget('taskSummary')}
                        isVisible={visibleWidgets.taskSummary}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* FinTech Layout - Simplified for FinTech companies */}
            {companyData?.category === 'FinTech' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Company Snapshot */}
                {visibleWidgets.companySnapshot && (
                  <div className="lg:col-span-1">
                    <CompanySnapshot
                      companyData={companyData}
                      onToggle={() => toggleWidget('companySnapshot')}
                      isVisible={visibleWidgets.companySnapshot}
                    />
                  </div>
                )}

                {/* Task Summary for FinTech */}
                {visibleWidgets.taskSummary && (
                  <div className="lg:col-span-1">
                    <TaskSummaryWidget
                      onToggle={() => toggleWidget('taskSummary')}
                      isVisible={visibleWidgets.taskSummary}
                    />
                  </div>
                )}

                {/* Risk Radar for FinTech */}
                {visibleWidgets.riskRadar && companyData && (
                  <div className="lg:col-span-2 h-[400px]">
                    <RiskRadarWidget
                      companyId={companyData?.id || 0}
                      onToggle={() => toggleWidget('riskRadar')}
                      isVisible={visibleWidgets.riskRadar}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Bank Layout - Full feature set for traditional banks */}
            {companyData?.category === 'Bank' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Company Info */}
                {visibleWidgets.companySnapshot && (
                  <div className="lg:col-span-1 space-y-6">
                    {/* Company Snapshot */}
                    <div>
                      <CompanySnapshot
                        companyData={companyData}
                        onToggle={() => toggleWidget('companySnapshot')}
                        isVisible={visibleWidgets.companySnapshot}
                      />
                    </div>
                  </div>
                )}

                {/* Right Columns - Visualization */}
                {(visibleWidgets.networkVisualization || visibleWidgets.companySnapshot) && (
                  <div className={cn(
                    "space-y-6",
                    visibleWidgets.companySnapshot ? "lg:col-span-2" : "lg:col-span-3"
                  )}>
                    {!visibleWidgets.companySnapshot && visibleWidgets.networkVisualization && (
                      <div>
                        <CompanySnapshot
                          companyData={companyData}
                          onToggle={() => toggleWidget('companySnapshot')}
                          isVisible={visibleWidgets.companySnapshot}
                        />
                      </div>
                    )}

                    {/* Network Visualization for Bank/Invela */}
                    {visibleWidgets.networkVisualization && (
                      <div className="h-[600px]">
                        <NetworkVisualizationWidget
                          onToggle={() => toggleWidget('networkVisualization')}
                          isVisible={visibleWidgets.networkVisualization}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Risk Monitoring Widget for Bank/Invela - Full width */}
            {visibleWidgets.riskMonitoring && companyData?.category !== 'FinTech' && (
              <div className="col-span-3 mt-4">
                <RiskMonitoringWidget />
              </div>
            )}
            

            
            {/* System Overview Widget for Invela - Full width */}
            {visibleWidgets.systemOverview && companyData?.category === 'Invela' && (
              <div className="col-span-3 mt-4">
                <SystemOverviewWidget
                  onToggle={() => toggleWidget('systemOverview')}
                  isVisible={visibleWidgets.systemOverview}
                />
              </div>
            )}
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