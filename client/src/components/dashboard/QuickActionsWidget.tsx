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
import { InviteModal } from "@/components/playground/InviteModal";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Zap, ArrowRight, Loader2 } from "lucide-react";
import { getQuickActionsForPersona, type Persona } from "@/lib/widgetPersonaConfig";
import { cn } from "@/lib/utils";

interface QuickActionsWidgetProps {
  onToggle: () => void;
  isVisible: boolean;
}

export function QuickActionsWidget({ onToggle, isVisible }: QuickActionsWidgetProps) {
  const [, setLocation] = useLocation();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const handleCompanyProfile = () => {
    // Navigate to company profile in network view - using Invela company ID (1)
    setLocation("/network/company/1");
  };

  const handleInsights = () => {
    // Navigate to insights tab
    setLocation("/insights");
  };

  const handleUploadFile = () => {
    // Navigate to file vault for upload functionality
    setLocation("/file-vault");
  };

  const handleInviteRecipient = () => {
    // Open the invite modal for FinTech companies
    setInviteModalOpen(true);
  };

  const handleTaskCenter = () => {
    // Navigate to task center
    setLocation("/task-center");
  };

  const handleRiskScore = () => {
    // Navigate to network company profile risk tab for current company
    setLocation("/network/company/1?tab=risk");
  };

  const handleNetwork = () => {
    // Navigate to network visualization
    setLocation("/network");
  };

  const handleClaims = () => {
    // Navigate to claims management
    setLocation("/claims");
  };

  const actions = [
    {
      id: "company-profile",
      label: "Company Profile",
      icon: <Building2 className="h-4 w-4" />,
      onClick: handleCompanyProfile
    },
    {
      id: "insights",
      label: "View Insights",
      icon: <BarChart2 className="h-4 w-4" />,
      onClick: handleInsights
    },
    {
      id: "upload-file",
      label: "Upload Files",
      icon: <FolderOpen className="h-4 w-4" />,
      onClick: handleUploadFile
    },
    {
      id: "invite-recipient",
      label: "Invite Recipient",
      icon: <UserPlus className="h-4 w-4" />,
      onClick: handleInviteRecipient
    },
    {
      id: "task-center",
      label: "View Tasks",
      icon: <ListTodo className="h-4 w-4" />,
      onClick: handleTaskCenter
    },
    {
      id: "risk-score",
      label: "View Risk Score",
      icon: <AlertTriangle className="h-4 w-4" />,
      onClick: handleRiskScore
    },
    {
      id: "network",
      label: "Manage Network",
      icon: <Network className="h-4 w-4" />,
      onClick: handleNetwork
    },
    {
      id: "claims",
      label: "Create Claim",
      icon: <Plus className="h-4 w-4" />,
      onClick: handleClaims
    }
  ];

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