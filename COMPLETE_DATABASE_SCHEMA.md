# Invela Complete Database Schema Documentation

**Enterprise Risk Assessment Platform - Complete Database Reference**

Based on database analysis of 32 tables as of June 2025

## Table Overview

**Total Tables**: 32  
**Database Type**: PostgreSQL  
**ORM**: Drizzle ORM  
**Primary Categories**: Core Entities, Assessments, Claims, Files, Authentication, Analytics, Demo System

### Table List by Category

**Core Business Tables (7)**:
- `companies` - Main company entities
- `users` - Platform users  
- `tasks` - Assessment tasks
- `company_logos` - Company logo files
- `accreditation_history` - Company accreditation tracking
- `relationships` - Business relationships
- `session` - User sessions

**Assessment Tables (12)**:
- `kyb_fields` - KYB form field definitions
- `kyb_responses` - KYB form responses
- `kyb_fields_backup` - KYB field backups
- `kyb_responses_backup` - KYB response backups
- `ky3p_fields` - KY3P security assessment fields
- `ky3p_responses` - KY3P security responses
- `open_banking_fields` - Open Banking field definitions
- `open_banking_responses` - Open Banking responses
- `open_banking_field_timestamps` - Field modification tracking
- `security_fields` - Security assessment fields
- `security_responses` - Security assessment responses
- `kyb_field_timestamps` - KYB field modification tracking

**Claims Management (4)**:
- `claims` - Insurance claims
- `claim_breaches` - Breach details
- `claim_disputes` - Dispute management
- `claim_resolutions` - Resolution tracking

**File Management (1)**:
- `files` - Document storage and metadata

**Authentication & Security (3)**:
- `invitations` - User invitations
- `password_reset_tokens` - Password reset security
- `refresh_tokens` - Session refresh tokens

**Analytics & Tracking (2)**:
- `openai_search_analytics` - AI search usage
- `user_tab_tutorials` - Tutorial progress

**Configuration & Templates (2)**:
- `task_templates` - Task configurations
- `component_configurations` - UI component settings

**Demo System (1)**:
- `demo_sessions` - Demo session management

---

## Core Business Tables

### `companies` - Main Company Entity
**Purpose**: Primary company information and comprehensive risk assessment data

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique company identifier | 1, 2, 3 |
| `name` | text | NOT NULL | Company legal name | "TechCorp Inc", "DataFlow Systems" |
| `description` | text | nullable | Company description | "Leading fintech platform" |
| `category` | text | NOT NULL | Business category | "fintech", "bank", "insurance" |
| `logo_id` | uuid | FK to company_logos | Company logo reference | uuid |
| `stock_ticker` | text | nullable | Stock exchange ticker | "AAPL", "GOOGL", "MSFT" |
| `website_url` | text | nullable | Company website | "https://techcorp.com" |
| `legal_structure` | text | nullable | Legal entity type | "Corporation", "LLC", "Partnership" |
| `market_position` | text | nullable | Market position | "Leader", "Challenger", "Niche" |
| `hq_address` | text | nullable | Headquarters address | "123 Main St, New York, NY 10001" |
| `products_services` | text | nullable | Products/services offered | "API platform, data analytics, payments" |
| `incorporation_year` | integer | nullable | Year incorporated | 2015, 2020, 1995 |
| `founders_and_leadership` | text | nullable | Key leadership info | "John Doe (CEO), Jane Smith (CTO)" |
| `num_employees` | integer | nullable | Employee count | 50, 500, 5000 |
| `revenue` | text | nullable | Annual revenue | "10000000", "50000000" |
| `revenue_tier` | text | nullable | Revenue classification | "small", "medium", "large" |
| `key_clients_partners` | text | nullable | Major clients/partners | "Bank of America, JPMorgan Chase" |
| `investors` | text | nullable | Investment information | "Series A led by Acme VC" |
| `funding_stage` | text | nullable | Current funding stage | "Seed", "Series A", "Series B", "IPO" |
| `exit_strategy_history` | text | nullable | Exit history | "IPO 2020", "Acquired by XYZ Corp" |
| `certifications_compliance` | text | nullable | Compliance certifications | "SOC2, ISO27001, PCI DSS" |
| `risk_score` | integer | nullable | Calculated risk score (0-100) | 25, 67, 89 |
| `chosen_score` | integer | nullable | User-selected risk score | 30, 70, 90 |
| `risk_clusters` | jsonb | nullable | Risk dimension breakdown | `{"Cyber Security": 75, "Financial": 45}` |
| `risk_configuration` | jsonb | nullable | Risk assessment config | Complex JSON object |
| `risk_priorities` | jsonb | nullable | Risk priority settings | Complex JSON object |
| `accreditation_status` | text | nullable | Current accreditation | "pending", "approved", "expired" |
| `onboarding_company_completed` | boolean | NOT NULL, default: true | Onboarding completion | true, false |
| `registry_date` | timestamp | NOT NULL, default: now() | Registration timestamp | 2025-01-15T10:30:00Z |
| `files_public` | jsonb | default: [] | Public file references | `["file1.pdf", "doc2.xlsx"]` |
| `files_private` | jsonb | default: [] | Private file references | `["sensitive.pdf"]` |
| `available_tabs` | text[] | NOT NULL, default: ['task-center'] | Accessible platform tabs | `["dashboard", "forms", "files"]` |
| `is_demo` | boolean | default: false | Demo company flag | true, false |
| `demo_created_at` | timestamp | nullable | Demo creation time | 2025-01-15T10:30:00Z |
| `demo_expires_at` | timestamp | nullable | Demo expiration time | 2025-01-18T10:30:00Z |
| `demo_cleanup_eligible` | boolean | default: true | Eligible for cleanup | true, false |
| `demo_session_id` | text | nullable | Demo session identifier | "demo_123456" |
| `demo_persona_type` | text | nullable | Demo persona type | "data-provider", "data-recipient" |
| `current_accreditation_id` | integer | FK to accreditation_history | Current accreditation ref | 1, 2, 3 |
| `first_accredited_date` | timestamp | nullable | First accreditation date | 2025-01-15T10:30:00Z |
| `accreditation_count` | integer | default: 0 | Number of accreditations | 0, 1, 2 |
| `created_at` | timestamp | default: now() | Record creation time | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update time | 2025-01-15T10:30:00Z |

