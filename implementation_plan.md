# Implementation Plan: Enhanced File Upload System with Document Classification

## Overview
This document outlines the implementation plan for enhancing the file upload system with:
1. Automated document classification using OpenAI
2. Real-time document count tracking per category
3. Improved file size handling (50MB limit)
4. Enhanced file type validation
5. Better error handling and user feedback

## Document Categories
Primary document types to classify:
- SOC 2 Audit Report
- ISO 27001 Certification
- Penetration Test Report
- Business Continuity Plan
- Other Documents

## Phase 1: Database Enhancement
1. Add new fields to files table:
```sql
CREATE TYPE document_category AS ENUM (
  'soc2_audit',
  'iso27001_cert',
  'pentest_report',
  'business_continuity',
  'other'
);

ALTER TABLE files 
  ADD COLUMN document_category document_category,
  ADD COLUMN document_type VARCHAR(50),
  ADD COLUMN classification_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN last_classified_at TIMESTAMP,
  ADD COLUMN classification_confidence FLOAT;

CREATE INDEX idx_files_document_category ON files(document_category);
CREATE INDEX idx_files_company_category ON files(company_id, document_category);
```

2. Add document count materialized view:
```sql
CREATE MATERIALIZED VIEW document_category_counts AS
SELECT 
  company_id,
  document_category,
  COUNT(*) as doc_count
FROM files
GROUP BY company_id, document_category;

CREATE UNIQUE INDEX ON document_category_counts (company_id, document_category);
```

## Phase 2: OpenAI Integration
1. Install and configure OpenAI SDK:
```bash
npm install openai
```

2. Add environment variables:
```
OPENAI_API_KEY=<key>
```

3. Create OpenAI service (server/services/openai.ts):
- Configure GPT-4 model for classification
- Implement document text extraction
- Configure classification prompts
- Handle confidence scoring
- Implement retry mechanism

4. Create classification types:
```typescript
export enum DocumentCategory {
  SOC2_AUDIT = 'soc2_audit',
  ISO27001_CERT = 'iso27001_cert',
  PENTEST_REPORT = 'pentest_report',
  BUSINESS_CONTINUITY = 'business_continuity',
  OTHER = 'other'
}

export interface ClassificationResult {
  category: DocumentCategory;
  confidence: number;
  suggestedName?: string;
}
```

## Phase 3: File Upload Enhancement
1. Update upload middleware (server/middleware/upload.ts):
- Increase file size limit to 50MB
- Validate accepted file types:
  - Document formats: CSV, DOC, DOCX, ODT, PDF, RTF, TXT
  - Image formats: JPG, PNG, SVG
- Implement proper MIME type validation

2. Enhance error handling:
- Add detailed error messages for size limits
- Improve file type validation feedback
- Implement upload retry mechanism

## Phase 4: Classification Integration
1. Update file upload endpoint:
- Add classification queue system
- Implement background processing
- Add retry mechanism
- Update document counts after classification

2. Create new endpoints:
```typescript
// Document management endpoints
GET /api/files/types (list document types)
POST /api/files/:id/classify (manual classification)
GET /api/files/stats (classification statistics)
GET /api/files/counts (get document counts by category)

// Real-time update endpoint
WebSocket /ws/files/updates (real-time count updates)
```

## Phase 5: Frontend Updates
1. Update FileUploadZone component:
- Add real-time document count display
- Show classification status and confidence
- Add manual classification trigger
- Display proper file size limits
- Add upload progress indicator

2. Create DocumentCountDisplay component:
```typescript
interface DocumentCount {
  category: DocumentCategory;
  count: number;
}

const DocumentCountDisplay: FC<{
  counts: DocumentCount[];
  onCategoryClick: (category: DocumentCategory) => void;
}>;
```

3. Update FileTable component:
- Add document type column
- Add classification status column
- Add filtering by document type
- Improve error messages

## Phase 6: Real-time Updates
1. Implement WebSocket connection:
- Handle document count updates
- Manage connection state
- Implement reconnection logic

2. Create CountManager service:
```typescript
class DocumentCountManager {
  private counts: Map<DocumentCategory, number>;
  private ws: WebSocket;

  updateCount(category: DocumentCategory, delta: number): void;
  subscribeToUpdates(callback: (counts: DocumentCount[]) => void): void;
}
```

## Phase 7: Security & Performance
1. Implement rate limiting for:
- File uploads (max 10 per minute)
- Classification requests (max 5 per minute)
- Manual classification attempts (max 3 per file)

2. Add monitoring for:
- Classification success rate
- Document count accuracy
- API usage tracking
- Error rate monitoring

## Testing Strategy
1. Unit Tests:
- Document classification service
- Count tracking logic
- WebSocket update handling
- Error handling

2. Integration Tests:
- End-to-end upload and classification
- Real-time count updates
- OpenAI API integration
- Error handling scenarios

3. Load Tests:
- Multiple simultaneous uploads
- Concurrent classification requests
- WebSocket connection stability

## Success Metrics
- Upload success rate > 99%
- Classification accuracy > 95%
- Real-time count update latency < 500ms
- User satisfaction with document management

## Rollback Plan
- Database changes can be reverted
- Classification can be disabled without affecting uploads
- Count tracking can fall back to polling
- File size limits can be adjusted if needed

End of Implementation Plan