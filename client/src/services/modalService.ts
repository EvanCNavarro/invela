/**
 * Modal Service
 * 
 * This service provides a consistent interface for displaying modal dialogs
 * throughout the application, particularly for form submission results.
 */

import { create } from 'zustand';
import getLogger from '@/utils/logger';
import { SuccessAction } from './formSubmissionService';

const logger = getLogger('ModalService');

interface SuccessModalOptions {
  title: string;
  description: string;
  actions?: SuccessAction[];
  onClose?: () => void;
}

interface ErrorModalOptions {
  title: string;
  description: string;
  onClose?: () => void;
}

interface ModalState {
  isSuccessModalOpen: boolean;
  isErrorModalOpen: boolean;
  modalData: {
    title: string;
    description: string;
    actions?: SuccessAction[];
    onClose?: () => void;
  };
  showSuccessModal: (options: SuccessModalOptions) => void;
  showErrorModal: (options: ErrorModalOptions) => void;
  closeModals: () => void;
}

/**
 * Zustand store for managing modal state
 */
export const useModalStore = create<ModalState>((set) => ({
  isSuccessModalOpen: false,
  isErrorModalOpen: false,
  modalData: {
    title: '',
    description: '',
    actions: []
  },
  showSuccessModal: (options) => {
    logger.info(`Showing success modal: ${options.title}`, {
      actionCount: options.actions?.length || 0
    });
    
    set({
      isSuccessModalOpen: true,
      isErrorModalOpen: false,
      modalData: {
        ...options
      }
    });
  },
  showErrorModal: (options) => {
    logger.info(`Showing error modal: ${options.title}`);
    
    set({
      isSuccessModalOpen: false,
      isErrorModalOpen: true,
      modalData: {
        ...options,
        actions: []
      }
    });
  },
  closeModals: () => {
    set(state => {
      // Call onClose callback if provided and if a modal is currently open
      if ((state.isSuccessModalOpen || state.isErrorModalOpen) && state.modalData.onClose) {
        logger.debug('Executing modal onClose callback');
        state.modalData.onClose();
      }
      
      return {
        isSuccessModalOpen: false,
        isErrorModalOpen: false
      };
    });
  }
}));

/**
 * Modal service for managing modals throughout the application
 */
export const modalService = {
  /**
   * Show a success modal
   */
  showSuccessModal: (options: SuccessModalOptions) => {
    useModalStore.getState().showSuccessModal(options);
  },
  
  /**
   * Show an error modal
   */
  showErrorModal: (options: ErrorModalOptions) => {
    useModalStore.getState().showErrorModal(options);
  },
  
  /**
   * Close all modals
   */
  closeModals: () => {
    useModalStore.getState().closeModals();
  }
};

export default modalService;