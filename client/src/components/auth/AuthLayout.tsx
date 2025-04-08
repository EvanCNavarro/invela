import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { AuthHeroSection } from "./AuthHeroSection";
import { AuthFooter } from "./AuthFooter";

interface AuthLayoutProps {
  children: React.ReactNode;
  isLogin: boolean;
}

export function AuthLayout({ children, isLogin }: AuthLayoutProps) {
  const [location] = useLocation();
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [prevLocation, setPrevLocation] = useState(location);
  
  // Set this flag in the register-page.tsx to represent the validated state
  const hasValidatedChild = React.Children.toArray(children).some(
    (child: any) => child?.props?.className?.includes?.("w-full max-w-[800px]")
  );
  
  // Determine if we're in the validated registration flow
  const isRegistrationValidated = location === "/register" && hasValidatedChild;

  // Determine animation direction based on navigation
  useEffect(() => {
    if (location !== prevLocation) {
      if ((prevLocation === "/login" && location === "/register") || 
          (prevLocation === "/" && location === "/register")) {
        setDirection("left");
      } else if ((prevLocation === "/register" && location === "/login") || 
                (prevLocation === "/" && location === "/login")) {
        setDirection("right");
      }
      setPrevLocation(location);
    }
  }, [location, prevLocation]);

  // Refined animation variants for smoother transitions
  const variants = {
    initial: (direction: "left" | "right") => ({
      x: direction === "right" ? "-30%" : "30%",
      opacity: 0,
      scale: 0.95
    }),
    animate: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: "spring", stiffness: 100, damping: 20, mass: 1 },
        opacity: { duration: 0.4, ease: "easeInOut" },
        scale: { duration: 0.35, ease: "easeOut" }
      }
    },
    exit: (direction: "left" | "right") => ({
      x: direction === "right" ? "30%" : "-30%",
      opacity: 0,
      scale: 0.95,
      transition: {
        x: { type: "spring", stiffness: 100, damping: 20, mass: 1 },
        opacity: { duration: 0.4, ease: "easeInOut" },
        scale: { duration: 0.3, ease: "easeIn" }
      }
    })
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="px-4 pt-8 w-full max-w-6xl mx-auto">
        <div className="w-full max-w-6xl">
          <Link href="/landing">
            <span className="inline-flex items-center text-muted-foreground hover:text-foreground gap-1.5 font-medium text-base px-3 py-2 rounded-md transition-all duration-200 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
              Back to Website
            </span>
          </Link>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div 
          className={`bg-white rounded-lg shadow-lg overflow-hidden ${isRegistrationValidated ? '' : 'flex'} ${isRegistrationValidated ? 'min-h-[800px] h-auto pt-10 pb-14' : 'h-[768px]'}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            width: isRegistrationValidated ? '100%' : '100%', 
            maxWidth: isRegistrationValidated ? '800px' : '6xl'
          }}
          transition={{ 
            duration: 0.5, 
            ease: "easeOut",
            width: { duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }, // Custom ease for width transition
            maxWidth: { duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }
          }}
          layout
        >
          {isRegistrationValidated ? (
            // Show full-width registration form
            children
          ) : isLogin ? (
            // Login layout with hero on right
            <>
              <motion.div 
                className="w-full lg:w-[55%] p-14 flex flex-col justify-center"
                custom={direction}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={variants}
                key="login-form"
              >
                {children}
              </motion.div>
              <motion.div 
                className="hidden lg:block w-[45%] p-3"
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <AuthHeroSection isLogin={true} />
              </motion.div>
            </>
          ) : (
            // Registration initial layout with hero on left
            <>
              <motion.div 
                className="hidden lg:block w-[45%] p-3"
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                key="register-hero"
              >
                <AuthHeroSection isLogin={false} />
              </motion.div>
              <motion.div 
                className="w-full lg:w-[55%] p-14 flex flex-col justify-center"
                custom={direction}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={variants}
                key="register-form"
              >
                {children}
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
      
      <AuthFooter />
    </div>
  );
}