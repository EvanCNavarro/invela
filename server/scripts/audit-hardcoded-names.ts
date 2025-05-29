/**
 * Security Audit: Hardcoded Company Names in Scripts
 * 
 * This script audits all hardcoded company names found in test scripts
 * and validates them against the problematic words blacklist.
 */

import { validateCompanyNameSafety } from '../utils/company-name-utils.js';

// Hardcoded names found in scripts
const HARDCODED_NAMES = [
  // From test-fintech-invite.js
  'DemoTest7',
  
  // From test-single-company.ts 
  'StreamPay Solutions',
  
  // From test-generator.js
  'TechFlow Financial'
];

async function auditHardcodedNames(): Promise<void> {
  console.log('[SecurityAudit] Starting hardcoded company name validation...');
  console.log(`[SecurityAudit] Found ${HARDCODED_NAMES.length} hardcoded names to audit`);
  
  const results = [];
  
  for (const name of HARDCODED_NAMES) {
    console.log(`[SecurityAudit] Validating: "${name}"`);
    
    try {
      const validation = await validateCompanyNameSafety(name);
      
      results.push({
        name,
        isValid: validation.isValid,
        issues: validation.issues,
        source: getNameSource(name)
      });
      
      if (!validation.isValid) {
        console.log(`[SecurityAudit] ❌ SECURITY RISK: "${name}"`);
        console.log(`[SecurityAudit] Issues: ${validation.issues.join(', ')}`);
      } else {
        console.log(`[SecurityAudit] ✅ Safe: "${name}"`);
      }
      
    } catch (error) {
      console.error(`[SecurityAudit] Error validating "${name}":`, error);
      results.push({
        name,
        isValid: false,
        issues: ['Validation failed'],
        source: getNameSource(name)
      });
    }
  }
  
  // Summary report
  const invalidNames = results.filter(r => !r.isValid);
  
  console.log('\n[SecurityAudit] === AUDIT SUMMARY ===');
  console.log(`[SecurityAudit] Total names audited: ${results.length}`);
  console.log(`[SecurityAudit] Safe names: ${results.length - invalidNames.length}`);
  console.log(`[SecurityAudit] Risky names: ${invalidNames.length}`);
  
  if (invalidNames.length > 0) {
    console.log('\n[SecurityAudit] ⚠️  SECURITY RISKS FOUND:');
    invalidNames.forEach(result => {
      console.log(`[SecurityAudit] - "${result.name}" in ${result.source}`);
      console.log(`[SecurityAudit]   Issues: ${result.issues.join(', ')}`);
    });
    
    console.log('\n[SecurityAudit] 🔒 RECOMMENDATION:');
    console.log('[SecurityAudit] Replace hardcoded names with dynamic API generation');
    console.log('[SecurityAudit] Use generateUniqueCompanyName() for all scripts');
  } else {
    console.log('\n[SecurityAudit] ✅ All hardcoded names are safe');
  }
}

function getNameSource(name: string): string {
  switch (name) {
    case 'DemoTest7':
      return 'test-fintech-invite.js';
    case 'StreamPay Solutions':
      return 'test-single-company.ts';
    case 'TechFlow Financial':
      return 'test-generator.js';
    default:
      return 'unknown';
  }
}

// Run audit if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  auditHardcodedNames().catch(console.error);
}

export { auditHardcodedNames };