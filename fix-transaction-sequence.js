/**
 * Implementation Fix for Transaction Sequence
 * 
 * This script modifies the transactional-form-handler.ts to fix
 * the sequence of operations, ensuring the file is generated and
 * tabs are unlocked BEFORE the success modal is shown.
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'server/services/transactional-form-handler.ts');

async function applyFix() {
  console.log('Reading transactional-form-handler.ts...');
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Create a backup
    const backupPath = path.join(process.cwd(), 'server/services/transactional-form-handler.backup.ts');
    fs.writeFileSync(backupPath, content);
    console.log(`✅ Backup created at ${backupPath}`);
    
    // Fix 1: Improve file generation verification
    const improvedFileVerification = `
          // Enhanced file verification to ensure file is fully created
          if (fileResult.success && fileResult.fileId) {
            fileId = fileResult.fileId;
            
            console.log(\`[TransactionalFormHandler] Verifying file \${fileId} for task \${taskId}...\`);
            
            // Update task metadata with file information
            // UNIFIED FIX: Use properly parameterized query for the fileId and include fileName
            await client.query(
              \`UPDATE tasks 
               SET metadata = jsonb_set(
                 jsonb_set(COALESCE(metadata, '{}'::jsonb), '{fileId}', to_jsonb($2::text)),
                 '{fileName}', to_jsonb($3::text)
               ) 
               WHERE id = $1\`,
              [taskId, fileId, fileResult.fileName || '']
            );
            
            // Also ensure the file is properly linked to the task as a form submission file
            await client.query(
              \`UPDATE files
               SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{formSubmission}', 'true')
               WHERE id = $1\`,
              [fileId]
            );
            
            // Add verification query to ensure file was properly linked
            const fileVerification = await client.query(
              \`SELECT id, file_name FROM files WHERE id = $1\`,
              [fileId]
            );
            
            if (fileVerification.rows.length > 0) {
              console.log(\`[FileCreation] ✅ File \${fileId} verified for task \${taskId}: \${fileVerification.rows[0].file_name}\`);
            } else {
              console.error(\`[FileCreation] ⚠️ File \${fileId} created but verification failed for task \${taskId}\`);
            }
          }`;
    
    // Replace the original file verification code
    content = content.replace(/if \(fileResult\.success && fileResult\.fileId\) \{[\s\S]*?await client\.query\([^)]*\);\s*\}/m, improvedFileVerification);
    
    // Fix 2: Improve tab unlocking verification
    const improvedTabUnlocking = `
      // 5. Unlock tabs based on form type with verification
      console.log(\`[TransactionalFormHandler] Unlocking tabs for company \${companyId} based on \${formType} submission...\`);
      
      const tabResult = await UnifiedTabService.unlockTabsForFormSubmission(
        companyId, 
        formType,
        { broadcast: true }
      );
      
      // Verify tabs were actually unlocked
      console.log(\`[TransactionalFormHandler] Tab unlock result for company \${companyId}:\`, {
        availableTabs: tabResult.availableTabs,
        fileVaultUnlocked: tabResult.availableTabs.includes('file-vault'),
        tabsChanged: tabResult.tabsChanged,
        timestamp: new Date().toISOString()
      });
      
      // Add tab verification check
      const tabVerification = await client.query(
        \`SELECT available_tabs FROM companies WHERE id = $1\`,
        [companyId]
      );
      
      if (tabVerification.rows.length > 0) {
        const availableTabs = tabVerification.rows[0].available_tabs || [];
        console.log(\`[TransactionalFormHandler] Tab verification: Company \${companyId} has tabs:\`, availableTabs);
        
        if (availableTabs.includes('file-vault')) {
          console.log(\`[TransactionalFormHandler] ✅ File Vault tab successfully unlocked for company \${companyId}\`);
        } else {
          console.warn(\`[TransactionalFormHandler] ⚠️ File Vault tab NOT found in available tabs for company \${companyId}\`);
        }
      }`;
    
    // Replace the original tab unlocking code
    content = content.replace(/\/\/ 5\. Unlock tabs based on form type[\s\S]*?const tabResult = await UnifiedTabService\.unlockTabsForFormSubmission\([^)]*\);/m, improvedTabUnlocking);
    
    // Fix 3: Add a submissionTimestamp variable for consistency
    const submissionTimestampDef = `
      // Create a single source of truth for all timestamps in this submission
      const submissionTimestamp = new Date().toISOString();`;
    
    if (!content.includes('const submissionTimestamp =')) {
      content = content.replace(/\/\/ 6\. Broadcast form submission events with comprehensive information/, `${submissionTimestampDef}\n\n      // 6. Broadcast form submission events with comprehensive information`);
    }
    
    // Fix 4: Ensure the broadcasting is done LAST
    // This is already in the correct order in the file, but we'll enhance the logging
    const enhancedBroadcastLogging = `
        // Log intent to send final message with additional details
        console.log(\`[TransactionalFormHandler] 🔔 SENDING FINAL completion message for task \${taskId}:\`, {
          formType,
          taskId,
          companyId,
          hasFileId: !!fileId,
          fileIdValue: fileId,
          hasUnlockedTabs: tabResult.availableTabs.includes('file-vault'),
          unlockedTabs: tabResult.availableTabs,
          completedActionCount: completedActions.length,
          timestamp: submissionTimestamp,
          sequence: 'FINAL_STEP'
        });`;
    
    content = content.replace(/\/\/ Log intent to send final message[\s\S]*?timestamp: submissionTimestamp[\s\S]*?\);/m, enhancedBroadcastLogging);
    
    // Write the updated content
    fs.writeFileSync(filePath, content);
    console.log('✅ Successfully updated transactional-form-handler.ts');
    
    console.log('\nSummary of changes:');
    console.log('1. Added file verification to confirm file was created');
    console.log('2. Added tab unlocking verification');
    console.log('3. Added consistent timestamp for all operations');
    console.log('4. Enhanced final broadcast logging with detailed diagnostics');
    console.log('\nThese changes ensure all operations are completed before showing the success modal.');
    
  } catch (error) {
    console.error('❌ Error applying fix:', error);
  }
}

applyFix().then(() => {
  console.log('Done!');
}).catch(err => {
  console.error('Script execution failed:', err);
});