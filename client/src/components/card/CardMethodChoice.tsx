import { Card } from '@/components/ui/card';
import { Upload, PenLine } from 'lucide-react';

export interface CardMethodChoiceProps {
  taskId?: number; // Making this optional to accommodate different usages
  companyName: string;
  onMethodSelect: (method: 'upload' | 'manual') => void;
  title?: string; // Optional title for the card component
  description?: string; // Optional description for context
}

/**
 * Component that allows the user to choose between uploading a document
 * or manually filling out a form.
 * 
 * This is used across different task types (card, ky3p, open_banking)
 * and supports optional title and description props.
 */
export function CardMethodChoice({ 
  taskId,
  companyName, 
  onMethodSelect,
  title = 'Choose Your Preferred Method',
  description
}: CardMethodChoiceProps) {
  const handleChoiceClick = (method: 'upload' | 'manual') => {
    onMethodSelect(method);
  };

  return (
    <div className="w-full py-4">
      <h2 className="text-xl font-medium mb-4">{title}</h2>
      
      {description && (
        <p className="text-muted-foreground mb-6">
          {description}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recommended Upload Option */}
        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-shadow relative overflow-hidden group border-2 border-blue-500"
          onClick={() => handleChoiceClick('upload')}
        >
          <div className="absolute top-2 right-2 px-2 py-1 bg-blue-100 text-blue-600 rounded text-sm">
            Recommended
          </div>

          <div className="flex items-center mb-4">
            <Upload className="h-8 w-8 text-blue-500 mr-3" />
            <h2 className="text-xl font-semibold">Document Upload</h2>
          </div>

          <p className="text-gray-600 mb-4">
            Upload your existing documentation to automatically fill out the compliance form.
            This method is faster and more efficient.
          </p>

          <ul className="text-gray-600 space-y-2 mb-4">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Supported formats: PDF, DOC, DOCX, XLS, XLSX</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Intelligent document analysis extracts relevant data</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Saves time by avoiding manual data entry</span>
            </li>
          </ul>

          <div className="bg-blue-50 p-3 rounded-md text-blue-700 text-sm">
            <strong>Recommended for:</strong> Organizations with existing compliance documentation
          </div>
        </Card>

        {/* Manual Entry Option */}
        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-shadow relative overflow-hidden group"
          onClick={() => handleChoiceClick('manual')}
        >
          <div className="flex items-center mb-4">
            <PenLine className="h-8 w-8 text-primary mr-3" />
            <h2 className="text-xl font-semibold">Manual Entry</h2>
          </div>

          <p className="text-gray-600 mb-4">
            Enter information manually through our guided form interface.
            Includes helpful tooltips and contextual guidance.
          </p>

          <ul className="text-gray-600 space-y-2 mb-4">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Step-by-step guided form with validation</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Save progress and continue later</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>In-context help for complex questions</span>
            </li>
          </ul>

          <div className="bg-gray-50 p-3 rounded-md text-gray-700 text-sm">
            <strong>Recommended for:</strong> Organizations collecting information for the first time
          </div>
        </Card>
      </div>
    </div>
  );
}