import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Redirect, useLocation } from "wouter";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";

// Form validation schema
const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  invitationCode: z.string().min(1, "Invitation code is required")
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // If user is already logged in, redirect to home
  if (user) {
    return <Redirect to="/" />;
  }

  // Initialize form
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
      firstName: "",
      lastName: "",
      invitationCode: ""
    }
  });

  // Registration response type
  type RegisterResponse = {
    success: boolean;
    message: string;
    userId?: number;
    companyId?: number;
    sessionCreated?: boolean;
    user?: {
      id: number;
      email: string;
      fullName: string;
      companyId: number;
    };
  };

  // Invitation validation response type
  type InvitationResponse = {
    success: boolean;
    message?: string;
    invitation?: {
      code: string;
      email: string;
      expiresAt: string;
    };
    company?: {
      id: number;
      name: string;
    };
    userExists?: boolean;
  };

  // Registration mutation
  const registerMutation = useMutation<RegisterResponse, Error, RegisterFormValues>({
    mutationFn: async (values: RegisterFormValues) => {
      const res = await apiRequest("POST", "/api/register", values) as Response;
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Registration successful",
          description: data.message,
        });
        
        // Redirect to home if session was created, 
        // otherwise redirect to login
        if (data.sessionCreated) {
          setLocation("/");
        } else {
          setLocation("/login");
        }
      } else {
        toast({
          title: "Registration failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Validate invitation code mutation
  const validateInvitationMutation = useMutation<InvitationResponse, Error, { email: string; invitationCode: string }>({
    mutationFn: async (values: { email: string; invitationCode: string }) => {
      const res = await apiRequest("POST", "/api/validate-invitation", values) as Response;
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Invitation code validated",
          description: `Invitation code is valid for ${data.company?.name || 'your company'}`,
        });
        
        if (data.userExists) {
          toast({
            title: "Account exists",
            description: "An account with this email already exists. Please log in.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Invalid invitation",
          description: data.message,
          variant: "destructive",
        });
        
        // Reset the invitation code field
        form.setValue("invitationCode", "");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Validation failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Submit handler
  const onSubmit = (values: RegisterFormValues) => {
    registerMutation.mutate(values);
  };
  
  // Validate invitation code when both email and code are entered
  const validateInvitationCode = () => {
    const email = form.getValues("email");
    const invitationCode = form.getValues("invitationCode");
    
    if (email && invitationCode) {
      validateInvitationMutation.mutate({ email, invitationCode });
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Register</CardTitle>
            <CardDescription>
              Create your account using the invitation code sent to your email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="name@example.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="invitationCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invitation Code</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Enter your invitation code" 
                            {...field} 
                          />
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={validateInvitationCode}
                            disabled={validateInvitationMutation.isPending || 
                              !form.getValues("email") || 
                              !form.getValues("invitationCode")}
                          >
                            {validateInvitationMutation.isPending ? (
                              <LoadingSpinner className="h-4 w-4" />
                            ) : "Validate"}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John Doe" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="John" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Doe" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <>
                      <LoadingSpinner className="mr-2 h-4 w-4" />
                      Registering...
                    </>
                  ) : "Register"}
                </Button>
                
                <div className="text-center text-sm mt-4">
                  Already have an account?{" "}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto" 
                    onClick={() => setLocation("/login")}
                  >
                    Log in
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      
      {/* Right side - Hero section */}
      <div className="hidden md:flex flex-1 bg-primary items-center justify-center p-8">
        <div className="max-w-md text-primary-foreground">
          <h1 className="text-4xl font-bold mb-4">Welcome to Invela</h1>
          <p className="text-xl mb-6">
            The advanced enterprise risk assessment platform that dynamically analyzes and visualizes complex financial risk metrics.
          </p>
          <ul className="space-y-2">
            <li className="flex items-center">
              <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center mr-3">
                ✓
              </div>
              Real-time risk monitoring
            </li>
            <li className="flex items-center">
              <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center mr-3">
                ✓
              </div>
              Intelligent data processing
            </li>
            <li className="flex items-center">
              <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center mr-3">
                ✓
              </div>
              Advanced visualization tools
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}