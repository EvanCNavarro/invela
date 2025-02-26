import React, { useCallback, useEffect } from "react";
import {
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import { 
  apiRequest, 
  queryClient, 
  checkAuthState, 
  queryKeys, 
  fetchCompanyData,
  registerCriticalQueries
} from "../lib/queryClient";
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
  debug: () => { clientState: ReturnType<typeof checkAuthState> };
};

const useLoginMutation = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (credentials: LoginData) => {
      if (!credentials.email || !credentials.password) {
        throw new AuthError("Email and password are required");
      }

      console.log('[Auth] Logging in user with email:', credentials.email);
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
      console.log('[Auth] Login successful, user data received:', { 
        id: user.id, 
        email: user.email,
        hasCompanyId: !!user.company_id
      });
      
      // Ensure query functions are registered
      registerCriticalQueries();
      
      // Cache user data with the correct query key
      queryClient.setQueryData(queryKeys.user(), user);
      console.log('[Auth] User data cached in query cache with key:', queryKeys.user());

      try {
        console.log('[Auth] Fetching company data');
        // Use the standalone fetchCompanyData function to ensure consistency
        const company: Company = await fetchCompanyData();
        console.log('[Auth] Company data received:', { 
          id: company.id, 
          name: company.name,
          availableTabs: company.available_tabs
        });
        
        // Cache with BOTH query keys to ensure consistency:
        // 1. The key used in DashboardLayout
        queryClient.setQueryData(queryKeys.currentCompany(), company);
        console.log('[Auth] ✅ Company data cached with standard key:', queryKeys.currentCompany());
        
        // 2. Also cache with the company-specific key for potential future use
        queryClient.setQueryData(queryKeys.company(company.id), company);
        console.log('[Auth] ✅ Company data also cached with company ID key:', queryKeys.company(company.id));
        
        // Register queries again to ensure they have query functions
        registerCriticalQueries();
        
        // Redirect based on available tabs
        if (company.available_tabs?.includes('dashboard')) {
          console.log('[Auth] Redirecting to dashboard');
          setLocation("/");
        } else {
          console.log('[Auth] Redirecting to task center');
          setLocation("/task-center");
        }
      } catch (error) {
        console.error('[Auth] Error fetching company data:', error);
        // Default to task center if company fetch fails
        console.log('[Auth] Defaulting to task center due to error');
        setLocation("/task-center");
      }
    },
    onError: (error: Error) => {
      console.error('[Auth] Login mutation error:', error);
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
      // Ensure we use the consistent query key
      queryClient.setQueryData(queryKeys.user(), user);
      // Register critical queries for consistent behavior
      registerCriticalQueries();
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
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Ensure critical queries are registered when the auth provider mounts
  useEffect(() => {
    registerCriticalQueries();
  }, []);
  
  const {
    data: userData,
    error,
    isLoading,
    refetch: refetchUser,
  } = useQuery<User | null, Error>({
    queryKey: queryKeys.user(),
    queryFn: fetchUserData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Disable retries completely for auth checks
    retry: false
  });

  // Ensure user is always User | null, never undefined
  const user = userData ?? null;

  // When the app starts, check for session cookies and try to refresh if needed
  useEffect(() => {
    const checkAuthOnLoad = async () => {
      const authState = checkAuthState();
      console.log('[Auth] Initial auth state check:', authState);
      
      // If we have cookies but no user data, try refreshing the session
      if ((authState.hasSid || authState.hasRefreshToken) && !user) {
        console.log('[Auth] Found auth cookies but no user data, attempting refresh');
        try {
          await refreshSession();
        } catch (error) {
          console.error('[Auth] Session refresh failed on initial load:', error);
        }
      }
    };
    
    checkAuthOnLoad();
  }, []);

  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const logoutMutation = useLogoutMutation();

  const refreshSession = useCallback(async () => {
    console.log('[Auth] Attempting to refresh session');
    try {
      // Use apiRequest directly, it handles JSON parsing
      const user = await apiRequest<User>("POST", "/api/refresh");
      console.log('[Auth] Session refresh successful:', { 
        id: user?.id, 
        email: user?.email 
      });
      
      queryClient.setQueryData(queryKeys.user(), user);
      return user;
    } catch (error) {
      console.error('[Auth] Session refresh error:', error);
      // Session expired or other error
      queryClient.setQueryData(queryKeys.user(), null);
      
      // If we get a specific authentication error, show a toast
      if (error instanceof Error && error.message.includes("Invalid or expired")) {
        toast({
          title: "Session expired",
          description: "Your session has expired. Please log in again.",
          variant: "default",
        });
        
        // Redirect to login page if we're not already there
        const currentPath = window.location.pathname;
        if (currentPath !== '/login') {
          setLocation('/login');
        }
      }
      
      return null;
    }
  }, [toast, setLocation]);

  const debug = useCallback(() => {
    return {
      clientState: checkAuthState()
    };
  }, []);

  const value = React.useMemo<AuthContextType>(() => ({
    user,
    isLoading,
    error,
    loginMutation,
    logoutMutation,
    registerMutation,
    refreshSession,
    debug
  }), [user, isLoading, error, loginMutation, logoutMutation, registerMutation, refreshSession, debug]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Define the fetchUserData function inline since we need it for useQuery above
const fetchUserData = async () => {
  const isInitialRender = !queryClient.getQueryState(queryKeys.user())?.dataUpdateCount;
  
  // Only log the fetch attempt on initial render or in non-production
  if (isInitialRender || process.env.NODE_ENV !== 'production') {
    console.log('[Auth] Fetching user data');
  }
  
  try {
    // apiRequest now returns null for 401 responses on /api/user
    const userData = await apiRequest<User | null>("GET", "/api/user");
    
    if (userData) {
      // Only log successful auth in non-production or initial render
      if (isInitialRender || process.env.NODE_ENV !== 'production') {
        console.log('[Auth] User data fetched successfully:', { 
          id: userData.id, 
          email: userData.email,
          hasCompanyId: !!userData.company_id
        });
      }
    } else {
      // Only log unsuccessful auth in non-production or initial render
      if (isInitialRender || process.env.NODE_ENV !== 'production') {
        console.log('[Auth] No user data found - user is not authenticated');
      }
    }
    return userData;
  } catch (error) {
    // Suppress 401/403 errors since they're expected for unauthenticated users
    if (error instanceof Error && (
      error.message.includes("401") || 
      error.message.includes("403") ||
      error.message.includes("Unauthorized")
    )) {
      console.log('[Auth] User is not authenticated (401/403)');
      return null;
    }
    
    // For unexpected errors, log and rethrow
    console.error('[Auth] Unexpected error during auth check:', error);
    throw error;
  }
};

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Export the hook for testing/debugging
export function useAuthDebug() {
  const { user, isLoading, error, debug } = useAuth();
  
  useEffect(() => {
    console.log('[Auth Debug] Auth state changed:', {
      isAuthenticated: !!user,
      isLoading,
      error: error?.message,
      userData: user ? { id: user.id, email: user.email } : null,
      clientState: debug().clientState
    });
  }, [user, isLoading, error, debug]);
  
  return { user, isLoading, error, debug };
}