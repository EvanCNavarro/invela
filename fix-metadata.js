const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(process.cwd(), 'server/utils/form-submission-notifications.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Replace all instances of the enhancedMetadata creation pattern
const modifiedContent = content.replace(
  /\/\/ Ensure metadata has submission_date for UI display\s+const enhancedMetadata = {\s+\.\.\.metadata,\s+submission_date: submissionTimestamp,\s+};/g,
  `// Ensure metadata has submission_date for UI display
  // Remove any existing submission_date to avoid duplication
  const { submission_date: existingDate, ...cleanMetadata } = metadata;
  const enhancedMetadata = {
    ...cleanMetadata,
    submission_date: submissionTimestamp,
  };`
);

// Write back to the file
fs.writeFileSync(filePath, modifiedContent, 'utf8');
console.log('File updated successfully');
