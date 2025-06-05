/**
 * Initialize User Tutorials Script
 * 
 * This admin script initializes tutorial entries for all users in the system.
 * It can be run when new tabs are added to the application or when onboarding
 * a new batch of users to ensure they all have consistent tutorial experiences.
 */
import { db } from './db';
import { users } from './db/schema';
import { createAllTutorials } from './server/utils/tutorial-manager-utils';
import { logger } from './server/utils/logger';

/**
 * Initialize tutorials for all users
 * 
 * @param excludeTabs Optional array of tab names to exclude
 */
async function initializeAllUserTutorials(excludeTabs: string[] = ['task-center']) {
  try {
    logger.info('[TutorialInit] Starting tutorial initialization for all users');
    
    // Get all user IDs from the database
    const allUsers = await db.query.users.findMany({
      columns: {
        id: true,
        email: true
      }
    });
    
    logger.info(`[TutorialInit] Found ${allUsers.length} users`);
    
    // Initialize tutorials for each user
    let totalInitialized = 0;
    
    for (const user of allUsers) {
      logger.info(`[TutorialInit] Initializing tutorials for user ${user.id} (${user.email})`);
      
      const createdCount = await createAllTutorials(user.id, excludeTabs);
      totalInitialized += createdCount;
      
      logger.info(`[TutorialInit] Created ${createdCount} tutorials for user ${user.id}`);
    }
    
    logger.info(`[TutorialInit] Initialization complete. Created ${totalInitialized} tutorial entries for ${allUsers.length} users`);
    return {
      success: true,
      usersProcessed: allUsers.length,
      tutorialsCreated: totalInitialized
    };
  } catch (error) {
    logger.error(`[TutorialInit] Error initializing tutorials: ${error}`);
    return {
      success: false,
      error: String(error)
    };
  }
}

// When running this script directly
if (require.main === module) {
  initializeAllUserTutorials()
    .then(result => {
      console.log('Tutorial initialization complete:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Error initializing tutorials:', error);
      process.exit(1);
    });
}

export default initializeAllUserTutorials;