import React from 'react';
import { cn } from '@/lib/utils';
import { StatusIcon } from './StatusIcon';
import { createEnhancedLogger } from '@/utils/enhanced-logger';

// Create a silent logger for this component - disable all logging
const logger = createEnhancedLogger('SectionNavigation', 'uiComponents', {
  disableAllLogs: true,
  preserveErrors: true  // Keep only critical errors
});

// Section model for the navigation component
export interface FormSection {
  id: string | number;
  title: string;
  description?: string;
  order?: number;
  collapsed?: boolean;
  fields?: any[];
}

// Section status information
export interface SectionStatusInfo {
  id: string | number;
  title: string;
  status: 'not-started' | 'in-progress' | 'completed';
  totalFields: number;
  filledFields: number;
  remainingFields: number;
  progress: number; // 0-100
  reviewStatus?: 'locked' | 'unlocked' | 'submitted'; // For the review section
}

// Props for the SectionNavigation component
export interface SectionNavigationProps {
  sections: FormSection[];
  sectionStatuses: SectionStatusInfo[];
  activeSection: number;
  onSectionChange: (sectionIndex: number) => void;
  className?: string;
}

// Desktop/tablet version of the section navigation component
export const SectionNavigation: React.FC<SectionNavigationProps> = ({
  sections,
  sectionStatuses,
  activeSection,
  onSectionChange,
  className,
}) => {
  return (
    <div className={cn("w-full mb-0", className)}>
      <div className="flex flex-col md:flex-row">
        {sections.map((section, index) => {
          const isActive = index === activeSection;
          const sectionNumber = index + 1;
          const isReviewSection = section.title === 'Review & Submit';
          
          // Find status for this section
          const status = sectionStatuses.find(s => s.id === section.id) || {
            id: section.id,
            title: section.title,
            status: 'not-started',
            totalFields: 0,
            filledFields: 0,
            remainingFields: 0,
            progress: 0
          };
          
          // Calculate if all other sections are completed
          // This is a more reliable way to check if review should be unlocked
          const allOtherSectionsCompleted = sectionStatuses
            .filter(s => s.id !== section.id)  // Exclude current section
            .every(s => s.status === 'completed');
            
          // The section is completed if its status is 'completed'
          const isCompleted = status.status === 'completed';
          
          // Generate status text based on status and whether it's the review section
          let statusText = '';
          let reviewStatus: 'locked' | 'unlocked' | 'submitted' = 'locked';
          
          if (isReviewSection) {
            // For Review & Submit section
            if (status.status === 'completed') {
              statusText = 'Submitted';
              reviewStatus = 'submitted';
            } else if (allOtherSectionsCompleted) {
              // If all other sections are completed, review is unlocked
              statusText = 'Unlocked';
              reviewStatus = 'unlocked';
            } else {
              statusText = 'Locked';
              reviewStatus = 'locked';
            }
          } else {
            // For regular sections
            if (status.status === 'completed') {
              statusText = 'Completed';
            } else if (status.status === 'in-progress') {
              statusText = `In Progress (${status.remainingFields} remaining)`;
            } else {
              statusText = `Not Started (${status.totalFields} remaining)`;
            }
          }
          
          // Removed section status logging to eliminate console spam
          
          return (
            <div
              key={section.id}
              onClick={() => {
                // Only allow clicking on Review & Submit if form is completed
                if (isReviewSection && reviewStatus === 'locked') {
                  // Do nothing if Review & Submit is locked
                  return;
                }
                
                onSectionChange(index);
              }}
              className={cn(
                "relative flex-1 px-4 py-3 transition-all duration-200 border-b-2",
                // Active tabs have subtle background, inactive tabs have white background
                isActive ? "border-primary bg-blue-50" : "border-transparent bg-white", 
                isCompleted && !isActive ? "border-emerald-500" : "",
                // Don't show as clickable if Review & Submit is locked
                (isReviewSection && reviewStatus === 'locked') ? "opacity-80 cursor-not-allowed" : "hover:bg-gray-50 cursor-pointer",
                // First item in row with rounded left
                index === 0 ? "rounded-tl-md" : ""
              )}
            >
              {/* Section number and title on first line */}
              <div className="w-full">
                <span 
                  className={cn(
                    "font-medium text-sm",
                    isActive ? "text-primary" : 
                    isCompleted ? "text-emerald-600" : "text-gray-700"
                  )}
                >
                  {sectionNumber}. {section.title}
                </span>
              </div>
              
              {/* Status text with icon on second line */}
              <div className="flex items-center mt-2">
                {/* Status icon using custom component */}
                <span className="mr-2">
                  {isReviewSection ? (
                    <StatusIcon 
                      isCompleted={isCompleted} 
                      isActive={isActive} 
                      size={14} 
                      variant="review" 
                      reviewStatus={reviewStatus} 
                    />
                  ) : (
                    <StatusIcon 
                      isCompleted={isCompleted} 
                      isActive={isActive} 
                      size={14} 
                    />
                  )}
                </span>
                
                {/* Status text */}
                <span 
                  className={cn(
                    "text-xs",
                    isCompleted || (isReviewSection && reviewStatus === 'submitted') ? "text-emerald-500" : 
                    isActive ? "text-primary" : "text-gray-400"
                  )}
                >
                  {statusText}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Mobile-optimized version for small screens
export const SectionNavigationMobile: React.FC<SectionNavigationProps> = ({
  sections,
  sectionStatuses,
  activeSection,
  onSectionChange,
  className,
}) => {
  return (
    <div className={cn("w-full mb-0 overflow-x-auto", className)}>
      <div className="flex whitespace-nowrap min-w-full">
        {sections.map((section, index) => {
          const isActive = index === activeSection;
          const sectionNumber = index + 1;
          const isReviewSection = section.title === 'Review & Submit';
          
          // Find status for this section
          const status = sectionStatuses.find(s => s.id === section.id) || {
            id: section.id,
            title: section.title,
            status: 'not-started',
            totalFields: 0,
            filledFields: 0,
            remainingFields: 0,
            progress: 0
          };
          
          // Calculate if all other sections are completed
          // This is a more reliable way to check if review should be unlocked
          const allOtherSectionsCompleted = sectionStatuses
            .filter(s => s.id !== section.id)  // Exclude current section
            .every(s => s.status === 'completed');
            
          // The section is completed if its status is 'completed'
          const isCompleted = status.status === 'completed';
          
          // Generate status text based on status and whether it's the review section
          let statusText = '';
          let reviewStatus: 'locked' | 'unlocked' | 'submitted' = 'locked';
          
          if (isReviewSection) {
            // For Review & Submit section
            if (status.status === 'completed') {
              statusText = 'Submitted';
              reviewStatus = 'submitted';
            } else if (allOtherSectionsCompleted) {
              // If all other sections are completed, review is unlocked
              statusText = 'Unlocked';
              reviewStatus = 'unlocked';
            } else {
              statusText = 'Locked';
              reviewStatus = 'locked';
            }
          } else {
            // For regular sections
            if (status.status === 'completed') {
              statusText = 'Completed';
            } else if (status.status === 'in-progress') {
              statusText = `In Progress (${status.remainingFields} remaining)`;
            } else {
              statusText = `Not Started (${status.totalFields} remaining)`;
            }
          }
          
          return (
            <div
              key={section.id}
              onClick={() => {
                // Only allow clicking on Review & Submit if form is completed
                if (isReviewSection && reviewStatus === 'locked') {
                  // Do nothing if Review & Submit is locked
                  return;
                }
                
                onSectionChange(index);
              }}
              className={cn(
                "inline-block px-4 py-3 transition-all duration-200 border-b-2",
                "min-w-[180px]",
                // Active tabs have subtle background, inactive tabs have white background
                isActive ? "border-primary bg-blue-50" : "border-transparent bg-white", 
                isCompleted && !isActive ? "border-emerald-500" : "",
                // Don't show as clickable if Review & Submit is locked
                (isReviewSection && reviewStatus === 'locked') ? "opacity-80 cursor-not-allowed" : "hover:bg-gray-50 cursor-pointer",
                index === 0 ? "rounded-tl-md" : ""
              )}
            >
              {/* Section number and title on first line */}
              <div className="w-full">
                <span 
                  className={cn(
                    "font-medium text-sm",
                    isActive ? "text-primary" : 
                    isCompleted ? "text-emerald-600" : "text-gray-700"
                  )}
                >
                  {sectionNumber}. {section.title}
                </span>
              </div>
              
              {/* Status text with icon on second line */}
              <div className="flex items-center mt-2">
                {/* Status icon using custom component */}
                <span className="mr-2">
                  {isReviewSection ? (
                    <StatusIcon 
                      isCompleted={isCompleted} 
                      isActive={isActive} 
                      size={14} 
                      variant="review" 
                      reviewStatus={reviewStatus} 
                    />
                  ) : (
                    <StatusIcon 
                      isCompleted={isCompleted} 
                      isActive={isActive} 
                      size={14} 
                    />
                  )}
                </span>
                
                {/* Status text */}
                <span 
                  className={cn(
                    "text-xs",
                    isCompleted || (isReviewSection && reviewStatus === 'submitted') ? "text-emerald-500" : 
                    isActive ? "text-primary" : "text-gray-400"
                  )}
                >
                  {statusText}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Responsive wrapper that uses the appropriate component based on screen size
export const ResponsiveSectionNavigation: React.FC<SectionNavigationProps> = (props) => {
  return (
    <>
      {/* Desktop version - visible on md screens and up */}
      <div className="hidden md:block">
        <SectionNavigation {...props} />
      </div>
      
      {/* Mobile version - visible on small screens */}
      <div className="block md:hidden">
        <SectionNavigationMobile {...props} />
      </div>
    </>
  );
};

export default ResponsiveSectionNavigation;