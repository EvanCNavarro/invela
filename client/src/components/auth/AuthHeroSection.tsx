/**
 * ========================================
 * Authentication Hero Section Component
 * ========================================
 * 
 * Enhanced branding component with progressive JPEG loading optimization.
 * Provides smooth loading experience with PNG fallback support.
 * 
 * @module AuthHeroSection
 * @version 2.1.0
 * @since 2025-06-08
 */

import { useState } from "react";
import { motion } from "framer-motion";

interface AuthHeroSectionProps {
  isLogin: boolean;
}

export function AuthHeroSection({ isLogin }: AuthHeroSectionProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [useJpeg, setUseJpeg] = useState(true);
  
  // Image sources with progressive JPEG primary and PNG fallback
  const imageSrc = useJpeg 
    ? (isLogin ? "/assets/invela_branding_login.jpg" : "/assets/invela_branding_register.jpg")
    : (isLogin ? "/assets/invela_branding_login.png" : "/assets/invela_branding_register.png");
    
  const altText = isLogin ? "Invela Professional Network" : "Invela Corporate Solutions";
  
  // Handle image load success
  const handleImageLoad = () => {
    setImageLoaded(true);
    console.log(`[AuthHeroSection] Image loaded successfully: ${useJpeg ? 'Progressive JPEG' : 'PNG fallback'}`);
  };
  
  // Handle image load error - fallback to PNG
  const handleImageError = () => {
    if (useJpeg) {
      console.log('[AuthHeroSection] JPEG failed, falling back to PNG');
      setUseJpeg(false);
      setImageLoaded(false);
    } else {
      console.log('[AuthHeroSection] Both JPEG and PNG failed');
    }
  };
  
  // Animation direction based on page type
  const initialX = isLogin ? -40 : 40;
  
  return (
    <motion.div 
      className={`w-full h-full flex items-center justify-center ${isLogin ? 'bg-gradient-to-br from-sky-100 to-blue-50' : 'bg-gradient-to-br from-gray-50 to-slate-100'} rounded-lg overflow-hidden`}
      initial={{ opacity: 0, x: initialX }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        duration: 0.6, 
        ease: [0.22, 1, 0.36, 1]
      }}
    >
      {/* Skeleton loader */}
      {!imageLoaded && (
        <div className={`absolute inset-0 ${isLogin ? 'bg-gradient-to-br from-sky-200 to-blue-100' : 'bg-gradient-to-br from-gray-200 to-slate-200'} animate-pulse rounded-lg`}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer" />
        </div>
      )}
      
      {/* Progressive JPEG Image */}
      <motion.img
        key={`${isLogin}-${useJpeg}`}
        src={imageSrc}
        alt={altText}
        className="w-full h-full object-cover rounded-lg"
        style={{
          imageRendering: 'auto',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden'
        }}
        loading="eager"
        decoding="async"
        onLoad={handleImageLoad}
        onError={handleImageError}
        initial={{ opacity: 0 }}
        animate={{ opacity: imageLoaded ? 1 : 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </motion.div>
  );
}