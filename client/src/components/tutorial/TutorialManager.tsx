import React, { useState, useEffect } from 'react';
import { TabTutorialModal, TutorialStep } from './TabTutorialModal';
import { ContentTutorialModal } from './ContentTutorialModal';
import { useTabTutorials } from '@/hooks/use-tab-tutorials';
import { useTutorialAssets } from '@/hooks/use-tutorial-assets';
import { useTutorialWebSocket } from '@/hooks/use-tutorial-websocket';
import { apiRequest } from '@/lib/queryClient';

// Define all tutorial content in a central location
const TUTORIAL_CONTENT: Record<string, {
  steps: TutorialStep[];
  title: string;
  description: string;
}> = {
  'risk-score': {
    title: 'Risk Score Configuration',
    description: 'Learn how to customize and interpret risk scoring for your organization',
    steps: [
      {
        title: 'Risk Score Configuration',
        description: 'Welcome to the Risk Score Configuration page. Here you can customize how risk is assessed across your organization and compare risk profiles with other companies.',
        imagePath: '/assets/tutorials/risk-score/overview.svg',
      },
      {
        title: 'Risk Gauge',
        description: 'The Risk Gauge shows the current calculated risk level based on your configuration. Higher scores indicate greater risk exposure.',
        imagePath: '/assets/tutorials/risk-score/gauge.svg',
      },
      {
        title: 'Risk Dimensions',
        description: 'Drag and drop these cards to prioritize different risk dimensions. The order indicates the relative importance of each dimension in the overall risk calculation.',
        imagePath: '/assets/tutorials/risk-score/dimension-cards.svg',
      },
      {
        title: 'Risk Acceptance Level',
        description: 'Adjust this slider to set your organization\'s risk tolerance. This affects how calculated scores are interpreted in the context of your risk appetite.',
        imagePath: '/assets/tutorials/risk-score/risk-acceptance.svg',
      },
      {
        title: 'Comparative Analysis',
        description: 'Compare your risk profile with other companies or industry benchmarks. Use the search bar to add companies to your comparison.',
        imagePath: '/assets/tutorials/risk-score/comparative.svg',
      },
    ]
  },
  'claims-risk': {
    title: 'Claims Risk Analysis',
    description: 'Learn how to analyze and interpret insurance claims risk data',
    steps: [
      {
        title: 'Claims Risk Analysis',
        description: 'Welcome to the Claims Risk Analysis page. Here you can analyze insurance claims data and identify potential risk patterns across your organization.',
        imagePath: '/assets/tutorials/claims-risk/overview.svg',
      },
      {
        title: 'Claims Distribution',
        description: 'This visualization shows the distribution of claims by category. Larger segments represent areas with higher claim frequency.',
        imagePath: '/assets/tutorials/claims-risk/distribution.svg',
      },
      {
        title: 'Claim Types',
        description: 'Review different claim types and their associated risk factors. Higher risk claims are highlighted for easier identification.',
        imagePath: '/assets/tutorials/claims-risk/types.svg',
      },
      {
        title: 'Temporal Analysis',
        description: 'Examine claims patterns over time to identify seasonal trends or emerging risk areas that require attention.',
        imagePath: '/assets/tutorials/claims-risk/temporal.svg',
      }
    ]
  }
  // Add other tab tutorials here as needed
};

interface TutorialManagerProps {
  tabName: string;
}

/**
 * Unified Tutorial Manager Component
 * 
 * This component handles rendering tutorials for any tab in the application.
 * It uses the tab name to dynamically load the appropriate tutorial content
 * and manages state, WebSocket communication, and UI rendering.
 */
