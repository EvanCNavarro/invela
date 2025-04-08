export interface FileItem {
  id?: number;
  name: string;
  size: number;
  type: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  uploadTime?: number;
  url?: string;
  path?: string;
  metadata?: Record<string, any>;
}