import { db } from '@db';
import { tasks, kybResponses, kybFields } from '@db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * This script fixes the discrepancy between savedFormData and kybResponses
 * for the legalEntityName field by syncing the value from company.name
 * to the appropriate kybResponses entry
 */
async function fixLegalEntityName() {
  try {
    // First get the field ID for legalEntityName
    const [legalEntityNameField] = await db
      .select()
      .from(kybFields)
      .where(eq(kybFields.field_key, 'legalEntityName'));

    if (!legalEntityNameField) {
      console.error('Field "legalEntityName" not found in the database');
      return;
    }

    console.log(`Found legalEntityName field with ID: ${legalEntityNameField.id}`);

    // Get all the KYB tasks
    const allTasks = await db.select()
      .from(tasks)
      .where(eq(tasks.task_type, 'kyb'));
      
    console.log(`Found ${allTasks.length} KYB tasks to check`);

    console.log(`Found ${allTasks.length} KYB tasks to check`);

    // For each task, update the legalEntityName field with the company name
    for (const task of allTasks) {
      // Skip if no company name is available
      if (!task.company_name) {
        console.log(`Task ${task.id}: No company name found in task metadata, skipping`);
        continue;
      }

      // Check if there's already a response for this field
      const [existingResponse] = await db
        .select()
        .from(kybResponses)
        .where(
          and(
            eq(kybResponses.task_id, task.id),
            eq(kybResponses.field_id, legalEntityNameField.id)
          )
        );

      if (existingResponse) {
        // If the response exists but is empty, update it
        if (!existingResponse.response_value) {
          console.log(`Task ${task.id}: Empty legalEntityName found in kybResponses, updating to "${task.company_name}"`);
          
          await db
            .update(kybResponses)
            .set({
              response_value: task.company_name,
              status: 'COMPLETE',
              updated_at: new Date()
            })
            .where(eq(kybResponses.id, existingResponse.id));

          console.log(`Task ${task.id}: Updated legalEntityName in kybResponses`);
        } else if (existingResponse.response_value !== task.company_name) {
          console.log(`Task ${task.id}: Mismatch in legalEntityName:`);
          console.log(`- Current value: "${existingResponse.response_value}"`);
          console.log(`- Company name: "${task.company_name}"`);
          console.log(`Updating to company name`);
          
          await db
            .update(kybResponses)
            .set({
              response_value: task.company_name,
              updated_at: new Date()
            })
            .where(eq(kybResponses.id, existingResponse.id));
          
          console.log(`Task ${task.id}: Updated legalEntityName in kybResponses`);
        } else {
          console.log(`Task ${task.id}: legalEntityName already set correctly to "${existingResponse.response_value}"`);
        }
      } else {
        // If no response exists, create a new one
        console.log(`Task ${task.id}: No legalEntityName entry found in kybResponses, creating new entry with "${task.company_name}"`);
        
        await db
          .insert(kybResponses)
          .values({
            task_id: task.id,
            field_id: legalEntityNameField.id,
            response_value: task.company_name,
            status: 'COMPLETE',
            version: 1,
            created_at: new Date(),
            updated_at: new Date()
          });
        
        console.log(`Task ${task.id}: Created new legalEntityName entry in kybResponses`);
      }
      
      // Also ensure the task.savedFormData is consistent
      if (task.savedFormData && typeof task.savedFormData === 'object') {
        const savedFormData = task.savedFormData as Record<string, any>;
        
        if (savedFormData.legalEntityName !== task.company_name) {
          console.log(`Task ${task.id}: Updating legalEntityName in savedFormData from "${savedFormData.legalEntityName}" to "${task.company_name}"`);
          
          savedFormData.legalEntityName = task.company_name;
          
          await db
            .update(tasks)
            .set({
              savedFormData: savedFormData,
              updated_at: new Date()
            })
            .where(eq(tasks.id, task.id));
          
          console.log(`Task ${task.id}: Updated savedFormData`);
        }
      }
    }

    console.log('Completed fixing legalEntityName fields');
  } catch (error) {
    console.error('Error fixing legalEntityName:', error);
  }
}

// Run the function
fixLegalEntityName()
  .then(() => {
    console.log('Fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running fix:', error);
    process.exit(1);
  });