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
import { Eye, EyeOff, Check, Lock, ArrowLeft } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { InvitationCodeInput } from "@/components/ui/invitation-code-input";

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
  const [showPassword, setShowPassword] = useState(false);
  const [validatedInvitation, setValidatedInvitation] = useState<{
    email: string;
    company: string;
    fullName: string;
  } | null>(null);

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
        
        // Focus on the password input after a short delay to allow the form to render
        setTimeout(() => {
          if (passwordInputRef.current) {
            passwordInputRef.current.focus();
          }
        }, 300);

        // Debug form values after setting
        console.log("[Registration] Form values after pre-fill:", registrationForm.getValues());

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

  const onRegisterSubmit = async (values: z.infer<typeof registrationSchema>) => {
    console.log("[Registration] Starting registration with values:", values);

    const fullName = `${values.firstName} ${values.lastName}`.trim();
    console.log("[Registration] Submitting registration with fullName:", fullName);

    try {
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
          console.log("[Registration] Registration successful");
          // Toast notification removed to improve user experience
          // The welcome modal will be shown instead
        },
        onError: (error: Error) => {
          console.error("[Registration] Registration error:", error);
          toast({
            title: "Registration failed",
            description: "There was an error creating your account. Please try again.",
            variant: "destructive",
          });
        },
      });
    } catch (error) {
      console.error("[Registration] Unexpected error during submission:", error);
      toast({
        title: "Registration failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
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
    <AuthLayout isLogin={false}>
      {!validatedInvitation ? (
        <>
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
                            autoFocus={true}
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
                transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
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
                transition={{ delay: 0.6, duration: 0.5 }}
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
        </>
      ) : (
        <motion.div
          className="w-full max-w-[800px] mx-auto overflow-y-auto py-4"
          initial={{ opacity: 0, scale: 1.05, maxWidth: "1200px" }}
          animate={{ opacity: 1, scale: 1, maxWidth: "800px" }}
          transition={{ 
            duration: 0.5,
            scale: { duration: 0.4, ease: "easeOut" },
            maxWidth: { duration: 0.35, ease: [0.4, 0.0, 0.2, 1] }
          }}
        >
          <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
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
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <div className="flex items-center justify-center gap-3">
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.3, type: "spring" }}
                    className="flex-shrink-0"
                  >
                    <Check className="h-5 w-5 text-blue-600" />
                  </motion.div>
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
                transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
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
                transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
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
                transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
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
                transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
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
                transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className=""
              >
                <Button
                  type="submit"
                  className="w-full font-bold hover:opacity-90 h-14 text-base"
                  disabled={registerMutation.isPending || !areRequiredFieldsValid()}
                >
                  Create Account
                </Button>
              </motion.div>

              <motion.div 
                className=""
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
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
        </motion.div>
      )}
    </AuthLayout>
  );
}