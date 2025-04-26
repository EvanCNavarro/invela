/**
 * Test page for the standardized KY3P form service
 */

import React from 'react';
import { TestStandardizedKy3pUpdate } from '@/components/test/TestStandardizedKy3pUpdate';

export default function TestStandardizedServicePage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">Test Standardized Services</h1>
      <p className="text-gray-500 dark:text-gray-400">
        This page contains test components for standardized form services.
      </p>
      
      <div className="mt-8">
        <TestStandardizedKy3pUpdate />
      </div>
    </div>
  );
}