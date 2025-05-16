/**
 * Fix onboarding modal persistence issue
 * 
 * This script updates the 'onboarding_user_completed' flag to TRUE 
 * for the specified user to prevent the onboarding modal from showing
 * after it has been completed.
 */

const { Pool } = require('pg');

// Add color to console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Connect to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Fix onboarding status for a user
 * 
 * @param {number} userId - The ID of the user to fix
 * @returns {Promise<object>} - Result of the operation
 */
async function fixOnboardingStatus(userId) {
  const client = await pool.connect();
  
  try {
    // First, check if the user exists and what their current status is
    const { rows: userRows } = await client.query(
      'SELECT id, email, onboarding_user_completed FROM users WHERE id = $1',
      [userId]
    );
    
    if (userRows.length === 0) {
      return {
        success: false,
        error: `User with ID ${userId} not found`
      };
    }
    
    const user = userRows[0];
    log(`Found user: ${user.email} (ID: ${user.id})`, colors.cyan);
    log(`Current onboarding completion status: ${user.onboarding_user_completed ? 'COMPLETED' : 'NOT COMPLETED'}`, 
        user.onboarding_user_completed ? colors.green : colors.yellow);
    
    // If onboarding is already completed, no need to update
    if (user.onboarding_user_completed) {
      return {
        success: true,
        message: 'User onboarding status is already marked as completed',
        updated: false,
        userId: user.id,
        email: user.email
      };
    }
    
    // Update the onboarding_user_completed flag to TRUE
    await client.query(
      'UPDATE users SET onboarding_user_completed = TRUE, updated_at = NOW() WHERE id = $1',
      [userId]
    );
    
    log(`Successfully updated onboarding status to COMPLETED`, colors.green);
    
    return {
      success: true,
      message: 'User onboarding status updated to completed',
      updated: true,
      userId: user.id,
      email: user.email
    };
  } catch (error) {
    log(`Error fixing onboarding status: ${error.message}`, colors.red);
    return {
      success: false,
      error: error.message
    };
  } finally {
    client.release();
  }
}

/**
 * Find all users with onboarding_user_completed = FALSE
 */
async function findIncompleteOnboardingUsers() {
  const client = await pool.connect();
  
  try {
    const { rows } = await client.query(
      'SELECT id, email, company_id, onboarding_user_completed FROM users WHERE onboarding_user_completed = FALSE ORDER BY id'
    );
    
    return rows;
  } finally {
    client.release();
  }
}

/**
 * Main function
 */
async function main() {
  log('=============================================', colors.blue);
  log('🔧 User Onboarding Status Fix Tool', colors.bold + colors.blue);
  log('=============================================', colors.blue);
  
  // Get user ID from command line arguments, or default to current user (356)
  const userId = process.argv[2] ? parseInt(process.argv[2], 10) : 356;
  
  try {
    // Find all users with incomplete onboarding status
    log('\nChecking for users with incomplete onboarding status...', colors.cyan);
    const incompleteUsers = await findIncompleteOnboardingUsers();
    
    if (incompleteUsers.length === 0) {
      log('✅ No users with incomplete onboarding found!', colors.green);
      return;
    }
    
    log(`Found ${incompleteUsers.length} users with incomplete onboarding status:`, colors.yellow);
    incompleteUsers.forEach((user, i) => {
      log(`  ${i+1}. ID: ${user.id}, Email: ${user.email}, Company ID: ${user.company_id}`, colors.yellow);
    });
    
    // Fix the specified user
    log(`\nFixing onboarding status for user ID: ${userId}...`, colors.cyan);
    const result = await fixOnboardingStatus(userId);
    
    if (result.success) {
      if (result.updated) {
        log(`\n✅ Successfully updated onboarding status for user ${result.email} (ID: ${result.userId})`, colors.green);
      } else {
        log(`\n✓ User ${result.email} (ID: ${result.userId}) already has completed onboarding status`, colors.blue);
      }
    } else {
      log(`\n❌ Error: ${result.error}`, colors.red);
    }
  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, colors.red);
    if (error.stack) {
      log(`Stack trace: ${error.stack}`, colors.red);
    }
  } finally {
    await pool.end();
  }
  
  log('\nDone!', colors.green);
}

// Run the script
main().catch(error => {
  log(`Unhandled error: ${error.message}`, colors.red);
  process.exit(1);
});