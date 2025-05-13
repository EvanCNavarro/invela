const fs = require('fs');
const path = require('path');

// File path
const filePath = path.join(process.cwd(), 'client/src/components/forms/UniversalForm.tsx');

// Read the file
let fileContent = fs.readFileSync(filePath, 'utf8');

// Find the function start and end
const functionStartRegex = /\/\/ Handle demo auto-fill functionality[\s\S]*?const handleDemoAutoFill = useCallback\(/;
const functionEndRegex = /\}, \[toast, taskId, taskType, form[\s\S]*?onProgress, logger\]\)/;

// Find start and end positions
const startMatch = fileContent.match(functionStartRegex);
const endMatch = fileContent.match(functionEndRegex);

if (!startMatch || !endMatch) {
  console.error('Could not find function boundaries');
  process.exit(1);
}

const startPos = startMatch.index;
const endPos = endMatch.index + endMatch[0].length;

// Get the replacement
const replacement = fs.readFileSync('fixed_autofill.tsx', 'utf8');

// Perform the replacement
const newContent = fileContent.substring(0, startPos) + 
                  replacement + 
                  fileContent.substring(endPos);

// Write the updated file
fs.writeFileSync(filePath, newContent);

console.log('Fixed function successfully replaced');
