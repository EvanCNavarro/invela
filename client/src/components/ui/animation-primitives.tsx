/**
 * ========================================
 * Animation Primitives
 * ========================================
 * 
 * Reusable animation components that implement the unified
 * animation design language consistently across the app.
 * 
 * Key Components:
 * - StaggeredContainer: Manages child element stagger timing
 * - ContentReveal: Standard content entrance with movement
 * - StaticReveal: Headers/buttons with fade-only animation
 * - ImageReveal: Special handling for image loading states
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';
import { 
  ANIMATION_VARIANTS, 
  ANIMATION_TRANSITIONS, 
  ANIMATION_DELAY 
} from '../../lib/animation-constants';

interface BaseAnimationProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

interface StaggeredContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  enabled?: boolean;
}

/**
 * Container that staggers child animations with incremental delays
 */
export function StaggeredContainer({ 
  children, 
  className, 
  staggerDelay = ANIMATION_DELAY.FIELD_BASE,
  enabled = true 
}: StaggeredContainerProps) {
  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
        exit: {},
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Standard content reveal with subtle upward movement
 */
export function ContentReveal({ children, className, delay = 0 }: BaseAnimationProps) {
  return (
    <motion.div
      className={className}
      variants={ANIMATION_VARIANTS.contentReveal}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={ANIMATION_TRANSITIONS.staggered(delay)}
    >
      {children}
    </motion.div>
  );
}

/**
 * Static element reveal (headers, buttons) - fade only, no movement
 */
export function StaticReveal({ children, className, delay = 0 }: BaseAnimationProps) {
  return (
    <motion.div
      className={className}
      variants={ANIMATION_VARIANTS.staticReveal}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={ANIMATION_TRANSITIONS.staggered(delay)}
    >
      {children}
    </motion.div>
  );
}

/**
 * Page-level reveal for modals and major transitions
 */
export function PageReveal({ children, className, delay = 0 }: BaseAnimationProps) {
  return (
    <motion.div
      className={className}
      variants={ANIMATION_VARIANTS.pageReveal}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={ANIMATION_TRANSITIONS.page}
    >
      {children}
    </motion.div>
  );
}

/**
 * Image reveal with loading state coordination
 */
interface ImageRevealProps extends BaseAnimationProps {
  src: string;
  alt: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  imageClassName?: string;
}

export function ImageReveal({ 
  children, 
  className, 
  delay = ANIMATION_DELAY.IMAGE,
  src,
  alt,
  loading = 'eager',
  onLoad,
  imageClassName
}: ImageRevealProps) {
  return (
    <ContentReveal className={className} delay={delay}>
      <img
        src={src}
        alt={alt}
        loading={loading}
        onLoad={onLoad}
        className={imageClassName}
        style={{
          imageRendering: 'auto',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden'
        }}
      />
      {children}
    </ContentReveal>
  );
}

/**
 * Action element reveal (buttons, CTAs) with longer delay
 */
export function ActionReveal({ children, className, delay = ANIMATION_DELAY.ACTION }: BaseAnimationProps) {
  return (
    <ContentReveal className={className} delay={delay}>
      {children}
    </ContentReveal>
  );
}

/**
 * Form field reveal with incremental stagger support
 */
interface FieldRevealProps extends BaseAnimationProps {
  fieldIndex?: number;
}

export function FieldReveal({ 
  children, 
  className, 
  fieldIndex = 0,
  delay = 0 
}: FieldRevealProps) {
  const calculatedDelay = delay + (fieldIndex * ANIMATION_DELAY.FIELD_BASE);
  
  return (
    <ContentReveal className={className} delay={calculatedDelay}>
      {children}
    </ContentReveal>
  );
}

/**
 * Conditional animation wrapper - useful for toggling animations
 */
interface ConditionalAnimationProps {
  children: ReactNode;
  condition: boolean;
  fallback?: ReactNode;
  className?: string;
}

export function ConditionalAnimation({ 
  children, 
  condition, 
  fallback,
  className 
}: ConditionalAnimationProps) {
  return (
    <AnimatePresence mode="wait">
      {condition ? (
        <motion.div
          key="animated-content"
          className={className}
          variants={ANIMATION_VARIANTS.contentReveal}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={ANIMATION_TRANSITIONS.content}
        >
          {children}
        </motion.div>
      ) : (
        fallback && (
          <motion.div
            key="fallback-content"
            className={className}
            variants={ANIMATION_VARIANTS.staticReveal}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={ANIMATION_TRANSITIONS.micro}
          >
            {fallback}
          </motion.div>
        )
      )}
    </AnimatePresence>
  );
}