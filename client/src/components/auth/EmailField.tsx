import { useState, useEffect } from "react";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Check, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface EmailFieldProps {
  field: any;
  setRedirectEmail?: (email: string) => void;
  isLogin?: boolean;
  onValidEmail?: (email: string) => void;
}

export function EmailField({ field, setRedirectEmail, isLogin, onValidEmail }: EmailFieldProps) {
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [isValidFormat, setIsValidFormat] = useState<boolean | null>(null);
  const [touched, setTouched] = useState(false);
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
      if (field.value && touched) {
        const isValid = validateEmailFormat(field.value);
        setIsValidFormat(isValid);

        if (isValid && !isLogin) {
          const exists = await checkEmailExists(field.value);
          setEmailExists(exists);

          if (!exists && onValidEmail) {
            onValidEmail(field.value);
          }
        }
      }
    };

    checkEmail();
  }, [field.value, isLogin, touched, onValidEmail]);

  const handleLoginRedirect = () => {
    if (setRedirectEmail) {
      setRedirectEmail(field.value);
    }
    setLocation('/auth?mode=login');
  };

  return (
    <>
      <FormItem>
        <FormLabel className={cn(
          touched && !isValidFormat && "text-[#E56047]"
        )}>Email</FormLabel>
        <div className="relative">
          <FormControl>
            <Input 
              type="email" 
              {...field} 
              onBlur={(e) => {
                field.onBlur(e);
                setTouched(true);
              }}
              className={cn(
                "pr-10",
                !touched ? '' :
                isValidFormat === false ? 'border-[#E56047] focus-visible:ring-[#E56047]' :
                isValidFormat && !emailExists ? 'border-green-500' : ''
              )}
            />
          </FormControl>
          {field.value && touched && (
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
        {touched && isValidFormat === false && (
          <FormMessage className="text-[#E56047]">
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