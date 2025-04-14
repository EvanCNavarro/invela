import React from 'react';
import { cn } from '@/lib/utils';
import { StatusIcon } from './StatusIcon';
import getLogger from '@/utils/logger';

// Logger instance for this component
const logger = getLogger('SectionNavigation', { 
  levels: { debug: true, info: true, warn: true, error: true } 
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
          
          // The section is completed if its status is 'completed'
          const isCompleted = status.status === 'completed';
          
          // Generate status text based on status
          let statusText = '';
          if (status.status === 'completed') {
            statusText = 'Completed';
          } else if (status.status === 'in-progress') {
            statusText = `In Progress (${status.remainingFields} remaining)`;
          } else {
            statusText = `Not Started (${status.totalFields} remaining)`;
          }
          
          // Log section status for debugging
          logger.debug(`Section ${section.title} status:`, { 
            isActive, 
            isCompleted, 
            status: status.status,
            remaining: status.remainingFields
          });
          
          return (
            <div
              key={section.id}
              onClick={() => onSectionChange(index)}
              className={cn(
                "relative flex-1 px-4 py-3 cursor-pointer transition-all duration-200 border-b-2",
                // Active tabs have white background, inactive tabs have light gray
                isActive ? "border-primary bg-white" : "border-transparent bg-slate-50",
                isCompleted && !isActive ? "border-emerald-500" : "",
                // First item in row with rounded left
                index === 0 ? "rounded-tl-md" : ""
              )}
            >
              {/* Section number and title on first line */}
              <div className="w-full">
                <span 
                  className={cn(
                    "font-medium text-sm",
                    isActive ? "text-primary" : "text-gray-700",
                    isCompleted && !isActive ? "text-emerald-600" : ""
                  )}
                >
                  {sectionNumber}. {section.title}
                </span>
              </div>
              
              {/* Status text with icon on second line */}
              <div className="flex items-center mt-2">
                {/* Status icon using custom component */}
                <span className="mr-2">
                  <StatusIcon isCompleted={isCompleted} isActive={isActive} size={14} />
                </span>
                
                {/* Status text */}
                <span 
                  className={cn(
                    "text-xs",
                    isCompleted ? "text-emerald-500" : 
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
          
          // The section is completed if its status is 'completed'
          const isCompleted = status.status === 'completed';
          
          // Generate status text based on status
          let statusText = '';
          if (status.status === 'completed') {
            statusText = 'Completed';
          } else if (status.status === 'in-progress') {
            statusText = `In Progress (${status.remainingFields} remaining)`;
          } else {
            statusText = `Not Started (${status.totalFields} remaining)`;
          }
          
          return (
            <div
              key={section.id}
              onClick={() => onSectionChange(index)}
              className={cn(
                "inline-block px-4 py-3 cursor-pointer transition-all duration-200 border-b-2",
                "min-w-[180px]",
                // Active tabs have white background, inactive tabs have light gray
                isActive ? "border-primary bg-white" : "border-transparent bg-slate-50",
                isCompleted && !isActive ? "border-emerald-500" : "",
                index === 0 ? "rounded-tl-md" : ""
              )}
            >
              {/* Section number and title on first line */}
              <div className="w-full">
                <span 
                  className={cn(
                    "font-medium text-sm",
                    isActive ? "text-primary" : "text-gray-700",
                    isCompleted && !isActive ? "text-emerald-600" : ""
                  )}
                >
                  {sectionNumber}. {section.title}
                </span>
              </div>
              
              {/* Status text with icon on second line */}
              <div className="flex items-center mt-2">
                {/* Status icon using custom component */}
                <span className="mr-2">
                  <StatusIcon isCompleted={isCompleted} isActive={isActive} size={14} />
                </span>
                
                {/* Status text */}
                <span 
                  className={cn(
                    "text-xs",
                    isCompleted ? "text-emerald-500" : 
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
