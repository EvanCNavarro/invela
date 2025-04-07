import { useState } from "react";

interface AuthHeroSectionProps {
  isLogin: boolean;
}

export function AuthHeroSection({ isLogin }: AuthHeroSectionProps) {
  return (
    <div className={`w-full h-full flex items-center justify-center ${isLogin ? 'bg-[#0082FF]' : 'bg-[#F5F5F5]'} rounded-lg`}>
      <div className="max-w-[500px] w-full h-[500px] relative">
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
        />
      </div>
    </div>
  );
}