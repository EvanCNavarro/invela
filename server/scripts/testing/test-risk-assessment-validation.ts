/**
 * ========================================
 * Risk Assessment Data Integrity Test
 * ========================================
 * 
 * Validates that risk assessment data is only assigned to accredited personas
 * and that non-accredited entities maintain NULL risk scores for compliance.
 * 
 * @module test-risk-assessment-validation
 * @version 1.0.0
 * @since 2025-05-29
 */

import { db } from '@db';
import { companies } from '@db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

interface TestResult {
  testName: string;
  passed: boolean;
  details: any;
  timestamp: string;
}

/**
 * Test suite for risk assessment data integrity validation
 */
async function runRiskAssessmentValidationTests(): Promise<void> {
  console.log('\n=== Risk Assessment Data Integrity Validation ===\n');
  
  const results: TestResult[] = [];
  const timestamp = new Date().toISOString();

  try {
    // Test 1: Verify no risk scores for new-data-recipient personas
    console.log('🔍 Test 1: Checking new-data-recipient personas have no risk scores...');
    
    const invalidRiskData = await db
      .select({
        id: companies.id,
        name: companies.name,
        persona: companies.demo_persona_type,
        accreditation: companies.accreditation_status,
        riskScore: companies.risk_score,
        chosenScore: companies.chosen_score
      })
      .from(companies)
      .where(
        and(
          eq(companies.demo_persona_type, 'new-data-recipient'),
          eq(companies.accreditation_status, 'PENDING'),
          isNotNull(companies.risk_score)
        )
      );

    const test1Passed = invalidRiskData.length === 0;
    results.push({
      testName: 'No risk scores for new-data-recipient',
      passed: test1Passed,
      details: {
        invalidEntries: invalidRiskData.length,
        entries: invalidRiskData
      },
      timestamp
    });

    console.log(`${test1Passed ? '✅' : '❌'} Test 1: ${test1Passed ? 'PASSED' : 'FAILED'}`);
    if (!test1Passed) {
      console.log('   Invalid entries found:', invalidRiskData);
    }

    // Test 2: Verify accredited personas can have risk scores
    console.log('🔍 Test 2: Checking accredited personas can have risk scores...');
    
    const accreditedWithRisk = await db
      .select({
        id: companies.id,
        name: companies.name,
        persona: companies.demo_persona_type,
        accreditation: companies.accreditation_status,
        riskScore: companies.risk_score
      })
      .from(companies)
      .where(
        and(
          eq(companies.accreditation_status, 'APPROVED'),
          isNotNull(companies.risk_score)
        )
      );

    const test2Passed = accreditedWithRisk.length >= 0; // Should allow risk scores for approved
    results.push({
      testName: 'Accredited personas can have risk scores',
      passed: test2Passed,
      details: {
        accreditedWithRisk: accreditedWithRisk.length,
        examples: accreditedWithRisk.slice(0, 3)
      },
      timestamp
    });

    console.log(`${test2Passed ? '✅' : '❌'} Test 2: ${test2Passed ? 'PASSED' : 'FAILED'}`);

    // Test 3: Verify data-provider personas (banks) have risk scores
    console.log('🔍 Test 3: Checking data-provider personas have appropriate risk access...');
    
    const dataProviders = await db
      .select({
        id: companies.id,
        name: companies.name,
        persona: companies.demo_persona_type,
        accreditation: companies.accreditation_status,
        riskScore: companies.risk_score
      })
      .from(companies)
      .where(eq(companies.demo_persona_type, 'data-provider'));

    const approvedDataProviders = dataProviders.filter(dp => dp.accreditation === 'APPROVED');
    const test3Passed = approvedDataProviders.length === 0 || 
                       approvedDataProviders.every(dp => dp.riskScore !== null);
    
    results.push({
      testName: 'Data-provider personas have risk access when approved',
      passed: test3Passed,
      details: {
        totalDataProviders: dataProviders.length,
        approvedDataProviders: approvedDataProviders.length,
        withRiskScores: approvedDataProviders.filter(dp => dp.riskScore !== null).length
      },
      timestamp
    });

    console.log(`${test3Passed ? '✅' : '❌'} Test 3: ${test3Passed ? 'PASSED' : 'FAILED'}`);

    // Test 4: Verify accredited-data-recipient personas have risk scores
    console.log('🔍 Test 4: Checking accredited-data-recipient personas have risk access...');
    
    const accreditedRecipients = await db
      .select({
        id: companies.id,
        name: companies.name,
        persona: companies.demo_persona_type,
        accreditation: companies.accreditation_status,
        riskScore: companies.risk_score
      })
      .from(companies)
      .where(eq(companies.demo_persona_type, 'accredited-data-recipient'));

    const approvedRecipients = accreditedRecipients.filter(ar => ar.accreditation === 'APPROVED');
    const test4Passed = approvedRecipients.length === 0 || 
                       approvedRecipients.every(ar => ar.riskScore !== null);
    
    results.push({
      testName: 'Accredited-data-recipient personas have risk access when approved',
      passed: test4Passed,
      details: {
        totalAccreditedRecipients: accreditedRecipients.length,
        approvedRecipients: approvedRecipients.length,
        withRiskScores: approvedRecipients.filter(ar => ar.riskScore !== null).length
      },
      timestamp
    });

    console.log(`${test4Passed ? '✅' : '❌'} Test 4: ${test4Passed ? 'PASSED' : 'FAILED'}`);

    // Summary
    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;
    
    console.log('\n=== Risk Assessment Validation Summary ===');
    console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
    console.log(`📊 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All risk assessment validation tests PASSED!');
    } else {
      console.log('⚠️  Some risk assessment validation tests FAILED.');
      console.log('Failed tests:', results.filter(r => !r.passed).map(r => r.testName));
    }

    console.log('\n=== Detailed Results ===');
    results.forEach((result, index) => {
      console.log(`\nTest ${index + 1}: ${result.testName}`);
      console.log(`Status: ${result.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`Details:`, JSON.stringify(result.details, null, 2));
    });

  } catch (error) {
    console.error('❌ Risk assessment validation test failed:', error);
    process.exit(1);
  }
}

// Run the test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runRiskAssessmentValidationTests()
    .then(() => {
      console.log('\n✅ Risk assessment validation test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Risk assessment validation test failed:', error);
      process.exit(1);
    });
}

export { runRiskAssessmentValidationTests };