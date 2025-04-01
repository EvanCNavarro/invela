import { db } from '../index';
import { tasks } from '../schema';
import { eq, like, sql } from 'drizzle-orm';

/**
 * This migration updates existing task titles to include sequential numbering
 */
export async function updateTaskTitles() {
  console.log('[DB Migration] Updating existing task titles...');

  try {
    // Get all tasks that need to be updated
    const allTasks = await db.select()
      .from(tasks)
      .where(
        sql`title LIKE 'Company KYB:%' OR title LIKE 'Security Assessment:%' OR title LIKE 'Company CARD:%'`
      );
    
    let kybCount = 0;
    let securityCount = 0;
    let cardCount = 0;
    
    // Update each task with appropriate new title
    for (const task of allTasks) {
      let newTitle = task.title;
      
      if (task.title.startsWith('Company KYB:')) {
        const companyName = task.title.replace('Company KYB:', '').trim();
        newTitle = `1. KYB Form: ${companyName}`;
        kybCount++;
      } 
      else if (task.title.startsWith('Security Assessment:')) {
        const companyName = task.title.replace('Security Assessment:', '').trim();
        newTitle = `2. Security Assessment: ${companyName}`;
        securityCount++;
      }
      else if (task.title.startsWith('Company CARD:')) {
        const companyName = task.title.replace('Company CARD:', '').trim();
        newTitle = `3. 1033 Open Banking Survey: ${companyName}`;
        cardCount++;
      }
      
      // Update the task title if it's changed
      if (newTitle !== task.title) {
        await db.update(tasks)
          .set({
            title: newTitle,
            updated_at: new Date()
          })
          .where(eq(tasks.id, task.id));
      }
    }
    
    console.log(`[DB Migration] Updated ${kybCount} KYB task titles`);
    console.log(`[DB Migration] Updated ${securityCount} Security Assessment task titles`);
    console.log(`[DB Migration] Updated ${cardCount} CARD task titles`);
    console.log('[DB Migration] Task titles updated successfully');
    
    return { kybCount, securityCount, cardCount };
  } catch (error) {
    console.error('[DB Migration] Error updating task titles:', error);
    throw error;
  }
}