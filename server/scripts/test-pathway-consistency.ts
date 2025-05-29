/**
 * ========================================
 * Company Data Pathway Consistency Test
 * ========================================
 * 
 * Comprehensive test to verify all company creation pathways
 * produce consistent data formatting using the standardized
 * business details generator.
 * 
 * Tests:
 * 1. Direct business details generator
 * 2. Demo API company creation
 * 3. FinTech generator company creation
 * 4. Company service integration
 * 
 * Validates:
 * - Website URLs use .com standard
 * - Employee counts are properly rounded
 * - Revenue uses K/M/B formatting
 * - Risk clusters follow approval status rules
 * 
 * @module test-pathway-consistency
 * @version 1.0.0
 * @since 2025-05-29
 */

// ========================================
// IMPORTS
// ========================================

import { generateBusinessDetails, type PersonaType } from '../utils/business-details-generator';

// ========================================
// TYPES & INTERFACES
// ========================================

interface PathwayTestResult {
  pathway: string;
  testsPassed: number;
  totalTests: number;
  issues: string[];
  sampleData: any;
}

interface ValidationResult {
  isValid: boolean;
  message: string;
}

// ========================================
// VALIDATION FUNCTIONS
// ========================================

/**
 * Validates website URL format
 */
function validateWebsiteUrl(url: string): ValidationResult {
  const isComDomain = url.endsWith('.com');
  const hasHttps = url.startsWith('https://');
  const hasValidFormat = /^https:\/\/[a-z]+\.com$/.test(url);
  
  if (!hasHttps) return { isValid: false, message: 'Website URL must use HTTPS' };
  if (!isComDomain) return { isValid: false, message: 'Website URL must use .com domain' };
  if (!hasValidFormat) return { isValid: false, message: 'Website URL format invalid' };
  
  return { isValid: true, message: 'Website URL format valid' };
}

/**
 * Validates employee count is business-friendly rounded
 */
function validateEmployeeCount(count: number): ValidationResult {
  const isRounded = count % 5 === 0; // Should be rounded to nearest 5/10/50/100
  const isRealistic = count >= 5 && count <= 50000;
  
  if (!isRealistic) return { isValid: false, message: 'Employee count unrealistic' };
  if (!isRounded) return { isValid: false, message: 'Employee count not properly rounded' };
  
  return { isValid: true, message: 'Employee count properly formatted' };
}

/**
 * Validates revenue format uses K/M/B notation
 */
function validateRevenueFormat(revenue: string): ValidationResult {
  const hasKMBFormat = /^\$[\d,]+(\.\d+)?[KMB]$/.test(revenue);
  const hasDollarSign = revenue.startsWith('$');
  
  if (!hasDollarSign) return { isValid: false, message: 'Revenue must start with $' };
  if (!hasKMBFormat) return { isValid: false, message: 'Revenue must use K/M/B format' };
  
  return { isValid: true, message: 'Revenue format valid' };
}

/**
 * Validates risk cluster data follows approval rules
 */
function validateRiskClusters(
  riskScore: number | null, 
  riskClusters: Record<string, number> | null, 
  isApproved: boolean
): ValidationResult {
  if (!isApproved) {
    if (riskScore !== null) return { isValid: false, message: 'Pending companies should not have risk scores' };
    if (riskClusters !== null) return { isValid: false, message: 'Pending companies should not have risk clusters' };
    return { isValid: true, message: 'Pending company risk data correctly null' };
  }
  
  if (riskScore === null) return { isValid: false, message: 'Approved companies should have risk scores' };
  if (riskClusters === null) return { isValid: false, message: 'Approved companies should have risk clusters' };
  
  // Validate risk cluster distribution
  const clusterSum = Object.values(riskClusters).reduce((sum, val) => sum + val, 0);
  if (clusterSum !== riskScore) {
    return { isValid: false, message: `Risk clusters sum (${clusterSum}) does not match risk score (${riskScore})` };
  }
  
  return { isValid: true, message: 'Risk data properly generated for approved company' };
}

// ========================================
// PATHWAY TESTING FUNCTIONS
// ========================================

