/**
 * Production Server Entry Point
 * 
 * This is a simplified production server that uses the built files
 * from the dist directory and avoids any TypeScript compilation issues.
 */

// Force production environment
process.env.NODE_ENV = 'production';
process.env.PORT = '8080';

console.log('=======================================');
console.log('INVELA PLATFORM - PRODUCTION SERVER');
console.log(`Starting server at: ${new Date().toISOString()}`);
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Port: ${process.env.PORT}`);
console.log('=======================================');

// Dynamically import the built server
try {
  // Import with proper error handling
  import('./dist/server/index.js')
    .then(() => {
      console.log('✅ Server started successfully!');
    })
    .catch(error => {
      console.error('❌ Failed to start server:', error);
      console.error('Stack trace:', error.stack);
      process.exit(1);
    });
} catch (error) {
  console.error('❌ Fatal error importing server module:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}