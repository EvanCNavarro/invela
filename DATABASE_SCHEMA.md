# Invela Database Schema Documentation

**Enterprise Risk Assessment Platform - Complete Database Reference**

## Overview

This document provides complete documentation for the Invela platform database schema. The database uses PostgreSQL with Drizzle ORM for type-safe operations.

**Schema Version**: Current as of June 2025  
**Database Type**: PostgreSQL  
**ORM**: Drizzle ORM  
**Total Tables**: 20+ core tables

## Table of Contents

1. [Core Entity Tables](#core-entity-tables)
2. [Assessment & Form Tables](#assessment--form-tables)
3. [File Management Tables](#file-management-tables)
4. [Authentication & Security](#authentication--security)
5. [Analytics & Tracking](#analytics--tracking)
6. [Claims Management](#claims-management)
7. [Demo System Tables](#demo-system-tables)
8. [Enums & Constants](#enums--constants)
9. [Relationships & Foreign Keys](#relationships--foreign-keys)
10. [Setup Instructions](#setup-instructions)

---

## Core Entity Tables

### `companies` - Main Company Entity
**Purpose**: Primary company information and risk assessment data

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique company identifier | 1, 2, 3... |
| `name` | text | NOT NULL | Company legal name | "TechCorp Inc", "DataFlow Systems" |
| `description` | text | nullable | Company description | "Leading fintech platform" |
| `category` | text | NOT NULL | Business category | "fintech", "bank", "insurance" |
| `logo_id` | uuid | FK to company_logos | Company logo reference | uuid |
| `stock_ticker` | text | nullable | Stock exchange ticker | "AAPL", "GOOGL" |
| `website_url` | text | nullable | Company website | "https://example.com" |
| `legal_structure` | text | nullable | Legal entity type | "Corporation", "LLC" |
| `market_position` | text | nullable | Market position | "Leader", "Challenger" |
| `hq_address` | text | nullable | Headquarters address | "123 Main St, NYC" |
| `products_services` | text | nullable | Products/services offered | "API platform, data analytics" |
| `incorporation_year` | integer | nullable | Year incorporated | 2015, 2020 |
| `founders_and_leadership` | text | nullable | Key leadership info | "John Doe (CEO), Jane Smith (CTO)" |
| `num_employees` | integer | nullable | Employee count | 50, 500, 5000 |
| `revenue` | text | nullable | Annual revenue | "10000000", "50000000" |
| `revenue_tier` | text | nullable | Revenue classification | "small", "medium", "large" |
| `key_clients_partners` | text | nullable | Major clients/partners | "Bank of America, JPMorgan" |
| `investors` | text | nullable | Investment information | "Series A led by Acme VC" |
| `funding_stage` | text | nullable | Current funding stage | "Seed", "Series A", "Series B" |
| `exit_strategy_history` | text | nullable | Exit history | "IPO 2020", "Acquired by XYZ" |
| `certifications_compliance` | text | nullable | Compliance certifications | "SOC2, ISO27001, PCI DSS" |
| `risk_score` | integer | nullable | Calculated risk score (0-100) | 25, 67, 89 |
| `chosen_score` | integer | nullable | User-selected risk score | 30, 70, 90 |
| `risk_clusters` | jsonb | nullable | Risk dimension breakdown | `{"Cyber Security": 75, "Financial": 45}` |
| `risk_configuration` | jsonb | nullable | Risk assessment config | Complex JSON object |
| `risk_priorities` | jsonb | nullable | Risk priority settings | Complex JSON object |
| `accreditation_status` | text | nullable | Current accreditation | "pending", "approved", "expired" |
| `onboarding_company_completed` | boolean | NOT NULL, default: true | Onboarding completion status | true, false |
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
| `id` | serial | PRIMARY KEY | Unique user identifier | 1, 2, 3... |
| `email` | text | NOT NULL, UNIQUE | User email address | "user@company.com" |
| `full_name` | text | NOT NULL | Complete user name | "John Doe" |
| `first_name` | text | nullable | First name | "John" |
| `last_name` | text | nullable | Last name | "Doe" |
| `password` | text | NOT NULL | Hashed password | bcrypt hash |
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
| `id` | serial | PRIMARY KEY | Unique task identifier | 1, 2, 3... |
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

---

## Assessment & Form Tables

### `kyb_fields` - KYB Form Field Definitions
**Purpose**: Define fields for Know Your Business assessments

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique field identifier | 1, 2, 3... |
| `field_key` | text | NOT NULL | Unique field identifier | "company_name", "incorporation_date" |
| `display_name` | text | NOT NULL | Human-readable field name | "Company Name", "Date of Incorporation" |
| `field_type` | text | NOT NULL | Input field type | "TEXT", "DATE", "SELECT", "BOOLEAN" |
| `question` | text | NOT NULL | Field question/prompt | "What is your company's legal name?" |
| `group` | text | NOT NULL | Field grouping | "basic_info", "financial", "legal" |
| `required` | boolean | NOT NULL, default: true | Required field flag | true, false |
| `order` | integer | NOT NULL | Display order | 1, 2, 3... |
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
| `id` | serial | PRIMARY KEY | Unique response identifier | 1, 2, 3... |
| `task_id` | integer | NOT NULL, FK to tasks | Associated task | 1, 2, 3 |
| `field_id` | integer | NOT NULL, FK to kyb_fields | Field being answered | 1, 2, 3 |
| `response_value` | text | nullable | User's response | "TechCorp Inc", "2015-03-15" |
| `status` | text | NOT NULL, default: 'empty' | Response status | "empty", "complete", "invalid" |
| `version` | integer | NOT NULL, default: 1 | Response version | 1, 2, 3 |
| `created_at` | timestamp | default: now() | Response creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last response update | 2025-01-15T10:30:00Z |

### `ky3p_fields` - KY3P Field Definitions
**Purpose**: Define fields for Know Your Third Party assessments

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique field identifier | 1, 2, 3... |
| `field_key` | text | NOT NULL, UNIQUE | Unique field key | "data_encryption", "access_controls" |
| `display_name` | text | NOT NULL | Display name | "Data Encryption Methods" |
| `question` | text | NOT NULL | Assessment question | "How do you encrypt data at rest?" |
| `field_type` | text | NOT NULL | Field input type | "textarea", "radio", "checkbox" |
| `required` | boolean | NOT NULL, default: true | Required field | true, false |
| `order` | integer | NOT NULL | Display order | 1, 2, 3... |
| `step_index` | integer | NOT NULL, default: 0 | Form step | 0, 1, 2 |
| `options` | jsonb | nullable | Field options | `["AES-256", "RSA", "Other"]` |
| `validation_rules` | jsonb | nullable | Validation rules | `{"minLength": 10}` |
| `help_text` | text | nullable | Help text | "Describe encryption methods used" |
| `category` | text | nullable | Question category | "security", "compliance", "technical" |
| `created_at` | timestamp | default: now() | Field creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

### `ky3p_responses` - KY3P Assessment Responses
**Purpose**: Store responses to KY3P security assessment questions

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique response identifier | 1, 2, 3... |
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
| `id` | serial | PRIMARY KEY | Unique field identifier | 1, 2, 3... |
| `field_key` | text | NOT NULL, UNIQUE | Unique field key | "api_security", "psd2_compliance" |
| `display_name` | text | NOT NULL | Display name | "API Security Standards" |
| `question` | text | NOT NULL | Assessment question | "Which API security standards do you implement?" |
| `field_type` | text | NOT NULL | Field input type | "multiselect", "textarea", "radio" |
| `required` | boolean | NOT NULL, default: true | Required field | true, false |
| `order` | integer | NOT NULL | Display order | 1, 2, 3... |
| `step_index` | integer | NOT NULL, default: 0 | Form step | 0, 1, 2 |
| `options` | jsonb | nullable | Field options | `["OAuth 2.0", "TLS 1.3", "FAPI"]` |
| `validation_rules` | jsonb | nullable | Validation rules | `{"minSelections": 1}` |
| `help_text` | text | nullable | Help text | "Select all applicable standards" |
| `category` | text | nullable | Question category | "security", "compliance", "technical" |
| `created_at` | timestamp | default: now() | Field creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

### `open_banking_responses` - Open Banking Responses
**Purpose**: Store responses to Open Banking assessment questions

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique response identifier | 1, 2, 3... |
| `task_id` | integer | NOT NULL, FK to tasks | Associated task | 1, 2, 3 |
| `field_id` | integer | FK to open_banking_fields | Field reference | 1, 2, 3 |
| `field_key` | text | nullable | Field key (denormalized) | "api_security" |
| `response_value` | text | nullable | Response content | "OAuth 2.0, TLS 1.3" |
| `status` | text | NOT NULL, default: 'empty' | Response status | "empty", "complete", "partial" |
| `version` | integer | NOT NULL, default: 1 | Response version | 1, 2, 3 |
| `created_at` | timestamp | default: now() | Response creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | default: now() | Last update | 2025-01-15T10:30:00Z |

---

## File Management Tables

### `files` - File Storage and Metadata
**Purpose**: Track uploaded files and documents

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique file identifier | 1, 2, 3... |
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

### `company_logos` - Company Logo Files
**Purpose**: Store company logo files separately

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | uuid | PRIMARY KEY, default: random | Unique logo identifier | uuid |
| `company_id` | integer | NOT NULL, FK to companies | Associated company | 1, 2, 3 |
| `file_name` | text | NOT NULL | Logo filename | "logo.png", "company_logo.svg" |
| `file_path` | text | NOT NULL | Storage path | "/logos/company1/logo.png" |
| `file_type` | text | NOT NULL | Image file type | "image/png", "image/svg+xml" |
| `uploaded_at` | timestamp | default: now() | Upload timestamp | 2025-01-15T10:30:00Z |

---

## Authentication & Security

### `password_reset_tokens` - Password Reset Security
**Purpose**: Manage secure password reset tokens

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique token identifier | 1, 2, 3... |
| `user_id` | integer | NOT NULL, FK to users | Target user | 1, 2, 3 |
| `token` | text | NOT NULL, UNIQUE | Reset token | "abc123def456..." |
| `expires_at` | timestamp | NOT NULL | Token expiration | 2025-01-15T11:30:00Z |
| `used_at` | timestamp | nullable | Token usage time | 2025-01-15T11:15:00Z |
| `created_at` | timestamp | default: now() | Token creation | 2025-01-15T10:30:00Z |

### `invitations` - User Invitation System
**Purpose**: Manage user invitations and access codes

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique invitation identifier | 1, 2, 3... |
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

---

## Analytics & Tracking

### `openai_search_analytics` - AI Search Analytics
**Purpose**: Track AI-powered search usage and costs

| Column | Type | Constraints | Description | Example Values |
|--------|------|-------------|-------------|----------------|
| `id` | serial | PRIMARY KEY | Unique analytics identifier | 1, 2, 3... |
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
| `id` | serial | PRIMARY KEY | Unique tutorial record | 1, 2, 3... |
| `user_id` | integer | NOT NULL, FK to users, CASCADE DELETE | Associated user | 1, 2, 3 |
| `tab_name` | varchar(50) | NOT NULL | Platform tab name | "dashboard", "forms", "files" |
| `completed` | boolean | NOT NULL, default: false | Tutorial completion | true, false |
| `current_step` | integer | NOT NULL, default: 0 | Current tutorial step | 0, 1, 2, 3 |
| `last_seen_at` | timestamp | nullable | Last tutorial interaction | 2025-01-15T10:30:00Z |
| `completed_at` | timestamp | nullable | Tutorial completion time | 2025-01-15T10:45:00Z |
| `created_at` | timestamp | NOT NULL, default: now() | Record creation | 2025-01-15T10:30:00Z |
| `updated_at` | timestamp | NOT NULL, default: now() | Last update | 2025-01-15T10:30:00Z |

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

### `kyb_field_timestamps` - Field Modification Tracking
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

---

## Relationships & Foreign Keys

### Primary Relationships

1. **companies** ← **users** (company_id)
   - One company has many users
   - Users belong to exactly one company

2. **companies** ← **tasks** (company_id)
   - One company has many tasks
   - Tasks belong to exactly one company

3. **tasks** ← **kyb_responses** (task_id)
   - One task has many KYB responses
   - Responses belong to exactly one task

4. **kyb_fields** ← **kyb_responses** (field_id)
   - One field has many responses
   - Responses reference exactly one field

5. **companies** ← **files** (company_id)
   - One company has many files
   - Files belong to exactly one company

6. **users** ← **files** (user_id)
   - One user uploads many files
   - Files uploaded by exactly one user

### Cascade Behaviors

- **users** deletion cascades to **user_tab_tutorials**
- **companies** deletion should cascade to related **users**, **tasks**, **files**
- **tasks** deletion cascades to **responses** tables

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

### KYB Response Example
```json
{
  "id": 1,
  "task_id": 1,
  "field_id": 1,
  "response_value": "TechFlow Innovations Inc.",
  "status": "complete",
  "version": 1
}
```

---

## Troubleshooting

### Common Issues

1. **Migration Failures**
   - Check DATABASE_URL format
   - Ensure PostgreSQL is running
   - Verify database permissions

2. **Foreign Key Errors**
   - Ensure referenced records exist
   - Check constraint violations
   - Verify cascade settings

3. **Demo Data Issues**
   - Check demo_session_id references
   - Verify demo expiration times
   - Ensure demo flags are set correctly

### Useful Queries

```sql
-- Check table relationships
SELECT schemaname, tablename, attname, constraint_name 
FROM pg_constraint 
JOIN pg_attribute ON pg_attribute.attnum = ANY(pg_constraint.conkey);

-- Find orphaned records
SELECT * FROM users WHERE company_id NOT IN (SELECT id FROM companies);

-- Check demo data
SELECT COUNT(*) as demo_companies FROM companies WHERE is_demo = true;
SELECT COUNT(*) as demo_users FROM users WHERE is_demo_user = true;
```

---

**Last Updated**: June 4, 2025  
**Schema Version**: 2.1.0  
**Maintainer**: Invela Development Team

For questions or updates to this documentation, please refer to the development team or update this file directly in the repository.