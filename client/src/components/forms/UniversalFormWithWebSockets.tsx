/**
 * UniversalFormWithWebSockets Component
 * 
 * This component extends the existing UniversalForm component with WebSocket
 * integration for real-time form submission status updates.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { FormSubmissionListener, FormSubmissionEvent } from './FormSubmissionListener';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { FormServiceInterface } from '@/services/formService';
import { submitFormWithWebSocketUpdates } from '@/services/form-submission-service';
import getLogger from '@/utils/logger';

const logger = getLogger('UniversalFormWithWebSockets');

interface SubmissionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  taskType: string;
  submissionDate: string;
}

// Simple success modal component
const SubmissionSuccessModal: React.FC<SubmissionSuccessModalProps> = ({ 
  isOpen, 
  onClose, 
  taskId, 
  taskType, 
  submissionDate 
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Form Submitted Successfully</h2>
        <p className="mb-2">Your {taskType} form has been successfully submitted.</p>
        <p className="mb-4 text-sm text-gray-500">Submission date: {new Date(submissionDate).toLocaleString()}</p>
        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

interface UniversalFormWithWebSocketsProps {
  taskId?: number;
  taskType: string;
  companyId?: number;
  formService: FormServiceInterface | null;
  onSubmissionComplete?: (result: any) => void;
}

export const UniversalFormWithWebSockets: React.FC<UniversalFormWithWebSocketsProps> = ({
  taskId,
  taskType,
  companyId,
  formService,
  onSubmissionComplete
}) => {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<FormSubmissionEvent | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  
  // Setup form
  const form = useForm({
    defaultValues: formData,
  });
  
  useEffect(() => {
    if (formService) {
      formService.getFormData().then(data => {
        setFormData(data);
        form.reset(data);
      }).catch(err => {
        setError(`Error loading form data: ${err.message}`);
      });
    }
  }, [formService, form]);
  
  // Handle form submission
  const handleSubmit = async (data: Record<string, any>) => {
    if (!taskId || !formService) {
      toast({
        title: "Form submission error",
        description: "Missing task ID or form service",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Save form data to the server
      await submitFormWithWebSocketUpdates({
        taskId,
        formType: taskType,
        companyId,
        formData: data,
        showToasts: true
      });
      
      // The WebSocket listener will handle the success/error toasts
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Form submission error:', error);
      
      setIsSubmitting(false);
    }
  };
  
  // WebSocket Event Handlers
  const handleSubmissionSuccess = useCallback((event: FormSubmissionEvent) => {
    logger.info('Form submission successful:', event);
    setIsSubmitting(false);
    setSubmissionResult(event);
    setShowSuccessModal(true);
    
    if (onSubmissionComplete) {
      onSubmissionComplete(event);
    }
  }, [onSubmissionComplete]);
  
  const handleSubmissionError = useCallback((event: FormSubmissionEvent) => {
    logger.error('Form submission error:', event);
    setIsSubmitting(false);
    
    // Error toast is handled by the FormSubmissionListener
  }, []);
  
  const handleSubmissionInProgress = useCallback((event: FormSubmissionEvent) => {
    logger.info('Form submission in progress:', event);
    setIsSubmitting(true);
    
    // In-progress toast is handled by the FormSubmissionListener
  }, []);
  
  // Render the form
  return (
    <div className="universal-form-container w-full max-w-4xl mx-auto">
      {/* WebSocket Form Submission Listener */}
      {taskId && (
        <FormSubmissionListener
          taskId={taskId}
          formType={taskType}
          onSuccess={handleSubmissionSuccess}
          onError={handleSubmissionError}
          onInProgress={handleSubmissionInProgress}
          showToasts={true}
        />
      )}
      
      {/* Submission Success Modal */}
      {showSuccessModal && submissionResult && (
        <SubmissionSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          taskId={taskId || 0}
          taskType={taskType}
          submissionDate={submissionResult.submissionDate || new Date().toISOString()}
        />
      )}
      
      {loading && (
        <div className="flex items-center justify-center h-full py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-2">Loading form...</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error loading form</p>
          <p>{error}</p>
        </div>
      )}
      
      {!loading && !error && formService && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left column: Section Navigation */}
              <div className="w-full md:w-1/4">
                <div className="bg-gray-50 p-4 rounded-lg sticky top-4">
                  <h3 className="text-lg font-medium mb-2">Sections</h3>
                  <nav className="space-y-1">
                    {formService.getSections().map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 focus:outline-none"
                        onClick={() => {
                          const sectionElement = document.getElementById(`section-${section.id}`);
                          if (sectionElement) {
                            sectionElement.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                      >
                        {section.title}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
              
              {/* Right column: Form Fields */}
              <div className="w-full md:w-3/4 space-y-6">
                {formService.getSections().map((section) => (
                  <div
                    key={section.id}
                    id={`section-${section.id}`}
                    className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
                  >
                    <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
                    {section.description && (
                      <p className="text-gray-600 mb-4">{section.description}</p>
                    )}
                    
                    <div className="space-y-4">
                      {section.fields.map((field) => (
                        <div key={field.name} className="form-field">
                          {/* Render fields based on type */}
                          {formService.renderField(field, form)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {/* Form Actions */}
                <div className="flex justify-end gap-2 py-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setLocation('/task-center')}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Submitting...
                      </>
                    ) : 'Submit'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};

export default UniversalFormWithWebSockets;