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
  
  // Width of the hashtag plus margin = ~30px (22px font + 8px margin)
  const hashtagWidth = '30px';
  
  return (
    <div className="inline-block relative">
      {/* Container with fixed width to prevent jitter */}
      <div className="inline-flex items-center justify-center">
        {/* Invisible placeholder on the left to balance the layout */}
        <div className="invisible" style={{ width: hashtagWidth }}></div>
        
        {/* The chip itself */}
        <motion.span 
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={copyToClipboard}
          className={`bg-blue-50 text-blue-600 rounded-full px-4 py-1 text-sm font-medium cursor-pointer hover:bg-blue-100 transition-colors duration-200 ${className}`}
        >
          {title}
        </motion.span>
        
        {/* Hash symbol container (visible or invisible) with fixed width */}
        <div className="flex items-center" style={{ width: hashtagWidth, justifyContent: 'flex-start' }}>
          <AnimatePresence>
            {isHovered && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="ml-2 text-gray-400 font-semibold"
                style={{ 
                  fontSize: '22px',
                  lineHeight: '22px',
                  marginTop: '-1px', // Offset to achieve perfect vertical alignment
                  display: 'inline-block'
                }}
              >
                #
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Copied to clipboard popup - centered to the entire component */}
      <AnimatePresence>
        {isCopied && (
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -10 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute left-1/2 -translate-x-1/2 bottom-8 bg-white text-black text-xs rounded px-3 py-1.5 z-50 whitespace-nowrap font-medium shadow-sm border border-gray-100"
          >
            Copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}