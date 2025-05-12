export type FileStatus = 'uploaded' | 'uploading' | 'error' | 'paused' | 'canceled' | 'deleted' | 'restored';

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  status: FileStatus;
  createdAt: string;
  updatedAt?: string;
  uploadTime?: number;
  url?: string;
  path?: string;
  metadata?: Record<string, any>;
}