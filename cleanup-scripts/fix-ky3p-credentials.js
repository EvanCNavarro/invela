/**
 * Utility script to update all fetch calls in ky3p-form-service.ts to include credentials
 * This ensures session cookies are sent with all requests
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the file
const filePath = path.join(__dirname, 'ky3p-form-service.ts');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Find all simple fetch call patterns
const simpleFetchRegex = /const\s+(?:response|directResponse|responsesResponse)\s*=\s*await\s+fetch\s*\(\s*(['"`][^)]+['"`])\s*\)\s*;/g;
content = content.replace(simpleFetchRegex, (match, url) => {
  return `const response = await fetch(${url}, {
        credentials: 'include' // Include session cookies
      });`;
});

// Write the updated content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Updated ky3p-form-service.ts to include credentials in all fetch calls');