import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
  return (
    <div className={cn(
      "flex items-center justify-center",
      size === "sm" && "h-4 w-4",
      size === "md" && "h-8 w-8",
      size === "lg" && "h-12 w-12",
      className
    )}>
      <svg 
        viewBox="0 0 28 28" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="animate-spin"
      >
        <g>
          <rect 
            x="-2" 
            y="-2" 
            width="24" 
            height="24" 
            rx="12" 
            transform="matrix(1.19249e-08 -1 -1 -1.19249e-08 23.9979 23.999)" 
            stroke="#DEE2F1" 
            strokeWidth="4" 
          />
          <rect 
            x="-2" 
            y="-2" 
            width="24" 
            height="24" 
            rx="12" 
            transform="matrix(-4.37114e-08 -1 -1 4.37114e-08 24 24.001)" 
            stroke="url(#paint0_angular)" 
            strokeWidth="4" 
          />
          <path 
            fillRule="evenodd" 
            clipRule="evenodd" 
            d="M4.198 11.999H0.139586C0.0488603 12.6333 0.000646812 13.2812 -0.0020752 13.9399V14.0581C0.000646806 14.7168 0.0488601 15.3648 0.139586 15.999H4.198C4.06682 15.3528 3.99795 14.684 3.99795 13.999C3.99795 13.3141 4.06682 12.6452 4.198 11.999Z" 
            fill="white"
          />
          <rect 
            x="3.99805" 
            y="11.999" 
            width="4" 
            height="4" 
            rx="0.25" 
            fill="#4965EC"
          />
        </g>
        <defs>
          <radialGradient 
            id="paint0_angular" 
            cx="0" 
            cy="0" 
            r="1" 
            gradientUnits="userSpaceOnUse" 
            gradientTransform="translate(14 14) scale(14)"
          >
            <stop stopColor="#4965EC"/>
            <stop offset="1" stopColor="#E7E8EB" stopOpacity="0"/>
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}
