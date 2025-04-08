import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface AuthHeroSectionProps {
  isLogin: boolean;
}

export function AuthHeroSection({ isLogin }: AuthHeroSectionProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    // Reset animation state on component mount
    setIsLoaded(false);
    
    // Trigger animation after a brief delay
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`w-full h-full flex items-center justify-center ${isLogin ? 'bg-[#0082FF]' : 'bg-[#F5F4F9]'} rounded-lg overflow-hidden`}>
      <motion.div 
        className="max-w-[500px] w-full h-[500px] relative"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ 
          opacity: isLoaded ? 1 : 0, 
          scale: isLoaded ? 1 : 0.9, 
          y: isLoaded ? 0 : 20 
        }}
        transition={{ 
          duration: 0.8, 
          ease: [0.22, 1, 0.36, 1],
          delay: 0.2
        }}
      >
        <img
          src={isLogin ? "/assets/auth_animation.gif" : "/assets/register_animation.gif"} 
          alt={isLogin ? "Secure Login Animation" : "Register Animation"}
          className="w-full h-full object-contain"
          style={{
            imageRendering: 'auto',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden'
          }}
          loading="eager"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
        />
      </motion.div>
    </div>
  );
}