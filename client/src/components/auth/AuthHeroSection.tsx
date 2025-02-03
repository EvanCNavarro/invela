import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthHeroSectionProps {
  isLogin: boolean;
}

export function AuthHeroSection({ isLogin }: AuthHeroSectionProps) {
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [imageCache, setImageCache] = useState<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    const images = ['/assets/auth_animation.gif', '/assets/register_animation.gif'];
    let loadedImages = 0;

    images.forEach(src => {
      if (imageCache[src]) {
        loadedImages++;
        if (loadedImages === images.length) {
          setImagesLoaded(true);
        }
        return;
      }

      const img = new Image();
      img.onload = () => {
        setImageCache(prev => ({ ...prev, [src]: img }));
        loadedImages++;
        if (loadedImages === images.length) {
          setImagesLoaded(true);
        }
      };
      img.src = src;
    });
  }, []);

  if (!imagesLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Skeleton className="w-[500px] h-[500px]" />
      </div>
    );
  }

  return (
    <div className="max-w-[500px] w-full h-[500px] relative">
      <img
        src={isLogin ? '/assets/auth_animation.gif' : '/assets/register_animation.gif'}
        alt={isLogin ? "Secure Login Animation" : "Register Animation"}
        className={cn(
          "w-full h-full object-contain transition-opacity duration-300",
          "absolute inset-0"
        )}
        style={{
          imageRendering: 'auto',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden'
        }}
      />
    </div>
  );
}
