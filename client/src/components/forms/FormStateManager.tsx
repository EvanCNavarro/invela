/**
 * FormStateManager Component
 * 
 * A centralized component for managing form state transitions across the application.
 * This component handles:
 * 1. Proper read-only state implementation for submitted forms
 * 2. Clear visual indicators of form submission state
 * 3. Consistent form field rendering across different submission states
 * 4. Coordination with the StandardizedUniversalForm for state transitions
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';
import getLogger from '@/utils/logger';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Lock } from 'lucide-react';

const logger = getLogger('FormStateManager');

// Define the possible form states
export type FormState = 
  | 'editable'   // Form can be edited (default state)
  | 'submitting' // Form is in the process of being submitted
  | 'read-only'  // Form has been submitted and is now read-only
  | 'error'      // Form has encountered an error during submission
  | 'disabled';  // Form is temporarily disabled for other reasons

// Context interface
interface FormStateContextType {
  formState: FormState;
  setFormState: (state: FormState) => void;
  setReadOnly: (isReadOnly: boolean) => void;
  isReadOnly: boolean;
  submissionTimestamp: Date | null;
  submittedBy: string | null;
  taskId: number | null;
  setSubmissionData: (data: {
    timestamp?: Date;
    submittedBy?: string;
    taskId?: number;
  }) => void;
}

// Create the context with default values
const FormStateContext = createContext<FormStateContextType>({
  formState: 'editable',
  setFormState: () => {},
  setReadOnly: () => {},
  isReadOnly: false,
  submissionTimestamp: null,
  submittedBy: null,
  taskId: null,
  setSubmissionData: () => {}
});

// Hook for components to use the form state
export const useFormState = () => useContext(FormStateContext);

// Props interface
interface FormStateManagerProps {
  children: React.ReactNode;
  initialState?: FormState;
  taskId?: number;
  submittedBy?: string;
  submissionTimestamp?: Date | string;
  showStatusBar?: boolean;
}

/**
 * FormStateManager component that provides form state context to its children
 */
export function FormStateManager({
  children,
  initialState = 'editable',
  taskId = null,
  submittedBy = null,
  submissionTimestamp = null,
  showStatusBar = true
}: FormStateManagerProps) {
  // Convert string timestamp to Date if needed
  const initialTimestamp = typeof submissionTimestamp === 'string'
    ? new Date(submissionTimestamp)
    : submissionTimestamp as Date | null;

  // State for form state and metadata
  const [formState, setFormState] = useState<FormState>(initialState);
  const [timestamp, setTimestamp] = useState<Date | null>(initialTimestamp);
  const [submitter, setSubmitter] = useState<string | null>(submittedBy);
  const [task, setTask] = useState<number | null>(taskId);
  
  // Derived state for read-only
  const isReadOnly = useMemo(() => {
    return formState === 'read-only' || formState === 'submitting';
  }, [formState]);

  // Set read-only state as a convenience method
  const setReadOnly = (isReadOnly: boolean) => {
    setFormState(isReadOnly ? 'read-only' : 'editable');
  };

  // Set submission data
  const setSubmissionData = (data: {
    timestamp?: Date;
    submittedBy?: string;
    taskId?: number;
  }) => {
    if (data.timestamp) setTimestamp(data.timestamp);
    if (data.submittedBy) setSubmitter(data.submittedBy);
    if (data.taskId) setTask(data.taskId);
  };

  // Log state changes for debugging
  useEffect(() => {
    logger.info(`Form state changed to: ${formState}`, {
      formState,
      isReadOnly,
      taskId: task,
      timestamp: timestamp?.toISOString() || null
    });
  }, [formState, isReadOnly, task, timestamp]);

  // Create context value
  const contextValue = useMemo(() => ({
    formState,
    setFormState,
    setReadOnly,
    isReadOnly,
    submissionTimestamp: timestamp,
    submittedBy: submitter,
    taskId: task,
    setSubmissionData
  }), [formState, isReadOnly, timestamp, submitter, task]);

  return (
    <FormStateContext.Provider value={contextValue}>
      {showStatusBar && formState !== 'editable' && (
        <FormStatusBar />
      )}
      {children}
    </FormStateContext.Provider>
  );
}

/**
 * Form status bar component for showing the current form state
 */
function FormStatusBar() {
  const { formState, submissionTimestamp, submittedBy } = useFormState();

  // Format the submission timestamp
  const formattedTimestamp = submissionTimestamp
    ? new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(submissionTimestamp)
    : null;

  // Status bar components based on state
  const statusComponents = {
    'read-only': (
      <Alert variant="success" className="mb-4 bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-700">Form Submitted</AlertTitle>
        <AlertDescription className="text-green-700">
          This form was submitted {formattedTimestamp && <>on <strong>{formattedTimestamp}</strong></>}
          {submittedBy && <> by <strong>{submittedBy}</strong></>}. It is now read-only.
        </AlertDescription>
      </Alert>
    ),
    'submitting': (
      <Alert variant="info" className="mb-4 bg-blue-50 border-blue-200">
        <div className="animate-spin mr-2">
          <div className="h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent" />
        </div>
        <AlertTitle className="text-blue-700">Submitting Form</AlertTitle>
        <AlertDescription className="text-blue-700">
          Your form is being submitted. Please wait...
        </AlertDescription>
      </Alert>
    ),
    'error': (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Submission Error</AlertTitle>
        <AlertDescription>
          There was an error submitting the form. Please try again or contact support.
        </AlertDescription>
      </Alert>
    ),
    'disabled': (
      <Alert variant="warning" className="mb-4 bg-yellow-50 border-yellow-200">
        <Lock className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-700">Form Disabled</AlertTitle>
        <AlertDescription className="text-yellow-700">
          This form is currently disabled. Please try again later.
        </AlertDescription>
      </Alert>
    )
  };

  // Return the appropriate status bar or null
  return (
    <div className="form-status-container">
      {statusComponents[formState as keyof typeof statusComponents] || null}
    </div>
  );
}

/**
 * HOC to wrap a form with the FormStateManager
 */
export function withFormStateManager<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<FormStateManagerProps, 'children'> = {}
) {
  return function WithFormStateManager(props: P) {
    return (
      <FormStateManager {...options}>
        <Component {...props} />
      </FormStateManager>
    );
  };
}
