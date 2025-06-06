/**
 * Test script for the improved Bank Company Generator
 * Verifies professional naming and comprehensive business data quality
 */

import { generateBankCompanies, validateBankGeneration } from './server/utils/bank-company-generator.js';

async function testBankGenerator() {
  console.log('🏦 Testing improved Bank Company Generator...');
  
  try {
    // Generate small test batch of 5 banks
    await generateBankCompanies(5, (progress) => {
      console.log(`Progress: ${progress.percentage}% - ${progress.phase}`);
    });
    
    // Validate results
    await validateBankGeneration();
    
    console.log('✅ Bank generator test completed successfully!');
    
  } catch (error) {
    console.error('❌ Bank generator test failed:', error);
    process.exit(1);
  }
}

testBankGenerator();