### `users` - Platform Users
**Purpose**: User authentication and profile information

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique user identifier | 1, 2, 3 |
| `email` | text | NOT NULL, UNIQUE | User email address | "john.doe@techcorp.com" |
| `full_name` | text | NOT NULL | Complete user name | "John Doe" |
| `first_name` | text | nullable | First name | "John" |
| `last_name` | text | nullable | Last name | "Doe" |
| `password` | text | NOT NULL | Hashed password | bcrypt hash string |
| `company_id` | integer | NOT NULL, FK to companies | Associated company | 1, 2, 3 |
| `onboarding_user_completed` | boolean | NOT NULL, default: false | User onboarding status | true, false |
| `is_demo_user` | boolean | default: false | Demo user flag | true, false |
| `demo_session_id` | text | nullable | Demo session reference | "demo_123456" |
| `demo_created_at` | timestamp | nullable | Demo user creation | 2025-01-15T10:30:00Z |
| `demo_persona_type` | text | nullable | Demo persona type | "new-data-recipient" |
| `demo_expires_at` | timestamp | nullable | Demo expiration | 2025-01-18T10:30:00Z |
| `demo_cleanup_eligible` | boolean | default: true | Demo cleanup eligible | true, false |
| `demo_last_login` | timestamp | nullable | Last demo login | 2025-01-16T14:20:00Z |
| `created_at` | timestamp | default: now() | Account creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last profile update | 2025-01-15T10:30:00Z |

### `tasks` - Assessment Tasks
**Purpose**: Task management for various assessment types

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique task identifier | 1, 2, 3 |
| `title` | text | NOT NULL | Task title | "KYB Assessment", "Security Review" |
| `description` | text | nullable | Task description | "Complete business verification" |
| `task_type` | text | NOT NULL | Type of assessment | "company_kyb", "ky3p", "open_banking" |
| `task_scope` | text | NOT NULL | Task scope | "full", "partial", "update" |
| `status` | text | NOT NULL, default: 'pending' | Current task status | "pending", "completed", "in_progress" |
| `priority` | text | NOT NULL, default: 'medium' | Task priority level | "low", "medium", "high", "urgent" |
| `progress` | real | NOT NULL, default: 0 | Completion percentage | 0.0, 0.5, 1.0 |
| `assigned_to` | integer | FK to users | Assigned user | 1, 2, 3 |
| `created_by` | integer | FK to users | Task creator | 1, 2, 3 |
| `company_id` | integer | FK to companies | Associated company | 1, 2, 3 |
| `user_email` | text | nullable | Assignee email | "user@company.com" |
| `due_date` | timestamp | nullable | Task deadline | 2025-01-20T17:00:00Z |
| `completion_date` | timestamp | nullable | Actual completion | 2025-01-18T15:30:00Z |
| `files_requested` | jsonb | default: [] | Required file types | `["SOC2", "financial_statements"]` |
| `files_uploaded` | jsonb | default: [] | Uploaded file references | `["doc1.pdf", "report.xlsx"]` |
| `metadata` | jsonb | default: {} | Additional task data | `{"locked": false, "auto_unlock": true}` |
| `created_at` | timestamp | default: now() | Task creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last task update | 2025-01-15T10:30:00Z |

### `company_logos` - Company Logo Files
**Purpose**: Store company logo files separately from main files table

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | uuid | PRIMARY KEY, default: random | Unique logo identifier | uuid |
| `company_id` | integer | NOT NULL, FK to companies | Associated company | 1, 2, 3 |
| `file_name` | text | NOT NULL | Logo filename | "logo.png", "company_logo.svg" |
| `file_path` | text | NOT NULL | Storage path | "/logos/company1/logo.png" |
| `file_type` | text | NOT NULL | Image file type | "image/png", "image/svg+xml" |
| `uploaded_at` | timestamp | default: now() | Upload timestamp | 2025-01-15T10:30:00Z |

