export type FileStatus = 'uploading' | 'uploaded' | 'paused' | 'canceled' | 'deleted' | 'restored';
export type SortField = 'name' | 'size' | 'createdAt' | 'status';
export type SortOrder = 'asc' | 'desc';

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  status: FileStatus;
  createdAt: string;
  updatedAt: string;
  uploadTime: string;
  uploader?: string;
  uploadTimeMs?: number;
  downloadCount?: number;
  lastAccessed?: string;
  version?: number;
  checksum?: string;
  expiryDate?: string;
  retentionPeriod?: number;
  lastModifiedBy?: string;
  modificationHistory?: string[];
  accessLevel?: 'public' | 'private' | 'restricted';
  encryptionStatus?: boolean;
  classificationType?: string;
  complianceTags?: string[];
  lastDownloadDate?: string;
  uniqueViewers?: number;
  averageViewDuration?: number;
  peakAccessTimes?: string[];
  compressionRatio?: number;
  duplicateCount?: number;
  storageLocation?: string;
  storageOptimizationFlag?: boolean;
  sharedWith?: string[];
  collaboratorCount?: number;
  commentCount?: number;
  lastCollaborationDate?: string;
}

export interface FileApiResponse extends Omit<FileItem, 'modificationHistory' | 'complianceTags' | 'peakAccessTimes' | 'sharedWith'> {
  modificationHistory?: string[];
  complianceTags?: string[];
  peakAccessTimes?: string[];
  sharedWith?: string[];
}

export interface UploadingFile extends Omit<FileItem, 'id'> {
  id: string;
  progress: number;
}

export interface TableRowData extends FileItem {}

export interface UploadedFile extends Omit<FileItem, 'id'> {
  id: string;
  progress: number;
}

// Add document processing specific types
export type DocumentProcessingStatus = 'uploading' | 'uploaded' | 'processing' | 'error';

export interface DocumentFile {
  file: File;
  id?: number;
  status: DocumentProcessingStatus;
  answersFound?: number;
  error?: string;
}