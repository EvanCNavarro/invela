import React from "react";
import {
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
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

      const res = await apiRequest("POST", "/api/login", credentials);
      if (!res.ok) {
        const error = await res.text();
        console.error('[Auth] Login request failed:', error);
        throw new Error(error || "Login failed");
      }

      console.log('[Auth] Login request successful');
      return await res.json();
    },
    onSuccess: async (user: User) => {
      console.log('[Auth] Login mutation succeeded, user:', user.id);
      queryClient.setQueryData(["/api/user"], user);

      // Fetch current company to check available tabs
      try {
        const companyRes = await apiRequest("GET", "/api/companies/current");
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
      const res = await apiRequest("POST", "/api/account/setup", data);
      if (!res.ok) {
        const errorData = await res.json().catch(async () => ({ 
          message: await res.text() 
        }));
        throw new Error(errorData.message || "Account setup failed");
      }
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      setLocation("/");
      
      // Registration success toast removed to improve user experience
      // The start modal will be enough to welcome the user
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
      const res = await apiRequest("POST", "/api/logout");
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Logout failed");
      }
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/login");
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
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
  });

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