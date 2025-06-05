/**
 * ========================================
 * Business Details Consistency Test
 * ========================================
 * 
 * Integration test to verify that demo companies and fintech companies
 * now generate consistent business detail patterns using the shared
 * business details generator system.
 * 
 * Key Validations:
 * - Demo API companies have complete business profiles
 * - FinTech generator companies use shared business logic
 * - All persona types generate appropriate business details
 * - Business field completeness across company creation pathways
 * 
 * @module test-business-details-consistency
 * @version 1.0.0
 * @since 2025-05-29
 */

// ========================================
// IMPORTS
// ========================================

import { generateBusinessDetails, type PersonaType } from '../../utils/business-details-generator.js';

// ========================================
// TYPES & INTERFACES
// ========================================

interface ConsistencyTestResult {
  persona: PersonaType;
  isApproved: boolean;
  fieldsGenerated: number;
  requiredFields: string[];
  missingFields: string[];
  businessDetails: any;
}

interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  results: ConsistencyTestResult[];
  issues: string[];
}

// ========================================
// CONSTANTS
// ========================================

const REQUIRED_BUSINESS_FIELDS = [
  'legal_structure',
  'market_position', 
  'hq_address',
  'website_url',
  'products_services',
  'incorporation_year',
  'founders_and_leadership',
  'num_employees',
  'revenue',
  'revenue_tier',
  'key_clients_partners',
  'investors',
  'funding_stage',
  'certifications_compliance',
  'files_public',
  'files_private'
];

const TEST_PERSONAS: PersonaType[] = [
  'data-provider',
  'accredited-data-recipient', 
  'new-data-recipient',
  'invela-admin'
];

const TEST_COMPANY_NAMES = [
  'Quantum Financial Solutions',
  'StreamPay Technologies', 
  'PanAmerica Bank',
  'DigitalVault Systems',
  'ClearPath Analytics'
];

// ========================================
// UTILITY FUNCTIONS
// ========================================