### `accreditation_history` - Company Accreditation Tracking
**Purpose**: Track historical accreditation status and changes

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique history record | 1, 2, 3 |
| `company_id` | integer | NOT NULL, FK to companies | Associated company | 1, 2, 3 |
| `status` | text | NOT NULL | Accreditation status | "pending", "approved", "rejected", "expired" |
| `accredited_date` | timestamp | nullable | Date accreditation granted | 2025-01-15T10:30:00Z |
| `expiry_date` | timestamp | nullable | Accreditation expiry | 2025-01-15T10:30:00Z |
| `notes` | text | nullable | Additional notes | "Initial accreditation approved" |
| `created_at` | timestamp | default: now() | Record creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

### `relationships` - Business Relationships
**Purpose**: Track relationships between companies

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique relationship identifier | 1, 2, 3 |
| `company_a_id` | integer | NOT NULL, FK to companies | First company | 1, 2, 3 |
| `company_b_id` | integer | NOT NULL, FK to companies | Second company | 1, 2, 3 |
| `relationship_type` | text | NOT NULL | Type of relationship | "partner", "client", "vendor" |
| `status` | text | NOT NULL, default: 'active' | Relationship status | "active", "inactive", "pending" |
| `notes` | text | nullable | Relationship details | "Strategic partnership since 2020" |
| `created_at` | timestamp | default: now() | Relationship creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

### `session` - User Sessions
**Purpose**: Track user authentication sessions

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `sid` | varchar | PRIMARY KEY | Session identifier | "abc123def456" |
| `sess` | jsonb | NOT NULL | Session data | JSON session object |
| `expire` | timestamp | NOT NULL | Session expiration | 2025-01-15T18:30:00Z |

---

## Assessment Tables

### `kyb_fields` - KYB Form Field Definitions
**Purpose**: Define fields for Know Your Business assessments

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique field identifier | 1, 2, 3 |
| `field_key` | text | NOT NULL | Unique field identifier | "company_name", "incorporation_date" |
| `display_name` | text | NOT NULL | Human-readable field name | "Company Name", "Date of Incorporation" |
| `field_type` | text | NOT NULL | Input field type | "TEXT", "DATE", "SELECT", "BOOLEAN" |
| `question` | text | NOT NULL | Field question/prompt | "What is your company's legal name?" |
| `group` | text | NOT NULL | Field grouping | "basic_info", "financial", "legal" |
| `required` | boolean | NOT NULL, default: true | Required field flag | true, false |
| `order` | integer | NOT NULL | Display order | 1, 2, 3 |
| `step_index` | integer | NOT NULL, default: 0 | Form step number | 0, 1, 2, 3 |
| `validation_rules` | jsonb | nullable | Field validation rules | `{"minLength": 2, "pattern": "^[A-Z]"}` |
| `help_text` | text | nullable | Field help text | "Enter full legal name as registered" |
| `demo_autofill` | text | nullable | Demo auto-fill value | "TechCorp Industries Inc." |
| `created_at` | timestamp | default: now() | Field creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last field update | 2025-01-15T10:30:00Z |

### `kyb_responses` - KYB Form Responses
**Purpose**: Store user responses to KYB assessment fields

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique response identifier | 1, 2, 3 |
| `task_id` | integer | NOT NULL, FK to tasks | Associated task | 1, 2, 3 |
| `field_id` | integer | NOT NULL, FK to kyb_fields | Field being answered | 1, 2, 3 |
| `response_value` | text | nullable | User's response | "TechCorp Inc", "2015-03-15" |
| `status` | text | NOT NULL, default: 'empty' | Response status | "empty", "complete", "invalid" |
| `version` | integer | NOT NULL, default: 1 | Response version | 1, 2, 3 |
| `created_at` | timestamp | default: now() | Response creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last response update | 2025-01-15T10:30:00Z |

### `kyb_fields_backup` - KYB Field Backup Storage
**Purpose**: Backup storage for KYB field definitions

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique backup identifier | 1, 2, 3 |
| `original_field_id` | integer | NOT NULL | Original field reference | 1, 2, 3 |
| `field_key` | text | NOT NULL | Backed up field key | "company_name" |
| `display_name` | text | NOT NULL | Backed up display name | "Company Name" |
| `field_type` | text | NOT NULL | Backed up field type | "TEXT" |
| `question` | text | NOT NULL | Backed up question | "What is your company's legal name?" |
| `group` | text | NOT NULL | Backed up group | "basic_info" |
| `required` | boolean | NOT NULL | Backed up required flag | true, false |
| `order` | integer | NOT NULL | Backed up order | 1, 2, 3 |
| `step_index` | integer | NOT NULL | Backed up step index | 0, 1, 2 |
| `validation_rules` | jsonb | nullable | Backed up validation rules | `{"minLength": 2}` |
| `help_text` | text | nullable | Backed up help text | "Enter full legal name" |
| `demo_autofill` | text | nullable | Backed up demo value | "TechCorp Industries Inc." |
| `backup_date` | timestamp | default: now() | When backup was created | 2025-01-15T10:30:00Z |
| `backup_reason` | text | nullable | Reason for backup | "schema_migration", "data_recovery" |

