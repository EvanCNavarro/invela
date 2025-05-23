# Coding Standards & Best Practices Guide

**Project:** Enterprise Risk Assessment Platform  
**Last Updated:** May 23, 2025  
**Purpose:** Unified coding standards for consistent, maintainable, and scalable code across the entire application

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

### **File Naming Conventions** (RIGID BEST PRACTICE STANDARDS)
- **React Components:** `PascalCase.tsx` (e.g., `DashboardPage.tsx`, `TaskCard.tsx`)
- **React Pages:** `PascalCase.tsx` (e.g., `LoginPage.tsx`, `TaskCenterPage.tsx`)
- **API Routes:** `kebab-case.routes.ts` (e.g., `company.routes.ts`, `task-management.routes.ts`)
- **Services:** `kebab-case.service.ts` (e.g., `user-auth.service.ts`, `risk-calculation.service.ts`)
- **Utilities:** `kebab-case.utils.ts` (e.g., `date-formatting.utils.ts`, `validation.utils.ts`)
- **Types:** `kebab-case.types.ts` (e.g., `task.types.ts`, `company-profile.types.ts`)
- **Constants:** `kebab-case.constants.ts` (e.g., `api-endpoints.constants.ts`)
- **Database:** `kebab-case.ts` (e.g., `add-user-table.ts`, `update-task-status.ts`)

**RULE**: No exceptions. All files will be renamed to follow these exact patterns.

### **Directory Structure**
```
project/
├── client/src/
│   ├── components/       # React components (PascalCase.tsx)
│   ├── pages/           # Page components (PascalCase.tsx)
│   ├── services/        # API services (kebab-case-service.ts)
│   ├── hooks/           # Custom hooks (use-kebab-case.ts)
│   ├── utils/           # Utility functions (kebab-case.ts)
│   ├── types/           # Type definitions (kebab-case-types.ts)
│   └── lib/             # Library configurations
├── server/
│   ├── routes/          # API routes (kebab-case.ts)
│   ├── services/        # Business logic services
│   ├── middleware/      # Express middleware
│   ├── utils/           # Server utilities
│   └── types/           # Server-side types
├── db/
│   ├── schema.ts        # Main database schema
│   ├── migrations/      # Database migrations
│   └── scripts/         # Database utility scripts
└── types/               # Shared type definitions
```

---

## 📄 File Header Standards

### **Standard File Header Template**
```typescript
/**
 * [File Purpose] - [Brief Description]
 * 
 * [Detailed explanation of what this file contains/does]
 * [Additional context about usage, dependencies, or important notes]
 * 
 * @author [Optional: Author name]
 * @created [Optional: Creation date]
 * @updated [Optional: Last update date]
 */
```

### **Example Headers by File Type**

**Database Schema:**
```typescript
/**
 * Database Schema - Core application data models
 * 
 * Defines all database tables, relationships, and validation schemas
 * using Drizzle ORM. Includes user management, task tracking, form responses,
 * and risk assessment data structures.
 */
```

**API Route:**
```typescript
/**
 * Company Management Routes - RESTful endpoints for company operations
 * 
 * Handles CRUD operations for company data including profile management,
 * risk scoring, onboarding status, and company-specific configurations.
 * Includes proper authentication and validation middleware.
 */
```

**React Component:**
```typescript
/**
 * Dashboard Component - Main application dashboard interface
 * 
 * Displays company overview, task progress, risk metrics, and navigation
 * to all major application features. Includes real-time data updates
 * via WebSocket integration.
 */
```

**Utility/Service:**
```typescript
/**
 * Logging Utility - Centralized application logging system
 * 
 * Provides structured logging with consistent formatting, log levels,
 * and metadata tracking. Integrates with monitoring systems and
 * supports both development and production environments.
 */
```

---

## 🏗️ Code Organization

### **MANDATORY File Structure Order**
**EVERY FILE MUST FOLLOW THIS EXACT ORDER:**

1. **File Header** - REQUIRED documentation block using JSDoc format
2. **Imports Section** - Grouped in specific order (see Import Standards)
3. **Constants Section** - ALL constants declared here with section comment
4. **Types & Interfaces Section** - ALL TypeScript definitions with section comment
5. **Helper Functions Section** - Internal utilities with section comment
6. **Main Implementation** - Primary logic with section comment
7. **Exports Section** - ALL exports grouped at bottom with section comment

### **MANDATORY Section Comments**
**EVERY FILE MUST USE THESE EXACT SECTION DIVIDERS:**
```typescript
// ========================================
// CONSTANTS
// ========================================

// ========================================
// TYPE DEFINITIONS
// ========================================

// ========================================
// HELPER FUNCTIONS
// ========================================

// ========================================
// MAIN IMPLEMENTATION
// ========================================

// ========================================
// EXPORTS
// ========================================
```

**RULE**: Files missing proper sections or order will be restructured.

---

## 🔤 TypeScript Standards

