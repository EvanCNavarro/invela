import React, { useEffect, useState } from 'react';
import { DocumentRow } from './DocumentRow';
import { getCardFields, type CardField } from '@/services/cardService';
import { useQuery } from '@tanstack/react-query';

interface UploadedFile {
  file: File;
  id?: number;
  status: 'uploaded' | 'processing' | 'classified';
  answersFound?: number;
}

interface DocumentProcessingStepProps {
  companyName: string;
  uploadedFiles: UploadedFile[];
}

export function DocumentProcessingStep({ 
  companyName,
  uploadedFiles 
}: DocumentProcessingStepProps) {
  // Fetch card fields using React Query
  const { data: cardFields, isLoading: isLoadingFields } = useQuery({
    queryKey: ['/api/card/fields'],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        2. Extracting Compliance Information
      </h1>

      {/* Loading State */}
      {isLoadingFields && (
        <div className="text-sm text-muted-foreground">
          Loading compliance questions...
        </div>
      )}

      {/* Document List */}
      <div className="space-y-2">
        {uploadedFiles.map((uploadedFile) => (
          <DocumentRow 
            key={uploadedFile.id} 
            file={{
              name: uploadedFile.file.name,
              size: uploadedFile.file.size,
              status: uploadedFile.status,
              answersFound: uploadedFile.answersFound
            }}
          />
        ))}
      </div>

      {/* Debug Info - Remove in production */}
      {cardFields && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md text-sm">
          <p className="font-medium mb-2">Loaded {cardFields.length} compliance questions</p>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(cardFields[0], null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default DocumentProcessingStep;