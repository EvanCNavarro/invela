import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SectionContentProps {
  children: React.ReactNode;
  isActive: boolean;
  className?: string;
  direction?: 'left' | 'right';
}

/**
 * Animated section content wrapper for form sections
 */
const SectionContent: React.FC<SectionContentProps> = ({
  children,
  isActive,
  className,
  direction = 'right'
}) => {
  const variants = {
    hidden: {
      opacity: 0,
      x: direction === 'right' ? 20 : -20
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    },
    exit: {
      opacity: 0,
      x: direction === 'right' ? -20 : 20,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key="section-content"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={variants}
          className={cn("w-full", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SectionContent;