// Define all tutorial content in a central location
const TUTORIAL_CONTENT = {
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
        title: 'Manage Profile',
        description: 'Welcome to your Company Profile. Here you can view and update all your organization\'s information and settings.',
        stepTitle: 'Manage Profile',
        bulletPoints: [
          'View and edit your company\'s core information in one place',
          'Access historical profile changes and audit logs',
          'Understand how your profile data influences risk assessments'
        ]
      },
      {
        title: 'Update Business Info',
        description: 'This section contains your core business details. Keep this information up-to-date for accurate risk assessment.',
        stepTitle: 'Update Business Info',
        bulletPoints: [
          'Update essential company information including address and contacts',
          'Maintain industry classifications and business descriptions',
          'Manage financial information and corporate structure details'
        ]
      },
      {
        title: 'Manage Team',
        description: 'Manage your team members, their roles, and permissions. You can add new users or update existing access levels.',
        stepTitle: 'Manage Team',
        bulletPoints: [
          'Add new team members and assign appropriate roles',
          'Set granular permissions based on job responsibilities',
          'Monitor user activity and access logs for security'
        ]
      },
      {
        title: 'Track Compliance',
        description: 'Review your compliance status and certification levels. This section shows any outstanding requirements or upcoming renewals.',
        stepTitle: 'Track Compliance',
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
        title: 'Simulate Scenarios',
        description: 'Welcome to the Playground. This is a safe environment where you can test different scenarios without affecting your production data.',
        stepTitle: 'Simulate Scenarios',
        bulletPoints: [
          'Experiment with risk scenarios in a safe, isolated environment',
          'Test configuration changes without affecting production settings',
          'Use real company data with "what-if" analysis capabilities'
        ]
      },
      {
        title: 'Build Test Cases',
        description: 'Use these tools to create different test scenarios. You can simulate various risk events and see how they would impact your business.',
        stepTitle: 'Build Test Cases',
        bulletPoints: [
          'Build custom scenarios with multiple risk variables',
          'Simulate market events and their impact on your risk profile',
          'Save and share scenarios with your team for collaborative planning'
        ]
      },
      {
        title: 'Compare Results',
        description: 'After running a simulation, you can analyze the results here. Compare different scenarios to find optimal risk strategies.',
        stepTitle: 'Compare Results',
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
        title: 'View Key Metrics',
        description: 'The dashboard provides a snapshot of your organization\'s key metrics and activities.',
        stepTitle: 'View Key Metrics',
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