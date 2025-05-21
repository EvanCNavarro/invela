/**
 * Custom development script that sets needed environment variables
 * before starting the application
 */
process.env.VITE_DEV_SERVER_HOST = '0.0.0.0';
process.env.VITE_SERVER_OPEN = 'true';
process.env.VITE_ALLOWED_HOSTS = 'all';
process.env.VITE_FORCE_ALLOW_HOSTS = 'true';

// Spawn the regular npm run dev process
const { spawn } = require('child_process');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

console.log('🚀 Starting development server with custom Vite settings...');
console.log('📝 Configured to allow all hosts for preview access');

const child = spawn(npmCmd, ['run', 'dev'], { 
  stdio: 'inherit',
  env: { ...process.env }
});

child.on('error', (error) => {
  console.error(`Error starting development server: ${error.message}`);
  process.exit(1);
});

child.on('close', (code) => {
  console.log(`Development server exited with code ${code}`);
  process.exit(code);
});