# Invela Business Logic Reference

**Core business workflows and calculation algorithms for the Enterprise Risk Assessment Platform**

## Risk Assessment Workflows

### Progressive Task Unlocking System

The platform implements a sophisticated progressive unlocking mechanism where completing certain assessments unlocks access to additional features and assessments.

#### KYB → KY3P Unlocking Logic
```typescript
// When KYB assessment reaches 100% completion:
// 1. Check all KYB responses are marked as 'complete'
// 2. Update company.available_tabs to include 'file-vault'
// 3. Create KY3P security assessment task
// 4. Broadcast WebSocket event for real-time UI updates

function unlockKY3PAssessment(companyId: number) {
  const kybProgress = calculateKYBProgress(companyId);
  
  if (kybProgress.percentage >= 1.0) {
    // Unlock file vault access
    updateCompanyTabs(companyId, [...currentTabs, 'file-vault']);
    
    // Create KY3P security task
    createTask({
      title: "KY3P Security Assessment",
      task_type: "ky3p", 
      company_id: companyId,
      priority: "high"
    });
    
    // Real-time notification
    broadcastTaskUpdate(companyId, 'ky3p_unlocked');
  }
}
```

#### File Vault Access Control
```typescript
// File vault becomes accessible when:
// 1. KYB assessment is 100% complete
// 2. Company.available_tabs includes 'file-vault'
// 3. User has valid session with company context

function checkFileVaultAccess(userId: number): boolean {
  const user = getUserWithCompany(userId);
  const company = user.company;
  
  return company.available_tabs.includes('file-vault') && 
         company.onboarding_company_completed === true;
}
```

### Risk Score Calculation Engine

#### Multi-Dimensional Risk Assessment
```typescript
interface RiskDimensions {
  cyberSecurity: number;    // 0-100
  financial: number;        // 0-100
  operational: number;      // 0-100
  compliance: number;       // 0-100
  thirdParty: number;       // 0-100
}

function calculateOverallRiskScore(dimensions: RiskDimensions): number {
  // Weighted average with cyber security having highest weight
  const weights = {
    cyberSecurity: 0.35,
    financial: 0.25,
    operational: 0.20,
    compliance: 0.15,
    thirdParty: 0.05
  };
  
  return Math.round(
    (dimensions.cyberSecurity * weights.cyberSecurity) +
    (dimensions.financial * weights.financial) +
    (dimensions.operational * weights.operational) +
    (dimensions.compliance * weights.compliance) +
    (dimensions.thirdParty * weights.thirdParty)
  );
}
```

#### AI-Powered Response Analysis
```typescript
// Open Banking responses include AI analysis
function analyzeOpenBankingResponse(response: string): AIAnalysis {
  return {
    suspicion_level: 0.0-1.0,  // AI confidence in response authenticity
    risk_score: 0-100,         // Calculated risk based on response content
    reasoning: "AI explanation of analysis"
  };
}

// Aggregated AI risk scoring
function calculateAIRiskScore(responses: OpenBankingResponse[]): number {
  const validResponses = responses.filter(r => r.ai_suspicion_level !== null);
  
  if (validResponses.length === 0) return 0;
  
  const avgSuspicion = validResponses.reduce((sum, r) => 
    sum + r.ai_suspicion_level, 0) / validResponses.length;
    
  // Convert suspicion level (0-1) to risk score (0-100)
  return Math.round(avgSuspicion * 100);
}
```

### Task Progress Calculation

#### KYB Progress Algorithm
```typescript
function calculateKYBProgress(taskId: number): TaskProgress {
  const fields = getKYBFields();
  const responses = getKYBResponses(taskId);
  
  const totalFields = fields.length;
  const completedFields = responses.filter(r => 
    r.status === 'complete' && 
    r.response_value !== null && 
    r.response_value.trim() !== ''
  ).length;
  
  return {
    total_fields: totalFields,
    completed_fields: completedFields,
    percentage: totalFields > 0 ? completedFields / totalFields : 0,
    status: completedFields === totalFields ? 'completed' : 'in_progress'
  };
}
```

#### Dynamic Field Validation
```typescript
function validateKYBResponse(fieldId: number, value: string): ValidationResult {
  const field = getKYBField(fieldId);
  
  // Required field validation
  if (field.required && (!value || value.trim() === '')) {
    return { valid: false, error: 'This field is required' };
  }
  
  // Type-specific validation
  switch (field.field_type) {
    case 'EMAIL':
      return validateEmail(value);
    case 'DATE':
      return validateDate(value);
    case 'NUMBER':
      return validateNumber(value, field.validation_rules);
    case 'TEXT':
      return validateText(value, field.validation_rules);
    default:
      return { valid: true };
  }
}
```

## Claims Management Business Logic

