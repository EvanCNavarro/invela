import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, Redirect, useLocation } from "wouter";
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
import { Eye, EyeOff, Check, Lock, ArrowLeft } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { InvitationCodeInput } from "@/components/ui/invitation-code-input";
import { motion } from "framer-motion";
import { queryClient } from "@/lib/queryClient";

// Updated interface to match API response
interface InvitationResponse {
  valid: boolean;
  invitation: {
    email: string;
    invitee_name: string;
    company_name: string;
  };
}

const invitationCodeSchema = z.object({
  invitationCode: z
    .string()
    .length(6, "Invitation code must be 6 characters")
    .regex(/^[0-9A-F]+$/, "Code must be a valid hexadecimal value")
});

const registrationSchema = z.object({
  invitationCode: z
    .string()
    .length(6, "Invitation code must be 6 characters")
    .regex(/^[0-9A-F]+$/, "Code must be a valid hexadecimal value"),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  company: z.string().min(1, "Company is required."),
});

export default function RegisterPage() {
  const { toast } = useToast();
  const { user, registerMutation } = useAuth();
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [validatedInvitation, setValidatedInvitation] = useState<{
    email: string;
    company: string;
    fullName: string;
  } | null>(null);
  const [isLoadingTransition, setIsLoadingTransition] = useState(false);

  const invitationForm = useForm<z.infer<typeof invitationCodeSchema>>({
    resolver: zodResolver(invitationCodeSchema),
    defaultValues: {
      invitationCode: "",
    },
  });

  const registrationForm = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      invitationCode: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      company: "",
    },
  });

  const { data: invitationData, refetch: validateInvitation } = useQuery<InvitationResponse>({
    queryKey: ["validateInvitation", invitationForm.watch("invitationCode")],
    queryFn: async () => {
      const code = invitationForm.watch("invitationCode")?.toUpperCase();
      console.log("[Registration] Validating invitation code:", code);

      if (!code || code.length !== 6) {
        console.log("[Registration] Invalid code format:", code);
        return null;
      }

      try {
        const response = await fetch(`/api/invitations/${code}/validate`);
        const responseData = await response.json();
        console.log("[Registration] Raw validation response:", responseData);

        if (!response.ok) {
          throw new Error(responseData.message || "Invalid invitation code");
        }

        return responseData;
      } catch (error) {
        console.error("[Registration] Validation error:", error);
        throw error;
      }
    },
    enabled: false,
    retry: false,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    console.log("[Registration] URL code parameter:", code);

    if (code) {
      const formattedCode = code.toUpperCase();
      console.log("[Registration] Setting invitation code:", formattedCode);
      invitationForm.setValue('invitationCode', formattedCode);
      validateInvitation();
    }
  }, []);

  // Reference to password input for auto-focus
  const passwordInputRef = useRef<HTMLInputElement>(null);
  
  const onValidateCode = async (values: z.infer<typeof invitationCodeSchema>) => {
    console.log("[Registration] Starting code validation for:", values.invitationCode);
    try {
      const result = await validateInvitation();
      console.log("[Registration] Full validation result:", result);

      if (result?.data?.valid && result?.data?.invitation) {
        const { invitation } = result.data;
        console.log("[Registration] Extracted invitation data:", invitation);

        // Split the invitee_name into first and last name
        const nameParts = invitation.invitee_name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // First animate the content fading out
        const invitationContainer = document.querySelector('.invitation-container');
        if (invitationContainer) {
          // Add fade-out animation class
          invitationContainer.classList.add('fade-out');
          
          // Wait for animation to complete before changing state
          setTimeout(() => {
            // Update state after fade-out animation
            setValidatedInvitation({
              email: invitation.email,
              company: invitation.company_name,
              fullName: invitation.invitee_name,
            });
            
            // Pre-fill registration form
            console.log("[Registration] Pre-filling registration form with:", {
              email: invitation.email,
              company: invitation.company_name,
              firstName,
              lastName,
              fullName: invitation.invitee_name
            });

            registrationForm.reset({
              invitationCode: values.invitationCode,
              email: invitation.email,
              company: invitation.company_name,
              firstName,
              lastName,
              password: '',
            });
            
            // Removed auto-focus to prevent unwanted focusing behavior

            // Debug form values after setting
            console.log("[Registration] Form values after pre-fill:", registrationForm.getValues());
          }, 400); // Match the duration of the fade-out animation
        } else {
          // Fallback if container not found
          setValidatedInvitation({
            email: invitation.email,
            company: invitation.company_name,
            fullName: invitation.invitee_name,
          });
          
          registrationForm.reset({
            invitationCode: values.invitationCode,
            email: invitation.email,
            company: invitation.company_name,
            firstName,
            lastName,
            password: '',
          });
          
          // Removed auto-focus to prevent unwanted focusing behavior
        }
      } else {
        console.log("[Registration] Invalid invitation code response");
        invitationForm.setError("invitationCode", {
          type: "manual",
          message: "Invalid invitation code",
        });
      }
    } catch (error) {
      console.error("[Registration] Validation error:", error);
      invitationForm.setError("invitationCode", {
        type: "manual",
        message: "Invalid invitation code",
      });
    }
  };

  // State to track if registration is currently in progress
  const [isRegistering, setIsRegistering] = useState(false);
  // Track loading state separately for better UX feedback
  const [isLoading, setIsLoading] = useState(false);

  // Create a unified logging utility for consistent logging patterns
  const logRegistration = (message: string, data?: any) => {
    if (data) {
      // Ensure we're not logging sensitive information like passwords
      const sanitizedData = data.password ? { ...data, password: '********' } : data;
      console.log(`[Registration] ${message}:`, sanitizedData);
    } else {
      console.log(`[Registration] ${message}`);
    }
  };

  // Function to handle registration form submission
  const onRegisterSubmit = async (values: z.infer<typeof registrationSchema>) => {
    // Prevent duplicate submissions
    if (isRegistering) {
      logRegistration('Submission already in progress, ignoring duplicate request');
      return;
    }
    
    try {
      // Update both states to indicate registration is starting
      setIsRegistering(true);
      setIsLoading(true);
      
      logRegistration('Starting registration with values', {
        ...values,
        password: values.password ? '********' : undefined // Mask password in logs
      });

      const fullName = `${values.firstName} ${values.lastName}`.trim();
      logRegistration('Submitting registration with fullName', fullName);

      // Determine if we should use the account setup flow
      // This is for users who are accepting an invitation with a code
      const shouldUseAccountSetup = 
        // We have a validated invitation code
        !!validatedInvitation && 
        // The code is present in the form
        !!values.invitationCode && 
        (
          // Either the invitation data is valid and the emails match
          (invitationData?.valid && invitationData?.invitation?.email === values.email) ||
          // Or we have no invitation data yet but we know the code is validated (fallback for cases where the data structure differs)
          (validatedInvitation && !invitationData)
        );
      
      // Log validation check details
      console.log("[Registration] Invitation validation check:", {
        hasValidatedInvitation: !!validatedInvitation,
        hasCode: !!values.invitationCode,
        isValid: invitationData?.valid,
        invitationEmail: invitationData?.invitation?.email,
        userEmail: values.email,
        emailsMatch: invitationData?.invitation?.email === values.email,
        shouldUseAccountSetup
      });
      
      if (shouldUseAccountSetup) {
        logRegistration(`Using account-setup flow for invitation code: ${values.invitationCode}`);
        
        try {
          // Call the account-setup endpoint directly
          logRegistration('Submitting to account/setup endpoint');
          const response = await fetch("/api/account/setup", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: values.email,
              password: values.password,
              firstName: values.firstName,
              lastName: values.lastName,
              fullName,
              invitationCode: values.invitationCode,
            }),
            credentials: "include", // Important for session cookies
            redirect: "follow" // Allow redirects to be followed
          });
          
          logRegistration(`Account setup response status: ${response.status} ${response.statusText}`);
          
          // For non-success status codes, handle errors simply
          if (!response.ok) {
            logRegistration(`Account setup failed with status: ${response.status}`);
            
            // Extract error message if available
            let errorMessage = "Account setup failed";
            try {
              // Try to get error message, but don't depend on it
              const contentType = response.headers.get("content-type") || "";
              if (contentType.includes("application/json")) {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
              } else {
                errorMessage = await response.text() || errorMessage;
              }
            } catch (parseError) {
              console.error("[Registration] Error parsing error response:", parseError);
              // Keep default error message
            }
            
            // Show error message
            toast({
              title: "Account setup failed",
              description: errorMessage,
              variant: "destructive",
            });
            
            // Reset loading states
            setIsLoading(false);
            setIsRegistering(false);
            return;
          }
          
          // For success status codes (200-299), the account setup was successful
          // First, check if we're already logged in by the server-side login
          logRegistration('Account setup successful, verifying login status');
          
          // Show a single, clear success message
          toast({
            title: "Your account is being created",
            description: "Please wait while we set everything up for you...",
          });
          
          // Start loading transition immediately
          setIsLoadingTransition(true);
          
          try {
            // First check if we're already logged in from the server-side req.login()
            logRegistration('Checking current authentication status');
            const authCheckResponse = await fetch("/api/user", {
              method: "GET",
              credentials: "include"
            });
            
            // If we're already logged in, we can skip the manual login process
            if (authCheckResponse.ok) {
              const userData = await authCheckResponse.json();
              logRegistration(`Already authenticated as user: ${userData.email}`);
              
              // Don't show another toast here - we already have the loading overlay
              
              // Refresh auth data to ensure latest state
              await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
              
              // Set loading transition state
              setIsLoadingTransition(true);
              
              // Navigate to home page after a small delay to show the toast
              setTimeout(() => {
                navigate("/");
              }, 1500);
              return;
            }
            
            // If we're not logged in yet, perform explicit login
            logRegistration('Not authenticated yet, performing explicit login');
            
            // Show login attempt message
            toast({
              title: "Your account was successfully created",
              description: "Logging you in...",
            });
            
            // Normalize email to lowercase before login to ensure case consistency
            const normalizedEmail = values.email.toLowerCase();
            logRegistration(`Attempting login with normalized email: ${normalizedEmail}`);
            
            // Perform login with the same credentials
            const loginResponse = await fetch("/api/login", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: normalizedEmail, // The login endpoint expects email, not username
                password: values.password
              }),
              credentials: "include"
            });
            
            if (!loginResponse.ok) {
              // If login fails, show error but don't block - account was still set up
              logRegistration(`Login after account setup failed: ${loginResponse.status} ${loginResponse.statusText}`);
              
              // Verify invitation status was updated
              logRegistration('Verifying invitation status update');
              
              // Make a separate API call to verify invitation status
              try {
                logRegistration(`Checking invitation code ${values.invitationCode} status`);
                
                // Re-validate the invitation code - if status changed to "used", registration was successful
                const verifyResponse = await fetch(`/api/invitations/${values.invitationCode}/validate`, {
                  method: "GET",
                  credentials: "include"
                });
                
                const verifyData = await verifyResponse.json();
                
                logRegistration(`Invitation verification response: ${JSON.stringify(verifyData)}`);
                
                // If invitation is marked as used or no longer valid
                if (verifyData.used) {
                  logRegistration(`Invitation confirmed as used at: ${verifyData.used_at}`);
                } else if (!verifyData.valid && verifyData.message?.toLowerCase().includes("invalid")) {
                  logRegistration('Invitation appears to be properly marked as invalid');
                } else {
                  // If it's still showing as valid, there might be an issue with status update
                  logRegistration('Warning: Invitation may not be properly marked as used', true);
                  
                  // Log a more detailed warning for debugging purposes
                  console.warn("[Registration] Invitation status verification result:", verifyData);
                }
              } catch (verifyError) {
                console.error("[Registration] Error verifying invitation status:", verifyError);
                logRegistration(`Error checking invitation status: ${verifyError}`, true);
              }
              
              toast({
                title: "Registration partially complete",
                description: "Your account was set up, but we couldn't log you in automatically. Please log in manually.",
                variant: "destructive",
              });
              
              // Reset loading states
              setIsLoading(false);
              setIsRegistering(false);
              
              // Set loading transition state for redirect
              setIsLoadingTransition(true);
              
              // Redirect to login page using React Router
              setTimeout(() => {
                navigate("/login");
              }, 2000);
              return;
            }
            
            // Login successful
            logRegistration('Login after account setup successful');
            
            // Show final success message
            toast({
              title: "Welcome to Invela",
              description: "Setting up your dashboard...",
            });
            
            // Refresh auth data to pick up the new user session
            await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
            
            // Set loading transition state
            setIsLoadingTransition(true);
            
            // Navigate to home page after a small delay to show the toast
            setTimeout(() => {
              navigate("/");
            }, 1500);
          } catch (authError) {
            // Authentication attempt failed with an exception
            console.error("[Registration] Error during authentication verification:", authError);
            
            // Try one last time with a direct login attempt
            try {
              logRegistration('Final login attempt after error');
              const finalLoginResponse = await fetch("/api/login", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  username: values.email,
                  password: values.password
                }),
                credentials: "include"
              });
              
              if (finalLoginResponse.ok) {
                logRegistration('Final login attempt succeeded');
                
                toast({
                  title: "Account setup complete",
                  description: "Your account has been set up. Redirecting to dashboard...",
                });
                
                await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
                
                setTimeout(() => {
                  window.location.href = "/";
                }, 1500);
                return;
              }
              
              // If we're here, both login attempts failed
              logRegistration('Final login attempt also failed');
            } catch (finalError) {
              console.error("[Registration] Error during final login attempt:", finalError);
            }
            
            // Show fallback error if everything failed
            toast({
              title: "Automatic login failed",
              description: "Your account was set up, but you'll need to log in manually.",
              variant: "destructive",
            });
            
            // Reset loading states
            setIsLoading(false);
            setIsRegistering(false);
            
            // Redirect to login page
            setTimeout(() => {
              window.location.href = "/login";
            }, 2000);
          }
        } catch (fetchError) {
          // Handle network errors or other exceptions during fetch
          console.error("[Registration] Account setup fetch error:", fetchError);
          
          toast({
            title: "Connection error",
            description: "Unable to connect to the server. Please try again.",
            variant: "destructive",
          });
          
          // Reset loading states on error
          setIsLoading(false);
          setIsRegistering(false);
        }
      } else {
        // Standard registration flow (without invitation code)
        logRegistration('Using standard registration flow');
        
        try {
          // Call the standard registration endpoint through our mutation
          registerMutation.mutate({
            email: values.email,
            password: values.password,
            firstName: values.firstName,
            lastName: values.lastName,
            fullName,
            company: values.company,
            invitationCode: values.invitationCode,
          }, {
            onSuccess: () => {
              logRegistration('Registration successful');
              
              // Reset loading state
              setIsLoading(false);
              
              // Show success message
              toast({
                title: "Account created",
                description: "Your account has been created successfully.",
              });
              
              // The welcome modal will be shown on the dashboard
              
              // Refresh the user data in the auth context
              queryClient.invalidateQueries({ queryKey: ["/api/user"] });
              
              // Set loading transition state for a smoother navigation experience
              setIsLoadingTransition(true);
              
              // Navigate to home page after a short delay using React Router
              setTimeout(() => {
                navigate("/");
              }, 1500); // Consistent with account setup flow
            },
            onError: (error: Error) => {
              console.error("[Registration] Registration error:", error);
              
              // Reset loading states
              setIsLoading(false);
              setIsRegistering(false);
              
              // Check if the error indicates the account already exists
              if (error.message.includes("already exists")) {
                toast({
                  title: "Account Already Exists",
                  description: "This email is already registered. Please try signing in instead.",
                  variant: "destructive",
                });
              } else {
                toast({
                  title: "Registration failed",
                  description: error.message || "There was an error creating your account. Please try again.",
                  variant: "destructive",
                });
              }
            },
          });
        } catch (registerError) {
          console.error("[Registration] Unexpected error initiating registration:", registerError);
          
          // Reset loading states
          setIsLoading(false);
          setIsRegistering(false);
          
          toast({
            title: "Registration failed",
            description: "An unexpected error occurred. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("[Registration] Unexpected error during submission:", error);
      
      // Reset loading states
      setIsLoading(false);
      setIsRegistering(false);
      
      toast({
        title: "Registration failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Ensure loading state is reset if we somehow missed a case
      if (isLoading) {
        // Use a safety timeout to make sure the loading state is eventually reset
        const safetyTimer = setTimeout(() => {
          // Add a delay to avoid UI flicker if there was a fast success case
          setIsLoading(false);
          setIsRegistering(false);
        }, 5000); // Longer timeout for slow connections
        
        // Clean up the timer if component unmounts
        return () => clearTimeout(safetyTimer);
      }
    }
  };

  if (user) {
    console.log("[Registration] User already logged in, redirecting");
    return <Redirect to="/" />;
  }

  // Create a helper function to check if all fields are valid
  const areRequiredFieldsValid = () => {
    const { firstName, lastName, password } = registrationForm.getValues();
    const hasFirstName = !!firstName && !registrationForm.formState.errors.firstName;
    const hasLastName = !!lastName && !registrationForm.formState.errors.lastName;
    const hasPassword = !!password && !registrationForm.formState.errors.password;
    
    return hasFirstName && hasLastName && hasPassword;
  };

  return (
    <AuthLayout mode={validatedInvitation ? "register-validated" : "register"}>
      {/* Enhanced Loading Transition Overlay */}
      {isLoadingTransition && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center transition-all duration-500 ease-in-out">
          <div className="flex flex-col items-center gap-6 max-w-md text-center p-8 rounded-xl">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">Setting up your account</h3>
              <p className="text-muted-foreground">Your account is being created and configured. This may take a moment...</p>
            </div>
          </div>
        </div>
      )}
      
      {!validatedInvitation ? (
        <div className="invitation-container">
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
              Verify your invitation
            </motion.h1>
            <motion.p 
              className="text-base text-muted-foreground mt-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              Enter your invitation code to begin registration
            </motion.p>
          </motion.div>

          <Form {...invitationForm}>
            <form onSubmit={invitationForm.handleSubmit(onValidateCode)} className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
              >
                <FormField
                  control={invitationForm.control}
                  name="invitationCode"
                  render={({ field }) => (
                    <FormItem className="mb-8">
                      <FormLabel className="text-base font-medium mb-2 block">Invitation Code</FormLabel>
                      <FormControl>
                        <div className="w-full">
                          <InvitationCodeInput
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </div>
                      </FormControl>
                      <div className="min-h-[24px] mt-4">
                        <FormMessage />
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
                  disabled={invitationForm.formState.isSubmitting || 
                    invitationForm.watch("invitationCode").length !== 6}
                >
                  Validate Code
                </Button>
              </motion.div>

              <motion.div 
                className="text-center mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    Sign in here
                  </Link>
                </p>
              </motion.div>
            </form>
          </Form>
        </div>
      ) : (
        <div className="w-full max-w-[800px] mx-auto overflow-y-auto py-4">
          <motion.div 
            className="flex flex-col items-center"
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
              className="text-3xl font-bold text-center mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              Create your account
            </motion.h1>
            <motion.p 
              className="text-base text-muted-foreground text-center mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              Complete your registration to get started
            </motion.p>
          </motion.div>

          <Form {...registrationForm}>
            <form onSubmit={registrationForm.handleSubmit(onRegisterSubmit)} className="flex flex-col space-y-6 max-w-[600px] mx-auto registration-form-content">
              <motion.div 
                className="p-4 bg-blue-50 rounded-lg border border-blue-200"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="flex-shrink-0">
                    <Check className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-sm text-blue-600 whitespace-nowrap sm:whitespace-normal md:whitespace-nowrap">
                    <span className="font-medium text-blue-700">Valid invitation code</span>
                    {" — "}
                    <span>Registering for {validatedInvitation.company}</span>
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.5, ease: "easeOut" }}
              >
                <FormField
                  control={registrationForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="mb-1">
                      <FormLabel className="text-base">Email</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <div className="relative">
                            <Lock className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                            <Input {...field} type="email" disabled className="h-14 bg-gray-50 pl-10" />
                          </div>
                        </FormControl>
                      </div>
                      <div className="min-h-[4px]">
                        <FormMessage />
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
                  control={registrationForm.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem className="mb-1">
                      <FormLabel className="text-base">Company</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <div className="relative">
                            <Lock className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                            <Input {...field} type="text" disabled className="h-14 bg-gray-50 pl-10" />
                          </div>
                        </FormControl>
                      </div>
                      <div className="min-h-[4px]">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.5, ease: "easeOut" }}
              >
                <FormField
                  control={registrationForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">First Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            {...field} 
                            
                            type="text" 
                            placeholder="First name" 
                            className={`h-14 bg-gray-50 ${
                              field.value ? 
                                registrationForm.formState.errors.firstName ? 
                                  'border-red-500 focus:border-red-500' : 
                                  'border-green-500 focus:border-green-500' : 
                                ''
                            }`}
                            onBlur={(e) => {
                              field.onBlur();
                              registrationForm.trigger('firstName');
                            }}
                          />
                          {field.value && !registrationForm.formState.errors.firstName && (
                            <Check className="h-4 w-4 text-green-500 absolute right-3 top-1/2 transform -translate-y-1/2" />
                          )}
                        </div>
                      </FormControl>
                      <div className="min-h-[24px] mt-2">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={registrationForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Last Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            {...field} 
                            type="text" 
                            placeholder="Last name" 
                            className={`h-14 bg-gray-50 ${
                              field.value ? 
                                registrationForm.formState.errors.lastName ? 
                                  'border-red-500 focus:border-red-500' : 
                                  'border-green-500 focus:border-green-500' : 
                                ''
                            }`}
                            onBlur={(e) => {
                              field.onBlur();
                              registrationForm.trigger('lastName');
                            }}
                          />
                          {field.value && !registrationForm.formState.errors.lastName && (
                            <Check className="h-4 w-4 text-green-500 absolute right-3 top-1/2 transform -translate-y-1/2" />
                          )}
                        </div>
                      </FormControl>
                      <div className="min-h-[24px] mt-2">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
              >
                <FormField
                  control={registrationForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Password</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={showPassword ? "text" : "password"}
                            {...field}
                            ref={passwordInputRef}
                            placeholder="Choose a secure password"
                            className={`h-14 bg-gray-50 ${
                              field.value ? 
                                registrationForm.formState.errors.password ? 
                                  'border-red-500 focus:border-red-500 pr-10' : 
                                  'border-green-500 focus:border-green-500 pr-10' : 
                                ''
                            }`}
                            onBlur={(e) => {
                              field.onBlur();
                              registrationForm.trigger('password');
                            }}
                          />
                        </FormControl>
                        <div className="absolute right-0 top-0 h-full flex items-center">
                          {field.value && !registrationForm.formState.errors.password && (
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-full px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="min-h-[24px] mt-2">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.5, ease: "easeOut" }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  className="w-full font-bold hover:opacity-90 h-14 text-base"
                  disabled={registerMutation.isPending || !areRequiredFieldsValid() || isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Setting up account...
                    </span>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.4, ease: "easeOut" }}
              >
                <button 
                  type="button" 
                  className="flex items-center text-primary hover:underline gap-1.5"
                  onClick={() => {
                    // First let the content fade out quickly
                    const formContent = document.querySelector('.registration-form-content');
                    
                    if (formContent) {
                      formContent.classList.add('fade-out');
                    }
                    
                    // Then set the state after a short delay
                    setTimeout(() => {
                      setValidatedInvitation(null);
                    }, 250);
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Invitation Code</span>
                </button>
              </motion.div>
            </form>
          </Form>
        </div>
      )}
    </AuthLayout>
  );
}
