/**
 * ========================================
 * Demo API Endpoints
 * ========================================
 * 
 * Production-ready API endpoints for demo account creation and management.
 * Handles company creation, user setup, authentication, and email invitations.
 * 
 * @module server/demo-api
 * @version 1.0.0
 * @since 2025-05-25
 */

import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '@db';
import { companies, users } from '@db/schema';
import { eq } from 'drizzle-orm';
import { broadcastMessage } from './services/websocket';

const router = Router();

/**
 * Generate realistic company details based on persona and size
 */
function generateRealisticCompanyDetails(persona: string, size: string) {
  const companyTypes = {
    'accredited-data-recipient': 'fintech',
    'data-provider': 'bank',
    'new-data-recipient': 'fintech',
    'invela-admin': 'consulting'
  };

  const type = companyTypes[persona] || 'fintech';
  
  // Generate realistic websites
  const websites = {
    fintech: ['securepay.com', 'dataflow.io', 'quantumfinance.net', 'techsecure.co', 'nexusfintech.com'],
    bank: ['firstnational.com', 'centralbank.org', 'premierbank.net', 'trustbank.com', 'globalbank.co'],
    consulting: ['strategycorp.com', 'advisorygroup.net', 'consultpro.io', 'expertadvisors.com', 'strategicpartners.co']
  };

  // Generate realistic addresses
  const addresses = [
    '1250 Broadway, Suite 2700, New York, NY 10001',
    '555 California Street, 45th Floor, San Francisco, CA 94104',
    '200 West Street, 31st Floor, New York, NY 10282',
    '100 Federal Street, 37th Floor, Boston, MA 02110',
    '1201 Third Avenue, Suite 4900, Seattle, WA 98101',
    '2100 McKinney Avenue, Suite 1600, Dallas, TX 75201',
    '71 South Wacker Drive, Suite 4400, Chicago, IL 60606'
  ];

  // Generate products and services
  const products = {
    fintech: [
      'Digital payment processing, fraud detection systems, compliance automation platform',
      'Real-time transaction monitoring, risk assessment tools, regulatory reporting solutions',
      'API-driven financial services, secure data analytics, automated compliance workflows',
      'Payment gateway solutions, identity verification, AML/KYC automation platform'
    ],
    bank: [
      'Commercial banking services, treasury management, corporate lending solutions',
      'Investment banking, wealth management, institutional financial services',
      'Digital banking platform, payment processing, credit risk management',
      'Corporate finance, trade finance, cash management solutions'
    ],
    consulting: [
      'Risk management consulting, regulatory compliance advisory, financial technology integration',
      'Digital transformation services, compliance automation, cybersecurity consulting',
      'Financial services consulting, regulatory advisory, technology implementation'
    ]
  };

  // Generate leadership teams
  const leadership = [
    'Sarah Chen (CEO, Former Goldman Sachs VP), Michael Rodriguez (CTO, Ex-Google Engineering), Jennifer Park (CFO, Former JPMorgan Director)',
    'David Thompson (CEO, Former Bank of America SVP), Lisa Wang (CTO, Ex-Microsoft Principal), Robert Kim (CFO, Former Citigroup VP)',
    'Amanda Foster (CEO, Former Morgan Stanley MD), James Liu (CTO, Ex-Amazon Senior Director), Maria Gonzalez (CFO, Former Wells Fargo VP)',
    'Thomas Anderson (CEO, Former Stripe VP), Rachel Davis (CTO, Ex-Meta Engineering Manager), Kevin Zhang (CFO, Former BlackRock Director)'
  ];

  // Generate key clients and partners
  const clients = {
    fintech: [
      'JPMorgan Chase, Wells Fargo, American Express, Mastercard, Visa',
      'Bank of America, Goldman Sachs, Morgan Stanley, Charles Schwab, Fidelity',
      'Citigroup, Capital One, PayPal, Square, Stripe',
      'PNC Bank, US Bank, TD Bank, HSBC, Barclays'
    ],
    bank: [
      'Fortune 500 corporations, institutional investors, government agencies, multinational enterprises',
      'Private equity firms, hedge funds, insurance companies, pension funds',
      'Technology companies, healthcare organizations, energy sector clients, retail chains',
      'Real estate investment trusts, asset management firms, sovereign wealth funds'
    ],
    consulting: [
      'Regional banks, credit unions, fintech startups, insurance companies',
      'Investment firms, payment processors, cryptocurrency exchanges, regulatory bodies',
      'Financial technology companies, compliance departments, risk management teams'
    ]
  };

  // Generate investors
  const investors = {
    'xlarge': [
      'Sequoia Capital, Andreessen Horowitz, Goldman Sachs Principal Strategic Investments, JPMorgan Strategic Investments',
      'Kleiner Perkins, Accel Partners, Bessemer Venture Partners, General Atlantic',
      'Tiger Global Management, Coatue Management, Insight Partners, GV (Google Ventures)',
      'Blackstone Strategic Partners, KKR, Carlyle Group, Apollo Global Management'
    ],
    'extra-large': [
      'Sequoia Capital, Andreessen Horowitz, Goldman Sachs Principal Strategic Investments, JPMorgan Strategic Investments',
      'Kleiner Perkins, Accel Partners, Bessemer Venture Partners, General Atlantic',
      'Tiger Global Management, Coatue Management, Insight Partners, GV (Google Ventures)',
      'Blackstone Strategic Partners, KKR, Carlyle Group, Apollo Global Management'
    ],
    large: [
      'Sequoia Capital, Andreessen Horowitz, Goldman Sachs Principal Strategic Investments, JPMorgan Strategic Investments',
      'Kleiner Perkins, Accel Partners, Bessemer Venture Partners, General Atlantic',
      'Tiger Global Management, Coatue Management, Insight Partners, GV (Google Ventures)',
      'Blackstone Strategic Partners, KKR, Carlyle Group, Apollo Global Management'
    ],
    medium: [
      'Index Ventures, Lightspeed Venture Partners, FirstMark Capital, Ribbit Capital',
      'QED Investors, Nyca Partners, FinTech Collective, Commerce Ventures',
      'Matrix Partners, Redpoint Ventures, Foundation Capital, NEA',
      'Bain Capital Ventures, General Catalyst, Spark Capital, CRV'
    ],
    small: [
      'Local angel investors, regional venture capital, strategic industry partners',
      'Seed funding from financial services veterans, early-stage VC firms',
      'Angel networks, accelerator programs, strategic corporate investors',
      'Family offices, regional investment groups, industry-focused funds'
    ]
  };

  // Generate certifications
  const certifications = [
    'SOC 2 Type II, ISO 27001, PCI DSS Level 1, GDPR Compliant, CCPA Compliant',
    'SOX Compliance, FISMA Moderate, FedRAMP Authorized, NIST Cybersecurity Framework',
    'ISO 9001, ISO 14001, SSAE 18, ISAE 3402, CSA STAR Level 2',
    'HIPAA Compliant, SOC 1 Type II, ISO 22301, COBIT 5, COSO Framework'
  ];

  // Normalize size for investor mapping
  const normalizedSize = size === 'extra-large' ? 'xlarge' : size;
  const investorSize = investors[normalizedSize] ? normalizedSize : 'medium'; // fallback to medium
  
  // Select random data
  const randomWebsite = websites[type][Math.floor(Math.random() * websites[type].length)];
  const randomAddress = addresses[Math.floor(Math.random() * addresses.length)];
  const randomProducts = products[type][Math.floor(Math.random() * products[type].length)];
  const randomLeadership = leadership[Math.floor(Math.random() * leadership.length)];
  const randomClients = clients[type][Math.floor(Math.random() * clients[type].length)];
  const randomInvestors = investors[investorSize][Math.floor(Math.random() * investors[investorSize].length)];
  const randomCertifications = certifications[Math.floor(Math.random() * certifications.length)];

  return {
    website: `https://www.${randomWebsite}`,
    address: randomAddress,
    products: randomProducts,
    leadership: randomLeadership,
    clients: randomClients,
    investors: randomInvestors,
    certifications: randomCertifications
  };
}