### Claim Lifecycle Management
```typescript
enum ClaimStatus {
  IN_REVIEW = 'in_review',
  PROCESSING = 'processing', 
  PENDING_INFO = 'pending_info',
  ESCALATED = 'escalated',
  APPROVED = 'approved',
  DENIED = 'denied'
}

function processClaimWorkflow(claimId: number, action: string): ClaimTransition {
  const claim = getClaim(claimId);
  
  switch (claim.status) {
    case ClaimStatus.IN_REVIEW:
      if (action === 'approve') {
        return transitionTo(ClaimStatus.APPROVED);
      } else if (action === 'request_info') {
        return transitionTo(ClaimStatus.PENDING_INFO);
      }
      break;
      
    case ClaimStatus.PENDING_INFO:
      if (action === 'info_received') {
        return transitionTo(ClaimStatus.PROCESSING);
      }
      break;
      
    // Additional state transitions...
  }
}
```

### Liability Calculation Logic
```typescript
function calculateLiability(claim: Claim, breachDetails: ClaimBreach): LiabilityAssessment {
  const factors = {
    dataType: getDataTypeSeverity(breachDetails.consent_scope),
    affectedRecords: breachDetails.affected_records,
    notificationDelay: calculateNotificationDelay(breachDetails),
    remediation: breachDetails.remediation_status
  };
  
  // Liability scoring algorithm
  let bankLiability = 0;
  let fintechLiability = 0;
  
  // Data type severity (PII = high liability)
  if (factors.dataType === 'PII') {
    fintechLiability += 40;
  }
  
  // Notification delay penalty
  if (factors.notificationDelay > 72) { // hours
    bankLiability += 30;
  }
  
  // Scale affected records impact
  const recordsMultiplier = Math.min(factors.affectedRecords / 1000, 5);
  fintechLiability += recordsMultiplier * 10;
  
  return {
    bank_liable: bankLiability > 50,
    fintech_liable: fintechLiability > 50,
    shared_liability: bankLiability > 30 && fintechLiability > 30,
    bank_percentage: bankLiability,
    fintech_percentage: fintechLiability
  };
}
```

## File Management Business Logic

### Document Classification System
```typescript
function classifyDocument(file: File): DocumentClassification {
  const analysis = analyzeFileContent(file);
  
  // Pattern matching for document types
  const patterns = {
    SOC2_AUDIT: /SOC\s*2|System and Organization Controls/i,
    ISO27001_CERT: /ISO\s*27001|Information Security Management/i,
    PENTEST_REPORT: /penetration test|pentest|security assessment/i,
    BUSINESS_CONTINUITY: /business continuity|disaster recovery|BCP/i
  };
  
  for (const [category, pattern] of Object.entries(patterns)) {
    if (pattern.test(analysis.text_content)) {
      return {
        category,
        confidence: calculateConfidence(analysis, pattern),
        extracted_metadata: extractMetadata(analysis, category)
      };
    }
  }
  
  return { category: 'OTHER', confidence: 0.1 };
}
```

### File Security and Access Control
```typescript
function validateFileAccess(userId: number, fileId: number): AccessResult {
  const user = getUser(userId);
  const file = getFile(fileId);
  
  // Company-scoped access control
  if (file.company_id !== user.company_id) {
    return { allowed: false, reason: 'Cross-company access denied' };
  }
  
  // File vault access requirement
  if (file.document_category === 'SENSITIVE') {
    const hasVaultAccess = checkFileVaultAccess(userId);
    if (!hasVaultAccess) {
      return { allowed: false, reason: 'File vault access required' };
    }
  }
  
  return { allowed: true };
}
```

## Authentication & Session Management

### Session-Based Authentication Flow
```typescript
function authenticateUser(email: string, password: string): AuthResult {
  const user = findUserByEmail(email);
  
  if (!user || !verifyPassword(password, user.password)) {
    return { success: false, error: 'Invalid credentials' };
  }
  
  // Create session with company context
  const session = createSession({
    userId: user.id,
    companyId: user.company_id,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  });
  
  return { 
    success: true, 
    user: sanitizeUser(user),
    sessionId: session.id
  };
}
```

### Company Context Enforcement
```typescript
function enforceCompanyContext(req: Request): CompanyContext {
  const session = getSessionFromRequest(req);
  const user = getUser(session.userId);
  const company = getCompany(user.company_id);
  
  // All data operations are automatically scoped to user's company
  return {
    userId: user.id,
    companyId: company.id,
    availableTabs: company.available_tabs,
    permissions: calculateUserPermissions(user, company)
  };
}
```

## Demo System Business Logic

### Demo Data Management
```typescript
function createDemoSession(personaType: DemoPersonaType): DemoSession {
  const session = {
    id: generateUUID(),
    persona_type: personaType,
    expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
    status: 'active'
  };
  
  // Create demo company and user based on persona
  const demoData = generateDemoData(personaType);
  
  return {
    session,
    company: demoData.company,
    user: demoData.user,
    tasks: demoData.tasks
  };
}
```

### Demo Data Cleanup Logic
```typescript
function cleanupExpiredDemoData(): CleanupResult {
  const expiredSessions = findExpiredDemoSessions();
  let deletedRecords = 0;
  
  for (const session of expiredSessions) {
    // Cascade delete demo entities
    const entities = findDemoEntitiesBySession(session.id);
    
    deletedRecords += deleteEntities('companies', entities.companies);
    deletedRecords += deleteEntities('users', entities.users);
    deletedRecords += deleteEntities('tasks', entities.tasks);
    deletedRecords += deleteEntities('files', entities.files);
    
    // Delete session last
    deleteDemoSession(session.id);
  }
  
  return { deletedRecords, expiredSessions: expiredSessions.length };
}
```

