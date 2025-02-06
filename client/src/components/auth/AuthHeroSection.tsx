import { useState } from "react";

interface AuthHeroSectionProps {
  isLogin: boolean;
}

export function AuthHeroSection({ isLogin }: AuthHeroSectionProps) {
  return (
    <div className="max-w-[500px] w-full h-[500px] relative">
      <img
        src={isLogin ? '/assets/auth_animation.gif' : '/assets/register_animation.gif'}
        alt={isLogin ? "Secure Login Animation" : "Register Animation"}
        className="w-full h-full object-contain"
        style={{
          imageRendering: 'auto',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden'
        }}
        loading="eager"
        fetchpriority="high"
        decoding="async"
      />
    </div>
  );
}