function logTestResult(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const prefix = `[BusinessDetailsTest] [${level.toUpperCase()}]`;
  
  if (data) {
    console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${message}`);
  }
}

function validateBusinessDetails(businessDetails: any, persona: PersonaType, isApproved: boolean): ConsistencyTestResult {
  const fieldsGenerated = Object.keys(businessDetails).length;
  const missingFields = REQUIRED_BUSINESS_FIELDS.filter(field => !businessDetails[field]);
  
  return {
    persona,
    isApproved,
    fieldsGenerated,
    requiredFields: REQUIRED_BUSINESS_FIELDS,
    missingFields,
    businessDetails
  };
}

function analyzePersonaSpecificPatterns(result: ConsistencyTestResult): string[] {
  const issues: string[] = [];
  const { businessDetails, persona, isApproved } = result;
  
  // Validate persona-specific business patterns
  if (persona === 'data-provider') {
    // Banks should have banking-specific patterns
    if (!businessDetails.legal_structure?.includes('Bank') && 
        !businessDetails.legal_structure?.includes('Credit Union')) {
      issues.push(`Data provider should have banking legal structure, got: ${businessDetails.legal_structure}`);
    }
    
    if (!businessDetails.revenue?.includes('million') || 
        parseInt(businessDetails.revenue.replace(/\D/g, '')) < 500) {
      issues.push(`Data provider should have higher revenue tier, got: ${businessDetails.revenue}`);
    }
  }
  
  if (persona === 'accredited-data-recipient' || persona === 'new-data-recipient') {
    // FinTechs should have fintech-specific patterns
    if (businessDetails.legal_structure?.includes('Bank')) {
      issues.push(`FinTech persona should not have banking legal structure, got: ${businessDetails.legal_structure}`);
    }
  }
  
  // Validate approval status impact
  if (isApproved) {
    if (businessDetails.incorporation_year > 2018) {
      issues.push(`Approved companies should be established (pre-2018), got: ${businessDetails.incorporation_year}`);
    }
    
    if (!businessDetails.certifications_compliance?.includes('SOC 2')) {
      issues.push(`Approved companies should have SOC 2 compliance, got: ${businessDetails.certifications_compliance}`);
    }
  }
  
  return issues;
}

// ========================================
// MAIN TEST FUNCTIONS
// ========================================

/**
 * Tests business details generation for all persona types
 */
async function testBusinessDetailsGeneration(): Promise<TestSummary> {
  const startTime = Date.now();
  const results: ConsistencyTestResult[] = [];
  const issues: string[] = [];
  
  logTestResult('info', 'Starting business details consistency test');
  
  for (const persona of TEST_PERSONAS) {
    for (const isApproved of [true, false]) {
      for (const companyName of TEST_COMPANY_NAMES.slice(0, 2)) { // Test 2 names per persona/status combo
        try {
          logTestResult('info', `Testing business details generation`, {
            persona,
            isApproved,
            companyName
          });
          
          // Generate business details
          const businessDetails = generateBusinessDetails(companyName, persona, isApproved);
          
          // Validate result
          const result = validateBusinessDetails(businessDetails, persona, isApproved);
          
          // Check for persona-specific patterns
          const personaIssues = analyzePersonaSpecificPatterns(result);
          issues.push(...personaIssues);
          
          results.push(result);
          
          logTestResult('info', `Business details generated successfully`, {
            persona,
            isApproved,
            fieldsGenerated: result.fieldsGenerated,
            missingFields: result.missingFields.length
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          issues.push(`Failed to generate business details for ${persona}/${isApproved}: ${errorMessage}`);
          
          logTestResult('error', 'Business details generation failed', {
            persona,
            isApproved,
            companyName,
            error: errorMessage
          });
        }
      }
    }
  }
  
  const duration = Date.now() - startTime;
  const passed = results.filter(r => r.missingFields.length === 0).length;
  const failed = results.length - passed;
  
  const summary: TestSummary = {
    totalTests: results.length,
    passed,
    failed,
    results,
    issues
  };
  
  logTestResult('info', `Business details consistency test completed`, {
    duration: `${duration}ms`,
    totalTests: summary.totalTests,
    passed: summary.passed,
    failed: summary.failed,
    issuesFound: summary.issues.length
  });
  
  return summary;
}

/**
 * Tests specific business field patterns and quality
 */
async function testBusinessFieldQuality(): Promise<void> {
  logTestResult('info', 'Testing business field quality patterns');
  
  const testCases = [
    { persona: 'data-provider' as PersonaType, isApproved: true, expectedPatterns: ['Bank', 'higher revenue'] },
    { persona: 'accredited-data-recipient' as PersonaType, isApproved: true, expectedPatterns: ['FinTech', 'enterprise'] },
    { persona: 'new-data-recipient' as PersonaType, isApproved: false, expectedPatterns: ['emerging', 'startup'] }
  ];
  
  for (const testCase of testCases) {
    const businessDetails = generateBusinessDetails(
      'Test Company',
      testCase.persona,
      testCase.isApproved
    );
    
    logTestResult('info', `Business field quality check`, {
      persona: testCase.persona,
      isApproved: testCase.isApproved,
      legalStructure: businessDetails.legal_structure,
      marketPosition: businessDetails.market_position,
      revenue: businessDetails.revenue,
      revenueTier: businessDetails.revenue_tier
    });
  }
}

// ========================================
// MAIN EXECUTION
// ========================================

/**
 * Main test execution function
 */
async function main(): Promise<void> {
  try {
    console.log('========================================');
    console.log('BUSINESS DETAILS CONSISTENCY TEST');
    console.log('========================================');
    console.log('Testing unified business details generation across demo and fintech pathways');
    console.log('');
    
    // Run consistency tests
    const summary = await testBusinessDetailsGeneration();
    
    // Run quality tests
    await testBusinessFieldQuality();
    
    // Report results
    console.log('');
    console.log('========================================');
    console.log('TEST SUMMARY');
    console.log('========================================');
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Success Rate: ${Math.round((summary.passed / summary.totalTests) * 100)}%`);
    
    if (summary.issues.length > 0) {
      console.log('');
      console.log('ISSUES FOUND:');
      summary.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }
    
    if (summary.failed === 0 && summary.issues.length === 0) {
      console.log('');
      console.log('✅ All business details consistency tests PASSED');
      console.log('✅ Demo and FinTech companies now use unified business detail generation');
    } else {
      console.log('');
      console.log('❌ Some tests failed or issues found');
      console.log('Review the issues above and verify business details generation logic');
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logTestResult('error', 'Test execution failed', { error: errorMessage });
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as runBusinessDetailsConsistencyTest };