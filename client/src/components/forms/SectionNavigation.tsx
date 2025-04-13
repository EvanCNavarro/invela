import React, { useMemo } from 'react';
import { Check, CircleCheck, CircleDashed, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FormSection {
  id: string | number;
  title: string;
  description?: string;
  order?: number;
  collapsed?: boolean;
  fields?: any[];
}

export interface SectionNavigationProps {
  sections: FormSection[];
  activeSection: number;
  completedSections: Record<string | number, boolean>;
  onSectionChange: (sectionIndex: number) => void;
  className?: string;
}

const SectionNavigation: React.FC<SectionNavigationProps> = ({
  sections,
  activeSection,
  completedSections,
  onSectionChange,
  className,
}) => {
  // Calculate section width based on number of sections
  // This ensures proper responsive behavior with up to 8 sections
  const sectionWidth = useMemo(() => {
    const count = sections.length;
    if (count <= 4) return '25%'; // 4 or fewer sections = 25% each
    if (count <= 6) return '16.66%'; // 5-6 sections = 16.66% each
    return '12.5%'; // 7-8 sections = 12.5% each
  }, [sections.length]);

  return (
    <div className={cn("w-full bg-white rounded-md shadow-sm mb-6", className)}>
      <div className="flex flex-row flex-wrap">
        {sections.map((section, index) => {
          const isActive = index === activeSection;
          const isCompleted = completedSections[section.id] === true;
          
          // Get section number for display (1-based index)
          const sectionNumber = index + 1;
          
          // Check if section has fields available
          const fieldsCount = section.fields?.length || 0;
          const filledFieldsCount = section.fields?.filter(field => 
            field.value && field.value.toString().trim() !== ''
          )?.length || 0;
          
          // Determine section status
          const isInProgress = !isCompleted && filledFieldsCount > 0;
          const isNotStarted = !isCompleted && filledFieldsCount === 0;
          const remainingCount = fieldsCount - filledFieldsCount;
          
          // Status text based on completion state
          let statusText = '';
          if (isCompleted) {
            statusText = 'Completed';
          } else if (isInProgress) {
            statusText = `In Progress (${remainingCount} remaining)`;
          } else {
            statusText = `Not Started (${fieldsCount} remaining)`;
          }
          
          return (
            <div
              key={section.id}
              onClick={() => onSectionChange(index)}
              style={{ width: sectionWidth }}
              className={cn(
                "relative px-4 py-3 cursor-pointer transition-all duration-200 border-b-2 hover:bg-gray-50", 
                "flex flex-col items-start justify-center min-h-[60px]",
                isActive ? "border-primary" : "border-transparent",
                isCompleted && !isActive ? "border-emerald-500" : "",
                // Last item in row with full border right
                index === sections.length - 1 ? "rounded-tr-md" : "border-r border-r-gray-200",
                // First item in row with rounded left
                index === 0 ? "rounded-tl-md" : ""
              )}
            >
              {/* Section number and title on first line */}
              <div className="flex items-center w-full">
                <span 
                  className={cn(
                    "font-medium text-sm mr-2",
                    isActive ? "text-primary" : "text-gray-600",
                    isCompleted && !isActive ? "text-emerald-600" : ""
                  )}
                >
                  {sectionNumber}.
                </span>
                <span 
                  className={cn(
                    "font-medium text-sm flex-1",
                    isActive ? "text-primary" : "text-gray-700",
                    isCompleted && !isActive ? "text-emerald-600" : ""
                  )}
                >
                  {section.title}
                </span>
                
                {/* Icon (only on top line) positioned to the far right */}
                <span className="ml-auto pl-2">
                  {isCompleted && (
                    <CircleCheck size={16} className="text-emerald-500" />
                  )}
                  {!isCompleted && (
                    <CircleDashed size={16} className="text-gray-400" />
                  )}
                </span>
              </div>
              
              {/* Status text on second line without any icon */}
              <div className="mt-1">
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
  activeSection,
  completedSections,
  onSectionChange,
  className,
}) => {
  return (
    <div className={cn("w-full bg-white rounded-md shadow-sm mb-6 overflow-x-auto", className)}>
      <div className="flex whitespace-nowrap min-w-full">
        {sections.map((section, index) => {
          const isActive = index === activeSection;
          const isCompleted = completedSections[section.id] === true;
          const sectionNumber = index + 1;
          
          // Check if section has fields available
          const fieldsCount = section.fields?.length || 0;
          const filledFieldsCount = section.fields?.filter(field => 
            field.value && field.value.toString().trim() !== ''
          )?.length || 0;
          
          // Determine section status
          const isInProgress = !isCompleted && filledFieldsCount > 0;
          const isNotStarted = !isCompleted && filledFieldsCount === 0;
          const remainingCount = fieldsCount - filledFieldsCount;
          
          // Status text based on completion state
          let statusText = '';
          if (isCompleted) {
            statusText = 'Completed';
          } else if (isInProgress) {
            statusText = `In Progress (${remainingCount} remaining)`;
          } else {
            statusText = `Not Started (${fieldsCount} remaining)`;
          }
          
          return (
            <div
              key={section.id}
              onClick={() => onSectionChange(index)}
              className={cn(
                "inline-block px-4 py-3 cursor-pointer transition-all duration-200 border-b-2",
                "min-w-[180px]",
                isActive ? "border-primary" : "border-transparent",
                isCompleted && !isActive ? "border-emerald-500" : "",
                index === 0 ? "rounded-tl-md" : ""
              )}
            >
              <div className="flex items-center">
                <span 
                  className={cn(
                    "font-medium text-sm mr-1",
                    isActive ? "text-primary" : "text-gray-700",
                    isCompleted && !isActive ? "text-emerald-600" : ""
                  )}
                >
                  {sectionNumber}. {section.title}
                </span>
                
                {/* Icon (only on top line) positioned to the far right */}
                <span className="ml-auto pl-2">
                  {isCompleted && (
                    <CircleCheck size={14} className="text-emerald-500" />
                  )}
                  {!isCompleted && (
                    <CircleDashed size={14} className="text-gray-400" />
                  )}
                </span>
              </div>
              
              {/* Status text on second line without any icon */}
              <div className="mt-1">
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