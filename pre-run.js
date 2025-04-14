// This file checks if all required dependencies are installed and installs only the actual npm packages,
// not TypeScript path aliases that might be misinterpreted as packages.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// List of actual npm packages we need to ensure are installed
const requiredPackages = [
  'dotenv',
  'pg'
];

// Check if package.json exists and contains the required dependencies
const packageJsonPath = path.join(__dirname, 'package.json');
let packageJson;

try {
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
} catch (error) {
  console.error('Error reading package.json:', error.message);
  process.exit(1);
}

// Filter packages that need to be installed
const packagesToInstall = requiredPackages.filter(pkg => {
  return !packageJson.dependencies[pkg] && !packageJson.devDependencies[pkg];
});

// Install missing packages if any
if (packagesToInstall.length > 0) {
  console.log(`Installing missing dependencies: ${packagesToInstall.join(', ')}`);
  try {
    execSync(`npm install ${packagesToInstall.join(' ')}`, { stdio: 'inherit' });
    console.log('Dependencies installed successfully.');
  } catch (error) {
    console.error('Error installing dependencies:', error.message);
    process.exit(1);
  }
} else {
  console.log('All required dependencies are already installed.');
}

// Exit successfully
process.exit(0);