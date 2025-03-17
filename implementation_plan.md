# Implementation Plan: Enhanced File Upload System with Document Classification

## Overview
This document outlines the implementation plan for enhancing the file upload system with:
1. Automated document classification using OpenAI ✅
2. Real-time document count tracking per category ✅
3. Improved file size handling (50MB limit) 🔄
4. Enhanced file type validation 🔄
5. Better error handling and user feedback 🔄

## Completed Steps ✅

### Phase 1: Database Enhancement
- Added document_category enum type
- Added new fields to files table
- Created document count materialized view
- Added necessary indices for performance

### Phase 2: OpenAI Integration
- Installed and configured OpenAI SDK
- Created document classification service
- Implemented confidence scoring
- Added retry mechanism
- Added comprehensive error handling

### Initial WebSocket Setup
- Implemented WebSocket server with proper configuration
- Added real-time document count updates
- Added classification status updates
- Implemented connection health monitoring

## In Progress 🔄

### Phase 3: File Upload Enhancement (Current Step)
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

3. Create WebSocket message types:
```typescript
interface DocumentCountUpdate {
  type: 'COUNT_UPDATE';
  category: DocumentCategory;
  count: number;
  companyId: string;
}

interface ClassificationUpdate {
  type: 'CLASSIFICATION_UPDATE';
  fileId: string;
  category: DocumentCategory;
  confidence: number;
}
```

## Phase 5: Frontend Updates
1. Update FileUploadZone component:
```typescript
interface FileUploadZoneProps {
  onFilesAccepted: (files: File[]) => Promise<void>;
  documentCounts: Record<DocumentCategory, number>;
  isProcessing: boolean;
}

interface DocumentCountDisplay {
  category: DocumentCategory;
  count: number;
  isUpdating: boolean;
}

const FileUploadZone: FC<FileUploadZoneProps> = ({
  onFilesAccepted,
  documentCounts,
  isProcessing
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Animation states for count updates
  const [updatingCategories, setUpdatingCategories] = useState<Set<DocumentCategory>>(new Set());

  // Custom upload error messages
  const getErrorMessage = (error: any): string => {
    if (error.code === 'FILE_TOO_LARGE') {
      return 'File size exceeds 50MB limit';
    }
    if (error.code === 'INVALID_FILE_TYPE') {
      return 'Unsupported file type. Please upload documents in CSV, DOC, DOCX, PDF, or image formats';
    }
    return 'Error uploading file. Please try again.';
  };

  // ... rest of component implementation
};
```

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
}> = ({ counts, onCategoryClick }) => (
  <div>
    {counts.map((count) => (
      <div key={count.category} onClick={() => onCategoryClick(count.category)}>
        {count.category}: {count.count}
      </div>
    ))}
  </div>
);
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
  private pendingUpdates: Set<string>; // Track files being processed

  // Optimistically update count when upload starts
  startUpload(fileId: string, predictedCategory: DocumentCategory): void {
    this.pendingUpdates.add(fileId);
    this.updateCount(predictedCategory, 1);
  }

  // Confirm or revert update when classification completes
  confirmUpload(fileId: string, actualCategory: DocumentCategory, predictedCategory: DocumentCategory): void {
    if (actualCategory !== predictedCategory) {
      this.updateCount(predictedCategory, -1);
      this.updateCount(actualCategory, 1);
    }
    this.pendingUpdates.delete(fileId);
  }

  updateCount(category: DocumentCategory, delta: number): void {
    const currentCount = this.counts.get(category) || 0;
    this.counts.set(category, currentCount + delta);
    // Emit update event or trigger UI refresh
  }

  subscribeToUpdates(callback: (counts: DocumentCount[]) => void): void {
    this.ws.onmessage = (event) => {
        const update = JSON.parse(event.data);
        this.updateCount(update.category, update.count);
        callback(Array.from(this.counts.entries()).map(([key,value])=> ({category: key, count:value})));
    };
  }
}
```

3. Implement optimistic updates:


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
- Classification accuracy > 90% for standard compliance documents
- Average classification time < 2 seconds per document
- Real-time count update latency < 100ms

## Rollback Plan
- Database changes can be reverted
- Classification can be disabled without affecting uploads
- Count tracking can fall back to polling
- File size limits can be adjusted if needed

End of Implementation Plan