### `kyb_responses_backup` - KYB Response Backup Storage
**Purpose**: Backup storage for KYB responses

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique backup identifier | 1, 2, 3 |
| `original_response_id` | integer | NOT NULL | Original response reference | 1, 2, 3 |
| `task_id` | integer | NOT NULL | Backed up task ID | 1, 2, 3 |
| `field_id` | integer | NOT NULL | Backed up field ID | 1, 2, 3 |
| `response_value` | text | nullable | Backed up response | "TechCorp Inc" |
| `status` | text | NOT NULL | Backed up status | "complete" |
| `version` | integer | NOT NULL | Backed up version | 1, 2, 3 |
| `original_created_at` | timestamp | NOT NULL | Original creation time | 2025-01-15T10:30:00Z |
| `original_updated_at` | timestamp | NOT NULL | Original update time | 2025-01-15T10:30:00Z |
| `backup_date` | timestamp | default: now() | When backup was created | 2025-01-15T10:30:00Z |
| `backup_reason` | text | nullable | Reason for backup | "data_migration", "error_recovery" |

### `ky3p_fields` - KY3P Field Definitions
**Purpose**: Define fields for Know Your Third Party assessments

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique field identifier | 1, 2, 3 |
| `field_key` | text | NOT NULL, UNIQUE | Unique field key | "data_encryption", "access_controls" |
| `display_name` | text | NOT NULL | Display name | "Data Encryption Methods" |
| `question` | text | NOT NULL | Assessment question | "How do you encrypt data at rest?" |
| `field_type` | text | NOT NULL | Field input type | "textarea", "radio", "checkbox" |
| `required` | boolean | NOT NULL, default: true | Required field | true, false |
| `order` | integer | NOT NULL | Display order | 1, 2, 3 |
| `step_index` | integer | NOT NULL, default: 0 | Form step | 0, 1, 2 |
| `group` | text | NOT NULL | Question group | "security", "compliance", "technical" |
| `help_text` | text | nullable | Help text | "Describe encryption methods used" |
| `demo_autofill` | text | nullable | Demo auto-fill | "AES-256 encryption with HSM" |
| `answer_expectation` | text | nullable | Expected answer format | "Technical details preferred" |
| `validation_type` | text | nullable | Validation type | "length", "format", "required" |
| `phasing` | text | nullable | Implementation phase | "phase1", "phase2", "phase3" |
| `soc2_overlap` | text | nullable | SOC2 control overlap | "CC6.1", "CC6.7" |
| `validation_rules` | text | nullable | Validation rules JSON | `{"minLength": 10}` |
| `created_at` | timestamp | default: now() | Field creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

### `ky3p_responses` - KY3P Assessment Responses
**Purpose**: Store responses to KY3P security assessment questions

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique response identifier | 1, 2, 3 |
| `task_id` | integer | NOT NULL, FK to tasks | Associated task | 1, 2, 3 |
| `field_id` | integer | FK to ky3p_fields | Field reference | 1, 2, 3 |
| `field_key` | text | nullable | Field key (denormalized) | "data_encryption" |
| `response_value` | text | nullable | Response content | "We use AES-256 encryption" |
| `status` | text | NOT NULL, default: 'empty' | Response status | "empty", "complete", "partial" |
| `version` | integer | NOT NULL, default: 1 | Response version | 1, 2, 3 |
| `created_at` | timestamp | default: now() | Response creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

### `open_banking_fields` - Open Banking Field Definitions
**Purpose**: Define fields for Open Banking compliance assessments

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique field identifier | 1, 2, 3 |
| `field_key` | text | NOT NULL, UNIQUE | Unique field key | "api_security", "psd2_compliance" |
| `display_name` | text | NOT NULL | Display name | "API Security Standards" |
| `question` | text | NOT NULL | Assessment question | "Which API security standards do you implement?" |
| `field_type` | text | NOT NULL | Field input type | "multiselect", "textarea", "radio" |
| `required` | boolean | NOT NULL, default: true | Required field | true, false |
| `order` | integer | NOT NULL | Display order | 1, 2, 3 |
| `step_index` | integer | NOT NULL, default: 0 | Form step | 0, 1, 2 |
| `group` | text | NOT NULL | Question group | "security", "compliance", "technical" |
| `help_text` | text | nullable | Help text | "Select all applicable standards" |
| `demo_autofill` | text | nullable | Demo auto-fill | "OAuth 2.0, TLS 1.3, FAPI" |
| `answer_expectation` | text | nullable | Expected answer format | "List applicable standards" |
| `validation_type` | text | nullable | Validation type | "multiselect", "required" |
| `validation_rules` | text | nullable | Validation rules | `{"minSelections": 1}` |
| `created_at` | timestamp | default: now() | Field creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

