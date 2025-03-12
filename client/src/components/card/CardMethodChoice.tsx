import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { ArrowRight, Upload, ClipboardList } from "lucide-react";

interface CardMethodChoiceProps {
  taskId: number;
  companyName: string;
}

export function CardMethodChoice({ taskId, companyName }: CardMethodChoiceProps) {
  const [, navigate] = useLocation();

  console.log('[CardMethodChoice] Initializing with:', {
    taskId,
    companyName,
    timestamp: new Date().toISOString()
  });

  const handleChoiceClick = (method: 'upload' | 'manual') => {
    console.log('[CardMethodChoice] Choice clicked:', {
      method,
      taskId,
      companyName,
      timestamp: new Date().toISOString()
    });

    if (method === 'upload') {
      console.log('[CardMethodChoice] Upload flow selected - to be implemented');
      navigate(`/task-center/task/card-${companyName}/upload`);
    } else {
      // Navigate to the questionnaire page
      console.log('[CardMethodChoice] Manual entry selected - navigating to questionnaire');
      navigate(`/task-center/task/card-${companyName}/questionnaire`);
    }
  };

  return (
    <div className="container max-w-7xl mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-6">Choose Your Preferred Method</h1>

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
            Upload your existing documentation to automatically fill out the CARD form.
            This method is faster and more efficient.
          </p>

          <div className="mt-4 flex items-center text-blue-500 group-hover:translate-x-2 transition-transform">
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <ul className="space-y-2">
              <li className="flex items-center text-sm text-blue-700">
                <span className="mr-2">✓</span> Faster completion time
              </li>
              <li className="flex items-center text-sm text-blue-700">
                <span className="mr-2">✓</span> Automated data extraction
              </li>
              <li className="flex items-center text-sm text-blue-700">
                <span className="mr-2">✓</span> Higher accuracy
              </li>
            </ul>
          </div>
        </Card>

        {/* Manual Option */}
        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-shadow group"
          onClick={() => handleChoiceClick('manual')}
        >
          <div className="flex items-center mb-4">
            <ClipboardList className="h-8 w-8 text-gray-500 mr-3" />
            <h2 className="text-xl font-semibold">Manual Entry</h2>
          </div>

          <p className="text-gray-600 mb-4">
            Manually fill out the CARD form by answering each question individually.
            Choose this if you prefer to input information directly.
          </p>

          <div className="mt-4 flex items-center text-gray-500 group-hover:translate-x-2 transition-transform">
            Start Manual Process <ArrowRight className="ml-2 h-4 w-4" />
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <ul className="space-y-2">
              <li className="flex items-center text-sm text-gray-600">
                <span className="mr-2">•</span> Step-by-step guidance
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <span className="mr-2">•</span> Direct input control
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <span className="mr-2">•</span> No document preparation needed
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}