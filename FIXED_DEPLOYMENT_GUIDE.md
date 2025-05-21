# Invela Platform - Fixed Deployment Guide

## Overview of Fixed Deployment Process

This guide documents the fixes implemented to resolve deployment issues with the Invela Platform application on Replit. The major issues addressed were:

1. **Docker image size exceeded limit** - Implemented aggressive cleanup to reduce image size
2. **Port configuration issues** - Enforced consistent port 8080 usage
3. **Module format incompatibility** - Fixed ES Module vs CommonJS conflicts

## Deployment Setup

### Required Files

The following files have been created or modified to ensure successful deployment:

- `.dockerignore` - Excludes large directories and unnecessary files
- `deployment-cleanup.js` - Reduces image size by cleaning assets and dependencies
- `dist/server/deployment-server.mjs` - ES Module compatible server for deployment
- `deployment-build.sh` - Orchestrates the build and deployment preparation

### Deployment Steps

1. **Build the application**:
   ```bash
   ./deployment-build.sh
   ```
   This script performs the following actions:
   - Runs the cleanup script to reduce image size
   - Builds the application with Vite
   - Copies the deployment server to the correct location

2. **Configure deployment settings in Replit**:
   - **Build Command**: `./deployment-build.sh`
   - **Run Command**: `node dist/server/deployment-server.mjs`
   - **Port**: `8080`

3. **Click Deploy**

## Troubleshooting

### Common Issues

1. **Module format errors**:
   - The application uses ES Modules while Node.js defaults to CommonJS
   - Solution: Use `.mjs` extension for ES Module files

2. **Port conflicts**:
   - Replit Cloud Run requires port 8080
   - Solution: Force `process.env.PORT = '8080'` in deployment server

3. **File size errors**:
   - Docker container size limit is 8GB
   - Solution: Use aggressive cleanup and `.dockerignore`

## Technical Details

### Deployment Server

The deployment server (`dist/server/deployment-server.mjs`) is a specialized entry point that:

1. Forces production environment
2. Strictly uses only port 8080
3. Properly imports the built application using ES Module syntax
4. Provides detailed logging for troubleshooting

### Cleanup Process

The cleanup script performs these optimizations:

1. Removes cache and test directories from node_modules
2. Backs up large assets to reduce image size
3. Cleans up development and utility files

## Maintenance Notes

When modifying the application, ensure that:

1. The deployment server continues to use port 8080
2. ES Module syntax is properly handled with .mjs extensions
3. The cleanup script is updated if new large directories are added