### **Naming Conventions**
- **Types/Interfaces:** `PascalCase`
- **Enums:** `PascalCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Variables:** `camelCase`
- **Functions:** `camelCase`
- **Files:** `kebab-case`

### **Type Definitions**
```typescript
// ✅ Good
export interface UserProfile {
  id: number;
  email: string;
  companyId: number;
  createdAt: Date;
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

export const API_ENDPOINTS = {
  USERS: '/api/users',
  COMPANIES: '/api/companies'
} as const;

// ❌ Avoid
interface userprofile { /* ... */ }
enum taskstatus { /* ... */ }
const apiEndpoints = { /* ... */ }
```

---

## 🏷️ Variable & Function Naming

### **STRICT Variable Naming** (MANDATORY)
**ALL VARIABLES MUST FOLLOW THESE EXACT PATTERNS:**

```typescript
// ✅ REQUIRED - Descriptive, action-oriented, no abbreviations
const userAuthenticationToken = generateUserToken();
const companyRiskScoreCalculation = calculateCompanyRiskScore();
const websocketConnectionStatus = 'connected';
const apiRequestTimeoutDuration = 30000;

// ❌ FORBIDDEN - Abbreviations, vague names, unclear purpose
const token = generateToken();           // TOO VAGUE
const calc = calculateRisk();           // ABBREVIATION
const wsStatus = 'connected';           // ABBREVIATION
const timeout = 30000;                  // TOO GENERIC
```

### **STRICT Function Naming** (MANDATORY)
**ALL FUNCTIONS MUST FOLLOW THESE EXACT PATTERNS:**

```typescript
// ✅ REQUIRED - Verb + Noun + Specific Purpose
function calculateCompanyRiskScore(data: RiskData): number { }
function validateUserPermissions(userId: number): boolean { }
function broadcastTaskStatusUpdate(taskId: number, status: TaskStatus): void { }
function generateUserAuthenticationToken(userId: number): string { }

// ❌ FORBIDDEN - Generic verbs, unclear purpose, abbreviations
function calculate(data: any): number { }           // TOO GENERIC
function check(id: number): boolean { }             // UNCLEAR PURPOSE
function broadcast(id: number, status: string): void { }  // MISSING SPECIFICITY
function genToken(id: number): string { }           // ABBREVIATION
```

**RULES**:
- ALL functions must start with action verbs (calculate, validate, generate, broadcast, etc.)
- NO abbreviations allowed (gen, calc, auth, etc.)
- ALL parameters must have explicit types
- ALL return types must be explicitly declared

---

## 💬 Comment Standards

### **MANDATORY Function Comments** 
**ALL FUNCTIONS MUST HAVE COMPLETE JSDOC DOCUMENTATION:**

```typescript
/**
 * Calculate comprehensive risk score based on company data and form responses
 * 
 * @param companyData - Complete company profile and metadata object
 * @param responses - Array of validated form response data for risk assessment
 * @param weights - Optional custom weighting factors for risk calculation
 * @returns Calculated risk score between 0-100 with decimal precision
 * 
 * @throws {ValidationError} When company data is incomplete
 * @throws {CalculationError} When risk calculation fails
 * 
 * @example
 * const riskScore = calculateCompanyRiskScore(companyProfile, formResponses, { security: 0.4 });
 */
function calculateCompanyRiskScore(
  companyData: CompanyProfile,
  responses: FormResponse[],
  weights?: RiskWeights
): number {
  // Implementation...
}
```

### **MANDATORY Inline Comments**
**ALL COMPLEX LOGIC MUST BE EXPLAINED:**

```typescript
// ✅ REQUIRED - Explain WHY, not just WHAT
const apiRequestTimeoutDuration = 30000; // 30 seconds timeout prevents hanging requests in production

// ✅ REQUIRED - Complex logic explanation
/*
 * Risk calculation uses weighted scoring algorithm:
 * - Security responses: 40% weight (highest priority)
 * - Financial data: 30% weight 
 * - Operational metrics: 30% weight
 */

// ❌ FORBIDDEN - Obvious or redundant comments
const userId = 123; // Set user ID to 123
let isValid = true; // Boolean variable
```

**RULES**:
- ALL functions require complete JSDoc with @param, @returns, @throws
- ALL complex logic requires explanatory comments
- NO obvious or redundant comments allowed

---

## 📦 Import/Export Organization

### **STRICT Import Order** (MANDATORY)
**ALL FILES MUST FOLLOW THIS EXACT IMPORT ORDER:**

```typescript
// ========================================
// IMPORTS
// ========================================

// 1. Node.js built-in modules (alphabetical)
import { readFileSync } from 'fs';
import { join } from 'path';

// 2. External library imports (alphabetical)
import express from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

// 3. Internal absolute path imports (alphabetical)
import { db } from '@db';
import { logger } from '@/server/utils/logger.utils';

// 4. Relative imports (alphabetical)
import { validateInput } from './validation.utils';
import { TaskStatus } from '../types/task.types';
```

### **STRICT Export Standards** (MANDATORY)
**EVERY FILE MUST FOLLOW THESE EXPORT RULES:**

```typescript
// ========================================
// EXPORTS
// ========================================

// Rule 1: Named exports for utilities, functions, and constants
export const calculateRiskScore = (data: RiskData): number => { };
export const validateFormData = (form: FormData): boolean => { };

// Rule 2: Default export ONLY for main component/service/class
export default class RiskCalculationService {
  // Implementation...
}

// Rule 3: Re-exports grouped alphabetically
export { TaskStatus, TaskUpdate } from './task.types';
export { UserProfile } from './user.types';
```

**RULES**: 
- NO mixed default/named exports except for main classes
- ALL exports must be at file bottom in EXPORTS section
- ALL imports must use exact file extensions (.types.ts, .utils.ts, etc.)

---

## 🗄️ Database Standards

### **Schema Organization**
```typescript
// 1. Imports
import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

// 2. Enums and constants
export const TaskStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed'
} as const;

