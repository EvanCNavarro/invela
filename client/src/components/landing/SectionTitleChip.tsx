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
      
      {/* Hash symbol that appears on hover - centered and taller */}
      <AnimatePresence>
        {isHovered && (
          <motion.div 
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            transition={{ duration: 0.2 }}
            className="ml-2 flex items-center h-full"
            style={{ alignItems: 'center' }}
          >
            <span className="text-gray-400 font-semibold" style={{ fontSize: '22px', lineHeight: 1 }}>
              #
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Copied to clipboard popup - appears above and fades upward */}
      <AnimatePresence>
        {isCopied && (
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -10 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white text-black text-xs rounded px-3 py-1.5 z-50 whitespace-nowrap font-medium shadow-sm border border-gray-100"
          >
            Copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}