import { useState, useEffect } from "react";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface EmailFieldProps {
  field: any;
  setRedirectEmail?: (email: string) => void;
  isLogin?: boolean;
  onValidEmail?: (email: string) => void;
  showError?: boolean;
  isLoading?: boolean;
}

export function EmailField({ field, setRedirectEmail, isLogin, onValidEmail, showError, isLoading }: EmailFieldProps) {
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [isValidFormat, setIsValidFormat] = useState<boolean | null>(null);
  const [touched, setTouched] = useState(false);
  const [, setLocation] = useLocation();

  const validateEmailFormat = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkEmailExists = async (email: string) => {
    if (isLogin) return false;
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

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    field.onBlur(e);
    if (!isLogin && field.value) {
      setTouched(true);
      const isValid = validateEmailFormat(field.value);
      setIsValidFormat(isValid);

      if (isValid) {
        const exists = await checkEmailExists(field.value);
        if (!exists && onValidEmail) {
          onValidEmail(field.value);
        }
      }
    }
  };

  useEffect(() => {
    if (!isLogin && showError && field.value) {
      setIsValidFormat(validateEmailFormat(field.value));
    }
  }, [showError, field.value, isLogin]);

  const handleLoginRedirect = () => {
    if (setRedirectEmail) {
      setRedirectEmail(field.value);
    }
    setLocation('/login');
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <>
      <FormItem>
        <FormLabel className={cn(
          !isLogin && (touched || showError) && ((field.value && !isValidFormat) || (!field.value && showError)) && "text-[#E56047]"
        )}>Email</FormLabel>
        <div className="relative">
          <FormControl>
            <Input 
              type="email" 
              {...field} 
              onBlur={handleBlur}
              className={cn(
                "pr-10",
                !isLogin && (!touched && !showError ? '' :
                ((field.value && !isValidFormat) || (!field.value && showError)) 
                  ? 'border-[#E56047] focus-visible:ring-[#E56047]' 
                  : field.value && isValidFormat && !emailExists ? 'border-green-500' : '')
              )}
            />
          </FormControl>
          {!isLogin && field.value && (touched || showError) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValidFormat && !emailExists && (
                <Check className="w-5 h-5 text-green-500" />
              )}
              {(!isValidFormat || emailExists) && (
                <X className="w-5 h-5 text-[#E56047]" />
              )}
            </div>
          )}
        </div>
        {!isLogin && (touched || showError) && ((field.value && !isValidFormat) || (!field.value && showError)) && (
          <FormMessage className="text-[#E56047]">
            Please enter a valid email address.
          </FormMessage>
        )}
      </FormItem>

      {!isLogin && emailExists && (
        <Button
          type="button"
          variant="ghost"
          className="w-full bg-[#FDEBE2] hover:bg-[#FDEBE2]/80 text-foreground"
          onClick={handleLoginRedirect}
        >
          Account exists. Log in instead
        </Button>
      )}
    </>
  );
}