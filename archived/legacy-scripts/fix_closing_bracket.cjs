const fs = require('fs');

// The file path
const filePath = 'client/src/components/forms/UniversalForm.tsx';

// Read the file content
let content = fs.readFileSync(filePath, 'utf8');

// Find the problematic closing pattern
const problematic = /return false;\s*\n\s*\},(.*?);/s;

// Replace with a properly structured closure
const fixed = content.replace(problematic, `return false;
  }
},$1;`);

// Write the fixed content back to the file
fs.writeFileSync(filePath, fixed);

console.log('Fixed the closing bracket structure');
