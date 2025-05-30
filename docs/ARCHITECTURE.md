# Invela Platform - Application Architecture
*Enterprise Risk Assessment System Architecture Documentation*

## System Overview

The Invela platform is a sophisticated enterprise-grade risk assessment solution built on a modern web stack with real-time capabilities, multi-tenant data isolation, and comprehensive workflow management.

## Architecture Patterns

### Layered Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                 Presentation Layer                          │
│  React Components, Forms, Dashboard, WebSocket Client      │
├─────────────────────────────────────────────────────────────┤
│                    API Gateway                              │
│     Express Routes, Authentication, Middleware             │
├─────────────────────────────────────────────────────────────┤
│                 Business Logic Layer                       │
│   Form Services, Risk Scoring, File Processing, WebSocket  │
├─────────────────────────────────────────────────────────────┤
│                 Data Access Layer                          │
│        Drizzle ORM, Database Connections, Migrations       │
├─────────────────────────────────────────────────────────────┤
│                 Infrastructure Layer                       │
│     PostgreSQL Database, File Storage, Session Store       │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Tenant Data Isolation
- **Company Scoping**: All data operations filtered by `company_id`
- **Service Isolation**: Factory pattern creates company-specific service instances
- **Session Management**: Company context embedded in user sessions
- **Data Segregation**: Database-level isolation prevents cross-company data access

## Core System Components

### 1. Authentication & Authorization

#### Session-Based Authentication
```typescript
// Passport.js with PostgreSQL session store
app.use(session({
  store: new PostgreSQLStore({
    connectionString: DATABASE_URL,
    tableName: 'user_sessions'
  }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
```

**Key Features**:
- Passport.js local strategy authentication
- PostgreSQL-backed session persistence
- Company-scoped user context
- Middleware-based route protection (`requireAuth`, `optionalAuth`)

### 2. Real-Time Communication System

#### WebSocket Architecture
```
Client Applications
       ↓
┌─────────────────────────────────────┐
│    WebSocket Connection Pool        │
│  • Multi-client support (5 max)    │
│  • Authentication validation        │
│  • Automatic reconnection           │
└─────────────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│   Unified WebSocket Server          │
│  • Message broadcasting             │
│  • Connection state management      │
│  • Error handling & recovery        │
└─────────────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│    Business Logic Integration       │
│  • Task progress updates            │
│  • Risk score calculations          │
│  • File operation notifications     │
└─────────────────────────────────────┘
```

**Message Flow**:
1. **Connection Establishment**: Client connects and receives unique client ID
2. **Authentication**: User/company validation with session token
3. **Message Broadcasting**: Real-time updates pushed to authenticated clients
4. **Reconnection Handling**: Automatic retry with exponential backoff

### 3. Form Management System

#### Universal Form Architecture
```
┌─────────────────────────────────────┐
│         Universal Form              │
│     (UniversalForm.tsx)             │
├─────────────────────────────────────┤
│  • Task type detection              │
│  • Dynamic service loading          │
│  • Field rendering engine           │
│  • Progress tracking                │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│      Form Service Factory           │
│   (form-service-factory.ts)         │
├─────────────────────────────────────┤
│  • KYB Service (Enhanced)           │
│  • KY3P Service (Unified)           │
│  • Open Banking Service             │
│  • Company-scoped instances         │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│    Unified Submission Handler       │
│ (unified-form-submission-handler)   │
├─────────────────────────────────────┤
│  • Transaction management           │
│  • Workflow dependencies            │
│  • Risk score calculation           │
│  • File generation                  │
└─────────────────────────────────────┘
```

**Assessment Types**:
- **KYB**: Primary business verification (entry point)
- **KY3P**: Third-party security assessment (requires KYB)
- **Open Banking**: Banking compliance evaluation (independent)
- **Security**: General security posture assessment

### 4. Risk Scoring Engine

#### Multi-Dimensional Scoring System
```typescript
interface RiskCalculation {
  kybWeight: 40%;      // Primary business assessment
  ky3pWeight: 35%;     // Security assessment weight
  openBankingWeight: 15%; // Banking compliance weight
  additionalFactors: 10%; // Metadata and relationships
}
```

**Score Calculation Pipeline**:
1. **Field Validation**: Individual response validation and scoring
2. **Weighted Aggregation**: Multi-assessment weight application
3. **Critical Field Analysis**: High-impact field identification
4. **Normalization**: 0-100 scale normalization
5. **Real-time Updates**: WebSocket broadcast of score changes

### 5. Task Dependency Management

#### Progressive Unlocking System
```
Initial State: All tasks locked except KYB
     ↓
KYB Completion
     ↓
Security Tasks Unlocked via metadata.locked = false
     ↓
Assessment Progress Tracked
     ↓
Dashboard Analytics Enabled
```

**Implementation**:
- Task dependencies stored in `tasks.metadata.prerequisite_task_id`
- Unlocking logic in `handleKybPostSubmission`
- Transaction-safe dependency resolution
- WebSocket notifications for unlocked tasks

### 6. File Management System

