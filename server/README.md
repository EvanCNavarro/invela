# Server TypeScript Compilation Workflow

This document explains the TypeScript compilation workflow for the server-side code, which resolves module import issues and provides a robust development and production environment.

## Overview

The server uses TypeScript for development but compiles to JavaScript for production. This approach offers several benefits:

1. **Type Safety** during development
2. **Improved Performance** in production
3. **Module System Compatibility** between different parts of the application
4. **Clearer Error Messages** for easier debugging

## Development Workflow

### Quick Start

To start the development server with automatic compilation:

```bash
npm run server:dev
```

This command:
1. Watches TypeScript files for changes and compiles them
2. Restarts the server when compiled files change
3. Provides hot-reloading for a smoother development experience

### Manual Steps

If you prefer to run these steps manually:

1. Compile TypeScript files:
   ```bash
   npm run tsc:server
   ```

2. Run the server:
   ```bash
   node dist/server/simple-server.js
   ```

## Production Deployment

For production deployment:

1. Build the server:
   ```bash
   npm run server:build
   ```

2. Start the production server:
   ```bash
   npm run server:prod
   ```

## Key Components

### 1. TypeScript Configuration

The `tsconfig.json` file is configured for CommonJS module output:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "outDir": "./dist",
    "rootDir": "./",
    "paths": {
      "@db/*": ["./db/*"],
      "@shared/*": ["./shared/*"]
    }
  }
}
```

### 2. Server-Specific Package.json

A server-specific `package.json` ensures CommonJS module resolution:

```json
{
  "name": "server",
  "type": "commonjs"
}
```

### 3. Path Aliases

Runtime path resolution is handled by `tsconfig-paths-bootstrap.js`:

```javascript
// Register path aliases for compiled files
require('./tsconfig-paths-bootstrap.js');
```

### 4. Database Adapter

The database adapter uses compiled JavaScript files:

```typescript
// Import compiled JavaScript files from the dist directory
const dbModule = await import('../../dist/db/index.js');
const schemaModule = await import('../../dist/db/schema.js');
```

## File Structure

- `/server` - Server-side TypeScript code
  - `/routes` - API route definitions
  - `/utils` - Utility functions and helpers
  - `simple-server.js` - Entry point for the compiled server
  - `tsconfig-paths-bootstrap.js` - Runtime path resolution
- `/dist` - Compiled JavaScript files (generated)
  - `/server` - Compiled server code
  - `/db` - Compiled database code
  - `/shared` - Compiled shared code

## Best Practices

1. **Keep TypeScript Files in Source Control**: Only source TypeScript files should be committed to version control. The `dist` directory should be in `.gitignore`.

2. **Use Type Definitions**: Create proper interfaces and types for all data structures.

3. **Validate Input**: Use Zod or similar libraries to validate input data.

4. **Handle Errors**: Implement proper error handling at all levels.

5. **Clean Before Build**: Always clean the `dist` directory before a new build to prevent stale files.

## Troubleshooting

### Common Issues

1. **Module Not Found Errors**:
   - Ensure TypeScript files are compiled
   - Check path aliases in tsconfig.json
   - Verify import paths use the correct extension (.js for imports in TypeScript files)

2. **Type Errors During Compilation**:
   - Fix type issues in TypeScript files
   - Check for missing type definitions
   - Update dependencies if needed

3. **Runtime Errors**:
   - Check console for error messages
   - Verify environment variables are set correctly
   - Ensure all dependencies are installed

### Diagnostic Commands

1. Check TypeScript compilation:
   ```bash
   npm run tsc:server -- --listFiles
   ```

2. Verify path resolution:
   ```bash
   NODE_DEBUG=module node dist/server/simple-server.js
   ```

## Additional Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Node.js CommonJS Documentation](https://nodejs.org/api/modules.html)
- [Express TypeScript Examples](https://github.com/expressjs/express/tree/master/examples) 