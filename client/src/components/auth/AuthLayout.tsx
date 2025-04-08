import React from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { AuthHeroSection } from "./AuthHeroSection";
import { AuthFooter } from "./AuthFooter";

interface AuthLayoutProps {
  children: React.ReactNode;
  isLogin: boolean;
  isRegistrationValidated?: boolean;
}

export function AuthLayout({ children, isLogin, isRegistrationValidated = false }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header with Back button */}
      <div className="pt-8 w-full max-w-6xl mx-auto">
        <div className="w-full max-w-[980px] mx-auto px-6">
          <Link href="/landing">
            <span className="inline-flex items-center text-muted-foreground hover:text-foreground gap-1.5 font-medium text-base px-3 py-2 rounded-md transition-all duration-200 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
              Back to Website
            </span>
          </Link>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        {isRegistrationValidated ? (
          // Account creation form (step 2 of registration) - narrow width
          <div className="bg-white rounded-lg shadow-lg overflow-hidden min-h-[800px] h-auto pt-10 pb-14 w-full max-w-[800px]">
            {children}
          </div>
        ) : (
          // Login or initial registration (step 1) - wider width with two columns
          <div className="bg-white rounded-lg shadow-lg overflow-hidden h-[768px] flex w-full max-w-[980px]">
            {isLogin ? (
              // Login layout with hero on right
              <>
                <div className="w-full lg:w-[55%] p-14 flex flex-col justify-center">
                  {children}
                </div>
                <div className="hidden lg:block w-[45%] p-3">
                  <AuthHeroSection isLogin={true} />
                </div>
              </>
            ) : (
              // Registration initial layout with hero on left
              <>
                <div className="hidden lg:block w-[45%] p-3">
                  <AuthHeroSection isLogin={false} />
                </div>
                <div className="w-full lg:w-[55%] p-14 flex flex-col justify-center">
                  {children}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <AuthFooter />
    </div>
  );
}