### `open_banking_responses` - Open Banking Responses
**Purpose**: Store responses to Open Banking assessment questions

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique response identifier | 1, 2, 3 |
| `task_id` | integer | NOT NULL, FK to tasks | Associated task | 1, 2, 3 |
| `field_id` | integer | FK to open_banking_fields | Field reference | 1, 2, 3 |
| `response_value` | text | nullable | Response content | "OAuth 2.0, TLS 1.3" |
| `ai_suspicion_level` | real | NOT NULL, default: 0 | AI suspicion score (0-1) | 0.0, 0.3, 0.8 |
| `partial_risk_score` | integer | NOT NULL, default: 0 | Calculated risk score | 0, 15, 35 |
| `reasoning` | text | nullable | AI reasoning | "Response shows strong compliance" |
| `status` | text | NOT NULL, default: 'empty' | Response status | "empty", "complete", "partial" |
| `version` | integer | NOT NULL, default: 1 | Response version | 1, 2, 3 |
| `created_at` | timestamp | default: now() | Response creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

### `open_banking_field_timestamps` - Open Banking Field Modification Tracking
**Purpose**: Track when Open Banking fields were last modified

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | uuid | PRIMARY KEY, default: random | Unique timestamp record | uuid |
| `task_id` | integer | NOT NULL, FK to tasks | Associated task | 1, 2, 3 |
| `field_key` | text | NOT NULL | Field identifier | "api_security", "psd2_compliance" |
| `company_id` | integer | NOT NULL, FK to companies | Associated company | 1, 2, 3 |
| `last_modified` | timestamp | NOT NULL, default: now() | Last modification time | 2025-01-15T10:30:00Z |
| `created_at` | timestamp | NOT NULL, default: now() | Record creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | NOT NULL, default: now() | Last update | 2025-01-15T10:30:00Z |

### `security_fields` - Security Assessment Fields
**Purpose**: Define fields for security assessment questionnaires

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique field identifier | 1, 2, 3 |
| `section` | varchar(255) | NOT NULL | Question section | "access_controls", "data_protection" |
| `field_key` | varchar(255) | NOT NULL, UNIQUE | Unique field key | "mfa_implementation", "encryption_at_rest" |
| `label` | text | NOT NULL | Field label | "Multi-Factor Authentication" |
| `description` | text | nullable | Field description | "Describe your MFA implementation" |
| `field_type` | varchar(50) | NOT NULL | Input field type | "textarea", "radio", "checkbox" |
| `is_required` | boolean | NOT NULL, default: false | Required field flag | true, false |
| `step_index` | integer | NOT NULL, default: 0 | Form step | 0, 1, 2 |
| `options` | jsonb | nullable | Field options | `["SMS", "App-based", "Hardware tokens"]` |
| `validation_rules` | jsonb | nullable | Validation rules | `{"minLength": 10}` |
| `metadata` | jsonb | nullable | Additional metadata | `{"category": "authentication"}` |
| `status` | varchar(50) | NOT NULL, default: 'ACTIVE' | Field status | "ACTIVE", "INACTIVE" |
| `created_at` | timestamp | default: now() | Field creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | nullable | Last update | 2025-01-15T10:30:00Z |

### `security_responses` - Security Assessment Responses
**Purpose**: Store responses to security assessment questions

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique response identifier | 1, 2, 3 |
| `company_id` | integer | NOT NULL, FK to companies | Associated company | 1, 2, 3 |
| `field_id` | integer | NOT NULL, FK to security_fields | Field reference | 1, 2, 3 |
| `response` | text | nullable | Response content | "We use app-based MFA for all users" |
| `metadata` | jsonb | nullable | Response metadata | `{"confidence": 0.9}` |
| `status` | varchar(50) | NOT NULL, default: 'pending' | Response status | "pending", "complete", "reviewed" |
| `created_at` | timestamp | default: now() | Response creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | nullable | Last update | 2025-01-15T10:30:00Z |

### `kyb_field_timestamps` - KYB Field Modification Tracking
**Purpose**: Track when specific KYB fields were last modified

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | uuid | PRIMARY KEY, default: random | Unique timestamp record | uuid |
| `task_id` | integer | NOT NULL, FK to tasks | Associated task | 1, 2, 3 |
| `field_key` | text | NOT NULL | Field identifier | "company_name", "revenue" |
| `company_id` | integer | NOT NULL, FK to companies | Associated company | 1, 2, 3 |
| `last_modified` | timestamp | NOT NULL, default: now() | Last modification time | 2025-01-15T10:30:00Z |
| `created_at` | timestamp | NOT NULL, default: now() | Record creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | NOT NULL, default: now() | Last update | 2025-01-15T10:30:00Z |

---

## Claims Management Tables

### `claims` - Insurance Claims Management
**Purpose**: Track insurance claims for data breaches and incidents

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique claim identifier | 1, 2, 3 |
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
| `id` | serial | PRIMARY KEY | Unique breach record | 1, 2, 3 |
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
| `id` | serial | PRIMARY KEY | Unique dispute record | 1, 2, 3 |
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
| `id` | serial | PRIMARY KEY | Unique resolution record | 1, 2, 3 |
| `claim_id` | integer | NOT NULL, FK to claims | Associated claim | 1, 2, 3 |
| `resolution_type` | text | nullable | Type of resolution | "full_payment", "partial_payment", "claim_withdrawn" |
| `resolution_date` | timestamp | NOT NULL | When resolved | 2025-01-25T10:30:00Z |
| `payment_amount` | real | nullable | Final payment amount | 50.00, 12500.00, 0.00 |
| `resolution_notes` | text | nullable | Resolution details | "Full payment approved after investigation" |
| `created_at` | timestamp | default: now() | Record creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

