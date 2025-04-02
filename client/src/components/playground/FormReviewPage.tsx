import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, ArrowLeft, ArrowUp } from 'lucide-react';

export interface FormReviewPageProps {
  formData: Record<string, any>;
  fieldConfigs: Record<string, any>; // Map of field names to their configs
  onBack: () => void;
  onSubmit: () => void;
  isSubmitted?: boolean; // New prop to control conditional rendering
}

export const FormReviewPage = ({ 
  formData, 
  fieldConfigs, 
  onBack, 
  onSubmit,
  isSubmitted = false
}: FormReviewPageProps) => {
  // If the component re-renders due to parent state changes, we need to ensure the submission state is respected
  const [internalIsSubmitted, setInternalIsSubmitted] = useState(isSubmitted);
  
  // Track when this component renders with detailed logging
  useEffect(() => {
    console.log('[FormReviewPage] Component rendered:', { 
      internalIsSubmitted,
      receivedIsSubmittedProp: isSubmitted,
      timestamp: new Date().toISOString()
    });
    
    // Once the form is submitted (either internal or external state), store it in localStorage as a backup
    if (internalIsSubmitted || isSubmitted) {
      const formId = JSON.stringify(formData).slice(0, 40); // Create a pseudo-id from form data
      try {
        localStorage.setItem(`form_${formId}_submitted`, 'true');
        console.log('[FormReviewPage] Submission state preserved in localStorage');
      } catch (e) {
        console.warn('[FormReviewPage] Could not store submission state in localStorage');
      }
    }
  }, [internalIsSubmitted, isSubmitted, formData]);
  
  // Enhanced state synchronization with parent
  useEffect(() => {
    console.log('[FormReviewPage] Checking submission state:', { 
      internalState: internalIsSubmitted, 
      propState: isSubmitted,
      timestamp: new Date().toISOString()
    });
    
    // Prioritize the submitted state - always use true if either is true
    const shouldBeSubmitted = isSubmitted || internalIsSubmitted;
    
    if (shouldBeSubmitted !== internalIsSubmitted) {
      console.log('[FormReviewPage] Updating submission state to:', shouldBeSubmitted);
      
      // Store submission state in multiple ways for redundancy
      try {
        // 1. Store in localStorage with task/form specific key
        const formId = JSON.stringify(formData).slice(0, 40);
        localStorage.setItem(`form_${formId}_submitted`, 'true');
        
        // 2. Store in sessionStorage as well
        sessionStorage.setItem('last_form_submitted', 'true');
        
        // 3. Set component state
        setInternalIsSubmitted(true);
        
        console.log('[FormReviewPage] Successfully persisted submission state');
      } catch (e) {
        console.warn('[FormReviewPage] Error persisting state:', e);
      }
    }
  }, [isSubmitted, internalIsSubmitted, formData]);
  // Filter out empty fields and create entries with their corresponding question
  const formEntries = Object.entries(formData)
    .filter(([_, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({
      fieldName: key,
      question: fieldConfigs[key]?.question || key,
      value: String(value)
    }));

  // Get company name from the form data
  const companyName = formData.legalEntityName || "your company";
  const [termsAccepted, setTermsAccepted] = useState(true);
  
  // Get the current user name (using email if full name not available)
  const userName = "John Doe"; // Replace with actual user name when available

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Card className="p-6">
      {/* Header Section - Match the main form header */}
      <div className="mb-4">
        <div className="flex items-center mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">
                {internalIsSubmitted ? "Submission Complete" : "Review Your Responses"}
              </h2>
              <div className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded ${
                internalIsSubmitted 
                  ? "bg-green-100 text-green-600" 
                  : "bg-blue-100 text-blue-600"
              }`}>
                {internalIsSubmitted ? "SUBMITTED" : "IN REVIEW"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-base">
            <span className="text-[#6B7280] font-medium">
              {internalIsSubmitted ? "Thank you for your submission" : "Ready for Submission"}
            </span>
          </div>
        </div>
      </div>
      
      {/* Custom dashed separator line with even spacing */}
      <div className="flex items-center justify-center my-4">
        <div className="w-full h-[2px] border-0 relative">
          <div className="absolute inset-0 flex items-center justify-evenly">
            {[...Array(15)].map((_, i) => (
              <div key={i} className="w-8 h-[2px]" style={{ backgroundColor: "#E5E7EB" }}></div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="space-y-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="mb-2 flex items-center">
          <div className={`${internalIsSubmitted ? 'bg-green-600' : 'bg-blue-600'} h-4 w-1 mr-2 rounded`}></div>
          <h3 className="text-sm font-semibold text-gray-800">
            {internalIsSubmitted ? "SUBMITTED RESPONSES" : "SURVEY ANSWERS FOR REVIEW"}
          </h3>
        </div>
        
        {formEntries.map((entry, index) => (
          <div key={entry.fieldName} className="mb-3 bg-white p-3 border border-gray-100 rounded-md shadow-sm">
            <div className="flex flex-col">
              <p className="text-gray-500 mb-1">
                <span className="font-medium text-gray-600 mr-1">{index + 1}.</span> Q: {entry.question}
              </p>
              <p className="font-semibold text-black flex items-center">
                <Check className="h-4 w-4 mr-1 text-green-600" /> Answer: {entry.value}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Terms and conditions acceptance section - only show if not submitted */}
      {!internalIsSubmitted && (
        <div 
          className={`mt-8 mb-6 p-4 rounded-lg border transition-colors ${
            termsAccepted 
              ? "bg-blue-50 border-blue-200" 
              : "bg-gray-50 border-gray-200"
          } cursor-pointer`}
          onClick={() => setTermsAccepted(!termsAccepted)}
        >
          <div className="flex items-start gap-3">
            <div 
              className={`flex-shrink-0 flex items-center justify-center w-5 h-5 rounded border mt-0.5 transition-colors ${
                termsAccepted 
                  ? "bg-blue-600 border-blue-600" 
                  : "bg-white border-gray-300"
              }`}
              style={{ minWidth: '20px', minHeight: '20px' }}
            >
              {termsAccepted && <Check className="h-3 w-3 text-white" />}
            </div>
            
            <div className="flex-grow">
              <h3 className="text-sm font-bold text-gray-800 mb-2">Submission Terms</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                I, <span className="font-bold text-black">{userName}</span>, acknowledge that I am an authorized representative of <span className="font-bold text-black">{companyName}</span> and certify 
                that all information provided is accurate and complete to the best of my knowledge. I understand that Invela 
                will use this information to assess accreditation status and calculate risk scores. I grant Invela permission 
                to securely store, process, and verify this data in accordance with industry regulations. I accept full 
                responsibility for any inaccuracies or omissions in the submitted data.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between pt-4 border-t">
        {internalIsSubmitted ? (
          <>
            <div /> {/* Empty div for spacing */}
            <Button
              onClick={scrollToTop}
              className="rounded-lg px-4 transition-all hover:bg-blue-700"
            >
              Back to Top
              <ArrowUp className="h-4 w-4 ml-1 text-white" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={onBack}
              className="rounded-lg px-4 transition-all hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            
            <Button
              onClick={onSubmit}
              disabled={!termsAccepted}
              className={`rounded-lg px-4 transition-all ${
                termsAccepted 
                  ? "hover:bg-blue-700 animate-pulse-ring" 
                  : "opacity-50 cursor-not-allowed"
              }`}
            >
              Submit
              <Check className="h-4 w-4 ml-1 text-white" />
            </Button>
          </>
        )}
      </div>
    </Card>
  );
};

export default FormReviewPage;