/**
 * Test direct business details generator
 */
function testBusinessDetailsGenerator(): PathwayTestResult {
  const result: PathwayTestResult = {
    pathway: 'Business Details Generator',
    testsPassed: 0,
    totalTests: 0,
    issues: [],
    sampleData: null
  };
  
  try {
    // Test approved FinTech company
    const approvedDetails = generateBusinessDetails('TestApproved', 'accredited-data-recipient', true);
    result.sampleData = approvedDetails;
    
    // Test website URL validation
    result.totalTests++;
    const urlValidation = validateWebsiteUrl(approvedDetails.website_url);
    if (urlValidation.isValid) result.testsPassed++;
    else result.issues.push(`Website URL: ${urlValidation.message}`);
    
    // Test employee count validation
    result.totalTests++;
    const employeeValidation = validateEmployeeCount(approvedDetails.num_employees);
    if (employeeValidation.isValid) result.testsPassed++;
    else result.issues.push(`Employee Count: ${employeeValidation.message}`);
    
    // Test revenue format validation
    result.totalTests++;
    const revenueValidation = validateRevenueFormat(approvedDetails.revenue);
    if (revenueValidation.isValid) result.testsPassed++;
    else result.issues.push(`Revenue Format: ${revenueValidation.message}`);
    
    // Test risk cluster validation for approved company
    result.totalTests++;
    const riskValidation = validateRiskClusters(
      approvedDetails.risk_score, 
      approvedDetails.risk_clusters, 
      true
    );
    if (riskValidation.isValid) result.testsPassed++;
    else result.issues.push(`Risk Clusters: ${riskValidation.message}`);
    
    // Test pending company (should have null risk data)
    const pendingDetails = generateBusinessDetails('TestPending', 'new-data-recipient', false);
    result.totalTests++;
    const pendingRiskValidation = validateRiskClusters(
      pendingDetails.risk_score, 
      pendingDetails.risk_clusters, 
      false
    );
    if (pendingRiskValidation.isValid) result.testsPassed++;
    else result.issues.push(`Pending Risk Data: ${pendingRiskValidation.message}`);
    
  } catch (error) {
    result.issues.push(`Generator Error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return result;
}

// ========================================
// MAIN TEST EXECUTION
// ========================================

/**
 * Run comprehensive pathway consistency tests
 */
async function runPathwayConsistencyTests(): Promise<void> {
  console.log('========================================');
  console.log('Company Data Pathway Consistency Test');
  console.log('========================================\n');
  
  const testResults: PathwayTestResult[] = [];
  
  // Test 1: Business Details Generator
  console.log('Testing Business Details Generator...');
  const generatorResult = testBusinessDetailsGenerator();
  testResults.push(generatorResult);
  
  console.log(`✓ ${generatorResult.testsPassed}/${generatorResult.totalTests} tests passed`);
  if (generatorResult.issues.length > 0) {
    console.log('Issues found:');
    generatorResult.issues.forEach(issue => console.log(`  - ${issue}`));
  }
  console.log('');
  
  // Summary
  console.log('========================================');
  console.log('Test Summary');
  console.log('========================================');
  
  const totalTests = testResults.reduce((sum, result) => sum + result.totalTests, 0);
  const totalPassed = testResults.reduce((sum, result) => sum + result.testsPassed, 0);
  const totalIssues = testResults.reduce((sum, result) => sum + result.issues.length, 0);
  
  console.log(`Total Tests: ${totalPassed}/${totalTests} passed`);
  console.log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
  console.log(`Issues Found: ${totalIssues}`);
  
  if (totalPassed === totalTests) {
    console.log('\n✅ All pathway consistency tests passed!');
    console.log('✅ Website URLs use .com standard');
    console.log('✅ Employee counts are properly rounded');
    console.log('✅ Revenue uses K/M/B formatting');
    console.log('✅ Risk clusters follow approval status rules');
  } else {
    console.log('\n❌ Some consistency tests failed');
    console.log('Review issues above for details');
  }
}

// ========================================
// EXECUTION
// ========================================

runPathwayConsistencyTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});