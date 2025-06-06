/**
 * Bank Company Generator Test Script
 * 
 * Execution script to run the bank company generator and validate results.
 * This script creates a comprehensive population of Bank companies to complete
 * the missing infrastructure component for network relationship testing.
 */

import { generateBankCompanies, validateBankGeneration } from '../../utils/bank-company-generator.js';

interface ProgressTracker {
  startTime: number;
  lastUpdate: number;
  phases: string[];
  currentPhase: number;
}

/**
 * Enhanced progress logger with time tracking
 */
function createProgressTracker(): ProgressTracker {
  return {
    startTime: Date.now(),
    lastUpdate: Date.now(),
    phases: [],
    currentPhase: 0
  };
}

/**
 * Main execution function
 */
async function main() {
  console.log('========================================');
  console.log('🏦 BANK COMPANY GENERATOR TEST');
  console.log('========================================');
  console.log('');
  
  const tracker = createProgressTracker();
  
  try {
    // Configure generation parameters
    const bankCount = 75; // Generate 75 banks for comprehensive coverage
    
    console.log(`Configuration:`);
    console.log(`- Target bank count: ${bankCount}`);
    console.log(`- Risk score range: 2-40 (banking optimized)`);
    console.log(`- Accreditation: Permanent (no expiration)`);
    console.log(`- Relationships: Data provider to existing FinTechs`);
    console.log('');
    
    // Progress logging function
    const logProgress = (progress: any) => {
      const now = Date.now();
      const elapsed = Math.round((now - tracker.startTime) / 1000);
      const phaseTime = Math.round((now - tracker.lastUpdate) / 1000);
      
      console.log(`[${elapsed}s] ${progress.phase}: ${progress.current}/${progress.total} (${progress.percentage}%) [+${phaseTime}s]`);
      tracker.lastUpdate = now;
    };
    
    // Execute bank generation
    console.log('🚀 Starting bank company generation...');
    console.log('');
    
    await generateBankCompanies(bankCount, logProgress);
    
    console.log('');
    console.log('✅ Generation completed successfully!');
    console.log('');
    
    // Run validation
    console.log('🔍 Validating generation results...');
    await validateBankGeneration();
    
    // Final summary
    const totalTime = Math.round((Date.now() - tracker.startTime) / 1000);
    console.log('');
    console.log('========================================');
    console.log('📊 GENERATION SUMMARY');
    console.log('========================================');
    console.log(`✅ Bank generation completed successfully`);
    console.log(`⏱️  Total execution time: ${totalTime} seconds`);
    console.log(`🏦 Banks created: ${bankCount}`);
    console.log(`🔐 Accreditations: Permanent (banking standard)`);
    console.log(`🌐 Network relationships: Created with existing FinTechs`);
    console.log('');
    console.log('The database now contains a comprehensive population of');
    console.log('Bank companies ready for network relationship testing');
    console.log('and comparative risk analysis scenarios.');
    
  } catch (error: any) {
    console.error('');
    console.error('❌ Bank generation failed:');
    console.error(`Error: ${error.message}`);
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack.substring(0, 1000));
    }
    process.exit(1);
  }
}

// Execute the script
main().catch((error) => {
  console.error('Script execution failed:', error);
  process.exit(1);
});