const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(process.cwd(), 'server/routes/kyb.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Get content lines
const lines = content.split('\n');

// Fix first instance (lines 1045-1067)
const firstReplacement = [
  '    // NOTE: File vault unlocking has been moved to the final critical section',
  '    // to ensure it always executes, even if other operations fail',
  '    console.log(`[SERVER DEBUG] File vault unlocking will be performed in the dedicated section below`);'
];

// Replace lines
if (lines.length >= 1067) {
  lines.splice(1045, 23, ...firstReplacement);
}

// Fix second instance (lines 1766-1788)
const secondReplacement = [
  '    // NOTE: File vault unlocking has been moved to the final critical section',
  '    // to ensure it always executes, even if other operations fail',
  '    console.log(`[SERVER DEBUG] File vault unlocking will be performed in the dedicated section below`);'
];

// Now the indexes have changed due to the first replacement
// So we recalculate the position: 1766 - (23 - 3) = 1766 - 20 = 1746
if (lines.length >= 1746 + 23) {
  lines.splice(1746, 23, ...secondReplacement);
}

// Write back the file
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');

console.log('File updated successfully');
