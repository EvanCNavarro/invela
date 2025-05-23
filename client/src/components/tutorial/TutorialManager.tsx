import React, { useState, useEffect, useCallback } from 'react';
import { TabTutorialModal, TutorialStep } from './TabTutorialModal';
import { ContentTutorialModal } from './ContentTutorialModal';
import { useTabTutorials } from '@/hooks/use-tab-tutorials';
import { useTutorialAssets } from '@/hooks/use-tutorial-assets';
import { useTutorialWebSocket } from '@/hooks/use-tutorial-websocket';
import { apiRequest } from '@/lib/queryClient';
import { createTutorialLogger } from '@/lib/tutorial-logger';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';

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
  // Claims tab tutorial - Reduced to 3 steps to match the provided images
  'claims': {
    title: 'Claims Overview',
    description: 'Learn how to manage and track claims in your organization',
    steps: [
      {
        title: 'Track Claim Status',
        description: 'The Claims Dashboard shows all claims categorized by their current status.',
        stepTitle: 'Track Claim Status',
        bulletPoints: [
          'View all claims organized by status: Active, Disputed, and Resolved',
          'Each claim category uses color coding for quick visual identification',
          'Access detailed information for any claim with a single click'
        ]
      },
      {
        title: 'View Claim Details',
        description: 'Access comprehensive information about any claim, including breach details and financial information.',
        stepTitle: 'View Claim Details',
        bulletPoints: [
          'View breach details, bank information, and FinTech data in one place',
          'Track claim progress with the status indicator',
          'Download comprehensive reports or escalate claims as needed'
        ]
      },
      {
        title: 'Manage Claim Process',
        description: 'Claims follow a standardized workflow from identification to resolution.',
        stepTitle: 'Manage Claim Process',
        bulletPoints: [
          'Follow claims through a complete lifecycle workflow',
          'Claims move from initial identification to documentation and verification',
          'Each step includes appropriate checks and regulatory compliance measures'
        ]
      }
    ]
  },
  
  // Risk Score Configuration - Reduced to 3 steps to match the provided images
  'risk-score-configuration': {
    title: 'S&P Data Access Risk Score (DARS) Overview',
    description: 'Learn how to customize and interpret risk scoring for your organization',
    steps: [
      {
        title: 'Set Risk Tolerance',
        description: 'Configure your organization\'s risk tolerance using the interactive gauge and slider.',
        stepTitle: 'Set Risk Tolerance',
        bulletPoints: [
          'View your current risk acceptance level on the interactive gauge',
          'Adjust the slider to set your custom risk tolerance level',
          'Choose between low (0-30), medium (31-70), and high (71-100) risk thresholds'
        ]
      },
      {
        title: 'Adjust Risk Weights',
        description: 'Customize the priority and weight of different risk dimensions to reflect your organization\'s needs.',
        stepTitle: 'Adjust Risk Weights',
        bulletPoints: [
          'Assign percentage weights to five key risk priority categories',
          'Higher priority categories receive more weight in the overall risk calculation',
          'Visualize the distribution of risk priorities using the pie chart'
        ]
      },
      {
        title: 'Define Eligibility Rules',
        description: 'Configure the eligibility thresholds that determine which partners and vendors meet your risk requirements.',
        stepTitle: 'Define Eligibility Rules',
        bulletPoints: [
          'Define eligibility criteria based on risk scores',
          'Set thresholds to automatically categorize partners as eligible or ineligible',
          'Use the slider to fine-tune your eligibility requirements'
        ]
      }
    ]
  },
  // Main Risk Score Dashboard - Reduced to 3 steps to match the provided images
  'risk-score': {
    title: 'S&P Data Access Risk Score (DARS) Overview',
    description: 'Understand how to interpret and use your risk assessment dashboard',
    steps: [
      {
        title: 'Set Risk Tolerance',
        description: 'Configure your organization\'s risk tolerance using the interactive gauge and slider.',
        stepTitle: 'Set Risk Tolerance',
        bulletPoints: [
          'View your current risk acceptance level on the interactive gauge',
          'Adjust the slider to set your custom risk tolerance level',
          'Choose between low (0-30), medium (31-70), and high (71-100) risk thresholds'
        ]
      },
      {
        title: 'Adjust Risk Weights',
        description: 'Customize the priority and weight of different risk dimensions to reflect your organization\'s needs.',
        stepTitle: 'Adjust Risk Weights',
        bulletPoints: [
          'Assign percentage weights to five key risk priority categories',
          'Higher priority categories receive more weight in the overall risk calculation',
          'Visualize the distribution of risk priorities using the pie chart'
        ]
      },
      {
        title: 'Define Eligibility Rules',
        description: 'Configure the eligibility thresholds that determine which partners and vendors meet your risk requirements.',
        stepTitle: 'Define Eligibility Rules',
        bulletPoints: [
          'Define eligibility criteria based on risk scores',
          'Set thresholds to automatically categorize partners as eligible or ineligible',
          'Use the slider to fine-tune your eligibility requirements'
        ]
      }
    ]
  },
  'insights': {
    title: 'Insights Overview',
    description: 'Learn how to interpret and use business intelligence insights',
    steps: [
      {
        title: 'Analyze Key Metrics',
        description: 'The Insights Dashboard provides multiple data visualizations for comprehensive analytics.',
        stepTitle: 'Analyze Key Metrics',
        bulletPoints: [
          'View all key metrics in a unified dashboard with multiple visualization types',
          'Access interactive charts, graphs, and checklists in one place',
          'Get a comprehensive view of your risk and compliance data'
        ]
      },
      {
        title: 'Track Performance',
        description: 'Key performance indicators help you track progress and identify areas of improvement.',
        stepTitle: 'Track Performance',
        bulletPoints: [
          'Monitor performance with clear numerical indicators',
          'Track completion rates and progress across different metrics',
          'Visualize performance trends with interactive charts'
        ]
      },
      {
        title: 'Export Data',
        description: 'Export your insights in multiple formats for sharing and further analysis.',
        stepTitle: 'Export Data',
        bulletPoints: [
          'Export data in CSV, PDF, or XLS formats with one click',
          'Share insights with stakeholders or use in other applications',
          'Choose the format that best suits your reporting needs'
        ]
      }
    ]
  },
  'network': {
    title: 'Network Overview',
    description: 'Learn how to navigate and manage your partner relationships',
    steps: [
      {
        title: 'Invite Partners',
        description: 'Add new financial institutions to your secure network with the invitation feature.',
        stepTitle: 'Invite Partners',
        bulletPoints: [
          'Invite new partners to join your secure network with a simple interface',
          'Add financial institutions, banks, and FinTech companies to your ecosystem',
          'Track pending invitations and manage your network connections'
        ]
      },
      {
        title: 'Visualize Connections',
        description: 'View your entire financial network in an interactive visualization that shows relationships and connection strengths.',
        stepTitle: 'Visualize Connections',
        bulletPoints: [
          'Visualize your complete network of financial relationships',
          'Identify connection patterns and relationship strengths visually',
          'Understand data flows between your organization and partners'
        ]
      },
      {
        title: 'Monitor Partners',
        description: 'Get detailed insights about your network partners, including risk scores, compliance status, and activity metrics.',
        stepTitle: 'Monitor Partners',
        bulletPoints: [
          'Access detailed profiles for all companies in your network',
          'Monitor compliance status and risk scores for each partner',
          'Track interaction history and data exchange patterns'
        ]
      }
    ]
  },
  'file-vault': {
    title: 'File Vault Overview',
    description: 'Learn how to securely store and manage files',
    steps: [
      {
        title: 'Upload Documents',
        description: 'Upload documents securely to the vault with an easy drag-and-drop interface.',
        stepTitle: 'Upload Documents',
        bulletPoints: [
          'Upload files using a simple drag-and-drop interface',
          'Monitor upload progress with real-time status indicators',
          'Search existing documents to avoid duplicates'
        ]
      },
      {
        title: 'Generate Reports',
        description: 'Generate standardized documents and reports directly from the platform.',
        stepTitle: 'Generate Reports',
        bulletPoints: [
          'Create new documents with customizable templates',
          'Select document types and format options (PDF, etc.)',
          'Add comments and customize document parameters'
        ]
      }
    ]
  },
  'company-profile': {
    title: 'Company Profile Overview',
    description: 'Learn how to manage and update your company information',
    steps: [
      {
        title: 'Manage Company Info',
        description: 'Welcome to your Company Profile. Here you can view and update all your organization\'s information and settings.',
        // Image path removed for fresh start
        stepTitle: 'Manage Company Info',
        bulletPoints: [
          'View and edit your company\'s core information in one place',
          'Access historical profile changes and audit logs',
          'Understand how your profile data influences risk assessments'
        ]
      },
      {
        title: 'Update Business Details',
        description: 'This section contains your core business details. Keep this information up-to-date for accurate risk assessment.',
        // Image path removed for fresh start
        stepTitle: 'Update Business Details',
        bulletPoints: [
          'Update essential company information including address and contacts',
          'Maintain industry classifications and business descriptions',
          'Manage financial information and corporate structure details'
        ]
      },
      {
        title: 'Control User Access',
        description: 'Manage your team members, their roles, and permissions. You can add new users or update existing access levels.',
        // Image path removed for fresh start
        stepTitle: 'Control User Access',
        bulletPoints: [
          'Add new team members and assign appropriate roles',
          'Set granular permissions based on job responsibilities',
          'Monitor user activity and access logs for security'
        ]
      },
      {
        title: 'Track Compliance',
        description: 'Review your compliance status and certification levels. This section shows any outstanding requirements or upcoming renewals.',
        // Image path removed for fresh start
        stepTitle: 'Compliance Tracking',
        bulletPoints: [
          'Track compliance status across multiple regulatory frameworks',
          'Receive alerts for upcoming certification expirations',
          'Upload and manage compliance documentation securely'
        ]
      }
    ]
  },
  'playground': {
    title: 'Playground Overview',
    description: 'Learn how to use the testing playground for risk simulations',
    steps: [
      {
        title: 'Playground Overview',
        description: 'Welcome to the Playground. This is a safe environment where you can test different scenarios without affecting your production data.',
        // Image path removed for fresh start
        stepTitle: 'Simulation Environment',
        bulletPoints: [
          'Experiment with risk scenarios in a safe, isolated environment',
          'Test configuration changes without affecting production settings',
          'Use real company data with "what-if" analysis capabilities'
        ]
      },
      {
        title: 'Scenario Building',
        description: 'Use these tools to create different test scenarios. You can simulate various risk events and see how they would impact your business.',
        // Image path removed for fresh start
        stepTitle: 'Creating Risk Scenarios',
        bulletPoints: [
          'Build custom scenarios with multiple risk variables',
          'Simulate market events and their impact on your risk profile',
          'Save and share scenarios with your team for collaborative planning'
        ]
      },
      {
        title: 'Results Analysis',
        description: 'After running a simulation, you can analyze the results here. Compare different scenarios to find optimal risk strategies.',
        // Image path removed for fresh start
        stepTitle: 'Analyzing Outcomes',
        bulletPoints: [
          'Compare simulation results side-by-side with detailed metrics',
          'Visualize potential impacts through interactive charts',
          'Export findings and recommendations for stakeholder review'
        ]
      }
    ]
  },
  'dashboard': {
    title: 'Dashboard Overview',
    description: 'Learn how to navigate and use the main dashboard',
    steps: [
      {
        title: 'Monitor Key Metrics',
        description: 'The dashboard provides a snapshot of your organization\'s key metrics and activities.',
        stepTitle: 'Monitor Key Metrics',
        bulletPoints: [
          'View all critical metrics and activities in one unified dashboard',
          'Monitor your organization\'s risk score and compliance status',
          'Access recent tasks and upcoming deadlines at a glance'
        ]
      },
      {
        title: 'Navigate Platform',
        description: 'Use the navigation menu to access different sections of the platform.',
        stepTitle: 'Navigate Platform',
        bulletPoints: [
          'Use the sidebar menu to switch between different platform sections',
          'Access Claims, Risk Score, Insights, and other key areas directly',
          'Return to the dashboard anytime using the home icon'
        ]
      },
      {
        title: 'Manage Tasks',
        description: 'Track and manage your tasks and deadlines from the dashboard.',
        stepTitle: 'Manage Tasks',
        bulletPoints: [
          'View all assigned tasks organized by priority and deadline',
          'Track task completion status with visual progress indicators',
          'Access detailed task information with a single click'
        ]
      }
    ]
  }
};

