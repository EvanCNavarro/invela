# Emergency Deployment Process for Invela Platform

This guide provides steps for deploying a minimal maintenance version of the Invela platform when standard deployment is experiencing issues.

## Why Use This Approach

If you're experiencing these issues:
- Build failures during package installation
- "Your app failed to build" errors
- Replit service disruptions for deployments

This simplified deployment approach bypasses complex build processes while maintaining an online presence.

## Steps to Deploy

1. **Prepare Files**
   - We've already created these files:
     - `deploy-build.sh`: A simplified build script
     - `dist/server/deployment-server.js`: A minimal Express server
     - `dist/client/index.html`: A maintenance page

2. **Run Simplified Build**
   ```bash
   ./deploy-build.sh
   ```

3. **In Replit Deployment Settings**
   - Go to Deployment tab
   - Click "Edit commands and secrets"
   - Update Build Command: `./deploy-build.sh`  
   - Update Run Command: `node dist/server/deployment-server.js`
   - Make sure only port 8080 is configured

4. **Deploy**
   - Click "Deploy" button

## What This Provides

This emergency deployment:
- Ensures you have a working deployment endpoint
- Provides a professional maintenance page
- Includes a health check API endpoint at `/api/health`
- Preserves your existing database

## Returning to Full Deployment

Once Replit's deployment service is fully operational:
1. Restore original build and run commands
2. Update port configuration as needed
3. Deploy again with the full application