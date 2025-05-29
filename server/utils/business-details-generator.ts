/**
 * ========================================
 * Business Details Generator Utility
 * ========================================
 * 
 * Extracted from fintech-company-generator.ts to provide reusable business
 * detail generation for both demo company creation and bulk fintech generation.
 * 
 * Key Features:
 * - Persona-specific business detail generation
 * - Realistic data patterns for Banks vs FinTechs
 * - Consistent data quality across all company creation pathways
 * 
 * @module BusinessDetailsGenerator
 * @version 1.0.0
 * @since 2025-05-29
 */

// ========================================
// IMPORTS
// ========================================

// ========================================
// TYPES & INTERFACES
// ========================================

export type PersonaType = 'data-provider' | 'accredited-data-recipient' | 'new-data-recipient' | 'invela-admin';
export type RevenueTier = 'small' | 'medium' | 'large' | 'xlarge';

export interface BusinessDetails {
  legal_structure: string;
  market_position: string;
  hq_address: string;
  website_url: string;
  products_services: string;
  incorporation_year: number;
  founders_and_leadership: string;
  num_employees: number;
  revenue: string;
  revenue_tier: RevenueTier;
  key_clients_partners: string;
  investors: string;
  funding_stage: string;
  exit_strategy_history: string | null;
  certifications_compliance: string;
  files_public: string[];
  files_private: string[];
}

// ========================================
// CONSTANTS
// ========================================

const BUSINESS_SECTORS_FINTECH = [
  'Payment Processing', 'Digital Banking', 'Lending Platform', 'Investment Management',
  'Insurance Technology', 'Regulatory Technology', 'Blockchain Solutions', 'Trading Platform'
];

const BUSINESS_SECTORS_BANK = [
  'Commercial Banking', 'Investment Banking', 'Private Banking', 'Retail Banking',
  'Corporate Finance', 'Asset Management', 'Risk Management', 'Digital Banking'
];

const CITIES = [
  'New York, NY', 'San Francisco, CA', 'London, UK', 'Boston, MA',
  'Chicago, IL', 'Austin, TX', 'Seattle, WA', 'Toronto, ON'
];

const LEGAL_STRUCTURES = {
  APPROVED: ['Corporation', 'Limited Liability Company', 'Public Limited Company'],
  PENDING: ['Private Limited Company', 'Limited Liability Company', 'Corporation'],
  BANK: ['National Bank', 'State Bank', 'Federal Credit Union', 'Banking Corporation']
};

