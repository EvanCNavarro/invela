# Missing Tables from DATABASE_SCHEMA.md

**These tables were identified but not included in the main documentation**

## Claims Management System

### `claims` - Insurance Claims Management
**Purpose**: Track insurance claims for data breaches and incidents

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique claim identifier | 1, 2, 3... |
| `claim_id` | text | NOT NULL, UNIQUE | Formatted claim ID | "CLM-2025-001", "CLM-2025-002" |
| `bank_id` | text | NOT NULL | Bank identifier | "BANK001", "JPM_NYC" |
| `bank_name` | text | NOT NULL | Bank name | "JPMorgan Chase", "Bank of America" |
| `fintech_name` | text | NOT NULL | FinTech company name | "PayFlow Inc", "DataTech Solutions" |
| `account_number` | text | nullable | Account reference | "ACC123456789" |
| `claim_type` | text | NOT NULL, default: 'PII Data Loss' | Type of claim | "PII Data Loss", "Unauthorized Access" |
| `claim_date` | timestamp | NOT NULL | When claim occurred | 2025-01-15T10:30:00Z |
| `claim_amount` | real | NOT NULL, default: 50.00 | Claim amount in USD | 50.00, 25000.00, 100000.00 |
| `status` | text | NOT NULL, default: 'in_review' | Current claim status | "in_review", "approved", "denied" |
| `policy_number` | text | nullable | Insurance policy number | "POL-2025-ABC123" |
| `is_disputed` | boolean | NOT NULL, default: false | Dispute flag | true, false |
| `is_resolved` | boolean | NOT NULL, default: false | Resolution flag | true, false |
| `company_id` | integer | NOT NULL, FK to companies | Associated company | 1, 2, 3 |
| `created_by` | integer | FK to users | Claim creator | 1, 2, 3 |
| `created_at` | timestamp | default: now() | Claim creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

### `claim_breaches` - Breach Details for Claims
**Purpose**: Detailed breach information for insurance claims

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique breach record | 1, 2, 3... |
| `claim_id` | integer | NOT NULL, FK to claims | Associated claim | 1, 2, 3 |
| `breach_date` | timestamp | NOT NULL | When breach occurred | 2025-01-15T10:30:00Z |
| `breach_discovered_date` | timestamp | nullable | When breach was discovered | 2025-01-16T09:15:00Z |
| `breach_reported_date` | timestamp | nullable | When breach was reported | 2025-01-16T14:30:00Z |
| `consent_id` | text | nullable | Consent identifier | "CONSENT_123456" |
| `consent_scope` | text | nullable | Scope of consent | "account_info", "transaction_history" |
| `affected_records` | integer | nullable | Number of affected records | 500, 10000, 50000 |
| `remediation_status` | text | nullable | Remediation progress | "in_progress", "completed", "pending" |
| `incident_description` | text | nullable | Detailed incident description | "Unauthorized API access detected..." |
| `created_at` | timestamp | default: now() | Record creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

### `claim_disputes` - Claim Dispute Management
**Purpose**: Track disputes and liability decisions for claims

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique dispute record | 1, 2, 3... |
| `claim_id` | integer | NOT NULL, FK to claims | Associated claim | 1, 2, 3 |
| `dispute_reason` | text | nullable | Reason for dispute | "liability_dispute", "policy_exclusion" |
| `dispute_details` | text | nullable | Detailed dispute explanation | "Bank disputes liability due to..." |
| `dispute_date` | timestamp | NOT NULL | When dispute was filed | 2025-01-20T10:30:00Z |
| `resolution_decision` | text | nullable | Final resolution decision | "bank_liable", "shared_liability" |
| `bank_liable` | boolean | nullable | Bank liability determination | true, false |
| `fintech_liable` | boolean | nullable | FinTech liability determination | true, false |
| `shared_liability` | boolean | nullable | Shared liability determination | true, false |
| `resolution_notes` | text | nullable | Resolution explanation | "Investigation shows negligent..." |
| `created_at` | timestamp | default: now() | Record creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

### `claim_resolutions` - Claim Resolution Details
**Purpose**: Track final resolution and payment details for claims

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique resolution record | 1, 2, 3... |
| `claim_id` | integer | NOT NULL, FK to claims | Associated claim | 1, 2, 3 |
| `resolution_type` | text | nullable | Type of resolution | "full_payment", "partial_payment", "claim_withdrawn" |
| `resolution_date` | timestamp | NOT NULL | When resolved | 2025-01-25T10:30:00Z |
| `payment_amount` | real | nullable | Final payment amount | 50.00, 12500.00, 0.00 |
| `resolution_notes` | text | nullable | Resolution details | "Full payment approved after investigation" |
| `created_at` | timestamp | default: now() | Record creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

## CARD Assessment System

### `card_fields` - CARD Assessment Fields
**Purpose**: Define fields for CARD (Compliance Assessment Risk Documentation) forms

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique field identifier | 1, 2, 3... |
| `field_key` | text | NOT NULL, UNIQUE | Unique field key | "data_classification", "access_controls" |
| `wizard_section` | text | NOT NULL | Form wizard section | "data_management", "security_controls" |
| `question_label` | text | NOT NULL | Short question label | "Data Classification" |
| `question` | text | NOT NULL | Full question text | "How do you classify sensitive data?" |
| `example_response` | text | nullable | Example answer | "We use 4-tier classification system..." |
| `ai_search_instructions` | text | nullable | AI analysis instructions | "Look for data classification policies" |
| `partial_risk_score_max` | integer | NOT NULL | Maximum risk score for field | 10, 25, 50 |
| `step_index` | integer | NOT NULL, default: 0 | Form step number | 0, 1, 2, 3 |
| `created_at` | timestamp | default: now() | Field creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

