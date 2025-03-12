import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  error?: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
}

interface UploadContextType {
  files: UploadingFile[];
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  updateFileProgress: (id: string, progress: number) => void;
  updateFileStatus: (id: string, status: UploadingFile['status'], error?: string) => void;
  getFile: (id: string) => UploadingFile | undefined;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

interface UploadProviderProps {
  children: ReactNode;
}

export const UploadProvider: React.FC<UploadProviderProps> = ({ children }) => {
  const [files, setFiles] = useState<UploadingFile[]>([]);

  const addFiles = (newFiles: File[]) => {
    const uploadingFiles = newFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      progress: 0,
      status: 'pending' as const
    }));
    
    setFiles(prev => [...prev, ...uploadingFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const clearFiles = () => {
    setFiles([]);
  };

  const updateFileProgress = (id: string, progress: number) => {
    setFiles(prev => prev.map(file => 
      file.id === id ? { ...file, progress } : file
    ));
  };

  const updateFileStatus = (id: string, status: UploadingFile['status'], error?: string) => {
    setFiles(prev => prev.map(file => 
      file.id === id ? { ...file, status, error } : file
    ));
  };

  const getFile = (id: string) => {
    return files.find(file => file.id === id);
  };

  return (
    <UploadContext.Provider
      value={{
        files,
        addFiles,
        removeFile,
        clearFiles,
        updateFileProgress,
        updateFileStatus,
        getFile
      }}
    >
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = (): UploadContextType => {
  const context = useContext(UploadContext);
  
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  
  return context;
};

export { UploadContext };