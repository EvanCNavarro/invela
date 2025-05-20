# Deployment Instructions

To deploy this application:

1. Run the preparation scripts:
   ```
   ./clean-large-files.sh
   ./prepare-deploy-config.sh
   ```

2. Update the Replit configuration to use single port:
   - Open the Replit interface
   - Click "Edit commands and secrets"
   - Under "Deployment" tab, ensure:
     - Build command: `npm run build`
     - Run command: `node dist/server/deployment-server.js`
     - Port: Only port 8080 is enabled

3. Click "Deploy" in the Replit interface

## Troubleshooting

If you encounter deployment issues:
- Make sure only port 8080 is used
- Verify the deployment server file exists at dist/server/deployment-server.js
- Check that large directories have been cleaned up