---

## File Management Tables

### `files` - File Storage and Metadata
**Purpose**: Track uploaded files and documents

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique file identifier | 1, 2, 3 |
| `name` | text | NOT NULL | Original filename | "soc2_report.pdf", "financial_2024.xlsx" |
| `size` | integer | NOT NULL | File size in bytes | 1024000, 5120000 |
| `type` | text | NOT NULL | File MIME type | "application/pdf", "image/jpeg" |
| `path` | text | NOT NULL | Storage file path | "/uploads/company1/doc.pdf" |
| `status` | text | NOT NULL | File processing status | "uploaded", "processing", "ready" |
| `user_id` | integer | NOT NULL, FK to users | Uploader | 1, 2, 3 |
| `company_id` | integer | NOT NULL, FK to companies | Associated company | 1, 2, 3 |
| `document_category` | text | nullable | Document type | "SOC2_AUDIT", "PENTEST_REPORT" |
| `classification_status` | text | nullable | AI classification status | "classified", "pending", "failed" |
| `classification_confidence` | real | nullable | Classification confidence | 0.95, 0.78, 0.62 |
| `created_at` | timestamp | nullable | Upload timestamp | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | nullable | Last update | 2025-01-15T10:30:00Z |
| `upload_time` | timestamp | nullable | Upload completion time | 2025-01-15T10:35:00Z |
| `download_count` | integer | nullable | Download counter | 0, 5, 15 |
| `version` | real | NOT NULL, default: 1.0 | File version | 1.0, 1.1, 2.0 |
| `metadata` | jsonb | default: {} | Additional file metadata | `{"encrypted": true, "checksum": "abc123"}` |

---

## Authentication & Security Tables

### `invitations` - User Invitation System
**Purpose**: Manage user invitations and access codes

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique invitation identifier | 1, 2, 3 |
| `email` | text | NOT NULL | Invitee email | "user@company.com" |
| `code` | text | NOT NULL, UNIQUE | Invitation code | "INV123456" |
| `status` | text | NOT NULL, default: 'pending' | Invitation status | "pending", "accepted", "expired" |
| `company_id` | integer | NOT NULL, FK to companies | Target company | 1, 2, 3 |
| `task_id` | integer | FK to tasks | Associated task | 1, 2, 3 |
| `invitee_name` | text | NOT NULL | Invitee full name | "John Doe" |
| `invitee_company` | text | NOT NULL | Invitee company | "Partner Corp" |
| `expires_at` | timestamp | NOT NULL | Invitation expiration | 2025-01-22T10:30:00Z |
| `used_at` | timestamp | nullable | Acceptance time | 2025-01-16T14:20:00Z |
| `created_at` | timestamp | default: now() | Invitation creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

### `password_reset_tokens` - Password Reset Security
**Purpose**: Manage secure password reset tokens

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique token identifier | 1, 2, 3 |
| `user_id` | integer | NOT NULL, FK to users | Target user | 1, 2, 3 |
| `token` | text | NOT NULL, UNIQUE | Reset token | "abc123def456..." |
| `expires_at` | timestamp | NOT NULL | Token expiration | 2025-01-15T11:30:00Z |
| `used_at` | timestamp | nullable | Token usage time | 2025-01-15T11:15:00Z |
| `created_at` | timestamp | default: now() | Token creation | 2025-01-15T10:30:00Z |

### `refresh_tokens` - Session Refresh Tokens
**Purpose**: Manage session refresh tokens for extended authentication

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique refresh token identifier | 1, 2, 3 |
| `user_id` | integer | NOT NULL, FK to users | Associated user | 1, 2, 3 |
| `token` | text | NOT NULL, UNIQUE | Refresh token | "refresh_abc123def456..." |
| `expires_at` | timestamp | NOT NULL | Token expiration | 2025-02-15T10:30:00Z |
| `used_at` | timestamp | nullable | Last token usage | 2025-01-16T14:20:00Z |
| `device_info` | text | nullable | Device information | "Chrome 120.0 on Windows 11" |
| `ip_address` | text | nullable | Client IP address | "192.168.1.100" |
| `is_revoked` | boolean | NOT NULL, default: false | Token revocation status | true, false |
| `created_at` | timestamp | default: now() | Token creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

---

## Analytics & Tracking Tables

