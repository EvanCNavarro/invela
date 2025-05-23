/**
 * ========================================
 * Modal Service Module
 * ========================================
 * 
 * Centralized modal state management service providing comprehensive
 * success and error modal functionality for form submissions and user
 * interactions. Built with Zustand for lightweight, performant state
 * management with TypeScript safety and predictable state transitions.
 * 
 * Key Features:
 * - Success modal management with customizable actions
 * - Error modal display with comprehensive error handling
 * - Centralized state management across the application
 * - TypeScript interfaces for complete type safety
 * - Flexible navigation and callback support
 * 
 * Dependencies:
 * - Zustand: Lightweight state management library
 * 
 * @module ModalService
 * @version 2.0.0
 * @since 2024-04-15
 */

// ========================================
// IMPORTS
// ========================================

// Zustand state management for lightweight, performant modal state
import { create } from 'zustand';

// ========================================
// CONSTANTS
// ========================================

/**
 * Modal service default configuration values
 * Defines baseline values for modal initialization and behavior
 */
const MODAL_DEFAULTS = {
  DEFAULT_TITLE: 'Notification',
  DEFAULT_DESCRIPTION: 'Operation completed',
  DEFAULT_RETURN_LABEL: 'Continue',
  ANIMATION_DURATION: 300
} as const;

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Success modal properties interface for positive user feedback
 * 
 * Defines comprehensive configuration for success modals including
 * customizable actions, navigation options, and callback handlers
 * for consistent user experience across form submissions.
 */
export interface SuccessModalProps {
  /** Modal visibility state */
  isOpen: boolean;
  /** Primary modal title text */
  title: string;
  /** Detailed description or message content */
  description: string;
  /** Array of action button labels for user choices */
  actions: string[];
  /** Optional navigation path for return action */
  returnPath?: string;
  /** Optional custom label for return button */
  returnLabel?: string;
  /** Optional callback function for modal close events */
  onClose?: () => void;
}

/**
 * Error modal properties interface for error handling and user guidance
 * 
 * Provides comprehensive error modal configuration with navigation
 * support and callback handling for consistent error communication
 * and user recovery workflows throughout the application.
 */
export interface ErrorModalProps {
  /** Modal visibility state */
  isOpen: boolean;
  /** Error modal title text */
  title: string;
  /** Detailed error description or guidance message */
  description: string;
  /** Optional navigation path for recovery action */
  returnPath?: string;
  /** Optional custom label for recovery button */
  returnLabel?: string;
  /** Optional callback function for modal close events */
  onClose?: () => void;
}

/**
 * Modal state management interface for comprehensive modal control
 * 
 * Defines the complete state management structure for both success
 * and error modals with methods for showing, hiding, and configuring
 * modal behavior throughout the application lifecycle.
 */
interface ModalState {
  /** Current success modal configuration and state */
  successModal: SuccessModalProps;
  /** Show success modal with custom configuration */
  showSuccessModal: (props: Omit<SuccessModalProps, 'isOpen'>) => void;
  /** Hide success modal and reset state */
  hideSuccessModal: () => void;
  
  /** Current error modal configuration and state */
  errorModal: ErrorModalProps;
  /** Show error modal with custom configuration */
  showErrorModal: (props: Omit<ErrorModalProps, 'isOpen'>) => void;
  /** Hide error modal and reset state */
  hideErrorModal: () => void;
}

// ========================================
// DEFAULT CONFIGURATIONS
// ========================================

/**
 * Default success modal configuration for consistent user experience
 * 
 * Provides baseline configuration values for success modals with
 * professional messaging and standard navigation patterns.
 */
const defaultSuccessModal: SuccessModalProps = {
  isOpen: false,
  title: MODAL_DEFAULTS.DEFAULT_TITLE,
  description: MODAL_DEFAULTS.DEFAULT_DESCRIPTION,
  actions: [],
  returnPath: '/tasks',
  returnLabel: MODAL_DEFAULTS.DEFAULT_RETURN_LABEL
};

/**
 * Default error modal configuration for consistent error handling
 * 
 * Provides baseline configuration values for error modals with
 * helpful messaging and recovery navigation patterns.
 */
const defaultErrorModal: ErrorModalProps = {
  isOpen: false,
  title: 'Error Occurred',
  description: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
  returnPath: '/tasks',
  returnLabel: MODAL_DEFAULTS.DEFAULT_RETURN_LABEL
};

// ========================================
// STORE IMPLEMENTATION
// ========================================

/**
 * Modal state store implementation using Zustand
 * 
 * Provides centralized modal state management with type-safe operations
 * for both success and error modals. Implements proper callback handling
 * and state reset functionality for consistent modal behavior.
 */
const useModalStore = create<ModalState>((set, get) => ({
  // Success modal state and comprehensive management
  successModal: defaultSuccessModal,
  
  /**
   * Show success modal with custom configuration
   * 
   * @param props Success modal properties without isOpen flag
   */
  showSuccessModal: (props) => set({ 
    successModal: { 
      ...props, 
      isOpen: true 
    } 
  }),
  
  /**
   * Hide success modal with proper cleanup and callback handling
   * 
   * Executes onClose callback if provided and resets modal state
   * to default configuration for consistent behavior.
   */
  hideSuccessModal: () => {
    // Execute onClose callback if provided for proper cleanup
    const currentState = get();
    const onClose = currentState.successModal.onClose;
    
    if (onClose && typeof onClose === 'function') {
      try {
        onClose();
      } catch (error) {
        console.warn('[ModalService] Error executing success modal onClose callback:', error);
      }
    }
    
    // Reset modal state to default configuration
    set({ 
      successModal: defaultSuccessModal 
    });
  },
  
  // Error modal state and comprehensive management
  errorModal: defaultErrorModal,
  
  /**
   * Show error modal with custom configuration
   * 
   * @param props Error modal properties without isOpen flag
   */
  showErrorModal: (props) => set({ 
    errorModal: { 
      ...props, 
      isOpen: true 
    } 
  }),
  
  /**
   * Hide error modal with proper cleanup and callback handling
   * 
   * Executes onClose callback if provided and resets modal state
   * to default configuration for consistent error handling.
   */
  hideErrorModal: () => {
    // Execute onClose callback if provided for proper cleanup
    const currentState = get();
    const onClose = currentState.errorModal.onClose;
    
    if (onClose && typeof onClose === 'function') {
      try {
        onClose();
      } catch (error) {
        console.warn('[ModalService] Error executing error modal onClose callback:', error);
      }
    }
    
    // Reset modal state to default configuration
    set({ 
      errorModal: defaultErrorModal 
    });
  }
}));

// ========================================
// SERVICE EXPORTS
// ========================================

/**
 * Modal service API for convenient modal management throughout the application
 * 
 * Provides simplified access to modal state management functionality with
 * comprehensive methods for both success and error modals. Offers both
 * imperative API for direct usage and reactive hooks for component integration.
 */
export const modalService = {
  // Success modal management methods
  showSuccessModal: (props: Omit<SuccessModalProps, 'isOpen'>) => {
    useModalStore.getState().showSuccessModal(props);
  },
  hideSuccessModal: () => {
    useModalStore.getState().hideSuccessModal();
  },
  getSuccessModalState: () => useModalStore.getState().successModal,
  
  // Error modal management methods
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