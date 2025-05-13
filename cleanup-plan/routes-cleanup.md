# Routes.ts Cleanup Plan

Based on our analysis of `server/routes.ts`, we need to remove imports and usage of test/debug routes. Here's what we need to modify:

## Test/Debug Routes to Remove

1. **Debug Routes**
   ```javascript
   // Remove these imports
   import enhancedDebugRoutes from './enhanced-debug-routes';
   import debugRouter from './routes/debug';
   import { router as debugRoutesTs } from './routes/debug-routes';
   
   // Remove these usage lines
   app.use('/api/debug', enhancedDebugRoutes);
   app.use('/api/debug', debugRouter);
   app.use('/api/debug', debugRoutesTs);
   ```

2. **Test Routes**
   ```javascript
   // Remove these imports
   import testKy3pProgressRouter from './routes/test-ky3p-progress';
   import testWebSocketNotificationsRouter from './routes/test-websocket-notifications';
   
   // Remove these usage lines
   app.use('/api/test-submission', createTestSubmissionStateRouter());
   app.use('/api/test/websocket', testWebSocketNotificationsRouter);
   app.use(testKy3pProgressRouter);
   ```

3. **Fix Routes to Keep**
   Some fix routes might be important for normal operation. These should be kept unless we're sure they're no longer needed:
   ```javascript
   // Keep these imports until we confirm they're not needed
   import fixMissingFileRouter from './routes/fix-missing-file-api';
   import fixKy3pFilesRouter from './routes/fix-ky3p-files';
   import { manualKy3pFix } from './routes/manual-ky3p-fix';
   
   // Keep these usage lines
   app.use('/api/ky3p/manual-fix', manualKy3pFix);
   app.use(fixKy3pFilesRouter);
   app.use(fixMissingFileRouter);
   ```

4. **Functions to Keep**
   ```javascript
   // This is used by the main app for task state submissions
   import { createTestSubmissionStateRouter } from './routes/test-submission-state';
   ```

## Implementation Strategy

1. Comment out the test/debug routes rather than removing them initially
2. Test the application after commenting them out
3. If no issues are found, remove the imports and route registrations completely
4. Repeat the process for any fix routes that are suspected to be no longer needed