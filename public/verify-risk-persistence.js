/**
 * Risk Score Persistence Verification Tool
 * 
 * This script helps verify that the risk score configuration and priorities 
 * are being properly persisted on navigation and page refresh.
 * 
 * To use:
 * 1. Paste this script into your browser console while on the risk score page
 * 2. Call verifyRiskPersistence() to check the current cache and local storage state
 * 3. Navigate away from the page and back again
 * 4. Call verifyRiskPersistence() again to see if data was properly persisted
 */

function verifyRiskPersistence() {
  // Get React Query cache
  let queryCache = null;
  try {
    if (window.__REACT_QUERY_GLOBAL_CACHE__) {
      queryCache = window.__REACT_QUERY_GLOBAL_CACHE__;
    } else if (window.__REACT_QUERY_DEVTOOLS__) {
      queryCache = window.__REACT_QUERY_DEVTOOLS__.devtools.currentManager.queryCache;
    }
  } catch (err) {
    console.error('Could not access React Query cache:', err);
  }
  
  // Create a styled output
  const styles = {
    heading: 'font-size: 16px; font-weight: bold; color: #2196f3; margin-top: 10px;',
    subheading: 'font-size: 14px; font-weight: bold; color: #333; margin-top: 8px;',
    success: 'color: #4caf50;',
    error: 'color: #f44336;',
    info: 'color: #2196f3;',
    warning: 'color: #ff9800;'
  };
  
  console.log('%c⚙️ Risk Score Persistence Verification', styles.heading);
  
  // Check React Query cache
  console.log('%c📊 React Query Cache Status:', styles.subheading);
  if (queryCache) {
    const prioritiesQuery = queryCache.find(['/api/risk-score/priorities']);
    const configQuery = queryCache.find(['/api/risk-score/configuration']);
    
    if (prioritiesQuery) {
      console.log('%c✅ Priorities query exists in cache', styles.success);
      console.log('Priorities data:', prioritiesQuery.state.data);
    } else {
      console.log('%c❌ Priorities query not found in cache', styles.error);
    }
    
    if (configQuery) {
      console.log('%c✅ Configuration query exists in cache', styles.success);
      console.log('Configuration data:', configQuery.state.data);
    } else {
      console.log('%c❌ Configuration query not found in cache', styles.error);
    }
  } else {
    console.log('%c❌ Could not access React Query cache', styles.error);
  }
  
  // Check component state via React DevTools
  console.log('%c📱 Component State:', styles.subheading);
  console.log('%c⚠️ Use React DevTools to inspect component state', styles.warning);
  console.log('Look for: dimensions, score, riskLevel, and userSetScore states');
  
  // Check localStorage (if used)
  console.log('%c💾 LocalStorage Status:', styles.subheading);
  const localStorageKeys = Object.keys(localStorage).filter(key => 
    key.includes('risk') || key.includes('score') || key.includes('priorities')
  );
  
  if (localStorageKeys.length > 0) {
    console.log('%c✅ Found risk-related entries in localStorage', styles.success);
    localStorageKeys.forEach(key => {
      try {
        const value = JSON.parse(localStorage.getItem(key));
        console.log(`${key}:`, value);
      } catch (e) {
        console.log(`${key}:`, localStorage.getItem(key));
      }
    });
  } else {
    console.log('%c⚠️ No risk-related entries found in localStorage', styles.warning);
  }
  
  // Check session storage (if used)
  console.log('%c🔄 SessionStorage Status:', styles.subheading);
  const sessionStorageKeys = Object.keys(sessionStorage).filter(key => 
    key.includes('risk') || key.includes('score') || key.includes('priorities')
  );
  
  if (sessionStorageKeys.length > 0) {
    console.log('%c✅ Found risk-related entries in sessionStorage', styles.success);
    sessionStorageKeys.forEach(key => {
      try {
        const value = JSON.parse(sessionStorage.getItem(key));
        console.log(`${key}:`, value);
      } catch (e) {
        console.log(`${key}:`, sessionStorage.getItem(key));
      }
    });
  } else {
    console.log('%c⚠️ No risk-related entries found in sessionStorage', styles.warning);
  }
  
  // Navigation instructions
  console.log('%c🧪 Testing Persistence:', styles.subheading);
  console.log('%cPerform these steps to test persistence:', 'font-weight: bold;');
  console.log('1. Note the current values shown above');
  console.log('2. Navigate to another page (e.g., click Dashboard)');
  console.log('3. Navigate back to the Risk Score page');
  console.log('4. Run this function again to verify values are correctly restored');
  
  return {
    queryCache: queryCache ? {
      prioritiesQuery: queryCache.find(['/api/risk-score/priorities'])?.state.data || null,
      configQuery: queryCache.find(['/api/risk-score/configuration'])?.state.data || null
    } : null,
    localStorage: localStorageKeys.reduce((acc, key) => {
      try {
        acc[key] = JSON.parse(localStorage.getItem(key));
      } catch (e) {
        acc[key] = localStorage.getItem(key);
      }
      return acc;
    }, {}),
    sessionStorage: sessionStorageKeys.reduce((acc, key) => {
      try {
        acc[key] = JSON.parse(sessionStorage.getItem(key));
      } catch (e) {
        acc[key] = sessionStorage.getItem(key);
      }
      return acc;
    }, {})
  };
}

// Expose function globally
window.verifyRiskPersistence = verifyRiskPersistence;
console.log('%c🚀 Risk Score Persistence Verification Tool loaded. Run verifyRiskPersistence() to check persistence.', 'color: #2196f3; font-weight: bold;');