/**
 * ========================================
 * Authentication Hook - User Session Management
 * ========================================
 * 
 * Comprehensive authentication hook providing user session management,
 * login/logout functionality, and user registration capabilities for the
 * enterprise platform. Integrates with TanStack Query for efficient caching.
 * 
 * Key Features:
 * - Secure user authentication with session management
 * - Login/logout mutations with error handling
 * - User registration with validation
 * - Navigation integration with wouter
 * - Toast notifications for user feedback
 * 
 * Authentication Flow:
 * - User login with credentials validation
 * - Session state management and persistence
 * - Automatic logout on session expiry
 * - Registration with company association
 * - Navigation redirection based on auth state
 * 
 * @module hooks/use-auth
 * @version 1.0.0
 * @since 2025-05-23
 */

import React, { useEffect } from "react";
import {
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import { getQueryFn, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { RegisterData, LoginData, User } from "@/types/auth";
import type { Company } from "@/types/company";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: ReturnType<typeof useLoginMutation>;
  logoutMutation: ReturnType<typeof useLogoutMutation>;
  registerMutation: ReturnType<typeof useRegisterMutation>;
};

const useLoginMutation = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log('[Auth] Login mutation called with:', {
        email: credentials.email,
        hasPassword: !!credentials.password,
        passwordLength: credentials.password?.length
      });

      // Use fetch directly to handle raw response
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include"
      });
      
      if (!res.ok) {
        // Get plain text error message directly from response
        const errorText = await res.text();
        console.error('[Auth] Login request failed:', errorText);
        
        // If we have an error message from the server, use it; otherwise use a default
        const errorMessage = errorText || "We couldn't sign you in. Please check your email and password and try again.";
        
        // Throw a clean error with just the message text
        throw new Error(errorMessage);
      }

      console.log('[Auth] Login request successful');
      return await res.json();
    },
    onSuccess: async (user: User) => {
      console.log('[Auth] Login mutation succeeded, user:', user.id);
      
      // Check if login was successful but includes a warning about status
      if (user.loginStatus === 'failed') {
        console.warn('[Auth] Login partially successful:', user.message || 'Login process had issues');
        
        // Show a toast notification with the partial success message
        toast({
          title: "Login partially complete",
          description: user.message || "Your account was authenticated but there was an issue with your session. Please try again.",
          variant: "warning",
        });
      }
      
      // Save user data to query cache
      queryClient.setQueryData(["/api/user"], user);
      
      // Successfully logged in, no need to show error messages anymore
      // The redirect will naturally clear any visible toasts

      // Fetch current company to check available tabs
      try {
        // Use fetch directly to match our direct fetch approach
        const companyRes = await fetch("/api/companies/current", {
          method: "GET",
          credentials: "include"
        });
        
        if (!companyRes.ok) {
          throw new Error("Failed to fetch company data");
        }
        
        const company: Company = await companyRes.json();

        console.log('[Auth] Company data fetched:', {
          companyId: company.id,
          availableTabs: company.available_tabs
        });

        // Check if dashboard is available, redirect accordingly
        if (company.available_tabs?.includes('dashboard')) {
          console.log('[Auth] Dashboard available, redirecting to /');
          setLocation("/");
        } else {
          console.log('[Auth] Dashboard not available, redirecting to task-center');
          setLocation("/task-center");
        }
      } catch (error) {
        console.error('[Auth] Error fetching company data:', error);
        // Default to task center if company fetch fails
        setLocation("/task-center");
      }
    },
    onError: (error: Error) => {
      console.error('[Auth] Login mutation error:', error);
      
      // Simplify error messages for users
      let errorMessage = "Please check your email and password and try again.";
      
      // Keep console logging the original error for debugging
      console.log('[Auth] Original login error:', error.message);
      
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

/**
 * Utility function to convert camelCase fields to snake_case
 * Helps maintain consistency between client and server data formats
 */
const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
};