### `openai_search_analytics` - AI Search Analytics
**Purpose**: Track AI-powered search usage and costs

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique analytics identifier | 1, 2, 3 |
| `search_type` | text | NOT NULL | Type of AI search | "company_research", "risk_analysis" |
| `company_id` | integer | FK to companies | Associated company | 1, 2, 3 |
| `search_prompt` | text | NOT NULL | AI search prompt | "Analyze cybersecurity posture" |
| `search_results` | jsonb | NOT NULL | AI response data | Complex JSON response |
| `input_tokens` | integer | NOT NULL | Input token count | 150, 500, 1200 |
| `output_tokens` | integer | NOT NULL | Output token count | 300, 800, 2000 |
| `estimated_cost` | real | NOT NULL | API call cost in USD | 0.05, 0.15, 0.30 |
| `search_date` | timestamp | NOT NULL, default: now() | Search timestamp | 2025-01-15T10:30:00Z |
| `model` | text | NOT NULL | AI model used | "gpt-4", "claude-3", "gpt-3.5-turbo" |
| `success` | boolean | NOT NULL | Search success flag | true, false |
| `error_message` | text | nullable | Error details if failed | "Rate limit exceeded" |
| `duration` | integer | NOT NULL | Search duration in ms | 1500, 3000, 5500 |
| `created_at` | timestamp | default: now() | Record creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

### `user_tab_tutorials` - Tutorial Progress Tracking
**Purpose**: Track user tutorial completion for platform tabs

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique tutorial record | 1, 2, 3 |
| `user_id` | integer | NOT NULL, FK to users, CASCADE DELETE | Associated user | 1, 2, 3 |
| `tab_name` | varchar(50) | NOT NULL | Platform tab name | "dashboard", "forms", "files" |
| `completed` | boolean | NOT NULL, default: false | Tutorial completion | true, false |
| `current_step` | integer | NOT NULL, default: 0 | Current tutorial step | 0, 1, 2, 3 |
| `last_seen_at` | timestamp | nullable | Last tutorial interaction | 2025-01-15T10:30:00Z |
| `completed_at` | timestamp | nullable | Tutorial completion time | 2025-01-15T10:45:00Z |
| `created_at` | timestamp | NOT NULL, default: now() | Record creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | NOT NULL, default: now() | Last update | 2025-01-15T10:30:00Z |

---

## Configuration & Template Tables

### `task_templates` - Task Template Configurations
**Purpose**: Define reusable task templates and configurations

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique template identifier | 1, 2, 3 |
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
| `id` | serial | PRIMARY KEY | Unique config identifier | 1, 2, 3 |
| `template_id` | integer | NOT NULL, FK to task_templates | Associated template | 1, 2, 3 |
| `config_key` | varchar(100) | NOT NULL | Configuration key | "max_file_size", "allowed_formats" |
| `config_value` | jsonb | NOT NULL | Configuration value | `{"size": 10485760}`, `["pdf", "docx"]` |
| `scope` | varchar(50) | default: 'global' | Configuration scope | "global", "company", "user" |
| `created_at` | timestamp | default: now() | Config creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

---

## Demo System Tables

### `demo_sessions` - Demo Session Management
**Purpose**: Track demo sessions and persona types

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | uuid | PRIMARY KEY, default: random | Unique session identifier | uuid |
| `persona_type` | text | NOT NULL | Demo persona type | "new-data-recipient", "data-provider" |
| `user_agent` | text | nullable | Browser user agent | "Mozilla/5.0..." |
| `ip_address` | text | nullable | Client IP address | "192.168.1.1" |
| `status` | text | NOT NULL, default: 'active' | Session status | "active", "completed", "expired" |
| `expires_at` | timestamp | NOT NULL | Session expiration | 2025-01-18T10:30:00Z |
| `created_at` | timestamp | NOT NULL, default: now() | Session creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | NOT NULL, default: now() | Last update | 2025-01-15T10:30:00Z |

---

## Additional Schema Tables

### `migration_status` - Database Migration Tracking
**Purpose**: Track database migrations and schema versions

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique migration identifier | 1, 2, 3 |
| `migration_name` | varchar(255) | NOT NULL, UNIQUE | Migration script name | "001_initial_schema", "002_add_claims" |
| `applied_at` | timestamp | NOT NULL, default: now() | When migration was applied | 2025-01-15T10:30:00Z |
| `checksum` | varchar(64) | nullable | Migration file checksum | "abc123def456" |
| `success` | boolean | NOT NULL, default: true | Migration success flag | true, false |
| `error_message` | text | nullable | Error details if failed | "Table already exists" |

### `document_category_config` - Document Category Configuration
**Purpose**: Configure document categories and their properties

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique config identifier | 1, 2, 3 |
| `category_name` | varchar(100) | NOT NULL, UNIQUE | Category name | "SOC2_AUDIT", "PENTEST_REPORT" |
| `display_name` | varchar(255) | NOT NULL | Human-readable name | "SOC 2 Audit Report" |
| `description` | text | nullable | Category description | "Annual SOC 2 compliance audit" |
| `allowed_extensions` | jsonb | NOT NULL | Allowed file extensions | `["pdf", "doc", "docx"]` |
| `max_file_size` | bigint | NOT NULL | Maximum file size in bytes | 10485760, 52428800 |
| `ai_processing_enabled` | boolean | NOT NULL, default: false | Enable AI document processing | true, false |
| `retention_days` | integer | nullable | Document retention period | 365, 2555, 7300 |
| `is_active` | boolean | NOT NULL, default: true | Category active status | true, false |
| `created_at` | timestamp | default: now() | Config creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

---

## Enums & Constants

