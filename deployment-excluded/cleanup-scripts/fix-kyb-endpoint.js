const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(process.cwd(), 'server/routes/kyb.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix for the first unlock section
const firstUnlockPattern = /\/\/ Update available tabs for the company using our dedicated service[\s\S]*?timestamp: new Date\(\)\.toISOString\(\)\s*}\s*\)\;\s*}\s*}\s*}\s*catch \(tabError\) {[\s\S]*?timestamp: new Date\(\)\.toISOString\(\)\s*}\s*\)\;\s*}\s*}/g;

const replacementText = `// NOTE: File vault unlocking is now handled in the final critical section
    // to ensure it always executes, even if other operations fail
    console.log('[SERVER DEBUG] File vault will be unlocked in the dedicated section at the end');`;

// Replace all occurrences of the unlock pattern
content = content.replace(firstUnlockPattern, replacementText);

// Write the modified content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('File updated successfully');
