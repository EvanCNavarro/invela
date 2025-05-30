# Contributing Guide

**Project:** Invela Enterprise Risk Assessment Platform  
**Last Updated:** May 30, 2025  
**Purpose:** Development guidelines, coding standards, and best practices for contributors

---

## 📋 Table of Contents

1. [File Structure & Naming](#file-structure--naming)
2. [File Header Standards](#file-header-standards)
3. [Code Organization](#code-organization)
4. [TypeScript Standards](#typescript-standards)
5. [Variable & Function Naming](#variable--function-naming)
6. [Comment Standards](#comment-standards)
7. [Import/Export Organization](#importexport-organization)
8. [Database Standards](#database-standards)
9. [API Route Standards](#api-route-standards)
10. [Frontend Component Standards](#frontend-component-standards)

---

## 🗂️ File Structure & Naming

### Directory Structure
```
client/src/
├── components/
│   ├── ui/           # Shared UI components
│   ├── dashboard/    # Dashboard-specific components
│   ├── forms/        # Form components
│   └── tutorial/     # Tutorial system components
├── hooks/            # Custom React hooks
├── layouts/          # Layout components
├── pages/            # Page components
├── lib/              # Utility libraries
├── api/              # API client functions
├── services/         # Business logic services
├── types/            # TypeScript type definitions
└── utils/            # General utilities

server/
├── routes/           # API route handlers
├── services/         # Backend services
├── middleware/       # Express middleware
└── utils/            # Server utilities

db/
├── schema.ts         # Database schema definitions
└── migrations/       # Database migrations
```

### File Naming Conventions
- **Components:** `PascalCase.tsx` (e.g., `CompanySnapshot.tsx`)
- **Pages:** `kebab-case-page.tsx` (e.g., `dashboard-page.tsx`)
- **Hooks:** `use-kebab-case.tsx` (e.g., `use-auth.tsx`)
- **Utilities:** `kebab-case.ts` (e.g., `form-utils.ts`)
- **Types:** `kebab-case.ts` (e.g., `company-types.ts`)
- **API Routes:** `kebab-case.ts` (e.g., `user-routes.ts`)
- **Documentation:** `UPPERCASE.md` (e.g., `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`)

---

## 📄 File Header Standards

### Component Headers
```typescript
/**
 * ========================================
 * [Component Name] Component
 * ========================================
 * 
 * [Brief description of component purpose and functionality]
 * 
 * Key Features:
 * - [Feature 1]
 * - [Feature 2]
 * - [Feature 3]
 * 
 * Dependencies:
 * - [Dependency 1]: [Purpose]
 * - [Dependency 2]: [Purpose]
 * 
 * @module [ComponentName]
 * @version [X.Y.Z]
 * @since [YYYY-MM-DD]
 */
```

### API Route Headers
```typescript
/**
 * ========================================
 * [Route Group] API Routes
 * ========================================
 * 
 * [Description of route group functionality]
 * 
 * Endpoints:
 * - GET /api/[endpoint] - [Description]
 * - POST /api/[endpoint] - [Description]
 * 
 * @module [RouteGroup]
 * @version [X.Y.Z]
 * @since [YYYY-MM-DD]
 */
```

---

## 🏗️ Code Organization

### Section Separators
Use consistent section separators in all files:

```typescript
// ========================================
// IMPORTS
// ========================================

// React core functionality
import { useState, useEffect } from "react";

// ========================================
// TYPES & INTERFACES
// ========================================

interface ComponentProps {
  // Interface definition
}

// ========================================
// CONSTANTS
// ========================================

const DEFAULT_CONFIG = {
  // Constants
};

// ========================================
// MAIN COMPONENT
// ========================================

export function ComponentName() {
  // Component implementation
}
```

### Function Organization Within Components
```typescript
export function ComponentName() {
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  const [state, setState] = useState();
  
  // ========================================
  // DATA FETCHING
  // ========================================
  
  const { data } = useQuery();
  
  // ========================================
  // EVENT HANDLERS
  // ========================================
  
  const handleClick = () => {};
  
  // ========================================
  // EFFECTS
  // ========================================
  
  useEffect(() => {}, []);
  
  // ========================================
  // RENDER
  // ========================================
  
  return (
    // JSX
  );
}
```

---

## 🔷 TypeScript Standards

### Type Definitions
```typescript
// Use interfaces for objects
interface User {
  id: number;
  name: string;
  email: string;
}

// Use type aliases for unions and primitives
type Status = 'pending' | 'approved' | 'rejected';

// Use generics for reusable types
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
```

### Function Signatures
```typescript
// Always include return types for functions
function processData(input: string): Promise<ProcessedData> {
  // Implementation
}

// Use arrow functions for simple utilities
const formatDate = (date: Date): string => {
  return date.toISOString();
};
```

---

## 🏷️ Variable & Function Naming

### Variables
- Use `camelCase` for variables and functions
- Use descriptive names that explain purpose
- Avoid abbreviations unless commonly understood

```typescript
// ✅ Good
const userAuthenticationStatus = 'authenticated';
const companyRiskScore = calculateRiskScore();

// ❌ Bad
const uas = 'auth';
const crs = calcRisk();
```

### Functions
- Use verbs that describe the action
- Include context when necessary
- Be specific about what the function does

```typescript
// ✅ Good
function validateUserEmail(email: string): boolean {}
function calculateCompanyRiskScore(company: Company): number {}
function fetchUserTasks(userId: number): Promise<Task[]> {}

// ❌ Bad
function validate(input: string): boolean {}
function calc(data: any): number {}
function get(id: number): Promise<any[]> {}
```

---

## 💬 Comment Standards

### JSDoc Comments
Use JSDoc for all public functions and complex logic:

```typescript
/**
 * Calculates the overall risk score for a company based on multiple factors
 * 
 * @param company - The company object containing assessment data
 * @param weightings - Optional custom weightings for risk factors
 * @returns The calculated risk score between 0-100
 * 
 * @example
 * const score = calculateRiskScore(company, { financial: 0.4, operational: 0.6 });
 */
function calculateRiskScore(
  company: Company, 
  weightings?: RiskWeightings
): number {
  // Implementation
}
```

### Inline Comments
- Explain **why**, not **what**
- Use for complex business logic
- Keep comments concise and relevant

```typescript
// Calculate weighted average considering regulatory requirements
const weightedScore = factors.reduce((sum, factor) => {
  // Regulatory factors have 1.5x weight multiplier
  const multiplier = factor.isRegulatory ? 1.5 : 1.0;
  return sum + (factor.score * factor.weight * multiplier);
}, 0);
```

---

## 📦 Import/Export Organization

### Import Order
1. React and core libraries
2. Third-party libraries (alphabetical)
3. Internal utilities and services
4. Components (alphabetical)
5. Types and interfaces
6. Relative imports

```typescript
// React core
import { useState, useEffect } from "react";

// Third-party libraries
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

// Internal utilities
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

// Components
import { CompanySnapshot } from "@/components/dashboard/CompanySnapshot";
import { RiskMeter } from "@/components/dashboard/RiskMeter";

// Types
import type { Company } from "@/types/company";
```

### Export Patterns
```typescript
// Default exports for main components
export default function DashboardPage() {}

// Named exports for utilities and types
export { calculateRiskScore, validateInput };
export type { RiskScoreConfig, ValidationResult };
```

---

## 🗄️ Database Standards

### Schema Naming
- Use `snake_case` for table and column names
- Use descriptive names that explain the data
- Include proper foreign key relationships

```typescript
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  risk_score: integer("risk_score").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});
```

### Query Organization
```typescript
// Group related queries in service files
export class CompanyService {
  static async findById(id: number): Promise<Company | null> {
    return await db.query.companies.findFirst({
      where: eq(companies.id, id),
    });
  }
  
  static async updateRiskScore(
    id: number, 
    score: number
  ): Promise<Company> {
    const [updated] = await db
      .update(companies)
      .set({ risk_score: score, updated_at: new Date() })
      .where(eq(companies.id, id))
      .returning();
    
    return updated;
  }
}
```

---

## 🛣️ API Route Standards

### Route Structure
```typescript
export function createCompanyRoutes(): Router {
  const router = Router();
  
  /**
   * GET /api/companies
   * Retrieve all companies for the authenticated user
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const companies = await CompanyService.findAll();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to fetch companies',
        details: error.message 
      });
    }
  });
  
  return router;
}
```

### Error Handling
```typescript
// Consistent error response format
interface ApiError {
  error: string;
  details?: string;
  code?: string;
}

// Standardized error responses
res.status(400).json({
  error: 'Validation failed',
  details: 'Email address is required',
  code: 'VALIDATION_ERROR'
});
```

---

## ⚛️ Frontend Component Standards

### Component Structure
```typescript
interface ComponentProps {
  // Always define prop interfaces
  data: ComponentData;
  onAction?: (id: string) => void;
  className?: string;
}

export default function ComponentName({ 
  data, 
  onAction, 
  className 
}: ComponentProps) {
  // 1. State management at top
  const [loading, setLoading] = useState(false);
  
  // 2. Data fetching with proper error handling
  const { data: fetchedData, isLoading } = useQuery({
    queryKey: ['/api/component-data'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // 3. Effects after data fetching
  useEffect(() => {
    // Side effects here
  }, [dependencies]);
  
  // 4. Early returns for loading/error states
  if (isLoading) {
    return <LoadingSkeleton />;
  }
  
  // 5. Main component render
  return (
    <div className={cn("base-styles", className)}>
      {/* Component content */}
    </div>
  );
}
```

### Critical Wrapper Component Patterns

**🚨 CRITICAL LESSON**: Wrapper components must ALWAYS render children content, regardless of internal state.

```typescript
// ✅ CORRECT: Always render children
interface WrapperProps {
  children: React.ReactNode;
  condition?: boolean;
}

function WrapperComponent({ children, condition }: WrapperProps) {
  // Even if wrapper logic determines not to show modal/overlay
  if (condition === false) {
    return <>{children}</>; // ALWAYS render children
  }
  
  // Show both wrapper functionality AND children
  return (
    <>
      {children}
      {condition && <OverlayComponent />}
    </>
  );
}

// ❌ WRONG: Never block children rendering
function BadWrapper({ children, condition }: WrapperProps) {
  if (!condition) {
    return null; // This blocks ALL content!
  }
  return <>{children}</>;
}
```

### Console Logging in React Components

```typescript
// ✅ CORRECT: Use useEffect for debugging
function Component() {
  useEffect(() => {
    console.log('Debug info:', data);
  }, [data]);
  
  return <div>Content</div>;
}

// ❌ WRONG: Never use console.log directly in JSX
function BadComponent() {
  return (
    <div>
      {console.log('This breaks React!')} // Type error!
      Content
    </div>
  );
}
```

### Debugging Patterns for React Components

```typescript
// ✅ CORRECT: Systematic debugging approach
function ComponentWithIssues() {
  // 1. Log component mount/unmount
  useEffect(() => {
    console.log('Component mounted');
    return () => console.log('Component unmounted');
  }, []);
  
  // 2. Log specific state changes
  useEffect(() => {
    console.log('Data changed:', data);
  }, [data]);
  
  // 3. Add conditional rendering debugs
  if (!data) {
    console.log('No data available');
    return <LoadingState />;
  }
  
  // 4. Use early returns to isolate issues
  return <ContentComponent data={data} />;
}
```

### Error Handling Standards

```typescript
// ✅ CORRECT: Comprehensive error handling
interface ErrorState {
  message: string;
  code?: string;
  details?: unknown;
}

function ComponentWithErrorHandling() {
  const [error, setError] = useState<ErrorState | null>(null);
  
  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ['/api/data'],
    onError: (err: Error) => {
      setError({
        message: 'Failed to load data',
        code: 'FETCH_ERROR',
        details: err.message
      });
    }
  });
  
  // Display error states clearly
  if (error) {
    return (
      <div className="error-container">
        <h3>Something went wrong</h3>
        <p>{error.message}</p>
        <Button onClick={() => setError(null)}>Try Again</Button>
      </div>
    );
  }
  
  return <SuccessContent data={data} />;
}
```

### State Management
```typescript
// Use descriptive state names
const [isLoading, setIsLoading] = useState(false);
const [errorMessage, setErrorMessage] = useState<string | null>(null);
const [formData, setFormData] = useState<FormData>(initialFormData);

// Group related state when appropriate
const [uiState, setUiState] = useState({
  isModalOpen: false,
  selectedTab: 'overview',
  sidebarExpanded: true,
});
```

### Event Handlers
```typescript
// Use descriptive handler names
const handleFormSubmit = async (data: FormData) => {};
const handleUserInvite = (email: string) => {};
const handleRiskScoreUpdate = (newScore: number) => {};

// Include proper error handling
const handleApiCall = async () => {
  try {
    setIsLoading(true);
    const result = await apiService.performAction();
    setData(result);
  } catch (error) {
    setErrorMessage('Failed to perform action');
    console.error('API call failed:', error);
  } finally {
    setIsLoading(false);
  }
};
```

---

## 🎯 Code Quality Checklist

Before committing code, ensure:

- [ ] All functions have proper TypeScript types
- [ ] Complex logic includes explanatory comments
- [ ] Error handling is implemented appropriately
- [ ] Component props are properly typed
- [ ] Database queries use proper error handling
- [ ] API routes return consistent response formats
- [ ] File headers are included for new files
- [ ] Imports are organized according to standards
- [ ] Variable and function names are descriptive
- [ ] No console.log statements in production code

---

## 🔄 Code Review Guidelines

### What to Look For:
1. **Consistency** - Does the code follow these standards?
2. **Clarity** - Is the code easy to understand?
3. **Correctness** - Does the code work as intended?
4. **Performance** - Are there any obvious performance issues?
5. **Security** - Are there any security concerns?

### Review Comments:
- Be constructive and specific
- Suggest improvements rather than just pointing out problems
- Reference these standards when applicable
- Consider the broader impact of changes

---

**Remember:** These standards exist to make our codebase maintainable and our team more productive. When in doubt, prioritize clarity and consistency over cleverness.