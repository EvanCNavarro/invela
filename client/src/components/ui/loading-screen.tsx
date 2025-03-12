
import React from 'react';
import { LoadingSpinner } from './loading-spinner';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <LoadingSpinner size="lg" />
      {message && <p className="text-muted-foreground">{message}</p>}
    </div>
  );
}
