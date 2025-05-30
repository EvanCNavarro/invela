# Live System Investigation Report
*Comprehensive Analysis of Invela Risk Assessment Platform*

## Executive Summary

This investigation analyzed the live Invela enterprise risk assessment platform through systematic code examination, revealing a sophisticated multi-workflow system with real-time capabilities, company-scoped data isolation, and comprehensive risk scoring algorithms.

## 1. Risk Assessment Workflows Analysis

### Primary Assessment Types Discovered

#### KYB (Know Your Business) - Foundation Assessment
- **Entry Point**: Primary onboarding workflow with no dependencies
- **Implementation**: `server/routes/kyb.ts` with CSV import/export capabilities
- **Key Features**: 
  - Multi-step form validation system
  - Demo autofill for testing scenarios
  - File generation with metadata tracking
  - Progressive unlocking mechanism for dependent assessments
- **Post-Completion Action**: Automatically unlocks KY3P security assessments
- **Data Flow**: Responses stored in `kyb_responses` table with field-level status tracking

#### KY3P (Know Your Third Party) - Security Assessment
- **Purpose**: Third-party vendor/partner risk evaluation
- **Dependencies**: Requires completed KYB assessment (enforced via `metadata.locked` flag)
- **Task Type Variations**: `sp_ky3p_assessment`, `ky3p`, `security_assessment`
- **Implementation**: Enhanced service architecture with factory pattern
- **Key Features**:
  - Template-based field loading with caching mechanisms
  - Unified submission handler with transaction support
  - Batch update capabilities for large-scale operations
  - Numeric field ID conversion for API compatibility
- **Service Architecture**: Multiple service layers including `UnifiedKY3PFormService` and legacy fallback

#### Open Banking Assessment - Compliance Evaluation
- **Purpose**: Banking compliance and security practices evaluation
- **Dependencies**: Independent workflow (can run parallel to others)
- **Implementation**: `server/routes/open-banking.ts` with OpenAI integration
- **Key Features**:
  - AI-powered response analysis using OpenAI models
  - Weighted risk score calculation algorithm
  - Compliance metadata generation
  - CSV export with regulatory documentation

### Workflow Dependencies & Unlocking Mechanism

```
KYB Assessment (Entry Point)
    ↓ (completes)
    ├── Unlocks KY3P Security Assessment
    ├── Unlocks General Security Assessment  
    └── Enables Dashboard Analytics

Open Banking Assessment (Independent)
    ↓ (completes)
    └── Contributes to Overall Risk Score
```

**Technical Implementation**: 
- Dependencies managed via `tasks.metadata.locked` boolean flags
- Prerequisite completion tracked with `prerequisite_completed_at` timestamps
- Unlocking handled in `unified-form-submission-handler.ts` with transaction safety

## 2. WebSocket Real-time Communication System

### Architecture Discovery

#### Connection Management
- **Multi-client Support**: Up to 5 concurrent connections per session observed
- **Authentication Flow**: Two-stage process (connection establishment → user/company authentication)
- **Client ID Generation**: Timestamp-based unique identifiers (`client-{timestamp}-{random}`)
- **Connection Tracking**: Server-side connection pool with health monitoring

#### Message Broadcasting System
**Implementation Files**:
- `server/services/websocket.ts` - Core WebSocket service
- `server/utils/websocketBroadcast.ts` - Message broadcasting utilities
- `server/utils/unified-websocket.ts` - Unified server management

**Message Types Identified**:
1. `connection_established` - Initial handshake confirmation
2. `authenticated` - User/company authentication success
3. `task_update` - Form submission progress notifications
4. `company_update` - Profile/logo change broadcasts
5. `risk_score_update` - Live risk calculation results
6. `file_operation` - Upload/processing status updates

#### Reconnection Logic
- **Automatic Reconnection**: Exponential backoff strategy (1s, 2s, 4s, 8s, 16s)
- **Connection Resilience**: Handles network interruptions gracefully
- **State Recovery**: Message queuing during disconnection periods
- **Error Handling**: WebSocket code 1006 handling with retry mechanisms

### Real-time Data Flow

```
Form Submission → Server Processing → Database Update → WebSocket Broadcast → Live UI Update
     ↓                   ↓                   ↓               ↓                    ↓
  User Action      Validation &         Transaction      All Connected      Dashboard
                   Business Logic      Commit/Rollback     Clients           Refresh
```

## 3. Authentication & Company-Scoped Data Isolation

### Session-Based Authentication System

