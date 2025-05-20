/**
 * Fix for KY3P Demo Auto-fill
 * 
 * This script corrects an issue with the KY3P Demo Auto-fill functionality
 * where the bulkUpdate method in UniversalForm.tsx is failing because
 * the data format being sent to the API is incorrect.
 * 
 * The issue is that the 'fieldIdRaw' is being sent as 'bulk' in the request,
 * which the server interprets as an invalid field ID format.
 */

const fs = require('fs');
const path = require('path');

// Path to the file we need to modify
const universalFormPath = path.resolve(__dirname, 'client/src/components/forms/UniversalForm.tsx');

// Read the file
let universalFormContent = fs.readFileSync(universalFormPath, 'utf8');

// Find the specific section to replace
const startSearchString = '// Convert validResponses to array format with explicit fieldId property';
const endSearchString = '// Force query refresh';

const startIndex = universalFormContent.indexOf(startSearchString);
const endSection = universalFormContent.substring(startIndex);
const endIndex = startIndex + endSection.indexOf(endSearchString);

// Ensure we found the section
if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find the section to replace in UniversalForm.tsx');
  process.exit(1);
}

// The section to replace
const oldSection = universalFormContent.substring(startIndex, endIndex);

// The new improved section that fixes the issue
const newSection = `// Convert validResponses to array format with explicit fieldId property
        const responsesArray = [];
        
        for (const [key, value] of Object.entries(validResponses)) {
          const fieldId = fieldKeyToIdMap.get(key);
          if (fieldId !== undefined) {
            // Ensure field ID is a number
            const numericFieldId = typeof fieldId === 'string' ? parseInt(fieldId, 10) : fieldId;
            
            if (!isNaN(numericFieldId)) {
              responsesArray.push({
                fieldId: numericFieldId, // Numeric field ID is required by the API
                value: value
              });
            }
          }
        }
        
        logger.info(\`[UniversalForm] Converted \${responsesArray.length} fields to array format for KY3P bulk update\`);
        
        // Make the API call directly for maximum control
        const response = await fetch(\`/api/tasks/\${taskId}/ky3p-responses/bulk\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            responses: responsesArray // Using array format with explicit fieldId property
          }),
        });`;

// Replace the section in the file
universalFormContent = universalFormContent.substring(0, startIndex) + newSection + universalFormContent.substring(endIndex);

// Write the updated content back to the file
fs.writeFileSync(universalFormPath, universalFormContent);

console.log('Successfully updated UniversalForm.tsx to fix KY3P demo auto-fill!');