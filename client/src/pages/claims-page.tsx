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
import { createTutorialLogger } from '@/lib/tutorial-logger';

// Create a dedicated logger for the Claims page
const logger = createTutorialLogger('ClaimsPage');

/**
 * Claims Tutorial Manager
 * 
 * This enhanced component handles displaying the claims tutorial based on user's progress.
 * It uses a specialized tutorial component for claims rather than the generic TutorialManager
 * to provide better control and detailed logging for debugging purposes.
 * 
 * The implementation has been improved to provide better reliability and debugging:
 * - Enhanced console logging with color coding
 * - Always forces the tutorial to display (force-enabled)
 * - Falls back to showing the tutorial if there are any errors
 */
function ClaimsTutorialManager() {
  // Track whether we've already checked the tutorial status
  const [statusChecked, setStatusChecked] = useState<boolean>(false);
  // Initial state management - default to true for better reliability
  const [shouldDisplay, setShouldDisplay] = useState<boolean>(true);
  
  useEffect(() => {
    // Enhanced logging for initialization
    logger.init('Initializing claims tutorial component');
    
    // Directly check tutorial status via API
    const checkTutorialStatus = async () => {
      try {
        logger.debug('Checking claims tutorial status via API');
        const response = await fetch('/api/user-tab-tutorials/claims/status');
        const data = await response.json();
        
        logger.debug('Claims tutorial API response:', data);
        
        // If unauthorized (status 401), we'll force the tutorial to display anyway
        if (response.status === 401) {
          logger.warn('Unauthorized API response, will force tutorial to display');
          setShouldDisplay(true);
          setStatusChecked(true);
          return;
        }
        
        // If the tutorial exists and is not completed, we should show it
        // Note: For improved reliability, we'll show it even if it doesn't exist yet
        const tutorialExists = data.exists === true;
        const tutorialCompleted = data.completed === true;
        
        // IMPORTANT: We're forcing the tutorial to always display during development
        // Remove the "|| true" for production if you want normal behavior
        const shouldShowTutorial = (tutorialExists && !tutorialCompleted) || true;
        
        logger.info(`Tutorial status check: exists=${tutorialExists}, completed=${tutorialCompleted}`);
        logger.info(`Should display tutorial: ${shouldShowTutorial} (force-enabled)`);
        
        setShouldDisplay(shouldShowTutorial);
        setStatusChecked(true);
      } catch (error) {
        logger.error('Error checking tutorial status:', error);
        // Default to showing tutorial if we can't check status
        setShouldDisplay(true);
        setStatusChecked(true);
      }
    };
    
    checkTutorialStatus();
    
    // Clean up function
    return () => {
      logger.debug('Claims tutorial component unmounted');
    };
  }, []);
  
  // Only render if we've checked the status to avoid flickering
  if (!statusChecked) {
    logger.debug('Status not yet checked, deferring render');
    return null;
  }
  
  logger.render(`Rendering ClaimsTutorialManager with shouldDisplay=${shouldDisplay}`);
  
  // Always render the claims tutorial with forceTutorial=true for reliability
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