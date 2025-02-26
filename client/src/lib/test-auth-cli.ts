/**
 * Authentication CLI Testing Tool
 * 
 * This file provides a command-line interface that can be called from the browser console
 * to test authentication functionality.
 * 
 * Usage from browser console:
 * 1. import: `import { AuthTestCLI } from '@/lib/test-auth-cli';`
 * 2. run: `AuthTestCLI.run()`
 */

import { checkAuthState, runAuthTest, clearAuthCookies, monitorAuthState } from './auth-tests';
import { queryClient, queryKeys } from './queryClient';
import type { User } from '@/types/auth';

// Define basic company interface based on available properties
interface Company {
  id?: number;
  name?: string;
  [key: string]: any; // Allow other properties
}

export class AuthTestCLI {
  private static isRunning = false;
  private static startTime: number = 0;
  private static results: any[] = [];

  /**
   * Run the CLI tool
   */
  static async run() {
    if (this.isRunning) {
      console.log('%c[Auth CLI] 🛑 CLI is already running. Please wait for the current operation to complete.', 'color: #f44336; font-weight: bold');
      return;
    }
    
    this.isRunning = true;
    this.startTime = Date.now();
    this.results = [];
    
    console.clear();
    this.printHeader();
    await this.mainMenu();
    
    this.isRunning = false;
  }
  
  /**
   * Print the CLI header
   */
  private static printHeader() {
    console.log('%c┌─────────────────────────────────────────────────┐', 'color: #2196f3; font-weight: bold');
    console.log('%c│ 🔒 Authentication Test CLI Tool                  │', 'color: #2196f3; font-weight: bold');
    console.log('%c└─────────────────────────────────────────────────┘', 'color: #2196f3; font-weight: bold');
    console.log('%cUse this tool to test authentication functionality directly from the console.', 'color: #607d8b');
  }
  
  /**
   * Display the main menu
   */
  private static async mainMenu() {
    console.log('\n%c📋 MAIN MENU:', 'color: #4caf50; font-weight: bold');
    console.log('1️⃣ Check current auth state');
    console.log('2️⃣ Run comprehensive auth test');
    console.log('3️⃣ Monitor auth state for 1 minute');
    console.log('4️⃣ Clear auth cookies');
    console.log('5️⃣ Display query cache');
    console.log('6️⃣ Force refresh session');
    console.log('0️⃣ Exit');
    
    const choice = await this.prompt('Enter your choice (0-6):');
    
    switch (choice) {
      case '1':
        await this.checkAuthState();
        break;
      case '2':
        await this.runFullTest();
        break;
      case '3':
        await this.monitorAuth();
        break;
      case '4':
        await this.clearCookies();
        break;
      case '5':
        await this.showQueryCache();
        break;
      case '6':
        await this.refreshSession();
        break;
      case '0':
        console.log('%c👋 Exiting Auth CLI...', 'color: #9e9e9e');
        return;
      default:
        console.log('%c❓ Invalid option. Please try again.', 'color: #f44336');
        await this.mainMenu();
        return;
    }
    
    await this.mainMenu();
  }
  
