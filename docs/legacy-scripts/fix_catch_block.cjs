const fs = require('fs');

// The file path
const filePath = 'client/src/components/forms/UniversalForm.tsx';

// Read the file content
let content = fs.readFileSync(filePath, 'utf8');

// Find the problematic section (return true followed by a misplaced catch)
const problematic = /\s+return true;\s*\}\s*catch\s*\(err.*?\)\s*\{/g;

// Replace with a properly structured try/catch block
const fixed = content.replace(problematic, `
    return true;
  } catch (err) {`);

// Write the fixed content back to the file
fs.writeFileSync(filePath, fixed);

console.log('Fixed the misplaced catch block');
