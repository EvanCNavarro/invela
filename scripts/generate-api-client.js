#!/usr/bin/env node

/**
 * @file generate-api-client.js
 * @description Script to generate TypeScript API client from Swagger documentation
 * 
 * This script:
 * 1. Starts the server in a special mode to expose the Swagger JSON
 * 2. Downloads the Swagger JSON from the server
 * 3. Uses openapi-typescript-codegen to generate a client library
 * 4. Cleans up temporary files and processes
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const SERVER_PORT = 5001;
const API_URL = `http://localhost:${SERVER_PORT}/api-docs.json`;
const OUTPUT_DIR = path.resolve(__dirname, '../client/src/api');
const SERVER_ENTRY = path.resolve(__dirname, '../server/index.ts');

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🚀 Starting API client generation...');

// Start server in a child process
console.log('📡 Starting server to get OpenAPI specification...');
const serverProcess = spawn('npx', ['ts-node', SERVER_ENTRY], {
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: SERVER_PORT.toString(),
  },
  stdio: 'pipe',
});

let serverOutput = '';
serverProcess.stdout.on('data', (data) => {
  serverOutput += data.toString();
  if (data.toString().includes('Swagger documentation available')) {
    console.log('✅ Server started successfully');
    generateClient().catch((error) => {
      console.error('❌ Error generating client:', error.message);
      serverProcess.kill();
      process.exit(1);
    });
  }
});

serverProcess.stderr.on('data', (data) => {
  console.error(`❌ Server error: ${data}`);
});

// Generate client from OpenAPI spec
async function generateClient() {
  try {
    console.log('📥 Downloading OpenAPI specification...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Give server time to start
    
    const response = await axios.get(API_URL);
    const openapiSpec = response.data;
    
    const tempFile = path.resolve(__dirname, 'temp-openapi.json');
    fs.writeFileSync(tempFile, JSON.stringify(openapiSpec, null, 2));
    
    console.log('🔧 Generating TypeScript client...');
    execSync(`npx openapi-typescript-codegen --input ${tempFile} --output ${OUTPUT_DIR} --client axios --useUnionTypes`, { 
      stdio: 'inherit' 
    });
    
    // Clean up temp file
    fs.unlinkSync(tempFile);
    
    console.log('🎉 API client generated successfully!');
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);
    
    // Create index.ts file for easy imports
    const indexPath = path.join(OUTPUT_DIR, 'index.ts');
    fs.writeFileSync(indexPath, `/**
 * @file index.ts
 * @description API client for interacting with the backend services
 * This file was automatically generated from the OpenAPI specification
 * 
 * To regenerate, run: npm run generate:api-client
 */

export * from './services/DefaultService';
export * from './core/ApiError';
export * from './core/ApiRequestOptions';
export * from './core/ApiResult';
export * from './core/request';
export { OpenAPI } from './core/OpenAPI';

// Configure the base URL for API requests
import { OpenAPI } from './core/OpenAPI';
OpenAPI.BASE = process.env.REACT_APP_API_URL || '/api';
`);
    
    // Create usage documentation
    const readmePath = path.join(OUTPUT_DIR, 'README.md');
    fs.writeFileSync(readmePath, `# API Client

This API client was automatically generated from the OpenAPI specification.

## Usage

\`\`\`typescript
import { DefaultService } from './api';

// Example: Get all tasks
const tasks = await DefaultService.getTasks();

// Example: Create a new task
const newTask = await DefaultService.createTask({
  title: 'My task',
  description: 'Task description',
  status: 'pending'
});
\`\`\`

## Configuration

You can configure the API base URL in your application:

\`\`\`typescript
import { OpenAPI } from './api';

// Set custom API URL
OpenAPI.BASE = 'https://api.example.com';

// Set authorization token
OpenAPI.TOKEN = 'your-auth-token';
\`\`\`

## Error Handling

The client includes a built-in \`ApiError\` class:

\`\`\`typescript
import { DefaultService, ApiError } from './api';

try {
  const result = await DefaultService.someOperation();
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.status, error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
\`\`\`

## Regenerating

To regenerate the client after API changes:

\`\`\`
npm run generate:api-client
\`\`\`
`);
    
  } catch (error) {
    console.error('Error generating client:', error);
  } finally {
    // Kill server
    serverProcess.kill();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('🛑 Process interrupted');
  serverProcess.kill();
  process.exit();
}); 