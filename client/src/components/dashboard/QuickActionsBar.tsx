/**
 * ========================================
 * Quick Actions Bar - Full Width Dashboard Component
 * ========================================
 * 
 * Full-width quick action buttons for data provider personas.
 * Provides one-click access to core platform navigation and actions.
 * 
 * Key Actions:
 * - View Company Profile
 * - View Insights  
 * - View Network
 * - Invite Data Recipient
 * 
 * @module components/dashboard/QuickActionsBar
 * @version 1.0.0
 * @since 2025-06-08
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InviteModal } from "@/components/playground/InviteModal";
import { useLocation } from "wouter";
import { Building2, BarChart3, Users, UserPlus } from "lucide-react";

interface QuickActionsBarProps {
  companyCategory?: string;
}

export function QuickActionsBar({ companyCategory }: QuickActionsBarProps) {
  const [, setLocation] = useLocation();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const handleCompanyProfile = () => {
    // Navigate to company profile in network view - using current company ID (1984 for demo)
    setLocation("/network/company/1984");
  };

  const handleInsights = () => {
    // Navigate to insights tab
    setLocation("/insights");
  };

  const handleNetwork = () => {
    // Navigate to network visualization
    setLocation("/network");
  };

  const handleInviteRecipient = () => {
    // Open the invite modal for FinTech companies
    setInviteModalOpen(true);
  };

  // Only show for data provider personas (currently Bank and Invela)
  if (companyCategory === 'FinTech') {
    return null;
  }

  return (
    <>
      <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">Quick Actions</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Button
            variant="outline"
            className="h-12 px-4 flex items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm transition-all duration-200"
            onClick={handleCompanyProfile}
          >
            <Building2 className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm text-gray-900">View Company Profile</span>
          </Button>

          <Button
            variant="outline"
            className="h-12 px-4 flex items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm transition-all duration-200"
            onClick={handleInsights}
          >
            <BarChart3 className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm text-gray-900">View Insights</span>
          </Button>

          <Button
            variant="outline"
            className="h-12 px-4 flex items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm transition-all duration-200"
            onClick={handleNetwork}
          >
            <Users className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm text-gray-900">View Network</span>
          </Button>

          <Button
            variant="outline"
            className="h-12 px-4 flex items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm transition-all duration-200"
            onClick={handleInviteRecipient}
          >
            <UserPlus className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm text-gray-900">Invite Data Recipient</span>
          </Button>
        </div>
      </div>

      <InviteModal
        variant="fintech"
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
      />
    </>
  );
}