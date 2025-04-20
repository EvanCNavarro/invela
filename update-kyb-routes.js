/**
 * Script to update KYB routes with our new file vault handling
 */

const fs = require('fs');
const path = require('path');

try {
  // Load the original file
  const filePath = path.join(__dirname, 'server/routes/kyb.ts');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find and replace both occurrences of the code
  const oldCodePattern = `    // Get company record to update available tabs
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, task.company_id));

    if (company) {
      // Add file-vault to available tabs if not already present
      const currentTabs = company.available_tabs || ['task-center'];
      if (!currentTabs.includes('file-vault')) {
        await db.update(companies)
          .set({
            available_tabs: [...currentTabs, 'file-vault'],
            updated_at: new Date()
          })
          .where(eq(companies.id, task.company_id));
      }
    }`;
    
  const newCodePattern = `    // Update available tabs for the company using our dedicated service
    // This ensures the file vault tab is properly unlocked after submission
    try {
      console.log(\`[SERVER DEBUG] Unlocking file vault access for company \${task.company_id}\`);
      const updatedCompany = await CompanyTabsService.unlockFileVault(task.company_id);
      
      if (updatedCompany) {
        console.log(\`[SERVER DEBUG] Successfully updated company tabs:\`, {
          companyId: task.company_id,
          availableTabs: updatedCompany.available_tabs,
          timestamp: new Date().toISOString()
        });
      } else {
        console.error(\`[SERVER ERROR] Failed to unlock file vault for company \${task.company_id}\`);
      }
    } catch (tabError) {
      // Log but don't fail the entire request if tab updating fails
      console.error(\`[SERVER ERROR] Error updating company tabs:\`, {
        error: tabError instanceof Error ? tabError.message : String(tabError),
        companyId: task.company_id,
        timestamp: new Date().toISOString()
      });
    }`;
    
  // Replace both occurrences
  const updatedContent = content.replace(new RegExp(oldCodePattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newCodePattern);
  
  // Write back to the file
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  
  console.log('Successfully updated KYB routes file!');
} catch (error) {
  console.error('Error updating KYB routes:', error);
}