### Task Status Values
```typescript
TaskStatus = {
  PENDING: 'pending',
  NOT_STARTED: 'not_started', 
  EMAIL_SENT: 'email_sent',
  COMPLETED: 'completed',
  FAILED: 'failed',
  IN_PROGRESS: 'in_progress',
  READY_FOR_SUBMISSION: 'ready_for_submission',
  SUBMITTED: 'submitted',
  APPROVED: 'approved'
}
```

### KYB Field Types
```typescript
KYBFieldType = {
  TEXT: 'TEXT',
  DATE: 'DATE', 
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  SELECT: 'SELECT',
  MULTI_SELECT: 'MULTI_SELECT',
  TEXTAREA: 'TEXTAREA',
  EMAIL: 'EMAIL'
}
```

### Document Categories
```typescript
DocumentCategory = {
  SOC2_AUDIT: 'soc2_audit',
  ISO27001_CERT: 'iso27001_cert',
  PENTEST_REPORT: 'pentest_report', 
  BUSINESS_CONTINUITY: 'business_continuity',
  OPEN_BANKING_SURVEY: 'open_banking_survey',
  OTHER: 'other'
}
```

### Demo Persona Types
```typescript
DemoPersonaType = {
  NEW_DATA_RECIPIENT: 'new-data-recipient',
  ACCREDITED_DATA_RECIPIENT: 'accredited-data-recipient', 
  DATA_PROVIDER: 'data-provider',
  INVELA_ADMIN: 'invela-admin'
}
```

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

---

## Relationships & Foreign Keys

### Primary Relationships

1. **companies** ← **users** (company_id)
   - One company has many users
   - Users belong to exactly one company

2. **companies** ← **tasks** (company_id)
   - One company has many tasks
   - Tasks belong to exactly one company

3. **tasks** ← **[assessment]_responses** (task_id)
   - One task has many responses across all assessment types
   - Responses belong to exactly one task

4. **[assessment]_fields** ← **[assessment]_responses** (field_id)
   - One field has many responses
   - Responses reference exactly one field

5. **companies** ← **files** (company_id)
   - One company has many files
   - Files belong to exactly one company

6. **users** ← **files** (user_id)
   - One user uploads many files
   - Files uploaded by exactly one user

7. **claims** ← **claim_breaches**, **claim_disputes**, **claim_resolutions**
   - One claim has related breach, dispute, and resolution records

8. **task_templates** ← **component_configurations** (template_id)
   - One template has many configuration settings

### Cascade Behaviors

- **users** deletion cascades to **user_tab_tutorials**
- **companies** deletion should cascade to related **users**, **tasks**, **files**
- **tasks** deletion cascades to **responses** tables
- **claims** deletion cascades to **claim_breaches**, **claim_disputes**, **claim_resolutions**

---

## Setup Instructions

### 1. Environment Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL
```

### 2. Database Creation
```sql
-- Create PostgreSQL database
CREATE DATABASE invela_platform;

-- Create user (optional)
CREATE USER invela_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE invela_platform TO invela_user;
```

### 3. Schema Migration
```bash
# Push schema to database
npm run db:push

# Or run migrations manually
npm run db:migrate
```

### 4. Required Environment Variables
```env
DATABASE_URL=postgresql://username:password@localhost:5432/invela_platform
NODE_ENV=development
SESSION_SECRET=your_session_secret_here
```

### 5. Seed Data (Optional)
```bash
# Run demo data population if needed
npm run seed:demo
```

### 6. Verify Setup
```bash
# Start development server
npm run dev

# Check database connection
npm run db:studio
```

---

## Example Data Samples

### Company Record Example
```json
{
  "id": 1,
  "name": "TechFlow Innovations Inc.",
  "category": "fintech",
  "revenue": "15000000",
  "revenue_tier": "medium", 
  "num_employees": 125,
  "risk_score": 45,
  "available_tabs": ["dashboard", "forms", "files", "network"],
  "is_demo": false,
  "accreditation_status": "approved",
  "onboarding_company_completed": true
}
```

### Task Record Example  
```json
{
  "id": 1,
  "title": "Complete KYB Assessment",
  "task_type": "company_kyb",
  "status": "in_progress",
  "progress": 0.65,
  "company_id": 1,
  "metadata": {
    "locked": false,
    "steps_completed": 3,
    "total_steps": 5
  }
}
```

### Claim Record Example
```json
{
  "id": 1,
  "claim_id": "CLM-2025-001",
  "bank_name": "JPMorgan Chase",
  "fintech_name": "PayFlow Inc",
  "claim_type": "PII Data Loss",
  "claim_amount": 25000.00,
  "status": "in_review",
  "is_disputed": false
}
```

---

## Database Statistics

**Total Tables**: 32  
**Total Columns**: 400+  
**Assessment Tables**: 12  
**Claims Tables**: 4  
**Core Business Tables**: 7  
**Supporting Tables**: 9  

---

**Last Updated**: June 4, 2025  
**Schema Version**: 3.0.0  
**Total Coverage**: All 32 database tables documented  
**Maintainer**: Invela Development Team

For questions or updates to this documentation, please refer to the development team or update this file directly in the repository.