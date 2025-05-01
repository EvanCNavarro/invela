/**
 * Fix KYB file for task 709
 * 
 * This script uses the new forms/fix-missing-file API endpoint to fix
 * a missing file for the KYB form task with ID 709.
 */

async function fixMissingFile() {
  try {
    console.log('Fixing missing file for task 709...');
    
    // Get the current session token
    const response = await fetch('/api/forms/fix-missing-file/709', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      console.error('Error fixing missing file:', data.error || 'Unknown error');
      return;
    }
    
    console.log('✅ File successfully fixed!', {
      fileId: data.fileId,
      fileName: data.fileName
    });
    
    // Force UI refresh after a brief delay
    console.log('Refreshing file vault...');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('Error fixing file:', error);
  }
}

// Run the function
fixMissingFile();

// Usage instructions for users:
console.log(`
-----------------------------------------------
INSTRUCTIONS FOR FIXING MISSING FILE IN KYB FORM
-----------------------------------------------

1. Go to the File Vault tab
2. Open browser console (F12 or Ctrl+Shift+J)
3. Copy this entire script
4. Paste into console and press Enter
5. The script will fix the missing file and reload the page
6. The generated KYB file should now appear in File Vault

If the file still doesn't appear, try clearing browser cache
and refreshing the page.
`);
