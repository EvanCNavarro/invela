/**
 * Modal Service for Form Submission
 * 
 * This service manages the state of success and error modals that appear after form submissions.
 * It provides a centralized way to show/hide modals and manage their content across the application.
 */
import { create } from 'zustand';

export interface SuccessModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  actions: string[];
  returnPath?: string;
  returnLabel?: string;
  onClose?: () => void;
}

export interface ErrorModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  returnPath?: string;
  returnLabel?: string;
  onClose?: () => void;
}

interface ModalState {
  // Success modal state
  successModal: SuccessModalProps;
  showSuccessModal: (props: Omit<SuccessModalProps, 'isOpen'>) => void;
  hideSuccessModal: () => void;
  
  // Error modal state
  errorModal: ErrorModalProps;
  showErrorModal: (props: Omit<ErrorModalProps, 'isOpen'>) => void;
  hideErrorModal: () => void;
}

const defaultSuccessModal: SuccessModalProps = {
  isOpen: false,
  title: 'Success',
  description: 'Operation completed successfully',
  actions: [],
  returnPath: '/tasks',
  returnLabel: 'Return to Tasks'
};

const defaultErrorModal: ErrorModalProps = {
  isOpen: false,
  title: 'Error',
  description: 'An error occurred',
  returnPath: '/tasks',
  returnLabel: 'Return to Tasks'
};

const useModalStore = create<ModalState>((set) => ({
  // Success modal state and actions
  successModal: defaultSuccessModal,
  showSuccessModal: (props) => set({ 
    successModal: { 
      ...props, 
      isOpen: true 
    } 
  }),
  hideSuccessModal: () => {
    // Call the onClose callback if it exists
    const onClose = useModalStore.getState().successModal.onClose;
    if (onClose) {
      onClose();
    }
    
    // Reset the modal state
    set({ 
      successModal: defaultSuccessModal 
    });
  },
  
  // Error modal state and actions
  errorModal: defaultErrorModal,
  showErrorModal: (props) => set({ 
    errorModal: { 
      ...props, 
      isOpen: true 
    } 
  }),
  hideErrorModal: () => {
    // Call the onClose callback if it exists
    const onClose = useModalStore.getState().errorModal.onClose;
    if (onClose) {
      onClose();
    }
    
    // Reset the modal state
    set({ 
      errorModal: defaultErrorModal 
    });
  }
}));

// Export a service object for easier consumption elsewhere in the codebase
export const modalService = {
  // Success modal methods
  showSuccessModal: (props: Omit<SuccessModalProps, 'isOpen'>) => {
    useModalStore.getState().showSuccessModal(props);
  },
  hideSuccessModal: () => {
    useModalStore.getState().hideSuccessModal();
  },
  getSuccessModalState: () => useModalStore.getState().successModal,
  
  // Error modal methods
  showErrorModal: (props: Omit<ErrorModalProps, 'isOpen'>) => {
    useModalStore.getState().showErrorModal(props);
  },
  hideErrorModal: () => {
    useModalStore.getState().hideErrorModal();
  },
  getErrorModalState: () => useModalStore.getState().errorModal,
  
  // Hooks for consuming in components
  useSuccessModal: () => {
    const { successModal, hideSuccessModal } = useModalStore();
    return { ...successModal, onClose: hideSuccessModal };
  },
  useErrorModal: () => {
    const { errorModal, hideErrorModal } = useModalStore();
    return { ...errorModal, onClose: hideErrorModal };
  }
};

export default modalService;