#### Document Processing Pipeline
```
File Upload → Validation → Processing → Storage → Vault Integration
     ↓            ↓           ↓          ↓            ↓
Size/Type     Virus Scan   CSV/PDF    Database     UI Display
Validation      & Auth     Generation  Metadata    & Download
```

**Features**:
- Multi-format support (CSV, PDF, images, documents)
- Version control and metadata tracking
- Company-scoped file segregation
- Document classification and categorization
- Integration with assessment workflows

## Database Architecture

### Core Schema Design
```sql
-- Primary entities with company isolation
companies (id, name, accreditation_status, risk_score)
users (id, email, company_id, role)
tasks (id, task_type, company_id, status, metadata)

-- Assessment-specific tables
kyb_fields (id, field_key, display_name, field_type)
kyb_responses (id, task_id, field_id, response_value)
ky3p_fields (id, field_key, display_name, question)
ky3p_responses (id, task_id, field_id, response_value)
open_banking_fields (id, field_key, display_name, question)
open_banking_responses (id, task_id, field_id, response_value)

-- Supporting entities
files (id, name, path, company_id, metadata)
relationships (id, company_id, related_company_id)
invitations (id, email, company_id, task_id)
```

**Design Principles**:
- **Company Isolation**: All major tables include `company_id` foreign key
- **Audit Trail**: `created_at` and `updated_at` timestamps on all entities
- **Flexible Metadata**: JSONB columns for extensible data storage
- **Referential Integrity**: Proper foreign key constraints and cascading

### Migration Strategy
- **Drizzle ORM**: Type-safe migrations with automatic generation
- **Version Control**: Schema changes tracked in version control
- **Rollback Support**: Reversible migration scripts
- **Development Workflow**: `npm run db:push` for schema synchronization

## Frontend Architecture

### Component Architecture
```
├── App.tsx (Router & Global State)
├── pages/
│   ├── dashboard-page.tsx
│   ├── forms/
│   │   ├── kyb-form-page.tsx
│   │   ├── ky3p-form-page.tsx
│   │   └── open-banking-form-page.tsx
│   └── company/
├── components/
│   ├── dashboard/
│   │   ├── CompanySnapshot.tsx
│   │   ├── RiskMeter.tsx
│   │   └── NetworkVisualizationWidget.tsx
│   ├── forms/
│   │   ├── UniversalForm.tsx
│   │   └── renderers/
│   └── ui/ (Shadcn components)
├── services/
│   ├── form-service-factory.ts
│   ├── enhanced-kyb-service.ts
│   └── unified-ky3p-service.ts
└── lib/
    ├── queryClient.ts
    └── web-socket-manager.ts
```

### State Management
- **TanStack Query**: Server state management with caching
- **React Hook Form**: Form state and validation
- **WebSocket Manager**: Real-time state synchronization
- **User Context**: Global authentication and company state

### Real-Time Integration
```typescript
// WebSocket connection management
const wsManager = new WebSocketManager();
wsManager.connect();
wsManager.onMessage('task_update', handleTaskProgress);
wsManager.onMessage('risk_score_update', handleScoreChange);
```

## API Design

### RESTful Endpoints
```
Authentication:
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/user

Companies:
GET    /api/companies/:id
PUT    /api/companies/:id
POST   /api/companies/:id/logo

Tasks & Assessments:
GET    /api/tasks
POST   /api/tasks/:id/submit
GET    /api/tasks/:id/fields
PUT    /api/tasks/:id/responses

Files:
POST   /api/files/upload
GET    /api/files/:id
DELETE /api/files/:id

Real-time:
WS     /ws (WebSocket endpoint)
```

### API Security
- **Authentication Required**: All endpoints except login/logout
- **Company Scoping**: Data filtered by user's company context
- **Input Validation**: Request validation with Zod schemas
- **Error Handling**: Consistent error response format

## Performance Considerations

### Database Optimization
- **Connection Pooling**: Neon PostgreSQL with optimized connection management
- **Query Optimization**: Indexed company_id columns for fast filtering
- **Transaction Management**: ACID compliance with proper rollback handling

### Caching Strategy
- **Template Caching**: Form field templates cached in service layer
- **Query Caching**: TanStack Query for client-side caching
- **WebSocket Optimization**: Connection pooling and message queuing

### Scalability Features
- **Multi-tenant Architecture**: Horizontal scaling support
- **Service Isolation**: Company-scoped service instances
- **Stateless Design**: Session-based authentication for load balancing

## Security Architecture

### Data Protection
- **Encryption**: Sensitive data encrypted at rest and in transit
- **Access Control**: Role-based permissions with company isolation
- **Session Security**: Secure session management with proper expiration
- **Input Sanitization**: All user inputs validated and sanitized

### Audit & Compliance
- **Activity Logging**: Comprehensive audit trail for all operations
- **Data Retention**: Configurable data retention policies
- **Compliance Features**: Built-in support for regulatory requirements
- **Risk Assessment**: Continuous security posture evaluation

---

*Architecture documentation reflects live system analysis*
*Last Updated: May 30, 2025*