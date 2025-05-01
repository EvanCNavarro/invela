/**
 * Fix Missing KYB File for Task 709
 * 
 * This script directly calls our emergency fix endpoint to regenerate the missing file
 * for the KYB form task with ID 709. This solves the issue where the file was
 * not appearing in the File Vault UI despite the form being successfully submitted.
 */

console.log('Fixing missing file for KYB task 709...');

// Fetch authentication token from current session first
document.cookie.split(';').forEach(cookie => {
  console.log('Cookie:', cookie.trim());
});

// Use the API endpoint we created
fetch('/api/forms/fix-missing-file/709', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({}),
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    console.log('✅ SUCCESS: File fixed successfully!');
    console.log('File ID:', data.fileId);
    console.log('File Name:', data.fileName);
    console.log('\nThe file should now appear in the File Vault tab. Please refresh the page to see it.');
  } else {
    console.error('❌ ERROR: Failed to fix file:', data.error || 'Unknown error');
  }
})
.catch(error => {
  console.error('❌ ERROR: Request failed:', error);
});

console.log('\nRequest sent. Waiting for response...');
console.log('If successful, please refresh the File Vault tab to see the file.');
