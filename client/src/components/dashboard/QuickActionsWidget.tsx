/**
 * ========================================
 * Quick Actions Widget - Enterprise Dashboard Component
 * ========================================
 * 
 * Persona-based quick action interface providing contextual access to platform
 * functionality. Implements the unified design token system with smooth animations,
 * accessibility compliance, and responsive behavior.
 * 
 * Key Features:
 * - Persona-based action filtering (Invela, Bank, FinTech)
 * - Unified design token integration
 * - Smooth entrance animations with staggered delays
 * - Professional hover and focus interactions
 * - Accessibility-compliant design
 * - Loading states with shimmer effects
 * - Error handling with fallback UI
 * 
 * Design System Integration:
 * - widget-button-action for consistent button styling
 * - widget-grid-actions for responsive layout
 * - widget-icon-standard for icon sizing
 * - widget-entrance-animation for premium feel
 * 
 * @module components/dashboard/QuickActionsWidget
 * @version 3.0.0
 * @since 2025-06-09
 */

import { useState, useEffect } from "react";
import { Widget } from "@/components/dashboard/Widget";
import { Button } from "@/components/ui/button";
import { InviteModal } from "@/components/playground/InviteModal";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Zap, 
  ArrowRight, 
  Loader2, 
  Building2, 
  BarChart2, 
  FolderOpen, 
  UserPlus, 
  ListTodo, 
  AlertTriangle, 
  Network, 
  Plus 
} from "lucide-react";
import { getQuickActionsForPersona, type Persona } from "@/lib/widgetPersonaConfig";
import { cn } from "@/lib/utils";

interface QuickActionsWidgetProps {
  onToggle: () => void;
  isVisible: boolean;
  /** Animation delay for staggered entrance effects */
  animationDelay?: number;
}

export function QuickActionsWidget({ 
  onToggle, 
  isVisible, 
  animationDelay = 0 
}: QuickActionsWidgetProps) {
  const [, setLocation] = useLocation();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // ========================================
  // DATA FETCHING & PERSONA DETECTION
  // ========================================

  // Fetch current company data to determine user persona
  const { data: companyData, isLoading: companyLoading, error } = useQuery({
    queryKey: ['/api/companies/current'],
    retry: 3,
    retryDelay: 1000
  });

  // Initialize loading state management
  useEffect(() => {
    console.log('[QuickActions] Widget initializing with animation delay:', animationDelay);
    const timer = setTimeout(() => {
      setIsInitializing(false);
      console.log('[QuickActions] Initialization complete');
    }, 300);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  // Determine user persona from company data with fallback
  const persona: Persona = (companyData as any)?.category || 'FinTech';
  console.log('[QuickActions] User persona detected:', persona, 'from company:', (companyData as any)?.name);

  // ========================================
  // PERSONA-BASED ACTION CONFIGURATION
  // ========================================

  // Handle invite modal for recipient invitations
  const handleInviteModal = () => {
    console.log('[QuickActions] Opening invite modal');
    setInviteModalOpen(true);
  };
  
  // Get persona-specific actions from configuration system
  const personaActions = getQuickActionsForPersona(persona, setLocation);
  console.log('[QuickActions] Loaded', personaActions.length, 'actions for persona:', persona);
  
  // Map actions with proper event handlers
  const actions = personaActions.map(action => ({
    ...action,
    onClick: action.id === 'invite-recipient' ? handleInviteModal : action.onClick
  }));

  // ========================================
  // LOADING & ERROR STATE HANDLING
  // ========================================

  // Show enhanced loading skeleton during data fetch
  if (companyLoading || isInitializing) {
    console.log('[QuickActions] Rendering loading state');
    return (
      <Widget
        title="Quick Actions"
        icon={<Zap className="widget-icon-header" />}
        onVisibilityToggle={onToggle}
        isVisible={isVisible}
        size="standard"
        loadingState="shimmer"
        isLoading={true}
        animationDelay={animationDelay}
        ariaLabel="Quick actions widget loading"
      >
        <div className="widget-grid-actions">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="widget-skeleton-shimmer h-14 rounded-lg"
              style={{ 
                animationDelay: `${animationDelay + (index * 100)}ms` 
              }}
            />
          ))}
        </div>
      </Widget>
    );
  }

  // Show error state with retry option
  if (error) {
    console.error('[QuickActions] Error loading data:', error);
    return (
      <Widget
        title="Quick Actions"
        icon={<Zap className="widget-icon-header" />}
        onVisibilityToggle={onToggle}
        isVisible={isVisible}
        size="standard"
        error="Unable to load quick actions. Please refresh to try again."
        animationDelay={animationDelay}
      />
    );
  }

  // ========================================
  // MAIN RENDER - ENTERPRISE WIDGET
  // ========================================

  console.log('[QuickActions] Rendering main widget with', actions.length, 'actions for', persona);

  return (
    <>
      <Widget
        title="Quick Actions"
        icon={<Zap className="h-5 w-5" />}
        onVisibilityToggle={onToggle}
        isVisible={isVisible}
        headerClassName="pb-4"
        className="h-full"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              className="h-14 px-3 flex items-center justify-between group hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm transition-all duration-200 ease-in-out transform hover:scale-[1.02]"
              onClick={action.onClick}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="text-blue-600 group-hover:text-blue-700 transition-colors flex-shrink-0">
                  {action.icon}
                </div>
                <span className="font-medium text-xs text-left text-gray-900 group-hover:text-gray-800 leading-tight truncate">{action.label}</span>
              </div>
              <ArrowRight className="h-3 w-3 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0 ml-1" />
            </Button>
          ))}
        </div>
      </Widget>

      {/* Invite Modal for FinTech companies */}
      <InviteModal
        variant="fintech"
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        onSuccess={() => {
          setInviteModalOpen(false);
          // Could add toast notification here if needed
        }}
      />
    </>
  );
}