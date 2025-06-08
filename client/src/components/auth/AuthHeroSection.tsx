/**
 * ========================================
 * Authentication Hero Section Component
 * ========================================
 * 
 * Enhanced branding component using the universal ProgressiveImage system.
 * Provides automatic progressive JPEG optimization with PNG fallback support.
 * 
 * @module AuthHeroSection
 * @version 3.0.0
 * @since 2025-06-08
 */

import { motion } from "framer-motion";
import { ProgressiveImage } from "@/components/ui/ProgressiveImage";

interface AuthHeroSectionProps {
  isLogin: boolean;
}

export function AuthHeroSection({ isLogin }: AuthHeroSectionProps) {
  // Image sources and content
  const imageSrc = isLogin ? "/assets/invela_branding_login.png" : "/assets/invela_branding_register.png";
  const altText = isLogin ? "Invela Professional Network" : "Invela Corporate Solutions";
  
  // Animation direction based on page type
  const initialX = isLogin ? -40 : 40;
  
  return (
    <motion.div 
      className="w-full h-full rounded-lg overflow-hidden"
      initial={{ opacity: 0, x: initialX }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        duration: 0.6, 
        ease: [0.22, 1, 0.36, 1]
      }}
    >
      <ProgressiveImage
        src={imageSrc}
        alt={altText}
        className="w-full h-full rounded-lg"
        skeletonVariant="branded"
        skeletonColors={{
          from: isLogin ? 'sky-200' : 'gray-200',
          to: isLogin ? 'blue-100' : 'slate-200'
        }}
        priority="eager"
        enableLogging={true}
        onLoad={() => console.log(`[AuthHeroSection] ${isLogin ? 'Login' : 'Register'} image loaded successfully`)}
        onError={(error) => console.error(`[AuthHeroSection] Image load failed: ${error}`)}
      />
    </motion.div>
  );
}