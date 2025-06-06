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
import { Building2, BarChart3, Upload, UserPlus } from "lucide-react";

interface QuickActionsWidgetProps {
  onToggle: () => void;
  isVisible: boolean;
}

export function QuickActionsWidget({ onToggle, isVisible }: QuickActionsWidgetProps) {
  const [, setLocation] = useLocation();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const handleCompanyProfile = () => {
    // Navigate to company profile
    setLocation("/company/1");
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

  const actions = [
    {
      id: "company-profile",
      label: "View Company Profile",
      icon: <Building2 className="h-5 w-5" />,
      onClick: handleCompanyProfile,
      description: "View your company details"
    },
    {
      id: "insights",
      label: "View Insights",
      icon: <BarChart3 className="h-5 w-5" />,
      onClick: handleInsights,
      description: "Access analytics dashboard"
    },
    {
      id: "upload-file",
      label: "Upload File",
      icon: <Upload className="h-5 w-5" />,
      onClick: handleUploadFile,
      description: "Upload documents to FileVault"
    },
    {
      id: "invite-recipient",
      label: "Invite Data Recipient",
      icon: <UserPlus className="h-5 w-5" />,
      onClick: handleInviteRecipient,
      description: "Invite FinTech companies"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center text-center space-y-2 hover:bg-blue-50 hover:border-blue-200 transition-colors"
              onClick={action.onClick}
            >
              <div className="text-blue-600">
                {action.icon}
              </div>
              <div>
                <div className="font-medium text-sm">{action.label}</div>
                <div className="text-xs text-gray-500 mt-1">{action.description}</div>
              </div>
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