### `card_responses` - CARD Assessment Responses
**Purpose**: Store responses to CARD assessment questions with AI analysis

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique response identifier | 1, 2, 3... |
| `task_id` | integer | NOT NULL, FK to tasks | Associated task | 1, 2, 3 |
| `field_id` | integer | NOT NULL, FK to card_fields | Field reference | 1, 2, 3 |
| `response_value` | text | nullable | User response | "We classify data into 4 tiers..." |
| `ai_suspicion_level` | real | NOT NULL, default: 0 | AI suspicion score (0-1) | 0.0, 0.3, 0.8 |
| `ai_reasoning` | text | nullable | AI analysis reasoning | "Response indicates robust controls..." |
| `partial_risk_score` | integer | NOT NULL, default: 0 | Calculated risk score | 0, 15, 35 |
| `status` | text | NOT NULL, default: 'empty' | Response status | "empty", "complete", "invalid" |
| `version` | integer | NOT NULL, default: 1 | Response version | 1, 2, 3 |
| `created_at` | timestamp | default: now() | Response creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

### `document_answers` - Document-Based Answers
**Purpose**: Link document content to assessment responses

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique document answer | 1, 2, 3... |
| `file_id` | integer | NOT NULL, FK to files | Source document | 1, 2, 3 |
| `response_id` | integer | NOT NULL, FK to card_responses | Associated response | 1, 2, 3 |
| `confidence_score` | real | NOT NULL, default: 0 | AI confidence (0-1) | 0.0, 0.75, 0.95 |
| `extracted_text` | text | NOT NULL | Extracted document text | "Section 4.2: Data Classification..." |
| `page_number` | integer | nullable | Source page number | 1, 15, 23 |
| `created_at` | timestamp | default: now() | Extraction time | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

## Template and Configuration System

### `task_templates` - Task Template Configurations
**Purpose**: Define reusable task templates and configurations

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique template identifier | 1, 2, 3... |
| `name` | varchar(255) | NOT NULL | Template name | "KYB Assessment", "Security Review" |
| `description` | text | nullable | Template description | "Standard KYB assessment template" |
| `task_type` | varchar(100) | NOT NULL, UNIQUE | Associated task type | "company_kyb", "security_assessment" |
| `component_type` | varchar(100) | NOT NULL, default: 'form' | UI component type | "form", "wizard", "survey" |
| `status` | varchar(50) | NOT NULL, default: 'active' | Template status | "active", "inactive", "draft" |
| `created_at` | timestamp | default: now() | Template creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

### `component_configurations` - Component Configuration Settings
**Purpose**: Store configuration settings for UI components and templates

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique config identifier | 1, 2, 3... |
| `template_id` | integer | NOT NULL, FK to task_templates | Associated template | 1, 2, 3 |
| `config_key` | varchar(100) | NOT NULL | Configuration key | "max_file_size", "allowed_formats" |
| `config_value` | jsonb | NOT NULL | Configuration value | `{"size": 10485760}`, `["pdf", "docx"]` |
| `scope` | varchar(50) | default: 'global' | Configuration scope | "global", "company", "user" |
| `created_at` | timestamp | default: now() | Config creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

## Additional Enums & Constants

### Claim Status Values
```typescript
ClaimStatus = {
  IN_REVIEW: 'in_review',
  PROCESSING: 'processing',
  PENDING_INFO: 'pending_info',
  UNDER_REVIEW: 'under_review',
  ESCALATED: 'escalated',
  APPROVED: 'approved',
  PARTIALLY_APPROVED: 'partially_approved',
  DENIED: 'denied'
}
```

### Dispute Reason Types
```typescript
DisputeReasonType = {
  LIABILITY_DISPUTE: 'liability_dispute',
  DATA_OWNERSHIP_DISPUTE: 'data_ownership_dispute',
  BREACH_NOTIFICATION_TIMING: 'breach_notification_timing',
  POLICY_EXCLUSION: 'policy_exclusion',
  CONTRACT_VIOLATION: 'contract_violation'
}
```

### Resolution Types
```typescript
ResolutionType = {
  FULL_PAYMENT: 'full_payment',
  PARTIAL_PAYMENT: 'partial_payment',
  POLICY_EXCLUSION: 'policy_exclusion',
  CLAIM_WITHDRAWN: 'claim_withdrawn'
}
```

## Relationships Summary

### Additional Foreign Key Relationships
- **claims** ← **claim_breaches** (claim_id)
- **claims** ← **claim_disputes** (claim_id)  
- **claims** ← **claim_resolutions** (claim_id)
- **card_fields** ← **card_responses** (field_id)
- **files** ← **document_answers** (file_id)
- **card_responses** ← **document_answers** (response_id)
- **task_templates** ← **component_configurations** (template_id)

## Integration Notes

**Total Missing Tables**: 9
- 4 Claims management tables
- 3 CARD assessment tables  
- 2 Template/configuration tables

**These tables should be integrated into the main DATABASE_SCHEMA.md file for complete documentation coverage.**

---
*Generated: June 4, 2025*