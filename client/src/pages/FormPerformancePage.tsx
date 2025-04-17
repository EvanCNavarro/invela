import React from 'react';
import TestRunner from '../utils/tests/TestRunner';
import { initializeOptimizationMonitoring } from '../utils/form-optimization';

/**
 * Form Performance Testing Page
 * 
 * This page hosts the performance test runner component,
 * allowing developers to run various performance tests on forms
 * with different field counts and optimization settings.
 */
export default function FormPerformancePage() {
  // Initialize performance monitoring when the page loads
  React.useEffect(() => {
    // Enable debug mode in development
    initializeOptimizationMonitoring(true);
    
    return () => {
      // Clean up if needed when navigating away
    };
  }, []);
  
  return (
    <div className="container mx-auto py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Form Performance Testing</h1>
        <p className="text-gray-600 mt-2">
          Run performance tests to measure and optimize form rendering and interaction
          with various field counts and optimization strategies.
        </p>
      </header>
      
      <div className="bg-white rounded-lg shadow-md">
        <TestRunner />
      </div>
    </div>
  );
}