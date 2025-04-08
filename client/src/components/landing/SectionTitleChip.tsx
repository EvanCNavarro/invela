import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { unifiedToast } from '@/hooks/use-unified-toast';

interface SectionTitleChipProps {
  title: string;
  sectionId: string;
  className?: string;
  centered?: boolean;
}

export default function SectionTitleChip({ 
  title, 
  sectionId, 
  className = '',
  centered = false // Default to false for left-aligned chips
}: SectionTitleChipProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const copyToClipboard = () => {
    // Get current URL and add the section ID as a fragment
    const url = window.location.href.split('#')[0] + '#' + sectionId;
    navigator.clipboard.writeText(url);
    
    // Use the unified toast system with clipboard variant
    unifiedToast.clipboardCopy(url);
  };
  
  // Width of the hashtag plus margin = ~30px (22px font + 8px margin)
  const hashtagWidth = '30px';
  
  return (
    <div className="inline-block relative">
      {/* Container with conditional layout based on centered prop */}
      <div className={`inline-flex items-start ${centered ? 'justify-center' : 'justify-start'}`}>
        {/* Invisible placeholder on the left only for centered chips */}
        {centered && <div className="invisible" style={{ width: hashtagWidth }}></div>}
        
        {/* The chip itself */}
        <motion.span 
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={copyToClipboard}
          className={`bg-blue-50 text-blue-600 rounded-full px-4 py-1 text-sm font-medium cursor-pointer hover:bg-blue-100 transition-colors duration-200 ${className}`}
        >
          {title}
        </motion.span>
        
        {/* Hash symbol container with fixed width - aligned to top */}
        <div className="flex items-start" style={{ width: hashtagWidth, justifyContent: 'flex-start' }}>
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
                  paddingTop: '2px', // Add top padding to align with top of button
                  display: 'inline-block'
                }}
              >
                #
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}