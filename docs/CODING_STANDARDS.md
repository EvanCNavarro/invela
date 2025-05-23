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

### **File Naming Conventions**
- **TypeScript Files:** `kebab-case.ts` or `kebab-case.tsx`
- **Components:** `PascalCase.tsx` (React components)
- **Utilities:** `kebab-case.ts`
- **Services:** `kebab-case-service.ts`
- **Types:** `kebab-case-types.ts`
- **Constants:** `kebab-case-constants.ts`

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

### **File Structure Order**
1. **File Header** - Documentation block
2. **Imports** - External libraries first, then internal modules
3. **Constants** - All constant declarations
4. **Types & Interfaces** - TypeScript definitions
5. **Main Logic** - Core functionality
6. **Exports** - Named and default exports

### **Section Comments**
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

### **Variables**
```typescript
// ✅ Good - Descriptive and clear
const userAuthenticationToken = generateToken();
const companyRiskScoreCalculation = calculateRisk();
const websocketConnectionStatus = 'connected';

// ❌ Avoid - Vague or abbreviated
const token = generateToken();
const calc = calculateRisk();
const wsStatus = 'connected';
```

### **Functions**
```typescript
// ✅ Good - Action-oriented, descriptive
function calculateCompanyRiskScore(data: RiskData): number { }
function validateUserPermissions(userId: number): boolean { }
function broadcastTaskUpdate(taskId: number, status: TaskStatus): void { }

// ❌ Avoid - Vague or unclear purpose
function calculate(data: any): number { }
function check(id: number): boolean { }
function broadcast(id: number, status: string): void { }
```

---

## 💬 Comment Standards

### **Function Comments**
```typescript
/**
 * Calculate risk score based on company data and form responses
 * 
 * @param companyData - Company profile and metadata
 * @param responses - Form response data for risk assessment
 * @param weights - Optional custom weighting factors
 * @returns Calculated risk score between 0-100
 * 
 * @example
 * const score = calculateRiskScore(company, responses, { security: 0.4 });
 */
function calculateRiskScore(
  companyData: CompanyProfile,
  responses: FormResponse[],
  weights?: RiskWeights
): number {
  // Implementation...
}
```

### **Inline Comments**
```typescript
// Single-line comments for brief explanations
const timeout = 30000; // 30 seconds timeout for API requests

/* 
 * Multi-line comments for complex logic explanations
 * or important context that affects multiple lines
 */
```

---

## 📦 Import/Export Organization

### **Import Order**
```typescript
// 1. Node.js built-in modules
import { readFileSync } from 'fs';
import { join } from 'path';

// 2. External library imports
import express from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

// 3. Internal imports - absolute paths with @
import { db } from '@db';
import { logger } from '@/server/utils/logger';

// 4. Relative imports
import { validateInput } from './validation';
import { TaskStatus } from '../types/task';
```

### **Export Standards**
```typescript
// ✅ Preferred - Named exports for utilities
export const calculateRisk = (data: RiskData) => { };
export const validateForm = (form: FormData) => { };

// ✅ Good - Default export for main component/service
export default class RiskCalculationService {
  // Implementation...
}

// ✅ Combined approach when appropriate
export { TaskStatus, TaskUpdate } from './types';
export { default as RiskService } from './risk-service';
```

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

**This guide should be referenced by all developers and AI agents working on this project to ensure consistency and maintainability.**