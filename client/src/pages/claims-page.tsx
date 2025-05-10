import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { PageTemplate } from "@/components/ui/page-template";
import { Skeleton } from "@/components/ui/skeleton";
import { TutorialManager } from "@/components/tutorial/TutorialManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { TabTutorialModal } from '@/components/tutorial/TabTutorialModal';
import { ClaimsTutorial } from '@/components/tutorial/tabs/ClaimsTutorial';

/**
 * Claims Tutorial Manager
 * 
 * This component handles displaying the claims tutorial based on user's progress.
 * It uses a specialized tutorial component for claims rather than the generic TutorialManager
 * to provide better control and detailed logging for debugging purposes.
 */
function ClaimsTutorialManager() {
  // Track whether we've already checked the tutorial status
  const [statusChecked, setStatusChecked] = useState<boolean>(false);
  // Initial state management
  const [shouldDisplay, setShouldDisplay] = useState<boolean>(false);
  
  useEffect(() => {
    // Standard logging for initialization
    console.log('[ClaimsTutorialManager] Initializing claims tutorial component');
    
    // Directly check tutorial status via API
    const checkTutorialStatus = async () => {
      try {
        console.log('[ClaimsTutorialManager] Checking claims tutorial status via API');
        const response = await fetch('/api/user-tab-tutorials/claims/status');
        const data = await response.json();
        
        console.log('[ClaimsTutorialManager] Claims tutorial status:', data);
        
        // If the tutorial exists and is not completed, we should show it
        const shouldShowTutorial = data.exists && !data.completed;
        console.log(`[ClaimsTutorialManager] Should display tutorial: ${shouldShowTutorial}`);
        
        setShouldDisplay(shouldShowTutorial);
        setStatusChecked(true);
      } catch (error) {
        console.error('[ClaimsTutorialManager] Error checking tutorial status:', error);
        // Default to showing tutorial if we can't check status
        setShouldDisplay(true);
        setStatusChecked(true);
      }
    };
    
    checkTutorialStatus();
    
    // Clean up function
    return () => {
      console.log('[ClaimsTutorialManager] Claims tutorial component unmounted');
    };
  }, []);
  
  // Only render if we've checked the status to avoid flickering
  if (!statusChecked) {
    console.log('[ClaimsTutorialManager] Status not yet checked, deferring render');
    return null;
  }
  
  console.log(`[ClaimsTutorialManager] Rendering with shouldDisplay=${shouldDisplay}`);
  
  // Render the claims tutorial component
  return (
    <>
      {shouldDisplay && <ClaimsTutorial forceTutorial={true} />}
    </>
  );
}

export default function ClaimsPage() {
  return (
    <DashboardLayout>
      {/* Enhanced claims tutorial manager with debug logging */}
      <ClaimsTutorialManager />
      
      <PageTemplate
        showBreadcrumbs
      >
        <div className="space-y-6">
          <PageHeader
            title="Claims"
            description="View and manage your organization's claims."
            icon={<FileText className="h-6 w-6 text-primary" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Open Claims</CardTitle>
                <CardDescription>Claims pending resolution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest claims updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Claims History</CardTitle>
              <CardDescription>Complete history of all claims</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}