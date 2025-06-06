# Development vs Production Mode Switching Guide

## Overview

The application automatically detects the environment but sometimes requires manual mode switching during development and deployment cycles.

## Mode Detection Logic

The server mode is controlled in `server/index.ts` around line 307:

```typescript
if (process.env.NODE_ENV === "production") {
  // Production: Serves pre-built static files from dist/
  serveStatic(app);
} else {
  // Development: Runs Vite dev server with hot reload
  setupVite(app, server);
}
```

## Switching Between Modes

### For Production Deployment

**When to use:** Before deploying to Replit or any production environment

1. Open `server/index.ts`
2. Find line ~307 with the environment check
3. Ensure it reads:
   ```typescript
   if (process.env.NODE_ENV === "production") {
   ```
4. Deploy the application
   - Replit automatically sets `NODE_ENV=production` during deployment
   - Application will serve optimized static files

### For Development Work

**When to use:** For local development or continued feature work in Replit

1. Open `server/index.ts` 
2. Find line ~307 with the environment check
3. Temporarily override to force development mode:
   ```typescript
   if (false) {  // Temporarily force development mode
   ```
4. Restart the application workflow
   - Vite development server runs with hot reload
   - Real-time file watching and updates

## Quick Reference Commands

### Switch to Production Mode
```typescript
// In server/index.ts line ~307
if (process.env.NODE_ENV === "production") {
```

### Switch to Development Mode  
```typescript
// In server/index.ts line ~307
if (false) {  // Temporarily force development mode
```

## Mode Characteristics

| Feature | Development Mode | Production Mode |
|---------|------------------|-----------------|
| Frontend Serving | Vite dev server | Pre-built static files |
| Hot Reload | ✅ Enabled | ❌ Disabled |
| Build Optimization | ❌ None | ✅ Full optimization |
| File Watching | ✅ Real-time | ❌ Static files only |
| Debug Features | ✅ Full debugging | ⚠️ Limited logging |
| Performance | Slower (dev tools) | Faster (optimized) |

## Workflow Process

### Typical Development Cycle

1. **Development Phase**
   - Set to development mode (`if (false)`)
   - Make code changes with hot reload
   - Test features in real-time

2. **Pre-Deployment**
   - Switch to production mode (`if (process.env.NODE_ENV === "production")`)
   - Test production build locally if needed

3. **Deployment**
   - Deploy to Replit
   - Environment automatically sets to production
   - Application serves optimized files

4. **Post-Deployment Development**
   - Switch back to development mode
   - Continue feature development

## Important Notes

- **Always** remember to switch to production mode before deployment
- The override is intentionally explicit to prevent accidental production deployments in dev mode
- Replit deployments automatically set `NODE_ENV=production` regardless of code
- Development mode in production environments may cause performance issues
- Static files are built during deployment, so development mode won't have access to them

## Troubleshooting

### "Internal Server Error" on Deployed App
**Cause:** Application deployed in development mode  
**Solution:** Switch to production mode and redeploy

### Changes Not Reflecting in Development
**Cause:** Application running in production mode locally  
**Solution:** Switch to development mode and restart

### Build Failures During Deployment
**Cause:** Code issues that only surface in production builds  
**Solution:** Test production mode locally before deployment

## File Locations

- **Mode Switch Location:** `server/index.ts` (around line 307)
- **Vite Configuration:** `vite.config.ts`
- **Static File Serving:** `server/vite.ts` (serveStatic function)
- **Development Server:** `server/vite.ts` (setupVite function)