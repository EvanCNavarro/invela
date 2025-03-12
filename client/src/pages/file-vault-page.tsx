// This file is deprecated in favor of FileVault.tsx
// Redirect to the new implementation
import { Redirect } from "wouter";

export default function FileVaultPage() {
  return <Redirect to="/file-vault" />;
}
import React from 'react';

export const FileVaultPage: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">File Vault</h1>
      <p>File management and document storage center.</p>
    </div>
  );
};

export default FileVaultPage;
