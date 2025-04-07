import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SectionTitleChipProps {
  title: string;
  sectionId: string;
  className?: string;
}

export default function SectionTitleChip({ title, sectionId, className = '' }: SectionTitleChipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  const copyToClipboard = () => {
    // Get current URL and add the section ID as a fragment
    const url = window.location.href.split('#')[0] + '#' + sectionId;
    navigator.clipboard.writeText(url);
    
    // Show copied message
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  return (
    <div className="relative inline-flex items-center">
      <motion.span 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={copyToClipboard}
        className={`inline-block bg-blue-50 text-blue-600 rounded-full px-4 py-1 text-sm font-medium cursor-pointer hover:bg-blue-100 transition-colors duration-200 ${className}`}
      >
        {title}
      </motion.span>
      
      {/* Hash symbol that appears on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.span 
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            transition={{ duration: 0.2 }}
            className="ml-2 text-gray-400 font-semibold"
          >
            #
          </motion.span>
        )}
      </AnimatePresence>
      
      {/* Copied to clipboard popup */}
      <AnimatePresence>
        {isCopied && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 z-50 whitespace-nowrap"
          >
            Copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}