/**
 * ========================================
 * Animation Constants
 * ========================================
 * 
 * Unified animation timing and easing system for consistent
 * user experience across the application.
 * 
 * Design Principles:
 * - Hierarchy-based timing: Container → Content → Actions
 * - Content-aware delays: Text → Images → Interactive elements
 * - Static element preservation: Navigation/buttons fade only
 * - Professional, snappy feel with smooth transitions
 */

// Base easing curve for all animations
export const ANIMATION_EASING = [0.22, 1, 0.36, 1] as const;

// Duration categories
export const ANIMATION_DURATION = {
  // Page/modal transitions
  PAGE: 0.6,
  // Content staging
  CONTENT: 0.4,
  // Micro-interactions
  MICRO: 0.2,
} as const;

// Stagger delays for content staging
export const ANIMATION_DELAY = {
  // Text content appears first
  TEXT: 0,
  // Form fields with incremental stagger
  FIELD_BASE: 0.05,
  // Images after text
  IMAGE: 0.1,
  // Action buttons last
  ACTION: 0.2,
} as const;

// Movement amounts for entrance animations
export const ANIMATION_MOVEMENT = {
  // Subtle vertical movement for content
  CONTENT_Y: 10,
  // Larger movement for page transitions
  PAGE_Y: 20,
  // Horizontal movement for hero sections
  PAGE_X: 40,
} as const;

// Animation variants for framer-motion
export const ANIMATION_VARIANTS = {
  // Standard content entrance
  contentReveal: {
    initial: { opacity: 0, y: ANIMATION_MOVEMENT.CONTENT_Y },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -ANIMATION_MOVEMENT.CONTENT_Y },
  },
  
  // Static elements (headers, buttons) - fade only
  staticReveal: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  
  // Page/modal entrance
  pageReveal: {
    initial: { opacity: 0, y: ANIMATION_MOVEMENT.PAGE_Y },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -ANIMATION_MOVEMENT.PAGE_Y },
  },
  
  // Hero section with horizontal movement
  heroReveal: (direction: 'left' | 'right' = 'left') => ({
    initial: { 
      opacity: 0, 
      x: direction === 'left' ? -ANIMATION_MOVEMENT.PAGE_X : ANIMATION_MOVEMENT.PAGE_X 
    },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: direction === 'left' ? ANIMATION_MOVEMENT.PAGE_X : -ANIMATION_MOVEMENT.PAGE_X },
  }),
} as const;

// Common transition configurations
export const ANIMATION_TRANSITIONS = {
  // Standard content transition
  content: {
    duration: ANIMATION_DURATION.CONTENT,
    ease: ANIMATION_EASING,
  },
  
  // Page transition
  page: {
    duration: ANIMATION_DURATION.PAGE,
    ease: ANIMATION_EASING,
  },
  
  // Micro-interaction
  micro: {
    duration: ANIMATION_DURATION.MICRO,
    ease: ANIMATION_EASING,
  },
  
  // Staggered content with delay
  staggered: (delay: number) => ({
    duration: ANIMATION_DURATION.CONTENT,
    ease: ANIMATION_EASING,
    delay,
  }),
} as const;