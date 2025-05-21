import React from 'react';
import { cn } from '@/lib/utils';
import { CircleCheck, CircleDashed, CircleDotDashed } from 'lucide-react';

// Desktop/tablet version of the section navigation component
export const SectionNavigation = ({ sections, activeSection, completedSections, onSectionChange, className }) => {
  return (
    <div className={cn("w-full bg-white rounded-md mb-6", className)}>
      <div className="flex flex-col md:flex-row">
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
                "relative flex-1 px-4 py-3 cursor-pointer transition-all duration-200 border-b-2",
                isActive ? "border-primary bg-slate-50" : "border-transparent",
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
                {/* Status icon */}
                <span className="mr-2">
                  {isCompleted && (
                    <CircleCheck size={14} className="text-emerald-500" />
                  )}
                  {!isCompleted && isActive && (
                    <CircleDotDashed size={14} className="text-primary" />
                  )}
                  {!isCompleted && !isActive && (
                    <CircleDashed size={14} className="text-gray-400" />
                  )}
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
