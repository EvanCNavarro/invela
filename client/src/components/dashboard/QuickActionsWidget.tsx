/**
 * ========================================
 * Quick Actions Widget - Invela Dashboard Component
 * ========================================
 * 
 * Administrative quick action buttons for Invela company users.
 * Provides one-click access to common platform management tasks.
 * 
 * Key Actions:
 * - View Company Profile
 * - Navigate to Insights
 * - Upload Files (FileVault integration)
 * - Invite Data Recipients (FinTech companies)
 * 
 * @module components/dashboard/QuickActionsWidget
 * @version 1.0.0
 * @since 2025-06-06
 */

import { useState } from "react";
import { Widget } from "@/components/dashboard/Widget";
import { Button } from "@/components/ui/button";
import { InviteModal } from "@/components/playground/InviteModal";
import { useLocation } from "wouter";
import { Building2, BarChart3, Upload, UserPlus, CheckSquare, Shield, ArrowRight, Users, FileText, Zap, TrendingUp, FolderOpen, Network, Activity, Eye, Settings, MessageSquare, BarChart2, AlertTriangle, ListTodo, Plus } from "lucide-react";

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
      label: "Insights",
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
      label: "Risk Analysis",
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
              className="h-14 px-3 flex items-center justify-start gap-3 group hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm transition-all duration-200 ease-in-out transform hover:scale-[1.02]"
              onClick={action.onClick}
            >
              <div className="text-blue-600 group-hover:text-blue-700 transition-colors flex-shrink-0">
                {action.icon}
              </div>
              <span className="font-medium text-xs text-left text-gray-900 group-hover:text-gray-800 leading-tight truncate">{action.label}</span>
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