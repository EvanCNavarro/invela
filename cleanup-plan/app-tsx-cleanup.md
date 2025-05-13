# App.tsx Router Cleanup Plan

Based on our analysis of `client/src/App.tsx`, there are numerous test and debug route imports and definitions that should be removed. Here's our cleanup plan:

## Imports to Remove

```javascript
// Debug/Test Page Imports
import TaskStatusDebugger from "@/pages/debug/status-fixer";
import WebSocketDebuggerPage from "@/pages/debug/websocket-debugger-page";
import WebSocketTestPage from "@/pages/websocket-test";
import WebSocketTestPageNew from "@/pages/websocket-test-page";
import FormSubmissionTestPage from "@/pages/form-submission-test";
import PlaygroundPage from "@/pages/playground-page";
import FormDebugPage from "@/pages/form-debug-page";
import TestFormUpdate from "./test-form-update";
import FormDbTestPage from "./form-db-test";
import TestDemoAutoFill from "@/pages/test-demo-autofill";
import TestKy3pPage from "@/pages/test-ky3p-page";
import { TestStandardizedKy3pUpdate } from "@/components/test/TestStandardizedKy3pUpdate";
import TestStandardizedServicePage from "@/pages/test-standardized-service-page";
import TestStandardizedUniversalFormPage from "@/pages/test-standardized-universal-form";
import KY3PTestPage from "@/pages/ky3p-test-page";
import FormPerformancePage from "@/pages/FormPerformancePage";
import ProgressiveLoadingDemo from "@/components/dev/ProgressiveLoadingDemo";
```

## Routes to Remove

Remove all of these test routes:

```javascript
// Playground Route
<ProtectedRoute path="/playground" component={() => (
  <ProtectedLayout>
    <OnboardingWrapper>
      <div className={cn(
        "min-h-screen",
        location === "/playground" && "bg-emerald-950/5"
      )}>
        <PlaygroundPage />
      </div>
    </OnboardingWrapper>
  </ProtectedLayout>
)} />

// Test and Debug Routes
<Route path="/test-form-update">
  <TestFormUpdate />
</Route>

<Route path="/form-debug">
  <FormDebugPage />
</Route>

<Route path="/form-db-test">
  <FormDbTestPage />
</Route>

<Route path="/form-performance">
  <FormPerformancePage />
</Route>

<Route path="/progressive-loading-demo">
  <ProgressiveLoadingDemo />
</Route>

<Route path="/test-demo-autofill">
  <TestDemoAutoFill />
</Route>

<Route path="/test-ky3p-batch-update">
  <TestKy3pPage />
</Route>

<Route path="/test-standardized-ky3p-update">
  <TestStandardizedKy3pUpdate />
</Route>

<Route path="/test-standardized-service">
  <TestStandardizedServicePage />
</Route>

<Route path="/test-standardized-universal-form">
  <TestStandardizedUniversalFormPage />
</Route>

<Route path="/ky3p-test">
  <KY3PTestPage />
</Route>

<Route path="/form-submission-test">
  <FormSubmissionTestPage />
</Route>

<Route path="/debug/status-fixer">
  <ProtectedLayout>
    <OnboardingWrapper>
      <Suspense fallback={<div>Loading status debugger...</div>}>
        <TaskStatusDebugger />
      </Suspense>
    </OnboardingWrapper>
  </ProtectedLayout>
</Route>

<Route path="/debug/websocket">
  <ProtectedLayout>
    <OnboardingWrapper>
      <Suspense fallback={<div>Loading WebSocket debugger...</div>}>
        <WebSocketDebuggerPage />
      </Suspense>
    </OnboardingWrapper>
  </ProtectedLayout>
</Route>

<Route path="/websocket-test">
  <WebSocketTestPage />
</Route>

<Route path="/websocket-test-page">
  <WebSocketTestPageNew />
</Route>
```

## Keep These Routes

The following routes should be kept as they appear to be part of the core application functionality:

1. All landing page routes (`/landing/*`)
2. Auth routes (`/login`, `/register`, `/auth`)
3. Dashboard routes (`/`, `/dashboard`)
4. Network routes (`/network`, `/network/company/:companySlug`) 
5. Task center routes (`/task-center`, `/task-center/task/:taskSlug`, `/task/:taskId`)
6. File vault route (`/file-vault`)
7. Insights route (`/insights`)
8. Risk score routes (`/risk-score`, `/risk-score-configuration`)
9. Claims routes (`/claims`, `/claims/:claimId`, `/claims-risk`)
10. Task-specific routes (`/ky3p-task/:taskId`, `/open-banking-task/:taskId`)
11. Diagnostic page (`/diagnostic`) - this appears to be a useful tool for admins/developers

## Implementation Strategy

1. First, comment out the routes and imports
2. Test that the application still functions correctly
3. Remove the commented code if no issues arise
4. Remove the now-unused page files