// 3. Table definitions
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 4. Relations
export const tasksRelations = relations(tasks, ({ one, many }) => ({
  // Relation definitions...
}));

// 5. Validation schemas
export const insertTaskSchema = createInsertSchema(tasks);
export const selectTaskSchema = createSelectSchema(tasks);
```

---

## 🛣️ API Route Standards

### **Route Organization**
```typescript
/**
 * Task Management Routes - CRUD operations for task entities
 * 
 * Provides RESTful endpoints for task creation, retrieval, updates,
 * and deletion with proper authentication and validation.
 */

import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ========================================
// VALIDATION SCHEMAS
// ========================================
const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional()
});

// ========================================
// ROUTE HANDLERS
// ========================================

/**
 * GET /api/tasks - Retrieve all tasks for authenticated user
 */
router.get('/tasks', async (req, res) => {
  // Implementation...
});

/**
 * POST /api/tasks - Create new task
 */
router.post('/tasks', async (req, res) => {
  // Implementation...
});

export default router;
```

---

## ⚛️ Frontend Component Standards

### **React Component Structure**
```typescript
/**
 * Task Card Component - Individual task display and interaction
 * 
 * Displays task information with status indicators, progress tracking,
 * and action buttons. Supports real-time updates via WebSocket.
 */

import React from 'react';
import { Task, TaskStatus } from '@/types/task';

// ========================================
// TYPE DEFINITIONS
// ========================================
interface TaskCardProps {
  task: Task;
  onUpdate: (taskId: number, status: TaskStatus) => void;
  className?: string;
}

// ========================================
// COMPONENT IMPLEMENTATION
// ========================================
export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onUpdate, 
  className 
}) => {
  // Hooks at the top
  const [isLoading, setIsLoading] = useState(false);
  
  // Event handlers
  const handleStatusChange = useCallback((newStatus: TaskStatus) => {
    setIsLoading(true);
    onUpdate(task.id, newStatus);
    setIsLoading(false);
  }, [task.id, onUpdate]);
  
  // Render logic
  return (
    <div className={`task-card ${className || ''}`}>
      {/* Component JSX */}
    </div>
  );
};

export default TaskCard;
```

---

## ✅ Quick Reference Checklist

**Before submitting any code:**

- [ ] File has proper header documentation
- [ ] Imports are organized correctly
- [ ] Variables and functions use descriptive names
- [ ] TypeScript types are properly defined
- [ ] Comments explain complex logic
- [ ] Consistent formatting throughout
- [ ] No console.log statements in production code
- [ ] Error handling is implemented
- [ ] File follows established naming conventions

---

---

## ✅ MANDATORY ENFORCEMENT CHECKLIST

**BEFORE ANY CODE IS COMMITTED, VERIFY 100% COMPLIANCE:**

### **File-Level Requirements:**
- [ ] File name follows EXACT naming convention for its type
- [ ] File header uses proper JSDoc format with complete description
- [ ] All sections present in correct order with proper dividers
- [ ] All imports grouped and alphabetized correctly
- [ ] All exports grouped at bottom with proper organization

### **Code-Level Requirements:**
- [ ] All functions have complete JSDoc documentation
- [ ] All variables use descriptive, non-abbreviated names
- [ ] All TypeScript types explicitly declared
- [ ] All complex logic has explanatory comments
- [ ] No console.log statements in production code
- [ ] No unused imports or variables
- [ ] No any types without explicit justification

### **Standards Violations = IMMEDIATE FIX REQUIRED:**
- **File naming violations**: Rename immediately
- **Missing documentation**: Add complete headers and comments
- **Poor organization**: Restructure to match mandatory sections
- **Abbreviated names**: Expand to full descriptive names
- **Missing types**: Add explicit TypeScript declarations

---

## 🎯 IMPLEMENTATION PRIORITY

**Phase 1**: Database folder (8 files) - Apply all standards
**Phase 2**: Types folder (1 file) - Validate compliance  
**Phase 3**: Client folder (100+ files) - Systematic cleanup
**Phase 4**: Server folder (100+ files) - Complete transformation

---

**This guide represents NON-NEGOTIABLE standards. ALL code must comply 100% with these requirements. No exceptions.**