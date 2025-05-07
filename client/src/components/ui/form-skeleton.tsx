import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface FormSkeletonWithModeProps {
  readOnly?: boolean;
}

/**
 * FormSkeletonWithMode - A skeleton loader for forms that can show either read-only or editable variants
 * 
 * This displays a content-appropriate skeleton based on whether we're loading a form that
 * will be read-only (for submitted forms) or editable (for forms in progress)
 */
export const FormSkeletonWithMode: React.FC<FormSkeletonWithModeProps> = ({ readOnly = false }) => {
  // If read-only, show the read-only form skeleton with accordions
  if (readOnly) {
    return (
      <div className="w-full mx-auto">
        <div className="bg-white border rounded-md shadow-sm">
          {/* Header skeleton with submission info and download options */}
          <div className="flex justify-between items-center p-6 border-b">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-6 w-20 bg-green-100 rounded"></div>
              </div>
              <Skeleton className="h-8 w-64 mb-2" />
              <div className="flex items-center gap-1 mt-1">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            
            {/* Download button skeleton */}
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
          
          {/* Form content as skeleton accordions */}
          <div className="p-6 space-y-4">
            {/* Multiple sections */}
            {[1, 2, 3, 4].map((section) => (
              <div 
                key={`section-${section}`} 
                className="border border-gray-200 rounded-md overflow-hidden"
              >
                {/* Section header */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </div>
                
                {/* Section content - show only for first "expanded" section */}
                {section === 1 && (
                  <div className="px-4 py-3 space-y-4">
                    {[1, 2, 3, 4].map((field) => (
                      <div key={`field-${field}`} className="border-b border-gray-100 pb-4 last:border-b-0">
                        <Skeleton className="h-5 w-64 mb-2" />
                        <Skeleton className="h-4 w-full max-w-md" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Footer with navigation buttons */}
          <div className="flex justify-between p-6 border-t">
            <Skeleton className="h-9 w-40 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>
      </div>
    );
  }
  
  // Otherwise, show the editable form skeleton with tabs and inputs
  return (
    <div className="w-full mx-auto">
      {/* Form title skeleton */}
      <div className="bg-gray-50 p-6 rounded-t-md mb-6">
        <Skeleton className="h-8 w-72 mb-2" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      
      {/* Progress bar skeleton */}
      <div className="mb-4">
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      
      {/* Tab navigation skeleton */}
      <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5].map((tab) => (
          <Skeleton 
            key={`tab-${tab}`} 
            className={`h-10 w-40 rounded-md ${tab === 1 ? 'bg-primary/20' : ''}`} 
          />
        ))}
      </div>
      
      {/* Form content */}
      <div className="bg-white rounded-b-md p-6 border-t-0">
        {/* Section title */}
        <Skeleton className="h-7 w-64 mb-6" />
        
        {/* Form fields */}
        <div className="space-y-8">
          {[1, 2, 3, 4, 5].map((field) => (
            <div key={`field-${field}`} className="space-y-2">
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-10 w-full" />
              {field === 2 && <Skeleton className="h-4 w-full max-w-sm mt-1" />}
            </div>
          ))}
        </div>
        
        {/* Action buttons */}
        <div className="flex justify-between mt-8">
          <Skeleton className="h-10 w-28 rounded-md" />
          <div className="flex space-x-3">
            <Skeleton className="h-10 w-32 rounded-md" />
            <Skeleton className="h-10 w-32 rounded-md bg-primary/30" />
          </div>
        </div>
      </div>
    </div>
  );
};