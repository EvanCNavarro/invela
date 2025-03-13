
import React from 'react';
import { PageTemplate } from '@/components/ui/page-side-drawer';

const FileVaultPage: React.FC = () => {
  return (
    <PageTemplate title="File Vault">
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">File Vault</h1>
        <p>Access and manage your secure files here.</p>
      </div>
    </PageTemplate>
  );
};

export default FileVaultPage;
