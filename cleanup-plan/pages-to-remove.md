# Test/Debug Pages to Remove

The following pages in `client/src/pages` appear to be for testing or debugging purposes and can be safely removed:

1. **Debug/Test Pages**
   - `form-debug-page.tsx`
   - `FormPerformancePage.tsx`
   - `form-submission-test.tsx`
   - `ky3p-test-page.tsx`
   - `playground-page.tsx` and `playground.tsx`
   - `test-demo-autofill.tsx`
   - `test-ky3p-page.tsx`
   - `test-standardized-service-page.tsx`
   - `test-standardized-universal-form.tsx`
   - `websocket-debugger-page.tsx`
   - `websocket-test-page.tsx`
   - `websocket-test.tsx`
   - The entire `/debug` directory

2. **Backup/Old Files**
   - `task-page-old.tsx`
   - `task-page.tsx.bak`
   - `register-page.tsx.new`
   - `risk-score-configuration-page.tsx.new`

3. **Redundant/Simplified Files**
   These files appear to be simplified versions of functionality that may have been integrated into the main pages:
   - `document-upload.tsx` (if the functionality is integrated elsewhere)
   - `task-center.tsx` (if the full `task-center-page.tsx` is being used)
   - `file-vault-page.tsx` (if `FileVault.tsx` is the main implementation)

# Primary Pages to Keep

These pages appear to be core functionality of the application:

1. **Authentication Pages**
   - `auth-page.tsx`
   - `login-page.tsx`
   - `register-page.tsx`

2. **Dashboard Pages**
   - `dashboard-page.tsx`
   - `task-center-page.tsx`
   - `company-profile-page.tsx`
   - `network-page.tsx`
   - `insights-page.tsx`
   - `risk-score-page.tsx`
   - `claims-risk-page.tsx`
   - `risk-score-configuration-page.tsx`
   - `diagnostic-page.tsx`

3. **Task/Form Pages**
   - `task-page.tsx`
   - `form-submission-workflow.tsx`
   - `kyb-form.tsx`
   - `kyb-task-page.tsx`
   - `ky3p-task-page.tsx`
   - `open-banking-task-page.tsx`
   - `card-form.tsx`
   - `card-task-page.tsx`
   
4. **Storage Pages**
   - `FileVault.tsx`

5. **Others**
   - `landing/` directory (likely contains the landing page components)
   - `claims/` directory
   - `not-found.tsx` (404 page)
   - `registry-page.tsx` (would need to verify purpose)