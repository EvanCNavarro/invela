# Invela API Reference

**Complete REST API documentation for the Enterprise Risk Assessment Platform**

## Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication
All API endpoints require session-based authentication unless specified otherwise.

**Session Cookie**: `connect.sid`  
**Headers**: Standard session headers are automatically handled by the browser

---

## Core API Endpoints

### Authentication

#### `POST /api/auth/login`
User authentication and session creation

**Request Body:**
```json
{
  "email": "user@company.com",
  "password": "userpassword"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@company.com",
    "full_name": "John Doe",
    "company_id": 1
  }
}
```

#### `POST /api/auth/logout`
End user session

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### `GET /api/user`
Get current authenticated user

**Response:**
```json
{
  "id": 1,
  "email": "user@company.com",
  "full_name": "John Doe",
  "company_id": 1,
  "onboarding_user_completed": true
}
```

#### `POST /api/auth/register`
Register new user with invitation code

**Request Body:**
```json
{
  "email": "newuser@company.com",
  "full_name": "Jane Smith",
  "password": "securepassword",
  "company": "TechCorp Inc",
  "invitation_code": "INV123456"
}
```

---

### Companies

#### `GET /api/companies/current`
Get current user's company details

**Response:**
```json
{
  "id": 1,
  "name": "TechCorp Inc",
  "category": "fintech",
  "risk_score": 45,
  "available_tabs": ["dashboard", "forms", "files"],
  "onboarding_company_completed": true,
  "accreditation_status": "approved"
}
```

#### `PUT /api/companies/:id`
Update company information

**Request Body:**
```json
{
  "name": "Updated Company Name",
  "description": "Updated description",
  "website_url": "https://updatedsite.com"
}
```

#### `POST /api/companies/:id/logo`
Upload company logo

**Content-Type:** `multipart/form-data`  
**Form Field:** `logo` (file)

**Response:**
```json
{
  "success": true,
  "logo_id": "uuid-string",
  "file_path": "/logos/company1/logo.png"
}
```

#### `GET /api/company-name/validate`
Validate company name availability

**Query Parameters:**
- `name`: Company name to validate

**Response:**
```json
{
  "available": true,
  "suggestions": ["TechCorp Ltd", "TechCorp LLC"]
}
```

---

### Tasks

#### `GET /api/tasks`
Get tasks for current user's company

**Query Parameters:**
- `status`: Filter by task status (optional)
- `type`: Filter by task type (optional)