## Real-Time Updates & WebSocket Logic

### Event Broadcasting System
```typescript
function broadcastTaskUpdate(taskId: number, eventType: string): void {
  const task = getTask(taskId);
  const companyId = task.company_id;
  
  // Broadcast to all clients in the same company
  const message = {
    type: eventType,
    taskId,
    companyId,
    timestamp: new Date().toISOString(),
    data: {
      progress: task.progress,
      status: task.status
    }
  };
  
  WebSocketService.broadcastToCompany(companyId, message);
}
```

### Progressive Enhancement Updates
```typescript
function handleKYBCompletion(taskId: number): void {
  const task = getTask(taskId);
  const progress = calculateKYBProgress(taskId);
  
  if (progress.percentage >= 1.0) {
    // Unlock file vault
    unlockFileVault(task.company_id);
    
    // Create KY3P task
    const ky3pTask = createKY3PTask(task.company_id);
    
    // Broadcast multiple events
    broadcastTaskUpdate(taskId, 'kyb_completed');
    broadcastTaskUpdate(ky3pTask.id, 'ky3p_unlocked');
    broadcastCompanyUpdate(task.company_id, 'file_vault_unlocked');
  }
}
```

## Data Validation & Business Rules

### Cross-Assessment Validation
```typescript
function validateAssessmentConsistency(companyId: number): ValidationReport {
  const kybData = getKYBResponses(companyId);
  const ky3pData = getKY3PResponses(companyId);
  const openBankingData = getOpenBankingResponses(companyId);
  
  const inconsistencies = [];
  
  // Example: Company size consistency check
  const kybEmployees = kybData.find(r => r.field_key === 'num_employees')?.response_value;
  const ky3pSecurityTeam = ky3pData.find(r => r.field_key === 'security_team_size')?.response_value;
  
  if (kybEmployees && ky3pSecurityTeam) {
    const ratio = parseInt(ky3pSecurityTeam) / parseInt(kybEmployees);
    if (ratio > 0.5) { // Security team can't be more than 50% of company
      inconsistencies.push({
        type: 'logical_inconsistency',
        fields: ['num_employees', 'security_team_size'],
        message: 'Security team size appears disproportionate to company size'
      });
    }
  }
  
  return { valid: inconsistencies.length === 0, inconsistencies };
}
```

### Revenue Tier Classification
```typescript
function classifyRevenueTier(revenue: string): RevenueTier {
  const revenueNum = parseInt(revenue.replace(/[^0-9]/g, ''));
  
  if (revenueNum < 1000000) return 'micro';
  if (revenueNum < 10000000) return 'small';
  if (revenueNum < 100000000) return 'medium';
  if (revenueNum < 1000000000) return 'large';
  return 'enterprise';
}
```

## Performance & Caching Logic

### Company Data Caching
```typescript
const COMPANY_CACHE_TTL = 60000; // 1 minute
const companyCache = new Map<number, CachedCompany>();

function getCachedCompany(companyId: number): Company | null {
  const cached = companyCache.get(companyId);
  
  if (cached && (Date.now() - cached.timestamp) < COMPANY_CACHE_TTL) {
    return cached.company;
  }
  
  // Cache miss - fetch from database
  const company = fetchCompanyFromDB(companyId);
  companyCache.set(companyId, {
    company,
    timestamp: Date.now()
  });
  
  return company;
}

function invalidateCompanyCache(companyId: number): void {
  companyCache.delete(companyId);
  
  // Broadcast cache invalidation to other instances
  broadcastCacheInvalidation('company', companyId);
}
```

---

## Business Constants & Configurations

### Assessment Field Limits
```typescript
const ASSESSMENT_LIMITS = {
  KYB_FIELDS: 30,           // Maximum KYB fields
  KY3P_FIELDS: 50,          // Maximum KY3P fields  
  OPEN_BANKING_FIELDS: 44,  // Maximum Open Banking fields
  MAX_FILE_SIZE: 10485760,  // 10MB file upload limit
  SESSION_TIMEOUT: 86400000 // 24 hour session timeout
};
```

### Risk Score Thresholds
```typescript
const RISK_THRESHOLDS = {
  LOW: 0-30,      // Green status
  MEDIUM: 31-60,  // Yellow status  
  HIGH: 61-85,    // Orange status
  CRITICAL: 86-100 // Red status
};
```

### Demo Configuration
```typescript
const DEMO_CONFIG = {
  EXPIRATION_HOURS: 72,
  MAX_DEMO_COMPANIES: 100,
  CLEANUP_INTERVAL_HOURS: 6,
  AUTO_FILL_DELAY_MS: 500
};
```

---

**Last Updated**: June 4, 2025  
**Version**: 1.0.0  
**Coverage**: Core business logic workflows and calculation algorithms