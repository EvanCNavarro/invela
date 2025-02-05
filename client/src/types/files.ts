export type FileStatus = 'uploading' | 'uploaded' | 'paused' | 'canceled' | 'deleted' | 'restored';

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

  // File lifecycle tracking
  expiryDate?: string;
  retentionPeriod?: number;
  lastModifiedBy?: string;
  modificationHistory?: string[];

  // Security and compliance
  accessLevel?: 'public' | 'private' | 'restricted';
  encryptionStatus?: boolean;
  classificationType?: string;
  complianceTags?: string[];

  // Access patterns
  lastDownloadDate?: string;
  uniqueViewers?: number;
  averageViewDuration?: number;
  peakAccessTimes?: string[];

  // Storage optimization
  compressionRatio?: number;
  duplicateCount?: number;
  storageLocation?: string;
  storageOptimizationFlag?: boolean;

  // Collaboration
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
