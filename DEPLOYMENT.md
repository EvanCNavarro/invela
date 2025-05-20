# Invela Platform Deployment Guide

This guide provides steps to successfully deploy the Invela platform on Replit.

## Pre-Deployment Steps

We've already completed these steps:
1. Large files have been moved to `deployment-excluded` directory
2. Node modules cache has been cleaned up
3. A deployment server file has been created at `dist/server/deployment-server.js`
4. A simplified deployment configuration has been created in `.replit.deploy`

## Deployment Steps

1. In the Replit interface, go to the **Deployment** tab
2. Click on **Edit configuration**
3. Make the following changes:
   - Build command: `npm run build`
   - Run command: `node dist/server/deployment-server.js`
   - Ensure only port 8080 is configured

4. Deploy the application by clicking the **Deploy** button

## Troubleshooting

If deployment fails, check:
1. The build logs for specific errors
2. Ensure `dist/server/deployment-server.js` exists after the build
3. Verify the server is configured to run on port 8080

## Verification

After deployment:
1. Check that the application loads properly
2. Verify database connections work
3. Test core functionality