interface TutorialManagerProps {
  tabName: string;
  children: React.ReactNode;
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
export function TutorialManager({ tabName, children }: TutorialManagerProps): React.ReactNode {
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
      
      // Company profile variations
      'company-profile-page': 'company-profile',
      
      // Risk score variations - keep these separate for now
      // 'risk-score-configuration': 'risk-score-configuration',
      // 'risk-score': 'risk-score',
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
      'risk-score': '/risk-score',
      'claims-risk': '/claims-risk',
      'risk-score-configuration': '/risk-score-configuration',
      'playground': '/playground'
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
  
  // In React, we need to call hooks unconditionally to maintain consistent order
  // This is a workaround to avoid the useTutorialAssets hook which causes issues
  
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
  
  // If we're still loading, show a loading state
  if (isLoading) {
    logger.debug(`Waiting for data to load (isLoading: ${isLoading}, initComplete: ${initializationComplete})`);
    return null;
  }
  
  // If we're not on a base route, don't show the tutorial
  if (!isBaseRoute()) {
    logger.info(`Tutorial not shown - not on base route for tab: ${normalizedTabName}, path: ${location}`);
    return null;
  }
  
  // If initialization is complete but tutorial is not enabled, don't render anything
  if (initializationComplete && !tutorialEnabled) {
    logger.info(`Tutorial not enabled for tab: ${normalizedTabName}`);
    
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
    
    return null;
  }
  
  // If tutorial is completed, just render children without tutorial modal
  if (isCompleted) {
    // Only log if we have data
    if (initializationComplete) {
      logger.debug(`Tutorial already completed for tab: ${normalizedTabName}`);
    }
    return <>{children}</>;
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
          // No image paths specified - will use placeholder
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
  
  // Generate the image URL based on the tab name and step
  const getImageUrl = () => {
    // Map tab names to their correct image prefix pattern based on available files
    const tabToPrefix: Record<string, string> = {
      'dashboard': 'modal_dash',
      'file-vault': 'modal_file',
      'risk-score': 'modal_risk',
      'risk-score-configuration': 'modal_risk',
      'network': 'modal_network',
      'claims': 'modal_claims',
      'insights': 'modal_insights'
    };
    
    // Use the correct prefix or fallback to a normalized version of the tab name
    const prefix = tabToPrefix[normalizedTabName] || `modal_${normalizedTabName.replace(/-/g, '_')}`;
    
    return `/assets/tutorials/${prefix}_${stepToUse + 1}.png`;
  };
  
  const imageUrl = getImageUrl();
  const imageLoading = false;
  
  logger.debug(`Loading image for ${normalizedTabName}, step ${stepToUse + 1}: ${imageUrl}`);
  
  // Use the TabTutorialModal with the appropriate content
  return (
    <>
      {children}
      <TabTutorialModal
        title={modalTitle}
        description={tutorialContent.steps[stepToUse].description}
        imageUrl={imageUrl}
        isLoading={isLoading || imageLoading}
        currentStep={stepToUse}
        totalSteps={tutorialContent.steps.length}
        onNext={handleNext}
        onBack={handleBack}
        onComplete={handleComplete}
        onClose={() => markTutorialSeen()}
        stepTitle={tutorialContent.steps[stepToUse].title}
        bulletPoints={tutorialContent.steps[stepToUse].bulletPoints}
      />
    </>
  );
}