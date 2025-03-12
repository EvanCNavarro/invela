import React, { createContext, useContext, useState, ReactNode } from 'react';

interface File {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: Date;
  accessLevel?: 'public' | 'private' | 'restricted';
  encryptionStatus?: boolean;
  classificationType?: string;
}

interface FileContextType {
  files: File[];
  setFiles: (files: File[]) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  addFile: (file: File) => void;
  removeFile: (fileId: string) => void;
  updateFile: (fileId: string, updates: Partial<File>) => void;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

interface FileProviderProps {
  children: ReactNode;
}

export const FileProvider: React.FC<FileProviderProps> = ({ children }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const addFile = (file: File) => {
    setFiles((prevFiles) => [...prevFiles, file]);
  };

  const removeFile = (fileId: string) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId));
    if (selectedFile && selectedFile.id === fileId) {
      setSelectedFile(null);
    }
  };

  const updateFile = (fileId: string, updates: Partial<File>) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === fileId ? { ...file, ...updates } : file
      )
    );
    
    if (selectedFile && selectedFile.id === fileId) {
      setSelectedFile({ ...selectedFile, ...updates });
    }
  };

  return (
    <FileContext.Provider
      value={{
        files,
        setFiles,
        selectedFile,
        setSelectedFile,
        addFile,
        removeFile,
        updateFile
      }}
    >
      {children}
    </FileContext.Provider>
  );
};

export const useFile = (): FileContextType => {
  const context = useContext(FileContext);
  
  if (context === undefined) {
    throw new Error('useFile must be used within a FileProvider');
  }
  
  return context;
};

export { FileContext };