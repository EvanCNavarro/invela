import React from 'react';

/**
 * FormSkeleton - A skeleton loading component for forms
 * Displays a loading animation for the form while actual content is being determined
 */
export const FormSkeleton: React.FC = () => {
  return (
    <div className="w-full mx-auto animate-pulse">
      {/* Form header skeleton */}
      <div className="bg-gray-50 p-6 rounded-t-md mb-6">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/5"></div>
      </div>
      
      {/* Form sections skeleton */}
      <div className="space-y-8 px-6">
        {/* First section */}
        <div>
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          
          {/* Fields */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-100 rounded w-full"></div>
            </div>
            
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-2/5"></div>
              <div className="h-10 bg-gray-100 rounded w-full"></div>
            </div>
            
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-10 bg-gray-100 rounded w-full"></div>
            </div>
          </div>
        </div>
        
        {/* Second section */}
        <div>
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          
          {/* Fields */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/5"></div>
              <div className="h-10 bg-gray-100 rounded w-full"></div>
            </div>
            
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-100 rounded w-full"></div>
            </div>
          </div>
        </div>
        
        {/* Navigation skeleton */}
        <div className="flex justify-between pt-6 border-t">
          <div className="h-10 bg-gray-200 rounded w-24"></div>
          <div className="h-10 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    </div>
  );
};

/**
 * FormSkeletonWithMode - A skeleton loader that changes appearance based on mode
 * This version shows different skeletons for read-only vs editable forms
 */
export const FormSkeletonWithMode: React.FC<{ readOnly?: boolean }> = ({ readOnly = false }) => {
  if (readOnly) {
    // Read-only skeleton has a slightly different appearance
    return (
      <div className="w-full mx-auto animate-pulse">
        {/* Form header skeleton for read-only mode */}
        <div className="bg-white border rounded-md shadow-sm">
          <div className="flex justify-between items-center p-6 border-b">
            <div className="space-y-2">
              <div className="h-5 bg-gray-200 rounded w-48"></div>
              <div className="h-4 bg-gray-200 rounded w-36"></div>
            </div>
            <div className="flex space-x-2">
              <div className="h-8 bg-gray-200 rounded w-20"></div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
          
          {/* Accordion skeleton */}
          <div className="py-4 px-6">
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-md p-3">
                <div className="flex justify-between items-center">
                  <div className="h-5 bg-gray-200 rounded w-36"></div>
                  <div className="h-5 bg-gray-200 rounded-full w-5"></div>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-md p-3">
                <div className="flex justify-between items-center">
                  <div className="h-5 bg-gray-200 rounded w-40"></div>
                  <div className="h-5 bg-gray-200 rounded-full w-5"></div>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-md p-3">
                <div className="flex justify-between items-center">
                  <div className="h-5 bg-gray-200 rounded w-32"></div>
                  <div className="h-5 bg-gray-200 rounded-full w-5"></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer skeleton */}
          <div className="flex justify-between items-center p-6 border-t">
            <div className="h-10 bg-gray-200 rounded w-40"></div>
            <div className="h-10 bg-gray-200 rounded w-10"></div>
          </div>
        </div>
      </div>
    );
  }
  
  // Default to standard form skeleton for editable mode
  return <FormSkeleton />;
};