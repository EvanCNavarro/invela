import { useState, useEffect } from "react";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Check, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface EmailFieldProps {
  field: any;
  setRedirectEmail?: (email: string) => void;
  isLogin?: boolean;
}

export function EmailField({ field, setRedirectEmail, isLogin }: EmailFieldProps) {
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [isValidFormat, setIsValidFormat] = useState<boolean | null>(null);
  const [, setLocation] = useLocation();

  const validateEmailFormat = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkEmailExists = async (email: string) => {
    try {
      const response = await fetch('/api/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const exists = await response.json();
      setEmailExists(exists);
      return exists;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  };

  useEffect(() => {
    const checkEmail = async () => {
      if (field.value) {
        const isValid = validateEmailFormat(field.value);
        setIsValidFormat(isValid);
        
        if (isValid && !isLogin) {
          const exists = await checkEmailExists(field.value);
          setEmailExists(exists);
        }
      } else {
        setIsValidFormat(null);
        setEmailExists(null);
      }
    };

    checkEmail();
  }, [field.value, isLogin]);

  const handleLoginRedirect = () => {
    if (setRedirectEmail) {
      setRedirectEmail(field.value);
    }
    setLocation('/auth?mode=login');
  };

  return (
    <>
      <FormItem>
        <FormLabel>Email</FormLabel>
        <div className="relative">
          <FormControl>
            <Input 
              type="email" 
              {...field} 
              className={`pr-10 ${
                isValidFormat === false ? 'border-[#EE7151]' : ''
              }`}
            />
          </FormControl>
          {field.value && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValidFormat && !emailExists && (
                <Check className="w-5 h-5 text-green-500" />
              )}
              {(!isValidFormat || emailExists) && (
                <X className="w-5 h-5 text-[#EE7151]" />
              )}
            </div>
          )}
        </div>
        {isValidFormat === false && (
          <FormMessage className="text-[#EE7151]">
            Please enter a valid email address
          </FormMessage>
        )}
      </FormItem>

      {emailExists && !isLogin && (
        <Button
          type="button"
          variant="ghost"
          className="w-full bg-[#FDEBE2] hover:bg-[#FDEBE2]/80 text-foreground"
          onClick={handleLoginRedirect}
        >
          Account exists. Log in instead
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      )}
    </>
  );
}
