import React, { useState, useEffect } from 'react';
import { TabTutorialModal, TutorialStep } from './TabTutorialModal';
import { ContentTutorialModal } from './ContentTutorialModal';
import { useTabTutorials } from '@/hooks/use-tab-tutorials';
import { useTutorialAssets } from '@/hooks/use-tutorial-assets';
import { useTutorialWebSocket } from '@/hooks/use-tutorial-websocket';
import { apiRequest } from '@/lib/queryClient';
import { createTutorialLogger } from '@/lib/tutorial-logger';

// Create a dedicated logger for TutorialManager
const logger = createTutorialLogger('TutorialManager');

// Define all tutorial content in a central location
const TUTORIAL_CONTENT: Record<string, {
  steps: TutorialStep[];
  title: string;
  description: string;
}> = {
  // Claims Tutorial - Added to ensure consistent integration with TutorialManager
  'claims': {
    title: 'Claims Management',
    description: 'Learn how to view, manage, and analyze claims across your organization',
    steps: [
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
    ]
  },
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
  },
  'network-view': {
    title: 'Network Visualization',
    description: 'Learn how to use the network visualization to understand relationships and risk exposure',
    steps: [
      {
        title: 'Network Overview',
        description: 'Welcome to the Network Visualization page. This tool helps you understand connections and risk relationships between different entities in your network.',
        imagePath: '/assets/tutorials/network-view/overview.svg',
      },
      {
        title: 'Connection Types',
        description: 'Different connection lines represent various relationship types. Thicker lines indicate stronger connections and potentially higher risk exposure.',
        imagePath: '/assets/tutorials/network-view/connections.svg',
      },
      {
        title: 'Entity Information',
        description: 'Click on any entity to view detailed information. You can see risk scores, connection details, and historical data.',
        imagePath: '/assets/tutorials/network-view/entity-details.svg',
      },
      {
        title: 'Filtering Options',
        description: 'Use the filtering options to focus on specific relationship types, risk thresholds, or entity categories.',
        imagePath: '/assets/tutorials/network-view/filtering.svg',
      }
    ]
  },
  'dashboard': {
    title: 'Dashboard Overview',
    description: 'Learn how to navigate and use the main dashboard',
    steps: [
      {
        title: 'Dashboard Overview',
        description: 'Welcome to your dashboard. This is your central hub for monitoring risk, tasks, and important metrics across your organization.',
        imagePath: '/assets/tutorials/dashboard/overview.svg',
      },
      {
        title: 'Summary Cards',
        description: 'These cards provide quick insights into key metrics. Click any card to view more detailed information about that specific area.',
        imagePath: '/assets/tutorials/dashboard/summary-cards.svg',
      },
      {
        title: 'Recent Activity',
        description: 'The Recent Activity section shows the latest changes, updates, and important events related to your organization.',
        imagePath: '/assets/tutorials/dashboard/recent-activity.svg',
      },
      {
        title: 'Action Items',
        description: 'Action Items highlight tasks that require your attention. Click on any item to take immediate action or view more details.',
        imagePath: '/assets/tutorials/dashboard/action-items.svg',
      }
    ]
  },
  'task-center': {
    title: 'Task Center',
    description: 'Learn how to manage and track tasks in the Task Center',
    steps: [
      {
        title: 'Task Center Overview',
        description: 'Welcome to the Task Center. This is where you can track, manage, and complete all tasks assigned to your organization.',
        imagePath: '/assets/tutorials/task-center/overview.svg',
      },
      {
        title: 'Task Filtering',
        description: 'Use these filters to find specific tasks based on status, type, priority, or assignee. This helps you focus on what\'s most important.',
        imagePath: '/assets/tutorials/task-center/filtering.svg',
      },
      {
        title: 'Task Details',
        description: 'Click on any task to view its full details. You can see deadlines, attachments, comments, and all related information.',
        imagePath: '/assets/tutorials/task-center/details.svg',
      },
      {
        title: 'Task Actions',
        description: 'Use these action buttons to update task status, add comments, upload files, or assign tasks to team members.',
        imagePath: '/assets/tutorials/task-center/actions.svg',
      },
      {
        title: 'Task Analytics',
        description: 'The analytics section shows trends in task completion, outstanding items, and overall productivity metrics.',
        imagePath: '/assets/tutorials/task-center/analytics.svg',
      }
    ]
  },
  'file-vault': {
    title: 'File Vault',
    description: 'Learn how to securely store and manage files',
    steps: [
      {
        title: 'File Vault Overview',
        description: 'Welcome to the File Vault. This secure repository stores all your important documents with enhanced security and organization.',
        imagePath: '/assets/tutorials/file-vault/overview.svg',
      },
      {
        title: 'Document Categories',
        description: 'Files are organized by these categories. Click on any category to view related documents or use the search to find specific files.',
        imagePath: '/assets/tutorials/file-vault/categories.svg',
      },
      {
        title: 'Upload Process',
        description: 'Use this section to upload new files. You can add metadata, set permissions, and choose the appropriate category for better organization.',
        imagePath: '/assets/tutorials/file-vault/upload.svg',
      },
      {
        title: 'Security Settings',
        description: 'Manage file permissions and access controls here. You can set who can view, edit, or download each document or category.',
        imagePath: '/assets/tutorials/file-vault/security.svg',
      }
    ]
  },
  'claims': {
    title: 'Claims Management',
    description: 'Learn how to manage insurance claims efficiently',
    steps: [
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
    ]
  },
  'insights': {
    title: 'Insights Dashboard',
    description: 'Learn how to interpret and use business intelligence insights',
    steps: [
      {
        title: 'Insights Overview',
        description: 'Welcome to the Insights Dashboard. This analytics center provides data-driven insights to help you make informed decisions.',
        imagePath: '/assets/tutorials/insights/overview.svg',
      },
      {
        title: 'Data Visualization',
        description: 'These charts and graphs represent key metrics and trends. Hover over any element to see detailed information.',
        imagePath: '/assets/tutorials/insights/visualization.svg',
      },
      {
        title: 'Custom Reports',
        description: 'Create customized reports based on your specific needs. Select metrics, time periods, and presentation formats.',
        imagePath: '/assets/tutorials/insights/reports.svg',
      },
      {
        title: 'Export Options',
        description: 'Use these options to export insights as PDFs, spreadsheets, or presentations to share with stakeholders.',
        imagePath: '/assets/tutorials/insights/export.svg',
      }
    ]
  },
  'network': {
    title: 'Partner Network',
    description: 'Learn how to navigate and manage your partner relationships',
    steps: [
      {
        title: 'Network Overview',
        description: 'Welcome to the Partner Network. This tool helps you manage and visualize all your business relationships and connections.',
        imagePath: '/assets/tutorials/network/overview.svg',
      },
      {
        title: 'Company Profiles',
        description: 'Click on any company to view their profile, including risk information, contact details, and relationship history.',
        imagePath: '/assets/tutorials/network/company-profile.svg',
      },
      {
        title: 'Relationship Management',
        description: 'Use these tools to manage your business relationships, track interactions, and monitor partnership health.',
        imagePath: '/assets/tutorials/network/relationship.svg',
      },
      {
        title: 'Network Insights',
        description: 'The analytics section shows relationship metrics, risk exposure patterns, and network growth trends.',
        imagePath: '/assets/tutorials/network/insights.svg',
      }
    ]
  },
  'company-profile': {
    title: 'Company Profile',
    description: 'Learn how to manage and update your company information',
    steps: [
      {
        title: 'Profile Overview',
        description: 'Welcome to your Company Profile. Here you can view and update all your organization\'s information and settings.',
        imagePath: '/assets/tutorials/company-profile/overview.svg',
      },
      {
        title: 'Business Information',
        description: 'This section contains your core business details. Keep this information up-to-date for accurate risk assessment.',
        imagePath: '/assets/tutorials/company-profile/business-info.svg',
      },
      {
        title: 'Team Management',
        description: 'Manage your team members, their roles, and permissions. You can add new users or update existing access levels.',
        imagePath: '/assets/tutorials/company-profile/team.svg',
      },
      {
        title: 'Compliance Status',
        description: 'Review your compliance status and certification levels. This section shows any outstanding requirements or upcoming renewals.',
        imagePath: '/assets/tutorials/company-profile/compliance.svg',
      }
    ]
  },
  'playground': {
    title: 'Playground Environment',
    description: 'Learn how to use the testing playground for risk simulations',
    steps: [
      {
        title: 'Playground Overview',
        description: 'Welcome to the Playground. This is a safe environment where you can test different scenarios without affecting your production data.',
        imagePath: '/assets/tutorials/playground/overview.svg',
      },
      {
        title: 'Scenario Building',
        description: 'Use these tools to create different test scenarios. You can simulate various risk events and see how they would impact your business.',
        imagePath: '/assets/tutorials/playground/scenarios.svg',
      },
      {
        title: 'Results Analysis',
        description: 'After running a simulation, you can analyze the results here. Compare different scenarios to find optimal risk strategies.',
        imagePath: '/assets/tutorials/playground/results.svg',
      }
    ]
  }
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
    // Track all tab name mappings in a central object for consistency
    const tabMappings: Record<string, string> = {
      // Risk scoring related tabs
      'risk-score-configuration': 'risk-score',
      'claims-risk-analysis': 'claims-risk',
      'network-visualization': 'network-view',
      
      // Company profile variations
      'company-profile-page': 'company-profile',
      
      // Task center variations
      'task-center-page': 'task-center',
      
      // File vault variations
      'file-vault-page': 'file-vault',
      'FileVault': 'file-vault',
      
      // Dashboard variations
      'dashboard-page': 'dashboard',
      
      // Ensure consistent handling for all known tabs
      'risk-score-page': 'risk-score',
      'claims-risk-page': 'claims-risk',
      'insights-page': 'insights',
      'network-page': 'network',
      'playground-page': 'playground',
      'claims-page': 'claims'
    };
    
    // Return normalized name if mapping exists, otherwise return original
    return tabMappings[inputTabName] || inputTabName;
  };
  
  // Get normalized tab name for better compatibility
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
        
        // Track initialization attempts for diagnostics
        console.log(`[TutorialManager] Tutorial initialization started for: ${tabName} (normalized: ${normalizedTabName})`);
        
        // Check if tutorial exists by fetching status
        console.log(`[TutorialManager] Fetching tutorial status for tab: ${tabName}`);
        const url = `/api/user-tab-tutorials/${encodeURIComponent(tabName)}/status`;
        console.log(`[TutorialManager] Status URL: ${url}`);
        
        let statusResponse;
        try {
          statusResponse = await apiRequest<{exists?: boolean}>(url);
          console.log(`[TutorialManager] Tutorial status response:`, statusResponse);
          
          // Log the actual response 
          console.log(`[TutorialManager] Status response details:`, JSON.stringify(statusResponse));
        } catch (statusError) {
          console.error(`[TutorialManager] Error fetching tutorial status:`, statusError);
          console.log(`[TutorialManager] Will attempt to create a new tutorial entry`);
          // Continue with creation if status check fails
          statusResponse = { exists: false };
        }
        
        // If tutorial doesn't exist (exists is explicitly false), create it
        if (statusResponse && 'exists' in statusResponse && statusResponse.exists === false) {
          console.log(`[TutorialManager] Creating new tutorial entry for tab: ${tabName}`);
          
          // Create a new tutorial entry - explicitly using POST method and direct payload
          console.log(`[TutorialManager] Raw tab name value:`, tabName);
          
          try {
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
          } catch (createError) {
            console.error(`[TutorialManager] Error creating tutorial entry:`, createError);
            console.log(`[TutorialManager] Will use fallback mechanism for tutorial display`);
            // Continue even if creation fails - we'll use the fallback mechanism
          }
        }
        
        setInitializationComplete(true);
      } catch (error) {
        console.error(`[TutorialManager] Error in initialization process:`, error);
        setInitializationError(String(error));
        // Still mark as complete so the fallback can take over
        setInitializationComplete(true);
      }
    };
    
    initializeTutorial();
  }, [tabName, normalizedTabName, steps.length]);
  
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
  // This is a fallback for when the API call fails or while waiting for it to complete
  const dbTutorialEntries: Record<string, { exists: boolean, tabName: string, completed: boolean, currentStep: number }> = {
    // Main navigation tabs - original names
    'dashboard': { exists: true, tabName: 'dashboard', completed: false, currentStep: 0 },
    'network': { exists: true, tabName: 'network', completed: false, currentStep: 0 },
    'task-center': { exists: true, tabName: 'task-center', completed: false, currentStep: 0 },
    'file-vault': { exists: true, tabName: 'file-vault', completed: false, currentStep: 0 },
    'insights': { exists: true, tabName: 'insights', completed: false, currentStep: 0 },
    
    // Risk scoring tabs - both original and normalized names
    'risk-score': { exists: true, tabName: 'risk-score', completed: false, currentStep: 0 },
    'risk-score-configuration': { exists: true, tabName: 'risk-score', completed: false, currentStep: 0 },
    'claims-risk': { exists: true, tabName: 'claims-risk', completed: false, currentStep: 0 },
    'claims-risk-analysis': { exists: true, tabName: 'claims-risk', completed: false, currentStep: 0 },
    'network-view': { exists: true, tabName: 'network-view', completed: false, currentStep: 0 },
    'network-visualization': { exists: true, tabName: 'network-view', completed: false, currentStep: 0 },
    
    // Claims-related tabs
    'claims': { exists: true, tabName: 'claims', completed: false, currentStep: 0 },
    
    // Other tabs that might need tutorials
    'company-profile': { exists: true, tabName: 'company-profile', completed: false, currentStep: 0 },
    'playground': { exists: true, tabName: 'playground', completed: false, currentStep: 0 }
  };
  
  // Check if we have a direct database entry for this tab
  // First try the original tab name, then fall back to the normalized name
  const directDbEntry = (dbTutorialEntries[tabName] || dbTutorialEntries[normalizedTabName]);
  const shouldForceTutorial = directDbEntry && !isCompleted;
  
  console.log(`[TutorialManager] Direct DB check - Entry for ${tabName}:`, directDbEntry);
  console.log(`[TutorialManager] Should force tutorial: ${shouldForceTutorial}`);
  
  // Enhanced fallback system for tutorial display
  // Set default values for tutorial state before conditional checks
  let shouldDisplay = false;
  let stepToUse = 0;
  
  // First, check if we have a valid API response (normal path)
  if (tutorialEnabled && !isLoading && !isCompleted && currentStep >= 0 && currentStep < steps.length) {
    console.log(`[TutorialManager] Displaying tutorial via standard API path`);
    shouldDisplay = true;
    stepToUse = currentStep;
  }
  // Otherwise, check if we have a valid fallback entry (fallback path)
  else if (shouldForceTutorial) {
    console.log(`[TutorialManager] Displaying tutorial via fallback path - forceTutorial`);
    shouldDisplay = true;
    // Get step from directDbEntry, defaulting to 0 if not available
    stepToUse = directDbEntry?.currentStep || 0;
    
    // Ensure step is within valid range
    if (stepToUse < 0 || stepToUse >= steps.length) {
      console.log(`[TutorialManager] Fallback step ${stepToUse} out of bounds, resetting to 0`);
      stepToUse = 0;
    }
  }
  // If neither condition is met, don't display tutorial
  else {
    console.log(`[TutorialManager] Not rendering tutorial: ${isLoading ? 'Loading' : !tutorialEnabled ? 'Not enabled' : isCompleted ? 'Completed' : 'Unknown state'}`);
    return null;
  }
  
  // Additional logging for successful tutorial display
  console.log(`[TutorialManager] Tutorial will display for ${tabName} (step ${stepToUse + 1}/${steps.length})`);
  
  // Safety check for step value - should never happen with the above logic
  if (stepToUse < 0 || stepToUse >= steps.length) {
    console.error(`[TutorialManager] Critical error - invalid step after all checks: ${stepToUse}`);
    stepToUse = 0; // Recover by setting to first step
  }
  
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