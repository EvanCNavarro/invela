import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TabTutorialModal, TutorialStep } from './TabTutorialModal';
import { ContentTutorialModal } from './ContentTutorialModal';
import { useTabTutorials } from '@/hooks/use-tab-tutorials';
import { useTutorialWebSocket } from '@/hooks/use-tutorial-websocket';
import { apiRequest } from '@/lib/queryClient';
import { createTutorialLogger } from '@/lib/tutorial-logger';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useTutorialLoadingStore } from '@/hooks/use-tutorial-loading';

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
    title: 'Claims Overview',
    description: 'Learn how to manage and track claims in your organization',
    steps: [
      {
        title: 'Manage Claims Lifecycle',
        description: 'Track active, disputed, and resolved claims effortlessly, all from one clear dashboard view.',
        imagePath: '/assets/tutorials/claims/modal_claims_1.png',
        stepTitle: 'Manage Claims Lifecycle',
        bulletPoints: [
          'View all claims categorized by their current status',
          'Easily distinguish between active, disputed, and resolved claims',
          'Monitor claim progression through intuitive visual indicators'
        ]
      },
      {
        title: 'Detailed Claim Information',
        description: 'Dive deeper into specific claims to view full details, history, and resolution statuses.',
        imagePath: '/assets/tutorials/claims/modal_claims_2.png',
        stepTitle: 'Detailed Claim Information',
        bulletPoints: [
          'Access comprehensive claim details with a single click',
          'Review complete claim history including all previous actions',
          'Track resolution process through detailed status indicators'
        ]
      }
    ]
  },
  
  // Risk Score Configuration - Complete tutorial for risk scoring configuration
  'risk-score-configuration': {
    title: 'S&P Data Access Risk Score Overview',
    description: 'Learn how to customize and interpret risk scoring for your organization',
    steps: [
      {
        title: 'Set Risk Thresholds',
        description: 'Define acceptable risk thresholds for fintech accreditation clearly and efficiently.',
        imagePath: '/assets/tutorials/risk-score-configuration/modal_risk_1.png',
        stepTitle: 'Risk Acceptance Level',
        bulletPoints: [
          'Set precise risk thresholds that align with your bank\'s standards',
          'Customize risk ranges for low, medium, and high risk levels',
          'Easily save your configuration for consistent application across assessments'
        ]
      },
      {
        title: 'Prioritize and Weight Dimensions',
        description: 'Customize dimension prioritization and weighting to align risk assessment precisely with your bank\'s standards.',
        imagePath: '/assets/tutorials/risk-score-configuration/modal_risk_2.png',
        stepTitle: 'Risk Dimension Weighting',
        bulletPoints: [
          'Adjust priority weights for critical security dimensions',
          'Fine-tune assessment criteria based on your specific industry requirements',
          'Create a weighted scoring system that accurately reflects your risk priorities'
        ]
      },
      {
        title: 'Evaluate and Compare Fintech Fit',
        description: 'Compare fintech applicants against your custom risk thresholds to determine accreditation eligibility at a glance.',
        imagePath: '/assets/tutorials/risk-score-configuration/modal_risk_3.png',
        stepTitle: 'Eligibility Assessment',
        bulletPoints: [
          'Instantly visualize eligibility status based on your defined thresholds',
          'Compare applicants side-by-side using consistent evaluation criteria',
          'Make informed accreditation decisions with clear visual indicators'
        ]
      }
    ]
  },
  'insights': {
    title: 'Insights Overview',
    description: 'Learn how to interpret and use business intelligence insights',
    steps: [
      {
        title: 'Visualize Key Metrics',
        description: 'Quickly visualize data like risk scores and accreditation status in easy-to-understand graphs and charts.',
        imagePath: '/assets/tutorials/insights/modal_insights_1.png',
        stepTitle: 'Visualize Key Metrics',
        bulletPoints: [
          'View comprehensive metrics in intuitive visualizations',
          'Monitor risk scores and compliance status at a glance',
          'Track changes over time with dynamic trend charts'
        ]
      },
      {
        title: 'Interactive Data Exploration',
        description: 'Drill down into specific insights or trends by interacting with dynamic graphs to understand deeper data patterns.',
        imagePath: '/assets/tutorials/insights/modal_insights_2.png',
        stepTitle: 'Interactive Data Exploration',
        bulletPoints: [
          'Explore data in depth through interactive charts and graphs',
          'Filter information to focus on specific time periods or metrics',
          'Discover data patterns and correlations through direct interaction'
        ]
      },
      {
        title: 'Export Insights Easily',
        description: 'Easily export any insights and visualizations for offline review or presentations.',
        imagePath: '/assets/tutorials/insights/modal_insights_3.png',
        stepTitle: 'Export Insights Easily',
        bulletPoints: [
          'Export data in multiple formats including PDF, CSV, and Excel',
          'Create presentation-ready visualizations with a single click',
          'Share insights with team members and stakeholders seamlessly'
        ]
      }
    ]
  },
  'network': {
    title: 'Network Overview',
    description: 'Learn how to navigate and manage your partner relationships',
    steps: [
      {
        title: 'Explore Your Network',
        description: 'View and manage your network of business partners. Quickly identify who you work with and the status of each relationship.',
        imagePath: '/assets/tutorials/network/modal_network_1.png',
        stepTitle: 'Explore Your Network',
        bulletPoints: [
          'View your entire business network in an interactive visualization',
          'Identify key relationships and connection patterns at a glance',
          'Filter the network view by relationship type, risk level, or industry'
        ]
      },
      {
        title: 'Invite New Connections',
        description: 'Easily invite new fintech companies or banks to join your network directly from this interface.',
        imagePath: '/assets/tutorials/network/modal_network_2.png',
        stepTitle: 'Invite New Connections',
        bulletPoints: [
          'Add new partners to your network with just a few clicks',
          'Track pending invitations and onboarding status',
          'Build a more comprehensive view of your business ecosystem'
        ]
      },
      {
        title: 'Detailed Company Profiles',
        description: 'Access detailed profiles including accreditation status, key contacts, and more by clicking into company entries.',
        imagePath: '/assets/tutorials/network/modal_network_3.png',
        stepTitle: 'Detailed Company Profiles',
        bulletPoints: [
          'Access comprehensive information about any company in your network',
          'Review risk scores, compliance status, and accreditation details',
          'Identify key contacts and important company metrics'
        ]
      }
    ]
  },
  'file-vault': {
    title: 'File Vault Overview',
    description: 'Learn how to securely store and manage files',
    steps: [
      {
        title: 'Centralized File Management',
        description: 'Upload, download, and manage your important files from a single centralized location.',
        imagePath: '/assets/tutorials/file-vault/modal_file_1.png',
        stepTitle: 'Centralized File Management',
        bulletPoints: [
          'Access all your documents in one secure, centralized location',
          'Easily upload files via drag-and-drop or file browser',
          'Track document versions with built-in history and audit trail'
        ]
      },
      {
        title: 'Generate System Files',
        description: 'Generate necessary system documents directly from your file vault. Choose document type and customize your file generation.',
        imagePath: '/assets/tutorials/file-vault/modal_file_2.png',
        stepTitle: 'Generate System Files',
        bulletPoints: [
          'Choose from various document types and templates',
          'Customize generated files with your specific requirements',
          'Export in multiple formats including PDF and CSV'
        ]
      }
    ]
  },

  'dashboard': {
    title: 'Dashboard Overview',
    description: 'Learn how to navigate and use the main dashboard',
    steps: [
      {
        title: 'Personalize Your Dashboard',
        description: 'Select and arrange widgets to create your ideal dashboard. Easily customize your workspace based on your role and preferences.',
        imagePath: '/assets/tutorials/dashboard/modal_dash_1.png',
        stepTitle: 'Personalize Your Dashboard',
        bulletPoints: [
          'Drag and drop widgets to reorganize your layout',
          'Show or hide widgets based on your needs using the Customize menu',
          'Save your preferences for future sessions automatically'
        ]
      },
      {
        title: 'Quick Actions at Your Fingertips',
        description: 'Access frequently used features directly from your dashboard with Quick Actions.',
        imagePath: '/assets/tutorials/dashboard/modal_dash_2.png',
        stepTitle: 'Quick Actions at Your Fingertips',
        bulletPoints: [
          'Launch common tasks with a single click',
          'Access company profiles, invitations, and insights directly',
          'Customize which actions appear in your Quick Actions panel'
        ]
      },
      {
        title: 'Tailored Data Visualizations',
        description: 'View and interact with key metrics and visualizations that matter most to your role.',
        imagePath: '/assets/tutorials/dashboard/modal_dash_3.png',
        stepTitle: 'Tailored Data Visualizations',
        bulletPoints: [
          'Monitor performance metrics and risk indicators in real-time',
          'Interact with charts to drill down into detailed information',
          'Customize visualization types to best represent your data'
        ]
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
 * 
 * @returns A React element containing the TabTutorialModal or null if no tutorial is available
 */
export function TutorialManager({ tabName }: TutorialManagerProps): React.ReactNode {
  // Initialize with detailed logging
  logger.init(`Initializing for tab: ${tabName}`);
  
  // Get current location to check if we're on a base route
  const [location] = useLocation();
  
  const [initializationComplete, setInitializationComplete] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  
  /**
   * Normalize tab names to a consistent format
   * 
   * This function maps all known tab name variations to their canonical form.
   * It's critical for ensuring we have a single source of truth for each tab's tutorial status.
   * 
   * @param inputTabName The tab name to normalize
   * @returns The normalized (canonical) tab name
   */
  const normalizeTabName = (inputTabName: string): string => {
    // First, convert to lowercase and trim to handle case variations
    const cleanedTabName = inputTabName.toLowerCase().trim();
    
    // Define canonical names for each tab
    // This mapping ensures all variations of a tab name resolve to a single canonical name
    const tabMappings: Record<string, string> = {
      // Network tab variations
      'network-view': 'network',
      'network-visualization': 'network',
      
      // Claims tab variations
      'claims-risk': 'claims',
      'claims-risk-analysis': 'claims',
      
      // File vault tab variations
      'file-manager': 'file-vault',
      'filevault': 'file-vault',  // Handle PascalCase version
      'file-vault-page': 'file-vault',
      
      // Dashboard variations
      'dashboard-page': 'dashboard',
      
      // Risk score configuration variations
      'risk-score-config': 'risk-score-configuration',
    };
    
    logger.info(`Normalizing tab name from '${inputTabName}' to canonical form`);
    
    // Return the canonical version or the original cleaned name
    const canonicalName = tabMappings[cleanedTabName] || cleanedTabName;
    
    if (canonicalName !== cleanedTabName) {
      logger.info(`Tab name normalized: '${cleanedTabName}' → '${canonicalName}'`);
    } else {
      logger.info(`Tab name already in canonical form: '${canonicalName}'`);
    }
    
    return canonicalName;
  };
  
  // Get normalized tab name for consistency
  const normalizedTabName = normalizeTabName(tabName);
  
  // Check if current location is a base route or a subpage
  const isBaseRoute = (): boolean => {
    // Extract the base path without query parameters
    const path = location.split('?')[0];
    
    // Map from tab name to expected base route
    const baseRouteMap: Record<string, string> = {
      'dashboard': '/',
      'insights': '/insights',
      'network': '/network',
      'file-vault': '/file-vault',
      'claims': '/claims',
      'claims-risk': '/claims-risk',
      'risk-score-configuration': '/risk-score-configuration',
    };
    
    // Special handling for dashboard (both '/' and '/dashboard' are valid base routes)
    if (normalizedTabName === 'dashboard' && (path === '/' || path === '/dashboard')) {
      logger.info(`Base route check: true for dashboard (path: ${path})`);
      return true;
    }
    
    // Get the expected base route for this tab
    const expectedBaseRoute = baseRouteMap[normalizedTabName];
    
    // If no expected base route is defined, don't show the tutorial
    if (!expectedBaseRoute) {
      logger.info(`Base route check: false - no expected route for tab ${normalizedTabName}`);
      return false;
    }
    
    // Check if current path is the base route
    const isOnBaseRoute: boolean = path === expectedBaseRoute;
    
    logger.info(`Base route check: ${isOnBaseRoute ? 'true' : 'false'} for tab ${normalizedTabName} (path: ${path}, expected: ${expectedBaseRoute})`);
    
    return isOnBaseRoute;
  };
  
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
  
  // Simple flag for loading state
  const [assetsLoading, setAssetsLoading] = useState(false);
  
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
    } else {
      const stepCount = TUTORIAL_CONTENT[normalizedTabName].steps.length;
      logger.info(`Found tutorial content for ${normalizedTabName} with ${stepCount} steps`);
      logger.info(`Available tutorial tabs: ${availableTabs}`);
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
  // We no longer need to get company data for the tutorial manager
  // since we're using the dashboard's own skeleton loaders
  
  // Get the loading state setter from the store
  const setLoading = useTutorialLoadingStore(state => state.setLoading);
  
  // Update the global loading state when our loading state changes
  useEffect(() => {
    setLoading(isLoading, isLoading ? normalizedTabName : null);
    
    if (isLoading) {
      logger.debug(`Tutorial data still loading (isLoading: ${isLoading}, initComplete: ${initializationComplete})`);
    }
    
    // Cleanup when component unmounts
    return () => {
      setLoading(false, null);
    };
  }, [isLoading, normalizedTabName, setLoading, initializationComplete]);
  
  // Early return conditions - "don't show until we're sure we should" approach
  // Check all reasons why we would NOT show a tutorial first
  const shouldShowTutorial = () => {
    // Don't render anything during loading
    if (isLoading) {
      logger.debug(`Tutorial not shown - still loading data for tab: ${normalizedTabName}`);
      return false;
    }
    
    // If we're not on a base route, don't show the tutorial
    if (!isBaseRoute()) {
      logger.info(`Tutorial not shown - not on base route for tab: ${normalizedTabName}, path: ${location}`);
      return false;
    }
    
    // If initialization is complete but tutorial is not enabled, don't render anything
    if (initializationComplete && !tutorialEnabled) {
      logger.info(`Tutorial not shown - not enabled for tab: ${normalizedTabName}`);
      return false;
    }
    
    // Do not render if tutorial is completed
    if (isCompleted) {
      // Only log if we have data
      if (initializationComplete) {
        logger.debug(`Tutorial not shown - already completed for tab: ${normalizedTabName}`);
      }
      return false;
    }
    
    // If we've passed all conditions, we should show the tutorial
    logger.info(`Tutorial will be shown for tab: ${normalizedTabName}`);
    return true;
  };
  
  // Return early if we shouldn't show the tutorial
  // This is the key change - we explicitly check if we should show the tutorial
  // rather than checking each condition individually
  if (!shouldShowTutorial()) {
    return null;
  }
  
  // Find the content for this tab
  const tutorialContent = TUTORIAL_CONTENT[normalizedTabName];
  
  // Log available tutorial tabs for debugging
  const availableTabs = Object.keys(TUTORIAL_CONTENT).join(', ');
  logger.info(`Available tutorial tabs: ${availableTabs}`);
  
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
          stepTitle={content.steps[0].title}
          bulletPoints={content.steps[0].bulletPoints}
        />
      );
    }
    
    return null;
  }
  
  // Calculate which step to use, ensuring we don't go out of bounds
  const maxStep = tutorialContent.steps.length - 1;
  const stepToUse = Math.min(currentStep, maxStep);
  
  // Generate descriptive log message about the tutorial being shown
  logger.render(`Rendering tutorial step ${stepToUse + 1} of ${tutorialContent.steps.length} for ${normalizedTabName}`);
  
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
  
  // Simple image path calculation without hooks
  const getImagePath = () => {
    if (!tutorialContent || !tutorialContent.steps || !tutorialContent.steps[stepToUse]) {
      return '';
    }
    
    const step = tutorialContent.steps[stepToUse];
    return step.imageUrl || step.imagePath || `/assets/tutorials/${normalizedTabName}/${stepToUse + 1}.svg`;
  };
  
  // Use the TabTutorialModal with simplified props
  return tutorialContent && tutorialContent.steps ? (
    <TabTutorialModal
      title={modalTitle}
      description={tutorialContent.steps[stepToUse]?.description || ''}
      imageUrl={getImagePath()}
      isLoading={isLoading}
      currentStep={stepToUse}
      totalSteps={tutorialContent.steps.length}
      onNext={handleNext}
      onBack={handleBack}
      onComplete={handleComplete}
      onClose={() => markTutorialSeen()}
      stepTitle={tutorialContent.steps[stepToUse]?.title || ''}
      bulletPoints={tutorialContent.steps[stepToUse]?.bulletPoints || []}
    />
  ) : null;
}