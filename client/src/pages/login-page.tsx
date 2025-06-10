/**
 * ========================================
 * Login Page Component
 * ========================================
 * 
 * Enterprise-grade user authentication interface providing secure login
 * functionality with form validation, visual feedback, and seamless
 * navigation integration for the risk assessment platform.
 * 
 * @module pages/login-page
 * @version 1.0.0
 * @since 2025-05-23
 */

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, Redirect } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Check } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginDemoHeader } from "@/components/auth/LoginDemoHeader";
import { motion } from "framer-motion";
import getLogger from '@/utils/logger';

// ========================================
// LOGGER INITIALIZATION
// ========================================

const logger = getLogger('LoginPage');

// ========================================
// VALIDATION SCHEMA
// ========================================

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

// ========================================
// MAIN COMPONENT
// ========================================

export default function LoginPage() {
  const { user, loginMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange" // Changed from onBlur to onChange to better handle autofill
  });

  // Handle autofill detection and form validation
  useEffect(() => {
    // Initialize a MutationObserver to detect when browser autofill occurs
    // This works because browsers typically add inline styles when autofilling
    if (emailInputRef.current && passwordInputRef.current) {
      const emailInput = emailInputRef.current;
      const passwordInput = passwordInputRef.current;
      
      // Function to check input values and update form if needed
      const checkAutofill = () => {
        if (emailInput.value && emailInput.value !== form.getValues('email')) {
          form.setValue('email', emailInput.value, { 
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true 
          });
          console.log('[Login] Autofill detected for email:', emailInput.value);
        }
        
        if (passwordInput.value && passwordInput.value !== form.getValues('password')) {
          form.setValue('password', passwordInput.value, { 
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true 
          });
          console.log('[Login] Autofill detected for password, length:', passwordInput.value.length);
        }
      };
      
      // Check immediately for instant autofills
      setTimeout(checkAutofill, 100);
      
      // Also check after a short delay to catch delayed autofills
      setTimeout(checkAutofill, 500);
      
      // And check again after a longer delay for slower browsers/connections
      setTimeout(checkAutofill, 1000);
      
      // Set up mutation observer to detect style changes from autofill
      const observer = new MutationObserver((mutations) => {
        checkAutofill();
      });
      
      // Observe both inputs for attribute changes (especially style changes)
      observer.observe(emailInput, { attributes: true });
      observer.observe(passwordInput, { attributes: true });
      
      return () => {
        observer.disconnect();
      };
    }
  }, [form]);



  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    if (!form.formState.isValid) {
      logger.warn('Form validation failed', { errors: form.formState.errors });
      return;
    }

    logger.info('Login form submission initiated', {
      email: values.email,
      passwordLength: values.password.length,
      timestamp: new Date().toISOString()
    });
    
    loginMutation.mutate(values);
  };

  return (
    <AuthLayout mode="login">
      <motion.div 
        className="mb-12"
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <motion.img
          src="/invela-logo.svg"
          alt="Invela"
          className="h-14 w-14 mb-6"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
        />
        <motion.h1 
          className="text-3xl font-bold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          Sign In to Invela Trust Network
        </motion.h1>
        <motion.p 
          className="text-base text-muted-foreground mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          Enter your credentials to access your account
        </motion.p>
      </motion.div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="mb-6">
                  <FormLabel className="text-base font-medium mb-2 block">Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      autoComplete="email"
                      autoFocus
                      placeholder="Enter your email"
                      ref={emailInputRef}
                      className={`h-14 bg-gray-50 ${field.value && !form.formState.errors.email ? "border-green-500" : ""}`}
                      onChange={(e) => {
                        field.onChange(e);
                        console.log('[Login] Email field changed:', e.target.value);
                      }}
                    />
                  </FormControl>
                  <div className="min-h-[24px] mt-2">
                    {field.value && form.formState.errors.email && (
                      <FormMessage />
                    )}
                    {field.value && !form.formState.errors.email && field.value.length > 0 && (
                      <p className="text-sm text-green-500 flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        Valid email address
                      </p>
                    )}
                  </div>
                </FormItem>
              )}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
          >
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="mb-6">
                  <FormLabel className="text-base font-medium mb-2 block">Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        {...field}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        ref={passwordInputRef}
                        className={`h-14 bg-gray-50 ${field.value && !form.formState.errors.password ? "border-green-500" : ""}`}
                        onChange={(e) => {
                          field.onChange(e);
                          console.log('[Login] Password field changed, length:', e.target.value.length);
                        }}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent focus:outline-none focus:ring-0 select-none"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <div className="min-h-[24px] mt-2">
                    {field.value && form.formState.errors.password && (
                      <FormMessage />
                    )}
                    {field.value && !form.formState.errors.password && field.value.length > 0 && (
                      <p className="text-sm text-green-500 flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        Valid password
                      </p>
                    )}
                  </div>
                </FormItem>
              )}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              type="submit"
              className="w-full font-bold hover:opacity-90 mt-10 h-14 text-base"
              disabled={!form.formState.isValid || loginMutation.isPending}
              onClick={() => {
                console.log('[Login] Submit button clicked');
                console.log('[Login] Form state:', {
                  isValid: form.formState.isValid,
                  errors: form.formState.errors,
                  isDirty: form.formState.isDirty
                });
              }}
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </motion.div>

          <motion.div 
            className="text-center mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <p className="text-sm text-muted-foreground">
              Have an invitation code?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Register here
              </Link>
            </p>
          </motion.div>
        </form>
      </Form>
    </AuthLayout>
  );
}