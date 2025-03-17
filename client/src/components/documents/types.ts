// Common types for document handling components
export interface FileData {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export type DocumentStatus = 'uploading' | 'uploaded' | 'processing' | 'processed' | 'error';

export interface UploadedFile {
  id?: number;
  fileData: FileData;
  status: DocumentStatus;
  answersFound?: number;
  error?: string;
}

export interface DocumentRowFile {
  name: string;
  size: number;
  type: string;
  status: DocumentStatus;
  answersFound?: number;
  error?: string;
}