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

// Claims-specific tutorial manager to resolve any issues with the standard component
function ClaimsTutorialManager() {
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [tutorialEnabled, setTutorialEnabled] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Tutorial content specific to claims
  const steps = [
    {
      title: 'Claims Dashboard',
      description: 'Welcome to Claims Management. This dashboard gives you an overview of all claims, their status, and important metrics.',
      imagePath: '/assets/tutorials/claims/overview.svg',
    },
    {
      title: 'Claim Details',
      description: 'Click on any claim to view its full details, including policy information, claimant data, and documentation.',
      imagePath: '/assets/tutorials/claims/details.svg',
    },
    {
      title: 'Claims Processing',
      description: 'Use these tools to process claims efficiently. You can update status, request additional information, or approve payments.',
      imagePath: '/assets/tutorials/claims/processing.svg',
    },
    {
      title: 'Analytics Dashboard',
      description: 'The analytics dashboard provides insights into claims trends, settlement times, and potential fraud indicators.',
      imagePath: '/assets/tutorials/claims/analytics.svg',
    },
    {
      title: 'Documentation Management',
      description: 'Manage all claim-related documents in this section. You can upload, organize, and securely share important files with stakeholders.',
      imagePath: '/assets/tutorials/claims/documentation.svg',
    }
  ];
  
  // Load tutorial status on mount
  useEffect(() => {
    const loadTutorialStatus = async () => {
      try {
        console.log('[ClaimsTutorialManager] Loading tutorial status for claims tab');
        const result = await apiRequest('/api/user-tab-tutorials/claims/status');
        console.log('[ClaimsTutorialManager] Tutorial status response:', result);
        
        if (result) {
          setCurrentStep(result.currentStep || 0);
          setIsCompleted(result.completed || false);
          setTutorialEnabled(true);
        }
      } catch (error) {
        console.error('[ClaimsTutorialManager] Error loading tutorial status:', error);
        // Force enable the tutorial even if there's an error
        setTutorialEnabled(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTutorialStatus();
  }, []);
  
  // Handle next step
  const handleNext = async () => {
    const nextStep = currentStep + 1;
    
    if (nextStep >= totalSteps) {
      // Complete tutorial
      setIsCompleted(true);
      try {
        await apiRequest('POST', '/api/user-tab-tutorials', {
          tabName: 'claims',
          currentStep,
          completed: true
        });
      } catch (error) {
        console.error('[ClaimsTutorialManager] Error completing tutorial:', error);
      }
    } else {
      // Go to next step
      setCurrentStep(nextStep);
      try {
        await apiRequest('POST', '/api/user-tab-tutorials', {
          tabName: 'claims',
          currentStep: nextStep,
          completed: false
        });
      } catch (error) {
        console.error('[ClaimsTutorialManager] Error updating tutorial step:', error);
      }
    }
  };
  
  // Handle back step
  const handleBack = async () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      try {
        await apiRequest('POST', '/api/user-tab-tutorials', {
          tabName: 'claims',
          currentStep: prevStep,
          completed: false
        });
      } catch (error) {
        console.error('[ClaimsTutorialManager] Error updating tutorial step:', error);
      }
    }
  };
  
  // Handle tutorial completion
  const handleComplete = async () => {
    setIsCompleted(true);
    try {
      await apiRequest('POST', '/api/user-tab-tutorials', {
        tabName: 'claims',
        currentStep,
        completed: true
      });
    } catch (error) {
      console.error('[ClaimsTutorialManager] Error completing tutorial:', error);
    }
  };
  
  // Skip tutorial
  const handleSkip = async () => {
    try {
      await apiRequest('POST', '/api/user-tab-tutorials/mark-seen', {
        tabName: 'claims'
      });
      setTutorialEnabled(false);
    } catch (error) {
      console.error('[ClaimsTutorialManager] Error skipping tutorial:', error);
      setTutorialEnabled(false);
    }
  };
  
  // Log current state
  console.log('[ClaimsTutorialManager] Current state:', {
    isLoading,
    tutorialEnabled,
    currentStep,
    totalSteps,
    isCompleted
  });
  
  // Don't render if loading, tutorial not enabled, or completed
  if (isLoading || !tutorialEnabled || isCompleted) {
    return <TutorialManager tabName="claims" />;
  }
  
  // Get the current step content
  const currentStepContent = steps[currentStep];
  
  return (
    <TabTutorialModal
      title={currentStepContent.title}
      description={currentStepContent.description}
      imageUrl={currentStepContent.imagePath}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={handleNext}
      onBack={currentStep > 0 ? handleBack : undefined}
      onClose={handleSkip}
      onComplete={handleComplete}
    />
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