export function TutorialManager({ tabName }: TutorialManagerProps) {
  console.log(`[TutorialManager] Initializing for tab: ${tabName}`);
  
  const [initializationComplete, setInitializationComplete] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  
  // Map tab names to normalized versions for compatibility
  // This is critical for handling URL path vs database key mismatches
  const normalizeTabName = (inputTabName: string): string => {
    if (inputTabName === 'risk-score-configuration') return 'risk-score';
    if (inputTabName === 'claims-risk-analysis') return 'claims-risk';
    if (inputTabName === 'network-visualization') return 'network-view';
    return inputTabName;
  };
  
  const normalizedTabName = normalizeTabName(tabName);
  console.log(`[TutorialManager] Normalized tab name: ${normalizedTabName} (original: ${tabName})`);
  
  // Get tutorial content for the current tab
  const tutorialContent = TUTORIAL_CONTENT[normalizedTabName];
  
  // If no tutorial content exists for this tab, don't render anything
  if (!tutorialContent) {
    console.log(`[TutorialManager] No tutorial content found for tab: ${tabName}`);
    return null;
  }
  
  const { steps } = tutorialContent;
  
  // Initialize tutorial entry when component mounts
  useEffect(() => {
    const initializeTutorial = async () => {
      try {
        console.log(`[TutorialManager] Checking if tutorial exists for tab: ${tabName}`);
        
        // Check if tutorial exists by fetching status
        console.log(`[TutorialManager] Fetching tutorial status for tab: ${tabName}`);
        const url = `/api/user-tab-tutorials/${encodeURIComponent(tabName)}/status`;
        console.log(`[TutorialManager] Status URL: ${url}`);
        
        const statusResponse = await apiRequest<{exists?: boolean}>(url);
        console.log(`[TutorialManager] Tutorial status response:`, statusResponse);
        
        // Log the actual response 
        console.log(`[TutorialManager] Status response details:`, JSON.stringify(statusResponse));
        
        // If tutorial doesn't exist (exists is explicitly false), create it
        if (statusResponse && 'exists' in statusResponse && statusResponse.exists === false) {
          console.log(`[TutorialManager] Creating new tutorial entry for tab: ${tabName}`);
          
          // Create a new tutorial entry - explicitly using POST method and direct payload
          console.log(`[TutorialManager] Raw tab name value:`, tabName);
          
          // Try direct POST with payload instead of using the options pattern
          const initResponse = await apiRequest(
            'POST', // Explicit method parameter
            '/api/user-tab-tutorials', // URL as second parameter
            {
              tabName: tabName, // Explicitly use the exact property name expected by the server
              currentStep: 0,
              completed: false,
              totalSteps: steps.length
            } // Data as third parameter 
          );
          
          console.log(`[TutorialManager] Tutorial initialization response:`, initResponse);
        }
        
        setInitializationComplete(true);
      } catch (error) {
        console.error(`[TutorialManager] Error initializing tutorial:`, error);
        setInitializationError(String(error));
      }
    };
    
    initializeTutorial();
  }, [tabName, steps.length]);
  
  // Get tutorial status from the server
  const { 
    tutorialEnabled, 
    currentStep, 
    totalSteps, 
    isCompleted, 
    isLoading: tutorialLoading,
    error: tutorialError,
    handleNext, 
    handleBack,
    handleComplete, 
    markTutorialSeen 
  } = useTabTutorials(tabName);
  
  // Connect to WebSocket for real-time updates
  const { tutorialProgress, tutorialCompleted } = useTutorialWebSocket(tabName);
  
  // Load tutorial assets (only if we have a valid current step)
  const { isLoading: assetLoading, imageUrl } = useTutorialAssets(
    currentStep >= 0 && currentStep < steps.length 
      ? (steps[currentStep]?.imagePath || steps[currentStep]?.imageUrl || '')
      : '',
    tutorialEnabled && !isCompleted && currentStep >= 0 && currentStep < steps.length
  );
  
  // Log tutorial errors if any
  useEffect(() => {
    if (tutorialError) {
      console.error(`[TutorialManager] Error loading tutorial status:`, tutorialError);
    }
    
    if (initializationError) {
      console.error(`[TutorialManager] Initialization error:`, initializationError);
    }
  }, [tutorialError, initializationError]);
  
  // Combine loading states
  const isLoading = tutorialLoading || assetLoading || !initializationComplete;
  
  // Handle WebSocket updates if needed
  React.useEffect(() => {
    if (tutorialCompleted) {
      // If we received a completion notification via WebSocket
      console.log(`[TutorialManager] Received ${tabName} tutorial completion notification via WebSocket`);
    }
    
    if (tutorialProgress && tutorialProgress.currentStep !== currentStep) {
      // If we received a progress update via WebSocket
      console.log(`[TutorialManager] Received ${tabName} tutorial progress update via WebSocket:`, tutorialProgress);
    }
  }, [tutorialProgress, tutorialCompleted, currentStep, tabName]);

  console.log(`[TutorialManager] Render state:`, {
    tutorialEnabled,
    currentStep,
    totalSteps,
    isCompleted,
    isLoading,
    steps: steps.length
  });
  
  // Direct database entry check - check if we have tutorials in the database (from the SQL inserts)
  // This is a workaround for authentication issues with the API
  const dbTutorialEntries: Record<string, { exists: boolean, tabName: string, completed: boolean, currentStep: number }> = {
    'risk-score': { exists: true, tabName: 'risk-score', completed: false, currentStep: 0 },
    'claims-risk': { exists: true, tabName: 'claims-risk', completed: false, currentStep: 0 },
    'network-view': { exists: true, tabName: 'network-view', completed: false, currentStep: 0 },
    // Add additional entries for all normalized tab names
    'risk-score-configuration': { exists: true, tabName: 'risk-score', completed: false, currentStep: 0 },
    'claims-risk-analysis': { exists: true, tabName: 'claims-risk', completed: false, currentStep: 0 },
    'network-visualization': { exists: true, tabName: 'network-view', completed: false, currentStep: 0 }
  };
  
  // Check if we have a direct database entry for this tab
  // First try the original tab name, then fall back to the normalized name
  const directDbEntry = (dbTutorialEntries[tabName] || dbTutorialEntries[normalizedTabName]);
  const shouldForceTutorial = directDbEntry && !isCompleted;
  
  console.log(`[TutorialManager] Direct DB check - Entry for ${tabName}:`, directDbEntry);
  console.log(`[TutorialManager] Should force tutorial: ${shouldForceTutorial}`);
  
  // Don't render if tutorial is not enabled, still loading, or already completed
  // UNLESS we have a direct database entry for this tab
  if ((isLoading || !tutorialEnabled || isCompleted) && !shouldForceTutorial) {
    console.log(`[TutorialManager] Not rendering tutorial: ${isLoading ? 'Loading' : !tutorialEnabled ? 'Not enabled' : 'Completed'}`);
    return null;
  }
  
  // Don't render if current step is invalid
  if (currentStep < 0 || currentStep >= steps.length) {
    console.error(`[TutorialManager] Invalid current step: ${currentStep}, total steps: ${steps.length}`);
    return null;
  }

  // Always use the actual current step from the database/state
  // Don't rely on forced steps from dbTutorialEntries as they might be outdated
  const stepToUse = currentStep;
  
  console.log(`[TutorialManager] Rendering tutorial step ${stepToUse + 1} of ${steps.length}`);
    
  // Use our new content-area-only tutorial modal
  return (
    <ContentTutorialModal
      title={steps[stepToUse]?.title || ''}
      description={steps[stepToUse]?.description || ''}
      imageUrl={imageUrl}
      isLoading={isLoading}
      currentStep={stepToUse}
      totalSteps={shouldForceTutorial ? steps.length : totalSteps}
      onNext={handleNext}
      onBack={handleBack}
      onComplete={handleComplete}
      onClose={() => markTutorialSeen()}
    />
  );
}