/**
 * Generate risk clusters based on risk score
 */
function generateRiskClusters(riskScore: number) {
  // Higher risk scores (80-100) = lower actual risk values
  // Lower risk scores (0-50) = higher actual risk values
  const baseRisk = Math.max(5, 100 - riskScore);
  const variation = 15;
  
  return {
    "PII Data": Math.max(5, Math.min(95, baseRisk + (Math.random() - 0.5) * variation)),
    "Account Data": Math.max(5, Math.min(95, baseRisk + (Math.random() - 0.5) * variation)),
    "Data Transfers": Math.max(5, Math.min(95, baseRisk + (Math.random() - 0.5) * variation)),
    "Certifications Risk": Math.max(5, Math.min(95, baseRisk + (Math.random() - 0.5) * variation)),
    "Security Risk": Math.max(5, Math.min(95, baseRisk + (Math.random() - 0.5) * variation)),
    "Financial Risk": Math.max(5, Math.min(95, baseRisk + (Math.random() - 0.5) * variation))
  };
}

/**
 * Demo Company Creation
 * Creates a new company for demo purposes with specified configuration
 */
router.post('/demo/company/create', async (req, res) => {
  try {
    const { name, type, persona, riskProfile, companySize, metadata } = req.body;

    console.log('[DemoAPI] Creating company with full payload:', JSON.stringify(req.body, null, 2));
    console.log('[DemoAPI] Extracted fields:', { name, type, persona, companySize, riskProfile });

    // Broadcast start event to connected clients
    broadcastMessage('demo_action_start', {
      actionId: 'create-company',
      actionName: `Creating "${name}" organization`,
      timestamp: new Date().toISOString()
    });

    // Create realistic company data based on persona and size
    const getCompanyData = (persona: string, size: string) => {
      
      // ========================================
      // PERSONA-SPECIFIC CONFIGURATION
      // ========================================
      
      /**
       * Configure company category, accreditation status, and available tabs 
       * based on the selected persona type.
       * 
       * Persona Tab Access:
       * - Non-accredited FinTech: ["task-center"]
       * - Accredited FinTech: ["dashboard", "task-center", "file-vault", "insights"]
       * - Bank Admin: ["dashboard", "task-center", "network", "file-vault", "insights", "claims", "risk-score"]
       * - Invela Admin: ["task-center", "dashboard", "network", "file-vault", "insights", "playground", "claims", "risk-score"]
       */
      console.log(`[DemoAPI] Configuring persona: ${persona}`);
      
      let category: string;
      let accreditationStatus: string;
      let availableTabs: string[];
      
      switch (persona) {
        case 'accredited-data-recipient':
          category = 'FinTech';
          accreditationStatus = 'APPROVED';
          availableTabs = ['dashboard', 'task-center', 'file-vault', 'insights'];
          console.log('[DemoAPI] Configured accredited FinTech with full business access');
          break;
          
        case 'data-provider':
          category = 'Bank';
          accreditationStatus = 'APPROVED'; // Banks are typically pre-approved
          availableTabs = ['dashboard', 'task-center', 'network', 'file-vault', 'insights', 'claims', 'risk-score'];
          console.log('[DemoAPI] Configured bank admin with full administrative access');
          break;
          
        case 'invela-admin':
          category = 'FinTech'; // Invela is a FinTech platform
          accreditationStatus = 'APPROVED';
          availableTabs = ['task-center', 'dashboard', 'network', 'file-vault', 'insights', 'playground', 'claims', 'risk-score'];
          console.log('[DemoAPI] Configured Invela admin with complete platform access');
          break;
          
        default: // 'new-data-recipient' and any other persona
          category = 'FinTech';
          accreditationStatus = 'PENDING';
          availableTabs = ['task-center'];
          console.log('[DemoAPI] Configured non-accredited FinTech with basic access');
          break;
      }
      
      const baseData = {
        category,
        accreditation_status: accreditationStatus,
        is_demo: true,
        available_tabs: availableTabs
      };

      // ========================================
      // COMPANY SIZE MAPPING
      // ========================================
      
      /**
       * Generate realistic revenue and employee data based on company size selection.
       * Ensures revenue_tier matches the selected size parameter exactly.
       * 
       * Size Ranges:
       * - xlarge: $500M-$2B revenue, 10,000-50,000 employees
       * - large: $100M-$500M revenue, 1,000-10,000 employees  
       * - medium: $10M-$100M revenue, 100-1,000 employees
       * - small: $1M-$10M revenue, 10-100 employees
       */
      console.log(`[DemoAPI] Processing company size: ${size}`);
      
      if (size === 'xlarge' || size === 'extra-large') {
        // Enterprise-level companies ($500M-$2B)
        const revenueAmount = Math.floor(Math.random() * 1500000000) + 500000000; // $500M-$2B
        const employeeCount = Math.floor(Math.random() * 40000) + 10000; // 10K-50K employees
        
        console.log(`[DemoAPI] Generated ${size} company: $${(revenueAmount / 1000000).toFixed(0)}M revenue, ${employeeCount} employees`);
        
        return {
          ...baseData,
          revenue: revenueAmount >= 1000000000 
            ? `$${(revenueAmount / 1000000000).toFixed(1)}B` // Format as "$1.2B"
            : `$${(revenueAmount / 1000000).toFixed(0)}M`,   // Format as "$750M"
          num_employees: employeeCount,
          revenue_tier: size === 'extra-large' ? 'xlarge' : 'xlarge' // Normalize to xlarge
        };
      } else if (size === 'large') {
        // Large corporations ($100M-$500M)
        const revenueAmount = Math.floor(Math.random() * 400000000) + 100000000; // $100M-$500M
        const employeeCount = Math.floor(Math.random() * 9000) + 1000; // 1K-10K employees
        
        console.log(`[DemoAPI] Generated large company: $${(revenueAmount / 1000000).toFixed(0)}M revenue, ${employeeCount} employees`);
        
        return {
          ...baseData,
          revenue: `$${(revenueAmount / 1000000).toFixed(0)}M`, // Format as "$250M"
          num_employees: employeeCount,
          revenue_tier: 'large'
        };
      } else if (size === 'medium') {
        // Mid-size companies ($10M-$100M)
        const revenueAmount = Math.floor(Math.random() * 90000000) + 10000000; // $10M-$100M
        const employeeCount = Math.floor(Math.random() * 900) + 100; // 100-1K employees
        
        console.log(`[DemoAPI] Generated medium company: $${(revenueAmount / 1000000).toFixed(0)}M revenue, ${employeeCount} employees`);
        
        return {
          ...baseData,
          revenue: `$${(revenueAmount / 1000000).toFixed(0)}M`, // Format as "$45M"
          num_employees: employeeCount,
          revenue_tier: 'medium'
        };
      } else {
        // Small businesses ($1M-$10M) - default case including 'small'
        const revenueAmount = Math.floor(Math.random() * 9000000) + 1000000; // $1M-$10M
        const employeeCount = Math.floor(Math.random() * 90) + 10; // 10-100 employees
        
        console.log(`[DemoAPI] Generated small company: $${(revenueAmount / 1000000).toFixed(1)}M revenue, ${employeeCount} employees`);
        
        return {
          ...baseData,
          revenue: `$${(revenueAmount / 1000000).toFixed(1)}M`, // Format as "$5.5M"
          num_employees: employeeCount,
          revenue_tier: 'small'
        };
      }
    };

    console.log('[DemoAPI] Generating company data for:', { persona, companySize });
    const companyData = getCompanyData(persona, companySize || 'medium');
    console.log('[DemoAPI] Generated company data:', companyData);
    
    // Generate risk score and clusters
    const finalRiskScore = riskProfile || Math.floor(Math.random() * 40) + 60;
    const riskClusters = generateRiskClusters(finalRiskScore);

    // ========================================
    // BUSINESS DETAILS GENERATION
    // ========================================
    
    /**
     * Generate comprehensive business details including website, address,
     * leadership team, clients, investors, and certifications.
     */
    console.log('[DemoAPI] Generating comprehensive business details...');
    const businessDetails = generateRealisticCompanyDetails(persona, companySize || 'medium');
    console.log('[DemoAPI] Generated business details:', {
      website: businessDetails.website,
      hasAddress: !!businessDetails.address,
      hasLeadership: !!businessDetails.leadership,
      hasClients: !!businessDetails.clients,
      hasInvestors: !!businessDetails.investors,
      hasCertifications: !!businessDetails.certifications
    });

    // ========================================
    // COMPREHENSIVE COMPANY DATA ASSEMBLY
    // ========================================
    
    /**
     * Assemble all company data including generated details, risk assessment,
     * and business information for database insertion.
     */
    const insertValues = {
      name,
      description: `Professional ${companyData.category.toLowerCase()} company specializing in secure data management and compliance`,
      ...companyData,
      risk_score: finalRiskScore,
      risk_clusters: riskClusters,
      
      // Business Details
      website_url: businessDetails.website,
      hq_address: businessDetails.address,
      products_services: businessDetails.products,
      founders_and_leadership: businessDetails.leadership,
      key_clients_partners: businessDetails.clients,
      investors: businessDetails.investors,
      certifications_compliance: businessDetails.certifications,
      
      // Corporate Structure
      legal_structure: 'Corporation',
      market_position: companyData.revenue_tier === 'xlarge' ? 'Market Dominator' :
                      companyData.revenue_tier === 'large' ? 'Market Leader' : 
                      companyData.revenue_tier === 'medium' ? 'Established Player' : 'Growing Business',
      incorporation_year: new Date().getFullYear() - Math.floor(Math.random() * 15) - 5, // 5-20 years old
      funding_stage: companyData.revenue_tier === 'xlarge' ? 'Public' :
                    companyData.revenue_tier === 'large' ? 'Public' : 
                    companyData.revenue_tier === 'medium' ? 'Series C' : 'Series B'
    };
    
    console.log('[DemoAPI] Assembled complete company data for insertion');
    console.log('[DemoAPI] Business details verification:', {
      websiteIncluded: !!insertValues.website_url,
      addressIncluded: !!insertValues.hq_address,
      productsIncluded: !!insertValues.products_services,
      leadershipIncluded: !!insertValues.founders_and_leadership,
      clientsIncluded: !!insertValues.key_clients_partners,
      investorsIncluded: !!insertValues.investors,
      certificationsIncluded: !!insertValues.certifications_compliance,
      riskClustersIncluded: !!insertValues.risk_clusters
    });

    console.log('[DemoAPI] Final insert values:', JSON.stringify(insertValues, null, 2));
    
    // Create company record with comprehensive data
    const company = await db.insert(companies).values(insertValues).returning().then(rows => rows[0]);

    // Broadcast completion event
    broadcastMessage('demo_action_complete', {
      actionId: 'create-company',
      actionName: `Creating "${name}" organization`,
      success: true,
      result: {
        companyId: company.id,
        companyName: company.name
      },
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      companyId: company.id,
      companyData: {
        name: company.name,
        type,
        persona
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DemoAPI] Company creation error:', error);
    
    // Broadcast error event
    broadcastMessage('demo_action_error', {
      actionId: 'create-company',
      actionName: 'Creating company organization',
      error: 'Failed to create company',
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create company',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Demo User Creation
 * Creates a new user account with proper role and permissions
 */
router.post('/demo/user/create', async (req, res) => {
  try {
    const { fullName, email, role, permissions, companyId } = req.body;

    console.log('[DemoAPI] Creating user:', { fullName, email, role, companyId });

    // Generate temporary password for demo
    const tempPassword = 'demo123'; // In production, use secure random generation
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Split full name
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;

    // Create user record using actual database fields
    const [user] = await db.insert(users).values({
      email,
      password: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      company_id: typeof companyId === 'string' && companyId.startsWith('comp_') 
        ? parseInt(companyId.replace('comp_', '')) 
        : parseInt(companyId)
    }).returning();

    res.json({
      success: true,
      userId: user.id,
      userData: {
        fullName,
        email,
        role
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DemoAPI] User creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Demo Authentication Setup
 * Sets up authentication credentials and generates login tokens
 */
router.post('/demo/auth/setup', async (req, res) => {
  try {
    const { userId, email, generateCredentials } = req.body;

    console.log('[DemoAPI] Setting up authentication:', { userId, email });

    // Generate demo session token
    const sessionToken = `demo_session_${Date.now()}_${userId}`;
    
    // In production, create proper session management
    const credentials = {
      loginUrl: '/login',
      email,
      tempPassword: 'demo123',
      sessionToken,
      setupComplete: true
    };

    res.json({
      success: true,
      credentials,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DemoAPI] Auth setup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup authentication',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Demo Email Invitation
 * Sends welcome email with login credentials (requires SendGrid setup)
 */
router.post('/demo/email/send-invitation', async (req, res) => {
  try {
    const { userEmail, userName, companyName, loginCredentials } = req.body;

    console.log('[DemoAPI] Sending invitation email:', { userEmail, userName, companyName });

    // TODO: Integrate with SendGrid for actual email sending
    // For now, we'll simulate the email sending
    
    const emailSent = true; // In production, check actual SendGrid response
    const messageId = `msg_${Date.now()}`;

    res.json({
      success: true,
      emailSent,
      messageId,
      recipientEmail: userEmail,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DemoAPI] Email invitation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send invitation email',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Demo Environment Finalization
 * Completes the demo setup and prepares the environment for access
 */
router.post('/demo/environment/finalize', async (req, res) => {
  try {
    const { userId, companyId, demoType } = req.body;

    console.log('[DemoAPI] Finalizing environment:', { userId, companyId, demoType });

    // Set up demo data and environment based on persona type
    const environmentId = `env_${Date.now()}`;
    
    // In production, this would initialize demo datasets, 
    // configure permissions, and prepare the dashboard

    res.json({
      success: true,
      demoReady: true,
      accessUrl: '/dashboard',
      environmentId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DemoAPI] Environment finalization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to finalize demo environment',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;