  /**
   * Check current auth state
   */
  private static async checkAuthState() {
    console.log('\n%c🔍 Checking current auth state...', 'color: #2196f3');
    
    const state = checkAuthState();
    this.results.push({
      timestamp: new Date().toISOString(),
      operation: 'checkAuthState',
      result: state
    });
    
    console.log('%c✅ Current auth state:', 'color: #4caf50');
    
    console.log('%c▶️ Overall Status: %c' + state.status, 
      'color: #607d8b', 
      `color: ${this.getStatusColor(state.status)}; font-weight: bold`);
    
    console.log('%c▶️ Cookies:', 'color: #607d8b');
    console.log(`   Session ID: ${state.cookies.hasSid ? '✅' : '❌'}`);
    console.log(`   Refresh Token: ${state.cookies.hasRefreshToken ? '✅' : '❌'}`);
    
    console.log('%c▶️ Token Status:', 'color: #607d8b');
    console.log(`   Valid: ${state.token.isValid ? '✅' : '❌'}`);
    if (state.token.expiresAt) {
      console.log(`   Expires: ${new Date(state.token.expiresAt).toLocaleString()}`);
    }
    if (state.token.isAboutToExpire) {
      console.log('%c   ⚠️ Token is about to expire!', 'color: #ff9800; font-weight: bold');
    }
    
    console.log('%c▶️ Query Cache:', 'color: #607d8b');
    console.log(`   User cached: ${state.cache.userCached ? '✅' : '❌'} (${state.cache.userQueryStatus})`);
    console.log(`   Company cached: ${state.cache.companyCached ? '✅' : '❌'} (${state.cache.companyQueryStatus})`);
    
    await this.prompt('Press Enter to continue...');
  }
  
  /**
   * Run a full authentication test
   */
  private static async runFullTest() {
    console.log('\n%c🧪 Running comprehensive auth test...', 'color: #2196f3');
    
    try {
      const results = await runAuthTest();
      this.results.push({
        timestamp: new Date().toISOString(),
        operation: 'runFullTest',
        result: results
      });
      
      if (results.passed) {
        console.log('%c✅ All tests passed!', 'color: #4caf50; font-weight: bold');
      } else {
        console.log('%c❌ Tests failed!', 'color: #f44336; font-weight: bold');
        console.log('%cErrors:', 'color: #f44336');
        results.errors.forEach((err, i) => {
          console.log(`   ${i+1}. ${err}`);
        });
      }
    } catch (error) {
      console.error('%c❌ Error running tests:', 'color: #f44336', error);
    }
    
    await this.prompt('Press Enter to continue...');
  }
  
  /**
   * Monitor auth state for a period
   */
  private static async monitorAuth() {
    console.log('\n%c👀 Starting auth state monitoring for 60 seconds...', 'color: #2196f3');
    console.log('%c(Results will be logged automatically)', 'color: #607d8b');
    
    return new Promise<void>((resolve) => {
      const cleanup = monitorAuthState(60, 5, (state) => {
        // State updates are logged by the monitor function
      });
      
      // Resolve after 61 seconds to ensure monitoring is complete
      setTimeout(() => {
        cleanup();
        resolve();
      }, 61000);
    });
  }
  
  /**
   * Clear auth cookies
   */
  private static async clearCookies() {
    console.log('\n%c🗑️ Clearing auth cookies...', 'color: #2196f3');
    
    clearAuthCookies();
    
    const state = checkAuthState();
    if (!state.cookies.hasSid && !state.cookies.hasRefreshToken) {
      console.log('%c✅ Auth cookies successfully cleared!', 'color: #4caf50');
    } else {
      console.log('%c⚠️ Some cookies may still be present:', 'color: #ff9800');
      console.log(`   Session ID: ${state.cookies.hasSid ? '❌ Still present' : '✅ Cleared'}`);
      console.log(`   Refresh Token: ${state.cookies.hasRefreshToken ? '❌ Still present' : '✅ Cleared'}`);
    }
    
    await this.prompt('Press Enter to continue...');
  }
  
