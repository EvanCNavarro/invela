# Invela Platform - Comprehensive Deployment Guide

## Overview

This guide provides detailed instructions for deploying the Invela Platform application to Replit Cloud. We've implemented robust solutions for several critical issues that previously prevented successful deployment:

1. **File Path Resolution** - Created a smart server that dynamically locates the application files
2. **Module Compatibility** - Resolved ES Module vs CommonJS compatibility issues
3. **Port Configuration** - Enforced consistent port 8080 usage as required by Replit
4. **Docker Image Size** - Enhanced file exclusions to keep the image under size limits

## Pre-Deployment Checklist

Before deploying, ensure these files are properly configured:

1. `server/deployment-server.js` - The main deployment server script
2. `deployment-build.sh` - Builds and prepares the application
3. `.replit.deploy.json` - Deployment configuration file

## Deployment Process

### Step 1: Build the Application

Run the deployment build script to prepare the application:

```bash
./deployment-build.sh
```

This script:
- Reduces image size through cleanup
- Builds the application
- Creates the deployment server file
- Adds a fallback entry point
- Generates a file map for troubleshooting

### Step 2: Deploy Through Replit

1. **Configure Replit Deployment Settings:**
   - **Build Command**: `./deployment-build.sh`
   - **Run Command**: `NODE_ENV=production PORT=8080 node dist/server/deployment-server.js`
   - **Port**: `8080`

2. **Click "Deploy"** in the Replit Deployments panel

## Technical Implementation Details

### The Deployment Server

Our deployment server (`dist/server/deployment-server.js`) uses several advanced techniques:

1. **Multiple Path Resolution** - Checks several possible locations for the application entry point
2. **Detailed Logging** - Provides comprehensive logging for troubleshooting
3. **Fallback Entry Point** - Includes a redirector that helps locate the correct application files
4. **Child Process Management** - Uses a child process to handle the ES Module application

### File Exclusion Strategy

The updated `.replit.deploy.json` configuration excludes:

- Large asset directories (attached_assets, backup_assets, etc.)
- Development files (TypeScript files, documentation, etc.)
- Heavy node modules that aren't needed for production

### Key Improvements

1. **Smart Path Finding**: The deployment server now tries multiple paths to locate the application entry point
2. **Enhanced Debugging**: Detailed logging helps troubleshoot deployment issues
3. **File Map Generation**: Automatically creates a map of all JavaScript files for reference
4. **Fallback Mechanisms**: Multiple fallback systems to ensure the application can start

## Troubleshooting

### Common Issues

1. **Cannot find module '/home/runner/workspace/index.js'**
   - The deployment server will scan multiple locations to find the correct entry point
   - Check the generated file-map.txt for the actual file locations

2. **Server process exited with code 1**
   - The logs from the deployment server will provide detailed error information
   - Look for issues related to module loading or path resolution

3. **Deployment server script is trying to load from the wrong file path**
   - Our smart path finding system should resolve this automatically
   - Check the deployment server logs to see which paths were tried

### Diagnostic Tools

The deployment server automatically logs information about:
- Current directory structure
- Available JavaScript files
- Module resolution attempts

## Future Maintenance

When updating the application:

1. Always ensure the deployment build script runs without errors
2. Be careful when changing the structure of the dist/ directory
3. Test the deployment server locally before deploying

## Security Notes

The deployment server will:
1. Force production mode
2. Only listen on port 8080
3. Log startup details for troubleshooting