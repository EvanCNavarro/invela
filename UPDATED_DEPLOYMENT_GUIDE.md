# Comprehensive Deployment Guide for Invela Platform

This guide provides step-by-step instructions to successfully deploy the Invela platform on Replit, addressing all identified issues.

## Current Deployment Issues

Based on the latest deployment attempt, we identified these specific issues:
1. **Image size exceeds the 8GB limit**
2. **Deployment server using multiple ports instead of just port 8080**
3. **Build process failing to handle large directory sizes**

## Complete Solution

We've created a comprehensive solution that addresses all these issues:

### 1. Files Created

- **`.dockerignore`**: Excludes large directories during the Docker build
- **`deployment-cleanup.js`**: Script to reduce image size by cleaning unnecessary files
- **`server/deployment-server.js`**: Server file that strictly uses port 8080
- **`deployment-build.sh`**: Build script that orchestrates the entire deployment process

### 2. Deployment Instructions

#### Step 1: Run the deployment build script
```bash
./deployment-build.sh
```
This script will:
- Run the cleanup script to reduce image size
- Build the application
- Ensure the deployment server is in the correct location

#### Step 2: Update Replit deployment settings
1. Go to the Deployment tab in Replit
2. Click "Edit commands and secrets"
3. Update the following settings:
   - **Build command:** `./deployment-build.sh`
   - **Run command:** `node dist/server/deployment-server.js`
   - **Port configuration:** Ensure only port 8080 is configured

#### Step 3: Deploy
Click the "Deploy" button to start the deployment process.

### 3. Verification

After deployment, verify that:
1. The application is accessible at your Replit deployment URL
2. Server logs confirm it's running on port 8080 only
3. All functionality works as expected

## Technical Details

### Image Size Reduction

The `deployment-cleanup.js` script reduces image size by:
- Moving large asset files to a deployment-excluded directory
- Removing cache files from node_modules
- Removing documentation, test files, and other non-essential content
- Implementing detailed logging to track size reduction

### Port Configuration

The `server/deployment-server.js` file ensures:
- Only port 8080 is used as required by Replit Cloud Run
- The environment is properly set to production
- Proper error handling is implemented
- Clean logging for monitoring and debugging

### Build Process

The `deployment-build.sh` script orchestrates:
- Running cleanup to reduce image size
- Running the standard build process
- Placing files in the locations expected by Replit

## Troubleshooting

If deployment issues persist:
1. Check the logs for specific error messages
2. Verify that all scripts have execute permissions
3. Ensure the .dockerignore file is properly configured
4. Confirm your deployment settings match the recommendations above