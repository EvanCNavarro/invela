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
import { Building2, BarChart3, Upload, UserPlus, CheckSquare, Shield, ArrowRight, Users, FileText } from "lucide-react";

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
    // Navigate to company profile risk tab for current company
    setLocation("/company-profile/1?tab=risk");
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
      icon: <BarChart3 className="h-4 w-4" />,
      onClick: handleInsights
    },
    {
      id: "upload-file",
      label: "Upload File",
      icon: <Upload className="h-4 w-4" />,
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
      label: "Task Center",
      icon: <CheckSquare className="h-4 w-4" />,
      onClick: handleTaskCenter
    },
    {
      id: "risk-score",
      label: "Risk Score",
      icon: <Shield className="h-4 w-4" />,
      onClick: handleRiskScore
    },
    {
      id: "network",
      label: "Network View",
      icon: <Users className="h-4 w-4" />,
      onClick: handleNetwork
    },
    {
      id: "claims",
      label: "Manage Claims",
      icon: <FileText className="h-4 w-4" />,
      onClick: handleClaims
    }
  ];

  return (
    <>
      <Widget
        title="Quick Actions"
        subtitle="Common administrative tasks"
        icon={<Building2 className="h-5 w-5" />}
        onVisibilityToggle={onToggle}
        isVisible={isVisible}
        headerClassName="pb-4"
        className="h-full"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              className="h-14 px-4 pr-3 flex items-center justify-between group hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm transition-all duration-200 ease-in-out transform hover:scale-[1.02]"
              onClick={action.onClick}
            >
              <div className="flex items-center space-x-2">
                <div className="text-blue-600 group-hover:text-blue-700 transition-colors">
                  {action.icon}
                </div>
                <span className="font-medium text-sm text-gray-900 group-hover:text-gray-800">{action.label}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-200 ml-2" />
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