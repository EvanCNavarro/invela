/**
 * Timer Source Validation Test
 * 
 * This script will systematically validate the timer pattern to establish:
 * 1. Exact timing intervals
 * 2. Source identification 
 * 3. Call stack analysis
 */

let timerObservations = [];
let testStartTime = Date.now();

// Monitor for batch update API calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  
  if (typeof url === 'string' && url.includes('/api/ky3p/batch-update/')) {
    const observation = {
      timestamp: Date.now(),
      timeFromStart: Date.now() - testStartTime,
      url: url,
      stackTrace: new Error().stack,
      userAgent: navigator.userAgent,
      referer: window.location.href
    };
    
    timerObservations.push(observation);
    
    console.log('=== TIMER VALIDATION ===');
    console.log('Call detected at:', new Date().toISOString());
    console.log('URL:', url);
    console.log('Time from test start:', observation.timeFromStart + 'ms');
    
    if (timerObservations.length > 1) {
      const lastCall = timerObservations[timerObservations.length - 2];
      const interval = observation.timestamp - lastCall.timestamp;
      console.log('Interval since last call:', interval + 'ms');
    }
    
    console.log('Stack trace:', observation.stackTrace);
    console.log('========================');
  }
  
  return originalFetch.apply(this, args);
};

// Log the test start
console.log('Timer validation test started at:', new Date().toISOString());
console.log('Monitoring for /api/ky3p/batch-update/ calls...');

// Export observations for analysis
window.getTimerObservations = () => timerObservations;