# PROJECT CLIFF NOTES

**Project**: Invela Enterprise Risk Assessment Platform  
**Stack**: TypeScript Full-Stack (React + Express + PostgreSQL)  
**Last Updated**: 2025-05-30  

---

## Purpose

Comprehensive enterprise-grade risk assessment platform delivering advanced diagnostic capabilities through modern, scalable web application with intelligent monitoring and deployment management. Enables organizations to assess, track, and manage risk across multiple assessment types including KYB (Know Your Business), KY3P (Know Your Third Party), Open Banking, and Security evaluations.

## Architecture

### Core Technologies
- **Frontend**: React 18 + TypeScript + Wouter routing
- **Backend**: Express.js + TypeScript + WebSocket
- **Database**: PostgreSQL + Drizzle ORM
- **Styling**: Tailwind CSS + Radix UI components
- **State**: TanStack Query + Zustand
- **Real-time**: WebSocket communication

### Layered Architecture
```
┌─────────────────────────────────────┐
│ Presentation Layer (client/src/)    │
│ - Pages, Components, UI interactions│
├─────────────────────────────────────┤
│ API Layer (server/routes/)          │
│ - HTTP endpoints, Auth, Validation  │
├─────────────────────────────────────┤
│ Business Logic (server/services/)   │
│ - Core business rules, Processing   │
├─────────────────────────────────────┤
│ Data Access Layer (db/)             │
│ - Schema, Migrations, Transactions  │
└─────────────────────────────────────┘
```

## Key Modules

### Frontend Components (`client/src/`)
- **Dashboard**: Risk assessment overview and analytics
- **Forms**: KYB, KY3P, Open Banking, Security forms
- **Company Management**: Profile, logo, relationship tracking
- **File Management**: Document upload, processing, vault
- **Tutorial System**: User onboarding and guidance
- **WebSocket Integration**: Real-time updates and notifications

### Backend Services (`server/`)
- **Authentication**: Session-based auth with middleware
- **API Routes**: 40+ endpoints organized by functionality
- **WebSocket Server**: Real-time communication infrastructure
- **File Processing**: Upload, validation, PDF generation
- **Risk Scoring**: Algorithm integration and calculation
- **Form Submission**: Transaction management and validation

### Database Schema (`db/`)
- **Core Tables**: users, companies, tasks, files, relationships
- **Form Tables**: kyb_fields, ky3p_fields, open_banking_fields, security_fields
- **Assessment**: risk_clusters, risk_configurations, task_templates
- **Audit**: timestamps, submissions, progress tracking

## Data Models

### Primary Entities
```typescript
User {
  id: number
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  password: string
  company_id: number
  created_at: timestamp
  updated_at: timestamp
}

Company {
  id: number
  name: string
  description?: string
  website_url?: string
  industry?: string
  companySize?: string
  isDemo: boolean
  created_at: timestamp
  updated_at: timestamp
}

Task {
  id: number
  title: string
  status: TaskStatus
  company_id: number
  form_type: string
  progress: number
  dependencies?: string[]
  created_at: timestamp
  updated_at: timestamp
}
```

### Form Schema Pattern
Each form type (KYB, KY3P, Open Banking, Security) follows consistent structure:
- Field definitions with validation rules (snake_case database fields)
- Progress tracking and dependencies
- File attachment capabilities
- Real-time status updates

### Database Naming Conventions
- **Database fields**: snake_case (first_name, company_id, created_at)
- **TypeScript interfaces**: Match database field names exactly
- **API responses**: Use database field naming for consistency

## Build

### Development
```bash
npm install           # Install dependencies
npm run dev          # Start development server (port 3000)
npm run db:push      # Deploy schema changes
```

### Production
```bash
npm run build        # Build frontend + backend
npm start           # Production server
```

### Database Management
```bash
npm run db:push      # Push schema changes
drizzle-kit studio   # Launch database studio
```

## Pain Points

### Current Issues
1. **Documentation Fragmentation**: 10+ files in docs/ need consolidation
2. **Development Artifacts**: 120+ attached_assets files cluttering repository
3. **Testing Infrastructure**: No test framework setup (Jest/Vitest missing)
4. **Legacy Code**: Multiple backup files and outdated scripts
5. **File Cleanup**: Significant cleanup needed per COMPREHENSIVE_PROJECT_AUDIT.md
6. **Import Organization**: Missing blank lines between external/internal imports

### Technical Debt
- Multiple route files with overlapping functionality
- Complex form submission logic across multiple services
- WebSocket connection management could be simplified
- File upload handling has multiple implementations

### Performance Considerations
- Database queries could benefit from optimization
- Frontend bundle size with 100+ dependencies
- Real-time updates may need throttling for scale
- File processing pipeline needs async optimization

### Security & Compliance
- Session-based auth working but needs review
- File upload validation comprehensive
- SQL injection protected via Drizzle ORM
- CORS configured for production environments

---

## Code Quality Standards

### File Headers
All components and modules use standardized headers:
```typescript
/**
 * ========================================
 * [Component Name] Component
 * ========================================
 * 
 * [Brief description and key features]
 * 
 * @module [ModuleName]
 * @version [X.Y.Z]
 * @since [YYYY-MM-DD]
 */
```

### File Naming Conventions
- **Components**: PascalCase.tsx (CompanySnapshot.tsx) or kebab-case.tsx (alert-dialog.tsx)
- **Pages**: kebab-case-page.tsx (auth-page.tsx)
- **Hooks**: use-kebab-case.tsx (use-auth.tsx)
- **API Routes**: kebab-case.ts (company-search.ts)

### Import Organization
Follow strict order with blank lines between sections:
1. React core libraries
2. Third-party libraries
3. Internal utilities and services
4. Components
5. Types and interfaces
6. Relative imports

---

**Quick Navigation**:
- Architecture Details: `docs/APPLICATION_ARCHITECTURE_ATLAS.md`
- Coding Standards: `docs/CODING_STANDARDS.md`
- Cleanup Plan: `docs/COMPREHENSIVE_PROJECT_AUDIT.md`
- Reality Audit: `docs/COMPREHENSIVE_REALITY_AUDIT.md`