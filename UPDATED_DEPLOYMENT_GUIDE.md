# Invela Platform - Deployment Guide

## Overview

This guide explains how to deploy the Invela Platform application to Replit Cloud. The deployment process has been designed to address several critical issues that were previously encountered:

1. **Docker image size limits** - Reduced image size through improved file exclusion
2. **Port configuration** - Strict use of port 8080 as required by Replit
3. **Module compatibility** - Fixed CommonJS vs ES Module issues

## Pre-Deployment Steps

Before deploying, ensure all these files are properly configured:

1. `.replit.deploy.json` - Contains deployment configuration
2. `deployment-build.sh` - Builds and prepares the application
3. `server/deployment-server.js` - Server entry point for deployment

## Deployment Process

### Step 1: Build the Application

Run the following command to build the application:

```bash
./deployment-build.sh
```

This script:
- Runs cleanup to reduce image size
- Builds the application with Vite
- Prepares the deployment server file
- Verifies critical files exist

### Step 2: Configure Replit Deployment Settings

In the Replit Deployment panel, ensure these settings:

- **Build Command**: `./deployment-build.sh`
- **Run Command**: `node dist/server/deployment-server.js`
- **Port**: `8080`

### Step 3: Deploy

Click the "Deploy" button in Replit.

## Technical Details

### Deployment Server

The deployment server (dist/server/deployment-server.js):

1. Forces production environment (`NODE_ENV=production`)
2. Forces port 8080 (`PORT=8080`) as required by Replit
3. Uses a child process to launch the ES Module server without compatibility issues
4. Provides robust error handling and logging

### File Exclusion

The `.replit.deploy.json` configuration excludes unnecessary files to reduce image size:

- Large assets directories (attached_assets, backup_assets, etc.)
- Source files (client/src, server/src)
- Development files (TypeScript files, documentation, etc.)

## Troubleshooting

### Common Issues

1. **Promotion failed: Missing deployment-server.js file**
   - Verify the build script completed successfully
   - Check that `dist/server/deployment-server.js` exists

2. **Server fails to start: ES Module compatibility**
   - Our solution uses a child process to bridge CommonJS and ES Module code
   - Check server logs for any error messages

3. **Excessive deployment size**
   - Review excluded files in `.replit.deploy.json`
   - Run deployment-cleanup.js manually to reduce size

## Maintenance Notes

1. Always use `PORT=8080` in production
2. Remember that the build process creates CommonJS files in the dist directory
3. Keep the .dockerignore file in sync with .replit.deploy.json exclude list