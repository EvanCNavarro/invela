import React, { useState, useEffect, useCallback } from 'react';
import { TabTutorialModal, TutorialStep } from './TabTutorialModal';
import { ContentTutorialModal } from './ContentTutorialModal';
import { useTabTutorials } from '@/hooks/use-tab-tutorials';
import { useTutorialAssets } from '@/hooks/use-tutorial-assets';
import { useTutorialWebSocket } from '@/hooks/use-tutorial-websocket';
import { apiRequest } from '@/lib/queryClient';
import { createTutorialLogger } from '@/lib/tutorial-logger';
import { useQueryClient } from '@tanstack/react-query';

// Import tutorial debugging utilities if available
let tutorialDebug: any = null;
try {
  // Dynamic import to avoid circular dependencies
  tutorialDebug = require('@/lib/tutorial-debug').default;
} catch (e) {
  console.warn('[TutorialManager] Tutorial debug utilities not available');
}

// Create a dedicated logger for TutorialManager
const logger = createTutorialLogger('TutorialManager');

// Define all tutorial content in a central location
const TUTORIAL_CONTENT: Record<string, {
  steps: TutorialStep[];
  title: string;
  description: string;
}> = {
  // Claims tab tutorial
  'claims': {
    title: 'Claims Dashboard',
    description: 'Learn how to manage and track claims in your organization',
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
  
  // Risk Score Configuration - Complete tutorial for risk scoring configuration
  'risk-score-configuration': {
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
  }
};

interface TutorialManagerProps {
  /**
   * The name of the tab for which to show tutorials
   */
  tabName: string;
  
  /**
   * Optional callback fired when tutorial state is determined
   * Parent components can use this to know when to show actual content
   * instead of a loading skeleton
   */
  onReadyStateChange?: (isReady: boolean) => void;
  
  /**
   * Whether the parent component should delay rendering content
   * until tutorial state is determined
   * @default true
   */
  delayContentUntilReady?: boolean;
}

/**
 * Unified Tutorial Manager Component
 * 
 * This component handles rendering tutorials for any tab in the application.
 * It uses the tab name to dynamically load the appropriate tutorial content
 * and manages state, WebSocket communication, and UI rendering.
 * 
 * ANTI-FLICKERING SOLUTION (May 2025):
 * This component has been enhanced with a deterministic rendering approach to eliminate
 * UI flickering. Instead of making multiple state-based decisions, we now use a central
 * shouldShowTutorial state that can have three values:
 * - undefined: still deciding whether to show a tutorial (loading state)
 * - true: definitely show the tutorial 
 * - false: definitely do not show the tutorial
 * 
 * This approach ensures that the UI doesn't "flicker" between states as data loads.
 * The decision is made early and cached, with state transitions properly coordinated
 * to prevent jarring UI changes.
 * 
 * When using this component, you can pass an onReadyStateChange callback
 * to be notified when the component has determined whether to show a tutorial.
 * This allows parent components to show skeleton loaders during the initial
 * loading phase, preventing the flash of tutorial content.
 * 
 * @returns A React element containing the TabTutorialModal or null if no tutorial is available
 */
export function TutorialManager({ 
  tabName,
  onReadyStateChange,
  delayContentUntilReady = true
}: TutorialManagerProps): React.ReactNode {
  // Initialize with detailed logging
  logger.info(`Initializing for tab: ${tabName}`);
  
  // Track component initialization and content ready state
  // For UX improvement: Start in a determined "loading" state rather than false
  // This avoids the flash of regular content while we're determining whether to show the tutorial
  const [initializationComplete, setInitializationComplete] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  
  // New state to hold the definitive rendering decision for tutorial content
  // By starting with undefined, we prevent any premature rendering decisions
  const [shouldShowTutorial, setShouldShowTutorial] = useState<boolean | undefined>(undefined);
  
  // Map tab names to normalized versions for compatibility
  // This is critical for handling URL path vs database key mismatches
  const normalizeTabName = (inputTabName: string): string => {
    // Track all tab name mappings in a central object for consistency
    const tabMappings: Record<string, string> = {
      // Risk scoring related tabs
      'claims-risk-analysis': 'claims-risk',
      'network-visualization': 'network-view',
      
      // File management
      'file-manager': 'file-vault',
      
      // Default fallback - assume direct match
      [inputTabName]: inputTabName
    };
    
    // Return the normalized version or the original if no mapping exists
    return tabMappings[inputTabName] || inputTabName;
  };
  
  // Get normalized tab name for consistency
  const normalizedTabName = normalizeTabName(tabName);
  
  // Get tutorial data from hooks
  const { 
    tutorialEnabled, 
    currentStep, 
    totalSteps, 
    isLoading, 
    isCompleted, 
    handleNext,
    handleBack,
    handleComplete,
    markTutorialSeen
  } = useTabTutorials(normalizedTabName);
  
  // Subscribe to WebSocket updates
  const { tutorialUpdate } = useTutorialWebSocket(normalizedTabName);
  
  // Query client for invalidating cache on WebSocket updates
  const queryClient = useQueryClient();
  
  // Get any custom assets for this tutorial
  const { imageUrl, isLoading: assetsLoading } = useTutorialAssets(normalizedTabName);
  
  // Handle initialization with comprehensive logging
  useEffect(() => {
    // Check if we have tutorial content for this tab
    const hasContent = TUTORIAL_CONTENT[normalizedTabName] !== undefined;
    
    // Additional debug information to help diagnose tab name issues
    const availableTabs = Object.keys(TUTORIAL_CONTENT).join(', ');
    
    if (!hasContent) {
      const errorMsg = `No tutorial content found for tab: ${normalizedTabName} (original: ${tabName})`;
      const extendedError = `${errorMsg}. Available tabs: ${availableTabs}`;
      logger.error(extendedError);
      setInitializationError(errorMsg);
      
      // Immediately set shouldShowTutorial to false if no content exists
      // This prevents any flash of loading states or erroneous display attempts
      setShouldShowTutorial(false);
    } else {
      const stepCount = TUTORIAL_CONTENT[normalizedTabName].steps.length;
      logger.info(`Found tutorial content for ${normalizedTabName} with ${stepCount} steps`);
      logger.info(`Available tutorial tabs: ${availableTabs}`);
      
      // Important: Make an early decision about whether to show a tutorial if we have data
      // This eliminates the race condition that causes flickering
      if (!isLoading) {
        // Only set this if tutorialEnabled has a definite value (true/false, not undefined or initial state)
        const shouldShow = tutorialEnabled && !isCompleted;
        logger.info(`Early tutorial decision for ${normalizedTabName}: ${shouldShow ? 'SHOW' : 'HIDE'}`, {
          tutorialEnabled, 
          isCompleted
        });
        setShouldShowTutorial(shouldShow);
      } else {
        // CRITICAL FIX: Default to showing tutorials before we have definite data
        // This prevents tutorials from not showing when they should
        setShouldShowTutorial(true);
      }
    }
    
    // Debug current tutorial state
    logger.info('Current tutorial state', {
      tabName,
      normalizedTabName,
      currentStep,
      totalSteps, 
      enabled: tutorialEnabled,
      completed: isCompleted,
      loading: isLoading
    });
    
    setInitializationComplete(true);
  }, [normalizedTabName, tabName]);
  
  // React to WebSocket updates
  useEffect(() => {
    if (tutorialUpdate !== null) {
      logger.info(`WebSocket update received:`, tutorialUpdate);
      
      // Invalidate tutorial queries to refresh data from the server
      queryClient.invalidateQueries({ 
        queryKey: ['/api/user-tab-tutorials/status', normalizedTabName] 
      });
    }
  }, [tutorialUpdate, normalizedTabName, queryClient]);
  
  // Notify parent component when content is ready to be shown
  useEffect(() => {
    // Content is ready when:
    // 1. We're not loading the tutorial data anymore
    // 2. We've made a definitive decision about showing the tutorial (true/false, not undefined)
    const readyToShow = !isLoading && shouldShowTutorial !== undefined;
    
    if (readyToShow && !contentReady) {
      logger.info(`Tutorial state determined for ${normalizedTabName}`, {
        isLoading,
        tutorialEnabled,
        isCompleted,
        currentStep,
        shouldShowTutorial
      });
      
      // Update our internal state to track readiness
      setContentReady(true);
      setInitializationComplete(true);
      
      // Notify parent component if callback was provided
      if (onReadyStateChange) {
        logger.info(`Notifying parent that content is ready to show`);
        onReadyStateChange(true);
      }
    }
  }, [
    isLoading, 
    shouldShowTutorial, 
    contentReady, 
    normalizedTabName, 
    tutorialEnabled, 
    isCompleted, 
    currentStep, 
    onReadyStateChange
  ]);
  
  // Use our deterministic shouldShowTutorial state to make rendering decisions
  // This is the key to eliminating the flickering issue
  if (shouldShowTutorial === undefined) {
    // If we haven't made a firm decision yet, and the parent component wants
    // us to delay content rendering until ready, show nothing
    if (delayContentUntilReady) {
      logger.debug(`Waiting for tutorial decision to be made`, {
        isLoading,
        tutorialEnabled,
        isCompleted,
        shouldShowTutorial
      });
      return null;
    }
    // Otherwise, we fall through to potentially show a tutorial if one is needed
  } else if (shouldShowTutorial === false) {
    // We've made a firm decision NOT to show a tutorial
    logger.info(`Tutorial decisively not showing for tab: ${normalizedTabName}`, {
      tutorialEnabled,
      isCompleted,
      currentStep
    });
    return null;
  } else {
    // shouldShowTutorial is explicitly true - we WANT to show a tutorial
    logger.info(`Tutorial SHOULD show for tab: ${normalizedTabName}`, {
      tutorialEnabled,
      isCompleted,
      isLoading,
      currentStep
    });
    // Continue to the rendering code below
  }
  
  // At this point, we should show the tutorial (or we're still deciding but allowing content)
  // Log the definitive state for debugging
  logger.info(`Tutorial render decision for tab: ${normalizedTabName}`, {
    shouldShowTutorial,
    isLoading, 
    tutorialEnabled, 
    isCompleted,
    contentReady,
    currentStep
  });
  
  // Find the content for this tab
  const tutorialContent = TUTORIAL_CONTENT[normalizedTabName];
  if (!tutorialContent) {
    logger.error(`No tutorial content found for tab: ${normalizedTabName} (original: ${tabName})`);
    
    // Try case-insensitive search as fallback
    const lowerCaseTabName = normalizedTabName.toLowerCase();
    const allKeys = Object.keys(TUTORIAL_CONTENT);
    const possibleMatch = allKeys.find(key => key.toLowerCase() === lowerCaseTabName);
    
    if (possibleMatch) {
      logger.info(`Found possible case-sensitive match: ${possibleMatch}`);
      // We must return a React element, not just the tutorial content object
      const content = TUTORIAL_CONTENT[possibleMatch];
      return (
        <TabTutorialModal
          title={content.title}
          description={content.steps[0].description}
          imageUrl={content.steps[0].imageUrl || content.steps[0].imagePath || `/assets/tutorials/${possibleMatch}/${1}.svg`}
          isLoading={false}
          currentStep={0}
          totalSteps={content.steps.length}
          onNext={() => {}}
          onComplete={() => {}}
          onClose={() => {}}
        />
      );
    }
    
    return null;
  }
  
  // Calculate which step to use, ensuring we don't go out of bounds
  const maxStep = tutorialContent.steps.length - 1;
  const stepToUse = Math.min(currentStep, maxStep);
  
  // Generate descriptive log message about the tutorial being shown
  logger.info(`Rendering tutorial step ${stepToUse + 1} of ${tutorialContent.steps.length} for ${normalizedTabName}`);
  
  // Prepare modal title based on active step
  const modalTitle = tutorialContent.title;
  
  // Debug current tutorial state one more time before rendering
  logger.info('Current tutorial state', {
    tabName,
    normalizedTabName,
    currentStep,
    totalSteps, 
    enabled: tutorialEnabled,
    completed: isCompleted,
    loading: isLoading
  });
  
  // Use the TabTutorialModal with the appropriate content
  return (
    <TabTutorialModal
      title={modalTitle}
      description={tutorialContent.steps[stepToUse].description}
      imageUrl={tutorialContent.steps[stepToUse].imageUrl || tutorialContent.steps[stepToUse].imagePath || `/assets/tutorials/${normalizedTabName}/${stepToUse + 1}.svg`}
      isLoading={isLoading}
      currentStep={stepToUse}
      totalSteps={tutorialContent.steps.length}
      onNext={handleNext}
      onBack={handleBack}
      onComplete={handleComplete}
      onClose={() => markTutorialSeen()}
    />
  );
}