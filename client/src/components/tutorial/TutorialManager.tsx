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
  // Claims tab tutorial
  'claims': {
    title: 'Claims Dashboard',
    description: 'Learn how to manage and track claims in your organization',
    steps: [
      {
        title: 'Claims Dashboard',
        description: 'Welcome to Claims Management. This dashboard gives you an overview of all claims, their status, and important metrics.',
        imagePath: '/assets/tutorials/claims/overview.svg',
        stepTitle: 'Claims Dashboard Overview',
        bulletPoints: [
          'View a summary of all claims activity across your organization',
          'Monitor critical metrics including claim frequency and severity',
          'Track claims trends over time with interactive visualizations'
        ]
      },
      {
        title: 'Claim Details',
        description: 'Click on any claim to view its full details, including policy information, claimant data, and documentation.',
        imagePath: '/assets/tutorials/claims/details.svg',
        stepTitle: 'Detailed Claims Information',
        bulletPoints: [
          'Access comprehensive information about individual claims',
          'Review policy details, coverage limits, and claim history',
          'Track claim status and progression through your workflow'
        ]
      },
      {
        title: 'Claims Processing',
        description: 'Use these tools to process claims efficiently. You can update status, request additional information, or approve payments.',
        imagePath: '/assets/tutorials/claims/processing.svg',
        stepTitle: 'Claims Processing Tools',
        bulletPoints: [
          'Update claim status using standardized workflow steps',
          'Request additional documentation when needed for evaluation',
          'Process approvals and payments through integrated systems'
        ]
      },
      {
        title: 'Analytics Dashboard',
        description: 'The analytics dashboard provides insights into claims trends, settlement times, and potential fraud indicators.',
        imagePath: '/assets/tutorials/claims/analytics.svg',
        stepTitle: 'Claims Analytics',
        bulletPoints: [
          'Identify patterns and trends in claims data over time',
          'Compare performance metrics against industry benchmarks',
          'Detect potential fraud indicators with advanced analytics'
        ]
      },
      {
        title: 'Documentation Management',
        description: 'Manage all claim-related documents in this section. You can upload, organize, and securely share important files with stakeholders.',
        imagePath: '/assets/tutorials/claims/documentation.svg',
        stepTitle: 'Document Management',
        bulletPoints: [
          'Upload and organize claim-related documents securely',
          'Control access permissions for sensitive information',
          'Share documentation with appropriate stakeholders seamlessly'
        ]
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
        stepTitle: 'Configuration Overview',
        bulletPoints: [
          'Tailor the S&P Data Access Risk Score to your organization\'s needs',
          'Adjust weighting factors to reflect your specific risk priorities',
          'Save multiple configuration profiles for different risk assessments'
        ]
      },
      {
        title: 'Risk Gauge',
        description: 'The Risk Gauge shows the current calculated risk level based on your configuration. Higher scores indicate greater risk exposure.',
        imagePath: '/assets/tutorials/risk-score/gauge.svg',
        stepTitle: 'Risk Level Visualization',
        bulletPoints: [
          'Visualize your current risk score on the interactive gauge',
          'Understand color-coded risk thresholds from low to critical',
          'See real-time updates as you modify configuration settings'
        ]
      },
      {
        title: 'Risk Dimensions',
        description: 'Drag and drop these cards to prioritize different risk dimensions. The order indicates the relative importance of each dimension in the overall risk calculation.',
        imagePath: '/assets/tutorials/risk-score/dimension-cards.svg',
        stepTitle: 'Risk Dimension Weighting',
        bulletPoints: [
          'Customize weights for key risk factors like Cyber Security and Public Sentiment',
          'Adjust the impact of Dark Web Data and Financial Stability indicators',
          'Fine-tune Data Access Scope importance for your industry context'
        ]
      },
      {
        title: 'Risk Acceptance Level',
        description: 'Adjust this slider to set your organization\'s risk tolerance. This affects how calculated scores are interpreted in the context of your risk appetite.',
        imagePath: '/assets/tutorials/risk-score/risk-acceptance.svg',
        stepTitle: 'Risk Tolerance Settings',
        bulletPoints: [
          'Set company-wide risk tolerance thresholds using the slider',
          'Determine when alerts and notifications will be triggered',
          'Configure different tolerance levels for various business units'
        ]
      },
      {
        title: 'Comparative Analysis',
        description: 'Compare your risk profile with other companies or industry benchmarks. Use the search bar to add companies to your comparison.',
        imagePath: '/assets/tutorials/risk-score/comparative.svg',
        stepTitle: 'Benchmarking Tools',
        bulletPoints: [
          'Compare your risk configuration with industry peers and competitors',
          'Identify gaps in your risk assessment approach',
          'Generate reports highlighting differences between configurations'
        ]
      },
    ]
  },
  // Main Risk Score Dashboard - Shows the S&P DARS score and overview
  'risk-score': {
    title: 'S&P Data Access Risk Score',
    description: 'Understand how to interpret and use your risk assessment dashboard',
    steps: [
      {
        title: 'Risk Score Dashboard',
        description: 'Welcome to the Risk Score Dashboard. This page shows your current S&P Data Access Risk Score and provides tools to understand and manage your risk posture.',
        imagePath: '/assets/tutorials/risk-score/overview.svg',
        stepTitle: 'Risk Score Overview',
        bulletPoints: [
          'View your current risk score and trend over time',
          'Explore detailed breakdown of contributing risk factors',
          'Access risk mitigation recommendations based on your profile'
        ]
      },
      {
        title: 'Risk Gauge',
        description: 'The Risk Gauge shows the current calculated risk level based on your configuration. Higher scores indicate greater risk exposure.',
        imagePath: '/assets/tutorials/risk-score/gauge.svg',
        stepTitle: 'Understanding the Risk Gauge',
        bulletPoints: [
          'Interpret color-coded risk levels from low to critical',
          'See how your score compares to industry benchmarks',
          'Track changes in your risk gauge with historical data'
        ]
      },
      {
        title: 'Risk Dimensions',
        description: 'Drag and drop these cards to prioritize different risk dimensions. The order indicates the relative importance of each dimension in the overall risk calculation.',
        imagePath: '/assets/tutorials/risk-score/dimension-cards.svg',
        stepTitle: 'Managing Risk Dimensions',
        bulletPoints: [
          'Prioritize risk dimensions based on your business needs',
          'Understand how each dimension affects your overall score',
          'Create a custom weighting system for your industry context'
        ]
      },
      {
        title: 'Risk Acceptance Level',
        description: 'Adjust this slider to set your organization\'s risk tolerance. This affects how calculated scores are interpreted in the context of your risk appetite.',
        imagePath: '/assets/tutorials/risk-score/risk-acceptance.svg',
        stepTitle: 'Setting Risk Tolerance',
        bulletPoints: [
          'Define acceptable risk thresholds for your organization',
          'Receive alerts when risks exceed your defined tolerance',
          'Adjust your tolerance levels based on business requirements'
        ]
      },
      {
        title: 'Comparative Analysis',
        description: 'Compare your risk profile with other companies or industry benchmarks. Use the search bar to add companies to your comparison.',
        imagePath: '/assets/tutorials/risk-score/comparative.svg',
        stepTitle: 'Risk Comparison Tools',
        bulletPoints: [
          'Compare your risk profile with industry peers',
          'Identify areas where you outperform or underperform',
          'Use benchmarking data to set realistic improvement goals'
        ]
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
        stepTitle: 'Insights Overview',
        bulletPoints: [
          'Access comprehensive analytics on your business risk profile',
          'View high-level KPIs and drill down into detailed metrics',
          'Receive AI-powered recommendations based on your data'
        ]
      },
      {
        title: 'Data Visualization',
        description: 'These charts and graphs represent key metrics and trends. Hover over any element to see detailed information.',
        imagePath: '/assets/tutorials/insights/visualization.svg',
        stepTitle: 'Interactive Visualizations',
        bulletPoints: [
          'Explore dynamic charts that respond to your interactions',
          'Customize visualization types to best represent your data',
          'Filter and segment data to uncover specific patterns'
        ]
      },
      {
        title: 'Custom Reports',
        description: 'Create customized reports based on your specific needs. Select metrics, time periods, and presentation formats.',
        imagePath: '/assets/tutorials/insights/reports.svg',
        stepTitle: 'Report Customization',
        bulletPoints: [
          'Build tailored reports focusing on metrics that matter to you',
          'Schedule automated report generation and delivery',
          'Save report templates for consistent analysis over time'
        ]
      },
      {
        title: 'Export Options',
        description: 'Use these options to export insights as PDFs, spreadsheets, or presentations to share with stakeholders.',
        imagePath: '/assets/tutorials/insights/export.svg',
        stepTitle: 'Sharing & Exporting',
        bulletPoints: [
          'Export data in multiple formats including PDF, CSV, and PowerPoint',
          'Share insights directly with team members via email or link',
          'Create annotated snapshots to highlight important findings'
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
    title: 'File Vault',
    description: 'Learn how to securely store and manage files',
    steps: [
      {
        title: 'File Vault Overview',
        description: 'Welcome to the File Vault. This secure repository stores all your important documents with enhanced security and organization.',
        imagePath: '/assets/tutorials/file-vault/overview.svg',
        stepTitle: 'File Vault Overview',
        bulletPoints: [
          'Access all your documents in one secure, centralized location',
          'Benefit from automatic versioning and audit trail features',
          'Experience enterprise-grade security for sensitive information'
        ]
      },
      {
        title: 'Document Categories',
        description: 'Files are organized by these categories. Click on any category to view related documents or use the search to find specific files.',
        imagePath: '/assets/tutorials/file-vault/categories.svg',
        stepTitle: 'Document Organization',
        bulletPoints: [
          'Browse files organized by logical categories and subcategories',
          'Use powerful search and filtering to quickly locate documents',
          'Apply custom tags to improve document categorization and findability'
        ]
      },
      {
        title: 'Upload Process',
        description: 'Use this section to upload new files. You can add metadata, set permissions, and choose the appropriate category for better organization.',
        imagePath: '/assets/tutorials/file-vault/upload.svg',
        stepTitle: 'File Upload & Management',
        bulletPoints: [
          'Upload multiple files with drag-and-drop or file selection',
          'Add metadata and tags to enhance document searchability',
          'Set document expiration dates and automatic retention policies'
        ]
      },
      {
        title: 'Security Settings',
        description: 'Manage file permissions and access controls here. You can set who can view, edit, or download each document or category.',
        imagePath: '/assets/tutorials/file-vault/security.svg',
        stepTitle: 'Security Controls',
        bulletPoints: [
          'Set granular permissions for individuals or groups of users',
          'Apply document-level encryption for highly sensitive files',
          'Monitor file access logs and receive security alerts'
        ]
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
        stepTitle: 'Company Profile Overview',
        bulletPoints: [
          'View and edit your company\'s core information in one place',
          'Access historical profile changes and audit logs',
          'Understand how your profile data influences risk assessments'
        ]
      },
      {
        title: 'Business Information',
        description: 'This section contains your core business details. Keep this information up-to-date for accurate risk assessment.',
        imagePath: '/assets/tutorials/company-profile/business-info.svg',
        stepTitle: 'Business Details',
        bulletPoints: [
          'Update essential company information including address and contacts',
          'Maintain industry classifications and business descriptions',
          'Manage financial information and corporate structure details'
        ]
      },
      {
        title: 'Team Management',
        description: 'Manage your team members, their roles, and permissions. You can add new users or update existing access levels.',
        imagePath: '/assets/tutorials/company-profile/team.svg',
        stepTitle: 'Team Management',
        bulletPoints: [
          'Add new team members and assign appropriate roles',
          'Set granular permissions based on job responsibilities',
          'Monitor user activity and access logs for security'
        ]
      },
      {
        title: 'Compliance Status',
        description: 'Review your compliance status and certification levels. This section shows any outstanding requirements or upcoming renewals.',
        imagePath: '/assets/tutorials/company-profile/compliance.svg',
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
    title: 'Playground Environment',
    description: 'Learn how to use the testing playground for risk simulations',
    steps: [
      {
        title: 'Playground Overview',
        description: 'Welcome to the Playground. This is a safe environment where you can test different scenarios without affecting your production data.',
        imagePath: '/assets/tutorials/playground/overview.svg',
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
        imagePath: '/assets/tutorials/playground/scenarios.svg',
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
        imagePath: '/assets/tutorials/playground/results.svg',
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
  
  // Do not render if tutorial is completed
  if (isCompleted) {
    // Only log if we have data
    if (initializationComplete) {
      logger.debug(`Tutorial already completed for tab: ${normalizedTabName}`);
    }
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
      stepTitle={tutorialContent.steps[stepToUse].title}
      bulletPoints={tutorialContent.steps[stepToUse].bulletPoints}
    />
  );
}