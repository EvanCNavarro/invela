import { useState } from "react";
import { cn } from "@/lib/utils";

interface AuthHeroSectionProps {
  isLogin: boolean;
}

export function AuthHeroSection({ isLogin }: AuthHeroSectionProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="max-w-[500px] w-full h-[500px] relative">
      <img
        src={isLogin ? '/assets/auth_animation.gif' : '/assets/register_animation.gif'}
        alt={isLogin ? "Secure Login Animation" : "Register Animation"}
        className={cn(
          "w-full h-full object-contain transition-opacity duration-500",
          imageLoaded ? "opacity-100" : "opacity-0"
        )}
        style={{
          willChange: 'transform, opacity',
          imageRendering: 'auto',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden'
        }}
        loading="eager"
        decoding="async"
        onLoad={() => setImageLoaded(true)}
      />
    </div>
  );
}