  /**
   * Display the query cache
   */
  private static async showQueryCache() {
    console.log('\n%c🗄️ Query Cache:', 'color: #2196f3');
    
    const userQuery = queryClient.getQueryState(queryKeys.user());
    const companyQuery = queryClient.getQueryState(queryKeys.currentCompany());
    
    console.log('%c▶️ User Query:', 'color: #607d8b');
    if (userQuery) {
      console.log(`   Status: ${userQuery.status}`);
      console.log(`   Data Available: ${userQuery.data ? '✅' : '❌'}`);
      console.log(`   Last Updated: ${new Date(userQuery.dataUpdatedAt).toLocaleString()}`);
      console.log(`   Fetch Count: ${userQuery.fetchStatus === 'fetching' ? 'In progress' : userQuery.fetchFailureCount}`);
      
      if (userQuery.data) {
        console.log('%c   User Data Preview:', 'color: #607d8b');
        const userPreview = userQuery.data as Partial<User>;
        // Only show limited user data
        if (userPreview.id !== undefined) console.log(`     ID: ${userPreview.id}`);
        if (userPreview.email) console.log(`     Email: ${userPreview.email}`);
      }
    } else {
      console.log('   ❌ No user query found in cache');
    }
    
    console.log('\n%c▶️ Company Query:', 'color: #607d8b');
    if (companyQuery) {
      console.log(`   Status: ${companyQuery.status}`);
      console.log(`   Data Available: ${companyQuery.data ? '✅' : '❌'}`);
      console.log(`   Last Updated: ${new Date(companyQuery.dataUpdatedAt).toLocaleString()}`);
      console.log(`   Fetch Count: ${companyQuery.fetchStatus === 'fetching' ? 'In progress' : companyQuery.fetchFailureCount}`);
      
      if (companyQuery.data) {
        console.log('%c   Company Data Preview:', 'color: #607d8b');
        const companyPreview = companyQuery.data as Company;
        // Only show limited company data
        if (companyPreview.id !== undefined) console.log(`     ID: ${companyPreview.id}`);
        if (companyPreview.name) console.log(`     Name: ${companyPreview.name}`);
      }
    } else {
      console.log('   ❌ No company query found in cache');
    }
    
    console.log('\n%c▶️ All Query Keys in Cache:', 'color: #607d8b');
    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.getAll();
    console.log(`   Total Queries: ${queries.length}`);
    queries.forEach((query, i) => {
      console.log(`   ${i+1}. ${JSON.stringify(query.queryKey)} (${query.state.status})`);
    });
    
    await this.prompt('Press Enter to continue...');
  }
  
  /**
   * Force refresh the session
   */
  private static async refreshSession() {
    console.log('\n%c🔄 Attempting to refresh session...', 'color: #2196f3');
    
    try {
      // Force a fresh fetch of user data
      const userData = await queryClient.fetchQuery({
        queryKey: queryKeys.user(),
        staleTime: 0
      });
      
      console.log('%c✅ Session refreshed successfully!', 'color: #4caf50');
      console.log('%cUser data:', 'color: #607d8b', userData);
      
      // Now also refresh company data
      console.log('%c🔄 Now refreshing company data...', 'color: #2196f3');
      
      const companyData = await queryClient.fetchQuery({
        queryKey: queryKeys.currentCompany(),
        staleTime: 0
      });
      
      console.log('%c✅ Company data refreshed successfully!', 'color: #4caf50');
      
      // Check current state after refresh
      const state = checkAuthState();
      console.log('%c▶️ Updated Auth State:', 'color: #607d8b');
      console.log(`   Status: ${state.status}`);
      console.log(`   Token Valid: ${state.token.isValid ? '✅' : '❌'}`);
      
    } catch (error) {
      console.error('%c❌ Failed to refresh session:', 'color: #f44336', error);
    }
    
    await this.prompt('Press Enter to continue...');
  }
  
  /**
   * Helper to prompt for user input
   */
  private static async prompt(message: string): Promise<string> {
    return new Promise((resolve) => {
      // In a browser context, we'll use a simple timeout and rely on the console.log
      console.log(`\n%c${message}`, 'color: #9e9e9e; font-style: italic');
      
      // Auto-resolve after a brief pause to simulate user input in the browser console
      setTimeout(() => {
        resolve('');
      }, 500);
    });
  }
  
  /**
   * Get color for status display
   */
  private static getStatusColor(status: string): string {
    switch (status) {
      case 'authenticated':
        return '#4caf50';
      case 'partial':
        return '#ff9800';
      case 'unauthenticated':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  }
}

// Export a global function to access the CLI from console
(window as any).runAuthCLI = () => AuthTestCLI.run(); 