**Response:**
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "KYB Assessment",
      "task_type": "company_kyb",
      "status": "in_progress",
      "progress": 0.65,
      "due_date": "2025-01-20T17:00:00Z",
      "company_id": 1
    }
  ]
}
```

#### `POST /api/tasks`
Create new task

**Request Body:**
```json
{
  "title": "Security Assessment",
  "task_type": "security_assessment",
  "task_scope": "company",
  "company_id": 1,
  "due_date": "2025-02-01T17:00:00Z"
}
```

#### `PUT /api/tasks/:id`
Update task

**Request Body:**
```json
{
  "status": "completed",
  "progress": 1.0,
  "completion_date": "2025-01-18T15:30:00Z"
}
```

#### `DELETE /api/tasks/:id`
Delete task

**Response:**
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

---

### KYB (Know Your Business)

#### `GET /api/kyb/fields`
Get KYB form field definitions

**Response:**
```json
{
  "fields": [
    {
      "id": 1,
      "field_key": "company_name",
      "display_name": "Company Name",
      "field_type": "TEXT",
      "question": "What is your company's legal name?",
      "group": "basic_info",
      "required": true,
      "order": 1,
      "step_index": 0
    }
  ]
}
```

#### `GET /api/kyb/progress/:taskId`
Get KYB assessment progress for task

**Response:**
```json
{
  "task_id": 1,
  "total_fields": 30,
  "completed_fields": 20,
  "progress": 0.67,
  "responses": [
    {
      "field_id": 1,
      "field_key": "company_name",
      "response_value": "TechCorp Inc",
      "status": "complete"
    }
  ]
}
```

#### `POST /api/kyb/responses`
Submit KYB field response

**Request Body:**
```json
{
  "task_id": 1,
  "field_id": 1,
  "response_value": "TechCorp Inc"
}
```

#### `PUT /api/kyb/responses/:id`
Update KYB response

**Request Body:**
```json
{
  "response_value": "Updated TechCorp Inc",
  "status": "complete"
}
```

---

### KY3P (Know Your Third Party)

#### `GET /api/ky3p/fields`
Get KY3P security assessment field definitions

**Response:**
```json
{
  "fields": [
    {
      "id": 1,
      "field_key": "data_encryption",
      "display_name": "Data Encryption Methods",
      "question": "How do you encrypt data at rest?",
      "field_type": "textarea",
      "group": "security",
      "required": true
    }
  ]
}
```

#### `GET /api/ky3p/progress/:taskId`
Get KY3P assessment progress

**Response:**
```json
{
  "task_id": 1,
  "progress": 0.45,
  "responses": [
    {
      "field_key": "data_encryption",
      "response_value": "AES-256 encryption with HSM",
      "status": "complete"
    }
  ]
}
```

#### `POST /api/ky3p/autofill/:taskId`
Auto-fill KY3P responses with demo data

**Response:**
```json
{
  "success": true,
  "message": "Demo data filled successfully",
  "task_id": 1,
  "filled_responses": 15
}
```

---

### Open Banking

#### `GET /api/open-banking/fields`
Get Open Banking assessment field definitions

**Response:**
```json
{
  "fields": [
    {
      "id": 1,
      "field_key": "api_security",
      "display_name": "API Security Standards",
      "question": "Which API security standards do you implement?",
      "field_type": "multiselect",
      "group": "security"
    }
  ]
}
```

#### `GET /api/open-banking/progress/:taskId`
Get Open Banking assessment progress

**Response:**
```json
{
  "task_id": 1,
  "total_fields": 44,
  "completed_fields": 12,
  "progress": 0.27,
  "ai_analysis": {
    "avg_suspicion": 0.15,
    "risk_score": 25
  }
}
```

---

### File Management

#### `POST /api/files/upload`
Upload file to company vault

**Content-Type:** `multipart/form-data`  
**Form Fields:**
- `file`: File to upload
- `category`: Document category (optional)

**Response:**
```json
{
  "success": true,
  "file": {
    "id": 1,
    "name": "soc2_report.pdf",
    "size": 1024000,
    "type": "application/pdf",
    "path": "/uploads/company1/doc.pdf",
    "status": "uploaded"
  }
}
```

#### `GET /api/files`
Get files for current company

**Query Parameters:**
- `category`: Filter by document category
- `status`: Filter by file status

**Response:**
```json
{
  "files": [
    {
      "id": 1,
      "name": "soc2_report.pdf",
      "size": 1024000,
      "type": "application/pdf",
      "status": "ready",
      "document_category": "SOC2_AUDIT",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

#### `GET /api/files/:id/download`
Download file

**Response:** File binary data with appropriate headers

#### `DELETE /api/files/:id`
Delete file

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

### Claims Management

#### `GET /api/claims`
Get claims for current company

**Response:**
```json
{
  "claims": [
    {
      "id": 1,
      "claim_id": "CLM-2025-001",
      "bank_name": "JPMorgan Chase",
      "fintech_name": "PayFlow Inc",
      "claim_type": "PII Data Loss",
      "claim_amount": 25000.00,
      "status": "in_review",
      "claim_date": "2025-01-15T10:30:00Z"
    }
  ]
}
```

#### `POST /api/claims`
Create new claim

**Request Body:**
```json
{
  "bank_name": "Bank of America",
  "fintech_name": "DataTech Solutions",
  "claim_type": "Unauthorized Access",
  "claim_amount": 15000.00,
  "account_number": "ACC987654321"
}
```

#### `GET /api/claims/:id`
Get claim details with related records

**Response:**
```json
{
  "claim": {
    "id": 1,
    "claim_id": "CLM-2025-001",
    "status": "in_review",
    "breaches": [
      {
        "breach_date": "2025-01-15T10:30:00Z",
        "affected_records": 500,
        "remediation_status": "in_progress"
      }
    ],
    "disputes": [],
    "resolutions": []
  }
}
```

---

### Analytics

#### `GET /api/analytics/search`
Get AI search analytics

**Query Parameters:**
- `from`: Start date (ISO string)
- `to`: End date (ISO string)

**Response:**
```json
{
  "analytics": [
    {
      "id": 1,
      "search_type": "company_research",
      "input_tokens": 150,
      "output_tokens": 300,
      "estimated_cost": 0.05,
      "model": "gpt-4",
      "success": true,
      "duration": 1500
    }
  ],
  "summary": {
    "total_searches": 25,
    "total_cost": 1.25,
    "avg_duration": 2100
  }
}
```

#### `GET /api/user-tutorials`
Get user tutorial progress

**Response:**
```json
{
  "tutorials": [
    {
      "tab_name": "dashboard",
      "completed": true,
      "current_step": 3,
      "completed_at": "2025-01-15T10:45:00Z"
    }
  ]
}
```

#### `PUT /api/user-tutorials/:tabName`
Update tutorial progress

**Request Body:**
```json
{
  "completed": true,
  "current_step": 3
}
```

---

### WebSocket Broadcast

#### `POST /api/broadcast/task-update`
Broadcast task update to all connected clients

**Request Body:**
```json
{
  "taskId": 1,
  "type": "task_updated",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task update broadcasted successfully",
  "taskId": 1
}
```

---

### Demo System

#### `POST /api/demo/create-session`
Create demo session

**Request Body:**
```json
{
  "persona_type": "new-data-recipient",
  "user_agent": "Mozilla/5.0...",
  "ip_address": "192.168.1.1"
}
```

#### `GET /api/demo/cleanup/preview`
Preview demo cleanup operation

**Response:**
```json
{
  "companies": 5,
  "users": 8,
  "tasks": 12,
  "files": 3,
  "total_records": 28
}
```

#### `POST /api/demo/cleanup/execute`
Execute demo data cleanup

**Response:**
```json
{
  "success": true,
  "deleted": {
    "companies": 5,
    "users": 8,
    "tasks": 12,
    "files": 3
  }
}
```

---

## Error Responses

All API endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "status": 400,
  "timestamp": "2025-01-15T10:30:00Z",
  "path": "/api/endpoint"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `422` - Unprocessable Entity (business logic errors)
- `500` - Internal Server Error

---

## Rate Limiting

- **Standard Endpoints**: 100 requests per minute per IP
- **File Upload**: 10 requests per minute per user
- **AI Analytics**: 20 requests per minute per company

---

## WebSocket Events

The platform uses WebSocket for real-time updates:

### Connection
```
wss://your-domain.com/ws
```

### Events Sent to Client

#### `connection_established`
```json
{
  "type": "connection_established",
  "clientId": "client-123456",
  "timestamp": "2025-01-15T10:30:00Z",
  "message": "Connection established"
}
```

#### `task_updated`
```json
{
  "type": "task_updated",
  "taskId": 1,
  "timestamp": "2025-01-15T10:30:00Z",
  "source": "api"
}
```

#### `company_tabs_updated`
```json
{
  "type": "company_tabs_updated",
  "companyId": 1,
  "availableTabs": ["dashboard", "forms", "files"],
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Events Sent to Server

#### `authenticate`
```json
{
  "type": "authenticate",
  "userId": "565",
  "companyId": "777",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### `ping`
```json
{
  "type": "ping",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

**Last Updated**: June 4, 2025  
**API Version**: 1.0.0  
**Base Path**: `/api`