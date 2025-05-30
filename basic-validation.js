#!/usr/bin/env node
/**
 * Basic code quality validation for Invela platform
 * Simulates test runner functionality for clean-code assessment
 */

import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;
let issues = [];

function validateFile(filepath, content) {
  const filename = path.basename(filepath);
  
  // Check file header standards
  if (filepath.includes('client/src/') || filepath.includes('server/')) {
    if (!content.includes('/**') || !content.includes('* ========================================')) {
      issues.push(`${filename}: Missing proper file header`);
      failed++;
      return false;
    }
  }
  
  // Check TypeScript usage
  if (filepath.endsWith('.js') && !filepath.includes('node_modules') && !filepath.includes('.config.')) {
    issues.push(`${filename}: Should use TypeScript (.ts/.tsx)`);
    failed++;
    return false;
  }
  
  // Check import organization
  const lines = content.split('\n');
  let importSection = false;
  let prevImportWasExternal = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('import ')) {
      importSection = true;
      const isExternal = !line.includes('./') && !line.includes('../') && !line.includes('@/');
      if (prevImportWasExternal && !isExternal) {
        // Should have blank line between external and internal imports
        if (i > 0 && lines[i-1].trim() !== '') {
          issues.push(`${filename}: Missing blank line between external and internal imports`);
          failed++;
          return false;
        }
      }
      prevImportWasExternal = isExternal;
    } else if (importSection && line !== '' && !line.startsWith('//')) {
      break;
    }
  }
  
  passed++;
  return true;
}

// Validate key files
const filesToCheck = [
  'client/src/App.tsx',
  'server/index.ts', 
  'server/routes.ts',
  'db/schema.ts'
];

console.log('Running basic validation...\n');

filesToCheck.forEach(filepath => {
  try {
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf8');
      validateFile(filepath, content);
    }
  } catch (error) {
    issues.push(`${filepath}: Could not read file - ${error.message}`);
    failed++;
  }
});

// Summary
console.log(`Validation Results:`);
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);

if (issues.length > 0) {
  console.log('\nIssues found:');
  issues.forEach(issue => console.log(`  - ${issue}`));
  process.exit(1);
} else {
  console.log('\nAll validations passed!');
  process.exit(0);
}