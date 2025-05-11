/**
 * Direct debugging script to check why the claims tutorial isn't showing
 * 
 * This script adds additional debugging code to the claims page
 * to help diagnose why the tutorial isn't showing.
 */
import fs from 'fs';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Logging helper function
function log(message, color = colors.reset) {
  console.log(`${color}[ClaimsDebug] ${message}${colors.reset}`);
}

// The path to the claims page file
const claimsPagePath = 'client/src/pages/claims-page.tsx';

// Function to add debugging to the claims page
async function addDebuggingToClaimsPage() {
  try {
    log('Reading claims page file...', colors.blue);
    
    // Read the current file content
    const fileContent = fs.readFileSync(claimsPagePath, 'utf8');
    
    // Check if debugging is already added to avoid duplicate code
    if (fileContent.includes('// DEBUG: Force tutorial')) {
      log('Debugging code already exists in claims-page.tsx', colors.yellow);
      return;
    }
    
    // Find the TutorialManager line
    const tutorialManagerPattern = /<TutorialManager tabName="claims" \/>/;
    
    // Check if the pattern exists
    if (!tutorialManagerPattern.test(fileContent)) {
      log('Could not find TutorialManager component in claims-page.tsx', colors.red);
      return;
    }
    
    // Replace the TutorialManager line with a version that forces the tutorial
    const newContent = fileContent.replace(
      tutorialManagerPattern,
      `{/* DEBUG: Force tutorial to display for testing */}
      <TutorialManager 
        tabName="claims"
        // Add key to force component recreation
        key="claims-tutorial-${Date.now()}" 
      />`
    );
    
    // Add additional console logging in the component
    const enhancedContent = newContent.replace(
      'export default function ClaimsPage() {',
      `export default function ClaimsPage() {
  // DEBUG: Added more logging for tutorial debugging
  console.log('[ClaimsPage] Mounting claims page component');
  
  // Force log to verify if tutorialEnabled state is being set correctly
  React.useEffect(() => {
    console.log('[ClaimsPage] Claims page mounted - checking tutorial status');
    
    // Make a direct API call to check tutorial status
    fetch('/api/user-tab-tutorials/claims/status')
      .then(response => response.json())
      .then(data => {
        console.log('[ClaimsPage] Tutorial status from API:', data);
      })
      .catch(error => {
        console.error('[ClaimsPage] Error fetching tutorial status:', error);
      });
  }, []);`
    );
    
    // Write the updated content
    fs.writeFileSync(claimsPagePath, enhancedContent, 'utf8');
    
    log('Added debugging code to claims-page.tsx', colors.green);
    log('Restart the application to apply changes', colors.bright + colors.yellow);
    
  } catch (error) {
    log(`Error: ${error.message}`, colors.red);
    log(error.stack, colors.red);
  }
}

// Run the function
addDebuggingToClaimsPage();