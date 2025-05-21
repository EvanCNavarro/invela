# Client Pages Cleanup Plan

Based on our review of the pages in `client/src/pages`, we've identified several test, debug, and deprecated pages that can be safely removed.

## Pages to Remove

1. **Test/Debug Pages**
   - `form-debug-page.tsx`: Test page for debugging form issues
   - `FormPerformancePage.tsx`: Performance testing for forms
   - `form-submission-test.tsx`: Test page for form submissions
   - `ky3p-test-page.tsx`: Test page for KY3P forms
   - `playground-page.tsx` and `playground.tsx`: Development playground pages
   - `test-demo-autofill.tsx`: Test page for demo autofill functionality
   - `test-ky3p-page.tsx`: Another test page for KY3P
   - `test-standardized-service-page.tsx`: Test for standardized services
   - `test-standardized-universal-form.tsx`: Test for universal forms
   - `websocket-debugger-page.tsx`: WebSocket debugging page
   - `websocket-test-page.tsx`: WebSocket test page
   - `websocket-test.tsx`: Another WebSocket test
   - The entire `/debug` directory: Contains debug-specific pages

2. **Backup/Old Files**
   - `task-page-old.tsx`: Old version of the task page
   - `task-page.tsx.bak`: Backup of task page
   - `register-page.tsx.new`: New version of register page that hasn't been implemented
   - `risk-score-configuration-page.tsx.new`: New version of risk score config

3. **Redundant/Simplified Files**
   - `document-upload.tsx`: If functionality is integrated elsewhere
   - `task-center.tsx`: If the full `task-center-page.tsx` is being used
   - `file-vault-page.tsx`: If `FileVault.tsx` is the main implementation

## Implementation Strategy

1. Check that all pages are properly referenced in the routing component (`client/src/App.tsx`)
2. Ensure the pages to be removed are not referenced elsewhere in the codebase
3. Back up all files before removal
4. Remove the identified files
5. Test the application to ensure no navigation issues