const FUNDING_STAGES = {
  APPROVED: ['Series B', 'Series C', 'Series D', 'Growth Stage'],
  PENDING: ['Seed', 'Series A', 'Pre-Series A', 'Angel'],
  BANK: ['Public', 'Private', 'Mutual', 'Government']
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateAddress(): string {
  const streetNumbers = [100, 200, 300, 500, 1000, 1500, 2000];
  const streetNames = [
    'Main Street', 'Broadway', 'Market Street', 'Federal Street', 'Wall Street',
    'Innovation Drive', 'Tech Boulevard', 'Financial Plaza', 'Commerce Way'
  ];
  
  const streetNumber = randomChoice(streetNumbers);
  const streetName = randomChoice(streetNames);
  const city = randomChoice(CITIES);
  
  return `${streetNumber} ${streetName}, ${city}`;
}

function getRevenueTier(isApproved: boolean, persona: PersonaType): RevenueTier {
  if (persona === 'data-provider') {
    // Banks typically have higher revenue tiers
    return randomChoice(['large', 'xlarge'] as RevenueTier[]);
  }
  
  const revenueTiers = isApproved 
    ? ['medium', 'large', 'xlarge']
    : ['small', 'medium'];
  
  return randomChoice(revenueTiers) as RevenueTier;
}

function getEmployeeCount(revenueTier: RevenueTier): number {
  const employeeRanges = {
    small: { min: 25, max: 500 },
    medium: { min: 501, max: 3000 },
    large: { min: 3001, max: 8000 },
    xlarge: { min: 8001, max: 15000 }
  };
  
  return randomInt(
    employeeRanges[revenueTier].min, 
    employeeRanges[revenueTier].max
  );
}

// ========================================
// MAIN GENERATION FUNCTIONS
// ========================================

/**
 * Generates comprehensive business details for a company based on persona type
 */
export function generateBusinessDetails(
  companyName: string,
  persona: PersonaType,
  isApproved: boolean = true
): BusinessDetails {
  const isBank = persona === 'data-provider';
  const sector = isBank 
    ? randomChoice(BUSINESS_SECTORS_BANK)
    : randomChoice(BUSINESS_SECTORS_FINTECH);
  
  const revenueTier = getRevenueTier(isApproved, persona);
  const numEmployees = getEmployeeCount(revenueTier);
  
  // Generate persona-specific business details
  const businessDetails: BusinessDetails = {
    legal_structure: randomChoice(
      isBank ? LEGAL_STRUCTURES.BANK : LEGAL_STRUCTURES[isApproved ? 'APPROVED' : 'PENDING']
    ),
    
    market_position: isBank
      ? `Leading ${sector.toLowerCase()} institution serving enterprise and institutional clients`
      : isApproved 
        ? `Leading ${sector.toLowerCase()} provider serving enterprise clients`
        : `Emerging ${sector.toLowerCase()} platform targeting ${randomChoice(['SMBs', 'retail customers', 'startups'])}`,
    
    hq_address: generateAddress(),
    
    website_url: `https://${companyName.toLowerCase().replace(/\s+/g, '')}.${randomChoice(['com', 'io', 'co'])}`,
    
    products_services: isBank
      ? `${sector} services, treasury management, ${randomChoice(['commercial lending', 'investment advisory', 'wealth management', 'corporate banking'])}`
      : `${sector} solutions, API integrations, ${randomChoice(['compliance tools', 'analytics platform', 'mobile apps', 'enterprise dashboard'])}`,
    
    incorporation_year: isBank
      ? randomInt(1990, 2010)  // Banks tend to be older
      : isApproved ? randomInt(2010, 2018) : randomInt(2018, 2022),
    
    founders_and_leadership: isBank
      ? `${randomChoice(['Robert Chen', 'Sarah Williams', 'Michael Davis', 'Jennifer Park'])} (CEO), ${randomChoice(['Former Federal Reserve', 'Ex-JPMorgan Chase', 'Former Wells Fargo', 'Ex-Bank of America'])} executive`
      : `${randomChoice(['Sarah Chen', 'Michael Rodriguez', 'Jessica Park', 'David Kim', 'Maria Garcia'])} (CEO), ${randomChoice(['Former Goldman Sachs', 'Ex-Stripe', 'Ex-PayPal', 'Former JPMorgan', 'Ex-Square'])} executive`,
    
    num_employees: numEmployees,
    
    revenue: isBank
      ? `$${randomInt(500, 2000)} million`  // Banks have higher revenue
      : `$${randomInt(10, 200)} million ARR`,
    
    revenue_tier: revenueTier,
    
    key_clients_partners: isBank
      ? `${randomChoice(['Fortune 500 companies', 'Institutional investors', 'Government entities'])}, ${randomChoice(['Corporate clients', 'High net worth individuals', 'Investment funds'])}`
      : isApproved 
        ? `${randomChoice(['Microsoft', 'Salesforce', 'Adobe', 'Oracle'])}, ${randomChoice(['JPMorgan', 'Wells Fargo', 'Bank of America'])}`
        : `${randomChoice(['Various startups', 'Regional banks', 'SMB clients', 'Emerging markets'])}`,
    
    investors: isBank
      ? 'Public shareholders, institutional investors'
      : isApproved
        ? `${randomChoice(['Andreessen Horowitz', 'Sequoia Capital', 'Kleiner Perkins'])}, ${randomChoice(['Goldman Sachs Ventures', 'JPMorgan Strategic'])}`
        : `${randomChoice(['Pantera Capital', 'Coinbase Ventures', 'Individual angels', 'Seed funds'])}`,
    
    funding_stage: randomChoice(
      isBank ? FUNDING_STAGES.BANK : FUNDING_STAGES[isApproved ? 'APPROVED' : 'PENDING']
    ),
    
    exit_strategy_history: isApproved && randomInt(1, 4) === 1 
      ? `Acquired ${randomChoice(['payment processor', 'compliance platform', 'analytics company'])} in ${randomInt(2019, 2023)}`
      : null,
    
    certifications_compliance: isBank
      ? `FDIC insured, ${randomChoice(['OCC regulated', 'Federal Reserve member', 'FFIEC compliant'])}, SOC 2 Type II`
      : isApproved
        ? `PCI DSS Level 1, SOC 2 Type II, ${randomChoice(['ISO 27001', 'GDPR compliant', 'FedRAMP certified'])}`
        : `Basic PCI compliance, ${randomChoice(['SOC 2 in progress', 'ISO 27001 planned', 'GDPR compliant'])}`,
    
    files_public: isBank
      ? ['annual_report_2024.pdf', 'regulatory_filing.pdf', 'investor_relations.pdf']
      : isApproved 
        ? ['compliance_report_2024.pdf', 'audit_summary.pdf', 'security_overview.pdf']
        : ['business_overview.pdf', 'compliance_basic.pdf'],
    
    files_private: isBank
      ? ['board_minutes_2024.pdf', 'regulatory_examination.pdf', 'risk_committee_report.pdf', 'capital_adequacy.pdf']
      : isApproved
        ? ['internal_audit_2024.pdf', 'security_assessment.pdf', 'financial_statements.pdf', 'risk_analysis.pdf']
        : ['risk_assessment.pdf', 'technical_architecture.pdf', 'financial_projections.pdf']
  };
  
  return businessDetails;
}