/**
 * Utility function to convert camelCase fields to snake_case
 * Helps maintain consistency between client and server data formats
 */
const toSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * Convert object keys from camelCase to snake_case
 * @param obj - Object with camelCase keys
 * @returns Object with snake_case keys
 */
const objectToSnakeCase = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = toSnakeCase(key);
      result[snakeKey] = obj[key];
    }
  }
  return result;
};

/**
 * Enhanced registration mutation that properly handles account setup with invitation codes
 * 
 * This implementation:
 * 1. Uses /api/account/setup endpoint when an invitation code is present
 * 2. Applies consistent email case normalization to lowercase
 * 3. Properly transforms camelCase client fields to snake_case server fields
 * 4. Implements comprehensive error handling with user-friendly messages
 * 5. Uses structured logging for better debugging
 */
const useRegisterMutation = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Create a unified logging utility for consistent logging patterns
  const logger = {
    info: (message: string, data?: any) => {
      const sanitizedData = data?.password ? { ...data, password: '********' } : data;
      console.log(`[Auth] ${message}`, sanitizedData || '');
    },
    warn: (message: string, data?: any) => {
      console.warn(`[Auth] ${message}`, data || '');
    },
    error: (message: string, data?: any) => {
      console.error(`[Auth] ${message}`, data || '');
    },
    debug: (message: string, data?: any) => {
      if (process.env.NODE_ENV !== 'production') {
        const sanitizedData = data?.password ? { ...data, password: '********' } : data;
        console.log(`[Auth:DEBUG] ${message}`, sanitizedData || '');
      }
    }
  };

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      // Log registration attempt (sanitizing sensitive data)
      logger.info('Registration attempt:', {
        email: data.email,
        hasFirstName: !!data.firstName,
        hasLastName: !!data.lastName,
        hasPassword: !!data.password,
        hasInvitationCode: !!data.invitationCode
      });
      
      // Normalize email to lowercase to ensure case-insensitive matching
      const normalizedEmail = data.email?.toLowerCase();
      
      // Determine if this is an invitation-based setup or regular registration
      const isAccountSetup = !!data.invitationCode;
      const endpoint = isAccountSetup ? "/api/account/setup" : "/api/register";
      
      logger.info(`Using ${isAccountSetup ? 'account setup' : 'registration'} endpoint: ${endpoint}`);
      
      // Create properly formatted payload based on endpoint type
      const payload: Record<string, any> = {
        email: normalizedEmail,
        password: data.password
      };
      
      // Add fullName and first/last name fields
      // For account setup, both camelCase and snake_case versions needed for compatibility
      if (isAccountSetup) {
        // The account setup endpoint expects these specific fields
        payload.fullName = data.fullName || (data.firstName && data.lastName ? 
                           `${data.firstName} ${data.lastName}`.trim() : 
                           data.firstName || data.lastName || '');
        payload.firstName = data.firstName || '';
        payload.lastName = data.lastName || '';
        payload.invitationCode = data.invitationCode;
      } else {
        // Regular registration endpoint expects snake_case fields
        payload.full_name = data.fullName || (data.firstName && data.lastName ? 
                           `${data.firstName} ${data.lastName}`.trim() : 
                           data.firstName || data.lastName || '');
        payload.first_name = data.firstName || null;
        payload.last_name = data.lastName || null;
        
        // Handle company data for regular registration
        if (data.company) {
          payload.company_name = data.company;
        }
        
        // Include company_id from the data if available, otherwise use default
        payload.company_id = data.companyId || 1;
        
        // Include invitation code if available for regular registration
        if (data.invitationCode) {
          payload.invitation_code = data.invitationCode;
        }
      }
      
      logger.info(`Sending ${isAccountSetup ? 'account setup' : 'registration'} payload:`, payload);
      
      try {
        // Use fetch directly to handle raw response
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include"
        });
        
        if (!res.ok) {
          // Enhanced error handling to avoid reading response body twice
          const responseClone = res.clone();
          
          // Check content type to determine how to parse the response
          const contentType = res.headers.get('content-type') || '';
          
          // Log the error response details for debugging
          logger.error(`${isAccountSetup ? 'Account setup' : 'Registration'} error response:`, { 
            status: res.status, 
            statusText: res.statusText,
            contentType,
            payload: {...payload, password: undefined} // Don't log password even if masked
          });
          
          let errorMessage = isAccountSetup ? "Account setup failed" : "Registration failed";
          let errorDetails = null;
          
          try {
            // If content type is JSON, parse as JSON
            if (contentType.includes('application/json')) {
              const errorData = await res.json();
              logger.error(`${isAccountSetup ? 'Account setup' : 'Registration'} error details (JSON):`, errorData);
              
              // Extract error message and details
              errorMessage = errorData.message || errorData.error || errorMessage;
              errorDetails = errorData.details || errorData.errors || null;
            } else {
              // Otherwise parse as text
              const errorText = await res.text();
              logger.error(`${isAccountSetup ? 'Account setup' : 'Registration'} error details (Text):`, errorText);
              errorMessage = errorText || errorMessage;
            }
          } catch (parseError) {
            // If parsing fails, try the clone as text
            logger.error('Error parsing response:', parseError);
            try {
              const fallbackText = await responseClone.text();
              logger.error('Fallback error text:', fallbackText);
              errorMessage = fallbackText || errorMessage;
            } catch (fallbackError) {
              logger.error('Fallback error parsing failed:', fallbackError);
              // Keep default error message if all parsing fails
            }
          }
          
          // Add special handling for login-related errors (registration successful but login failed)
          if (res.status === 201 || 
              errorMessage.includes("login") || 
              errorMessage.includes("authentication") ||
              errorMessage.includes("session")) {
            logger.warn(`Detected ${isAccountSetup ? 'account setup' : 'registration'} success but login failure`);
            
            // This is the case where account creation succeeded but automatic login failed
            // We'll add better feedback for the user about what happened
            throw new Error(
              isAccountSetup 
                ? "Account setup partially complete. Your information was updated, but we couldn't log you in automatically. Please log in manually with your credentials."
                : "Registration partially complete. Your account was created, but we couldn't log you in automatically. Please log in manually with your new credentials."
            );
          }
          
          // Provide a more user-friendly message for common errors
          let friendlyMessage = errorMessage;
          
          // Handle duplicate account errors
          if (errorMessage.includes("duplicate") || 
              errorMessage.includes("already exists") || 
              errorMessage.includes("Email already exists")) {
            friendlyMessage = "This account already exists. Please try signing in instead.";
          }
          // Handle validation errors
          else if (errorMessage.includes("validation") || errorDetails) {
            friendlyMessage = "Please check your information and try again.";
            if (errorDetails) {
              // Add specific field errors if available
              friendlyMessage += " " + JSON.stringify(errorDetails);
            }
          }
          // Handle invitation-specific errors
          else if (isAccountSetup && (
            errorMessage.includes("invitation") || 
            errorMessage.includes("User account not found") ||
            errorMessage.includes("Invalid invitation code")
          )) {
            friendlyMessage = "Invalid invitation code or account not found. Please check your invitation email.";
          }
          
          logger.info('Final error message:', {
            original: errorMessage,
            friendly: friendlyMessage
          });
            
          throw new Error(friendlyMessage);
        }
        
        // Successfully completed the request
        const userData = await res.json();
        logger.info(`${isAccountSetup ? 'Account setup' : 'Registration'} succeeded, user:`, { 
          id: userData.id, 
          email: userData.email 
        });
        
        return userData;
      } catch (error) {
        // Catch any unexpected errors not handled by response parsing
        logger.error('Unexpected error during request:', error);
        throw error;
      }
    },
    onSuccess: (user: User) => {
      // Use the standardized logger
      const logger = {
        info: (message: string, data?: any) => console.log(`[Auth] ${message}`, data || ''),
        warn: (message: string, data?: any) => console.warn(`[Auth] ${message}`, data || ''),
        error: (message: string, data?: any) => console.error(`[Auth] ${message}`, data || '')
      };
      
      logger.info('Authentication process completed, user data:', { 
        userId: user.id, 
        email: user.email,
        loginStatus: user.loginStatus 
      });
      
      // Check for partial success (account created/updated but login failed)
      if (user.loginStatus === 'failed') {
        logger.warn('Process partially successful:', user.message || 'Account action completed but auto-login failed');
        
        // Set a flag that can be used to show a special message on the login page
        sessionStorage.setItem('registrationPartialSuccess', 'true');
        sessionStorage.setItem('registrationEmail', user.email || '');
        
        // Store any available message
        if (user.message) {
          sessionStorage.setItem('registrationMessage', user.message);
        }
        
        // Show toast with helpful information - determine if this was setup or registration
        const isSetup = !!user.first_name || !!user.last_name; // If we have name data, likely account setup
        
        toast({
          title: isSetup ? "Account setup completed" : "Account created successfully",
          description: "Your account information was saved, but we couldn't log you in automatically. Please sign in with your credentials.",
          variant: "default",
        });
        
        // Redirect to login page
        setLocation("/login");
      } else {
        // Complete success - store user data and redirect to dashboard
        logger.info('Full success with authentication, redirecting to dashboard');
        queryClient.setQueryData(["/api/user"], user);
        
        // Check if company data is available to decide where to redirect
        if (user.company?.available_tabs?.includes('dashboard')) {
          logger.info('Dashboard available, redirecting to /', { 
            availableTabs: user.company.available_tabs 
          });
          setLocation("/");
        } else {
          logger.info('Dashboard not available, redirecting to task center');
          setLocation("/task-center");
        }
      }
    },
    onError: (error: Error) => {
      // Use the standardized logger
      const logger = {
        info: (message: string, data?: any) => console.log(`[Auth] ${message}`, data || ''),
        warn: (message: string, data?: any) => console.warn(`[Auth] ${message}`, data || ''),
        error: (message: string, data?: any) => console.error(`[Auth] ${message}`, data || '')
      };
      
      // Log the original error for debugging
      logger.error('Authentication process error:', error.message);
      
      // Display a user-friendly message
      let errorMessage = error.message;
      
      // Only replace the message if it's our generic fallback
      if (!errorMessage.includes("already exists") && 
          !errorMessage.includes("invalid") && 
          !errorMessage.includes("Invalid") &&
          !errorMessage.includes("check your") &&
          !errorMessage.includes("partially complete")) {
        errorMessage = "We couldn't complete your request. Please try again.";
      }
      
      toast({
        title: "Process failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

const useLogoutMutation = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      // Use fetch directly to handle raw response
      const res = await fetch("/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });
      
      if (!res.ok) {
        // Get plain text error message directly from response
        const errorText = await res.text();
        console.error('[Auth] Logout request failed:', errorText);
        
        // If we have an error message from the server, use it; otherwise use a default
        const errorMessage = errorText || "There was a problem signing out. Please try again.";
        
        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/login");
    },
    onError: (error: Error) => {
      console.error('[Auth] Logout mutation error:', error);
      
      // Force logout on client side even if server logout failed
      // This ensures users can still sign out even if there's a server issue
      queryClient.clear();
      setLocation("/login");
      
      toast({
        title: "Sign out issue",
        description: "There was an issue signing you out, but you've been redirected to the login page.",
        variant: "destructive",
      });
    },
  });
};

export const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    gcTime: 60000 // 1 minute
  });

  // Log when user object changes (for debugging purposes)
  useEffect(() => {
    if (user) {
      console.log('[Auth] User object in AuthProvider changed:', {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      });
    }
  }, [user]);

  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const logoutMutation = useLogoutMutation();

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}