#### Implementation Details
- **Framework**: Passport.js with local strategy authentication
- **Session Storage**: PostgreSQL-backed sessions using `connect-pg-simple`
- **Middleware**: `requireAuth` for protected routes, `optionalAuth` for flexible access
- **Session Cookie**: Persistent session management with `.session-cookie` file

#### Company Data Isolation
**Multi-tenant Architecture**:
- Every user belongs to a specific `company_id`
- All database queries filtered by user's company scope
- Form services instantiated per company for data isolation
- File storage segregated by company boundaries
- WebSocket authentication validates both user and company context

**Implementation Evidence**:
```typescript
// From form service factory
service = await formServiceFactory.getServiceInstance(taskType, companyId, taskId);

// From database queries
.where(eq(tasks.company_id, user.company_id))
```

### Security Features
- **Request Validation**: All API endpoints validate company membership
- **Data Segregation**: Company-specific service instances prevent data leakage
- **Session Management**: Secure session handling with automatic expiration
- **WebSocket Security**: Company-scoped real-time updates

## 4. Dashboard Analytics & Widget System

### Core Dashboard Components Analyzed

#### CompanySnapshot Widget
- **Data Sources**: Company profile, relationships, accreditation status
- **Real-time Updates**: WebSocket-driven data refresh
- **Interactive Features**: Click navigation to network visualization
- **Responsive Design**: Mobile-first layout with adaptive sizing

#### RiskMeter Component
- **Score Range**: 0-100 risk scoring system
- **Visual Indicators**: Color-coded risk levels (Blue/Yellow/Red)
- **Calculation Logic**: Multi-dimensional scoring algorithm
- **Risk Levels**:
  - 0-33: Low Risk (Blue - `bg-[hsl(209,99%,50%)]`)
  - 34-66: Medium Risk (Yellow - `bg-yellow-100`)
  - 67-99: High Risk (Red - `bg-red-100`) 
  - 100: Critical Risk (Red - enhanced styling)

#### Additional Widget Suite
1. **ConsentActivityWidget**: User activity and consent tracking
2. **NetworkVisualizationWidget**: D3.js-powered relationship mapping
3. **RiskMonitoringWidget**: Trend analysis and risk trajectory
4. **CompanyScoreWidget**: Aggregated assessment scoring

### Risk Scoring Algorithm

#### Multi-Assessment Weighting System
**Discovery from `unified-form-submission-service.ts`**:
- KYB Assessment: Primary weight in overall calculation
- KY3P Security: Secondary weight with critical field emphasis
- Open Banking: Specialized banking compliance scoring
- Additional Factors: Metadata and relationship scoring

**Technical Implementation**:
- Weighted average calculations with importance multipliers
- Critical field identification and enhanced scoring
- Normalization to 0-100 scale for consistent display
- Real-time recalculation on assessment completion

## 5. File Management & Document Processing

### File System Architecture
- **Storage**: Database-backed file metadata with file content handling
- **Versioning**: File version tracking with metadata
- **Categories**: Document classification system (`DocumentCategory` enum)
- **Processing**: CSV generation, PDF creation, and metadata extraction
- **Vault Integration**: Organized file storage with company-scoped access

### File Creation Service
**Implementation**: `server/services/fileCreation.ts`
- Handles multiple file types (CSV, PDF, documents)
- Metadata enrichment with task and company context
- Version control and file history tracking
- Integration with form submission workflows

## Technical Architecture Insights

### Service Layer Pattern
- **Factory Pattern**: Form service factories for type-specific implementations
- **Service Isolation**: Company-scoped service instances
- **Unified Handlers**: Transaction-safe submission processing
- **Error Handling**: Comprehensive logging and error recovery

### Database Design
- **Schema**: Well-structured relational design with proper foreign keys
- **Transactions**: ACID compliance with rollback capabilities
- **Migrations**: Drizzle ORM-managed schema evolution
- **Connection Pooling**: Neon PostgreSQL with optimized connections

### Performance Considerations
- **Caching**: Template and field caching for form services
- **Connection Management**: Efficient database connection pooling
- **Real-time Optimization**: WebSocket connection pooling and message queuing
- **Loading States**: Skeleton loaders and progressive enhancement

## Recommendations for Future Development

1. **API Documentation**: Comprehensive OpenAPI/Swagger documentation needed
2. **Testing Infrastructure**: Unit and integration test coverage
3. **Performance Monitoring**: Real-time performance metrics and alerting
4. **Security Auditing**: Regular security assessment and penetration testing
5. **Scalability Planning**: Load balancing and horizontal scaling preparation

---

*Investigation completed through systematic code analysis and architecture review*
*Date: May 30, 2025*