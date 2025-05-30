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

  // Set animation direction based on login/register page
  // For login: content comes from right, hero from left
  // For register: content comes from left, hero from right
  const initialX = isLogin ? -40 : 40; 
  
  return (
    <motion.div 
      className={`w-full h-full flex items-center justify-center ${isLogin ? 'bg-[#0082FF]' : 'bg-[#F5F4F9]'} rounded-lg overflow-hidden`}
      initial={{ opacity: 0, x: initialX }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        duration: 0.6, 
        ease: [0.22, 1, 0.36, 1]
      }}
    >
      <img
        src={isLogin ? "/assets/auth_animation.gif" : "/assets/register_animation.gif"} 
        alt={isLogin ? "Secure Login Animation" : "Register Animation"}
        className="w-full h-full object-contain max-w-[500px]"
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
  );
}