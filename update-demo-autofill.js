import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const sourceFile = path.join(process.cwd(), 'fixed-demo-autofill.tsx');
const targetFile = path.join(process.cwd(), 'client/src/components/forms/UniversalForm.tsx');

// Read the files
const fixedFunction = fs.readFileSync(sourceFile, 'utf8');
let universalFormCode = fs.readFileSync(targetFile, 'utf8');

// Look for the start of the handleDemoAutoFill function
const functionStartRegex = /\s+\/\/ Handle demo auto-fill functionality[\s\S]*?const handleDemoAutoFill = useCallback\(/;
const functionStartMatch = universalFormCode.match(functionStartRegex);

if (!functionStartMatch) {
  console.error('Could not find the start of handleDemoAutoFill function');
  process.exit(1);
}

// Find the end of the function (the closing of useCallback)
const startPos = functionStartMatch.index;
let pos = startPos;
let braceCount = 0;
let insideString = false;
let stringChar = '';
let foundCallbackEnd = false;
let endPos = -1;

// Skip until we find the opening brace of the useCallback function
while (pos < universalFormCode.length && universalFormCode[pos] !== '{') {
  pos++;
}

if (pos >= universalFormCode.length) {
  console.error('Could not find the opening brace of handleDemoAutoFill function');
  process.exit(1);
}

// Now count braces to find the matching closing brace
pos++;
braceCount = 1; // We've seen one opening brace

while (pos < universalFormCode.length && braceCount > 0) {
  const char = universalFormCode[pos];
  
  // Handle string literals to avoid counting braces inside strings
  if ((char === '"' || char === "'" || char === '`') && 
      (pos === 0 || universalFormCode[pos-1] !== '\\')) {
    if (!insideString) {
      insideString = true;
      stringChar = char;
    } else if (char === stringChar) {
      insideString = false;
    }
  }
  
  // Only count braces if we're not inside a string
  if (!insideString) {
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      
      // If we've found the matching closing brace
      if (braceCount === 0) {
        // Look for the closing part of useCallback after this brace
        const remainingCode = universalFormCode.substring(pos + 1);
        const callbackEndMatch = remainingCode.match(/\s*\}, \[[^\]]+\]\);/);
        
        if (callbackEndMatch) {
          foundCallbackEnd = true;
          endPos = pos + 1 + callbackEndMatch.index + callbackEndMatch[0].length;
          break;
        }
      }
    }
  }
  
  pos++;
}

if (!foundCallbackEnd || endPos === -1) {
  console.error('Could not find the end of handleDemoAutoFill function');
  process.exit(1);
}

// Replace the function
const updatedCode = 
  universalFormCode.substring(0, startPos) + 
  fixedFunction + 
  universalFormCode.substring(endPos);

// Write the updated file
fs.writeFileSync(targetFile, updatedCode);

console.log('Successfully updated handleDemoAutoFill function in UniversalForm.tsx');