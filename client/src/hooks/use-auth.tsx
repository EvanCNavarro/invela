import React, { useCallback } from "react";
import {
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import { apiRequest, queryClient, checkAuthState } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { RegisterData, LoginData, User } from "@/types/auth";
import type { Company } from "@/types/company";

// Custom error class for authentication errors
class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: ReturnType<typeof useLoginMutation>;
  logoutMutation: ReturnType<typeof useLogoutMutation>;
  registerMutation: ReturnType<typeof useRegisterMutation>;
  refreshSession: () => Promise<User | null>;
  debug?: () => { clientState: ReturnType<typeof checkAuthState> };
};

const useLoginMutation = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (credentials: LoginData) => {
      if (!credentials.email || !credentials.password) {
        throw new AuthError("Email and password are required");
      }

      try {
        return await apiRequest("POST", "/api/login", credentials);
      } catch (error) {
        console.error('[Auth] Login error:', error);
        if (error instanceof AuthError) {
          throw error;
        }
        throw new AuthError("Network error occurred. Please try again.");
      }
    },
    onSuccess: async (user: User) => {
      queryClient.setQueryData(["/api/user"], user);

      try {
        const company: Company = await apiRequest("GET", "/api/companies/current");
        
        // Redirect based on available tabs
        if (company.available_tabs?.includes('dashboard')) {
          setLocation("/");
        } else {
          setLocation("/task-center");
        }
      } catch (error) {
        console.error('[Auth] Error fetching company data:', error);
        // Default to task center if company fetch fails
        setLocation("/task-center");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

const useRegisterMutation = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      if (!data.email || !data.password) {
        throw new AuthError("Email and password are required");
      }
      
      try {
        return await apiRequest("POST", "/api/account/setup", data);
      } catch (error) {
        console.error('[Auth] Register error:', error);
        if (error instanceof AuthError) {
          throw error;
        }
        throw new AuthError("Network error occurred. Please try again.");
      }
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      setLocation("/");

      toast({
        title: "Account setup completed",
        description: "Welcome to Invela! Your account has been set up successfully.",
        variant: "default",
        className: "border-l-4 border-green-500",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Account setup failed",
        description: error.message,
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
      console.log('[Auth] Initiating logout process');
      
      try {
        // First try a direct logout
        await apiRequest("POST", "/api/logout");
        console.log('[Auth] Logout API call succeeded');
        return { success: true };
      } catch (error) {
        console.error('[Auth] Logout API error:', error);
        
        // If the server has issues with the logout endpoint, 
        // we'll manually clear the cookies
        try {
          console.log('[Auth] Attempting manual cookie cleanup');
          
          // Force cookie expiration by setting to past date
          document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie = "sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          
          console.log('[Auth] Manual cookie cleanup attempted');
        } catch (cookieError) {
          console.error('[Auth] Manual cookie cleanup failed:', cookieError);
        }
        
        // Return success anyway - we'll forcibly clear all client state
        return { success: true, hadServerError: true };
      }
    },
    onSuccess: (result) => {
      console.log('[Auth] Logout mutation completed, clearing client state');
      
      // Clear all query cache to remove any stored user data
      queryClient.clear();
      
      // Redirect to login page
      setLocation("/login");
      
      // Show a toast only if there was a server error
      if (result.hadServerError) {
        toast({
          title: "Logged out with warning",
          description: "Session ended, but there was a server issue. You have been logged out.",
          variant: "warning"
        });
      }
    },
    onError: (error: Error) => {
      console.error('[Auth] Unhandled logout error:', error);
      
      // This should never happen due to our error handling in mutationFn,
      // but just in case, we'll still clear client state and redirect
      queryClient.clear();
      setLocation("/login");
      
      toast({
        title: "Logout issue",
        description: "There was a problem during logout, but you have been logged out.",
        variant: "warning",
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
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/user");
        return await res.json();
      } catch (error) {
        if (error instanceof Error && error.message.includes("401")) {
          return undefined;
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 401/403 errors
      if (error instanceof Error && error.message.includes("401")) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const logoutMutation = useLogoutMutation();

  const refreshSession = useCallback(async () => {
    try {
      // Use apiRequest directly, it handles JSON parsing
      const user = await apiRequest("POST", "/api/refresh");
      queryClient.setQueryData(["/api/user"], user);
      return user;
    } catch (error) {
      console.error('[Auth] Session refresh error:', error);
      // Session expired or other error
      queryClient.setQueryData(["/api/user"], null);
      return null;
    }
  }, []);

  const value = React.useMemo(() => ({
    user: user ?? null,
    isLoading,
    error,
    loginMutation,
    logoutMutation,
    registerMutation,
    refreshSession
  }), [user, isLoading, error, loginMutation, logoutMutation, registerMutation, refreshSession]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  
  if (!context) {
    throw new AuthError("useAuth must be used within an AuthProvider");
  }
  
  // Add a debug helper function
  context.debug = () => {
    console.log('[Auth] Debug info:');
    console.log('User data:', context.user);
    console.log('Loading state:', context.isLoading);
    console.log('Error state:', context.error);
    
    // Check cookies and auth state
    const authState = checkAuthState();
    
    // Try to fetch auth debug info from server
    fetch('/api/debug/auth', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        console.log('[Auth] Server debug info:', data);
      })
      .catch(err => {
        console.error('[Auth] Failed to fetch server debug info:', err);
      });
      
    return { clientState: authState };
  };
  
  return context;
}