/**
 * Test Page for KY3P Batch Update functionality
 * 
 * This page displays the KY3P Batch Update test component.
 */

import React from 'react';
import { TestKy3pBatchUpdate } from '@/components/test/TestKy3pBatchUpdate';

export default function TestKy3pPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">KY3P Batch Update Tester</h1>
          <p className="text-muted-foreground">
            Test environment for validating the KY3P batch update helper component
          </p>
        </div>
        
        <div className="mt-6">
          <TestKy3pBatchUpdate />
        </div>
      </div>
    </div>
  );
}