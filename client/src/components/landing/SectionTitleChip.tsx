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
    
    // Show copied message for a shorter duration
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1000);
  };
  
  return (
    <div className="inline-flex items-center">
      {/* The chip itself */}
      <motion.span 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={copyToClipboard}
        className={`bg-blue-50 text-blue-600 rounded-full px-4 py-1 text-sm font-medium cursor-pointer hover:bg-blue-100 transition-colors duration-200 ${className}`}
      >
        {title}
      </motion.span>
      
      {/* Hash symbol that appears outside the chip on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-2 text-gray-400 font-semibold"
            style={{ fontSize: '22px', lineHeight: 1 }}
          >
            #
          </motion.span>
        )}
      </AnimatePresence>
      
      {/* Popup container */}
      <div className="relative">
        {/* Copied to clipboard popup */}
        <AnimatePresence>
          {isCopied && (
            <motion.div
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: -10 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute bottom-8 left-0 -translate-x-1/4 bg-white text-black text-xs rounded px-3 py-1.5 z-50 whitespace-nowrap font-medium shadow-sm border border-gray-100"
            >
              Copied to clipboard
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}