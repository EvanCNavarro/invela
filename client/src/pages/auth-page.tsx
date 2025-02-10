import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
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
import { Eye, EyeOff, Check, AlertTriangle } from "lucide-react";
import { AuthHeroSection } from "@/components/auth/AuthHeroSection";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";

// Form validation schemas
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

const registrationSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  fullName: z.string().min(1, "Full name is required."),
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  invitationCode: z.string().min(1, "Invitation code is required."),
});

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Extract and clean up URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  const rawCode = searchParams.get('code');
  const invitationCode = rawCode?.split('/')[0] || '';
  const workEmail = searchParams.get('work_email');

  // Validate invitation code
  const { data: invitationData, isLoading: isValidatingCode } = useQuery({
    queryKey: ['/api/invitations', invitationCode],
    queryFn: async () => {
      if (!invitationCode) return null;
      const response = await fetch(`/api/invitations/${invitationCode}/validate`);
      if (!response.ok) throw new Error('Invalid invitation code');
      return response.json();
    },
    enabled: !!invitationCode,
  });

  // Form setup
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registrationForm = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      email: workEmail || "",
      password: "",
      fullName: "",
      firstName: "",
      lastName: "",
      invitationCode: invitationCode || "",
    },
  });

  // Update email field when invitation data is loaded
  useEffect(() => {
    if (invitationData?.email) {
      registrationForm.setValue('email', invitationData.email);
    }
  }, [invitationData]);

  // Add loading delay for smooth transitions
  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Updated routing logic to handle invitation codes
  const showRegistrationForm = !!invitationCode && (
    isValidatingCode || (invitationData?.valid && invitationData?.email === workEmail)
  );

  // Only redirect if user is logged in AND there's no valid invitation flow
  if (user && !showRegistrationForm) {
    return <Redirect to="/" />;
  }

  // Loading state
  if (isPageLoading || isValidatingCode) {
    return (
      <div className="min-h-screen flex">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm p-6 space-y-6">
            <div className="text-center space-y-4">
              <Skeleton className="h-12 w-12 rounded-full mx-auto" />
              <Skeleton className="h-8 w-48 mx-auto" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
        <div className="hidden lg:flex flex-1 items-center justify-center bg-[hsl(209,99%,50%)]">
          <Skeleton className="w-[500px] h-[500px]" />
        </div>
      </div>
    );
  }

  // Form submission handlers
  const onLoginSubmit = async (values: z.infer<typeof loginSchema>) => {
    const { email, password } = values;
    loginMutation.mutate({ email, password });
  };

  const onRegisterSubmit = async (values: z.infer<typeof registrationSchema>) => {
    registerMutation.mutate(values);
  };

  // Registration form view
  if (showRegistrationForm) {
    return (
      <div className="min-h-screen flex">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm p-6">
            <div className="text-center mb-8">
              <img
                src="/invela-logo.svg"
                alt="Invela"
                className="h-12 w-12 mx-auto mb-4"
              />
              <h1 className="text-2xl font-bold">Create your account</h1>
            </div>

            {/* Email domain warning */}
            {invitationData?.companyDomainMismatch && (
              <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-700">
                      Email domain doesn't match company
                    </p>
                    <p className="text-sm text-amber-600 mt-1">
                      The email domain doesn't match the expected company domain. Please verify this is correct.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Form {...registrationForm}>
              <form onSubmit={registrationForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                <FormField
                  control={registrationForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          disabled={true}
                          className={field.value && !registrationForm.formState.errors.email ? "border-green-500" : ""}
                        />
                      </FormControl>
                      {field.value && !registrationForm.formState.errors.email && (
                        <p className="text-sm text-green-500 mt-1 flex items-center gap-1">
                          <Check className="h-4 w-4" />
                          Valid email address
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={registrationForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          className={field.value && !registrationForm.formState.errors.fullName ? "border-green-500" : ""}
                        />
                      </FormControl>
                      <FormMessage />
                      {field.value && !registrationForm.formState.errors.fullName && (
                        <p className="text-sm text-green-500 mt-1 flex items-center gap-1">
                          <Check className="h-4 w-4" />
                          Name looks good
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={registrationForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            className={field.value && !registrationForm.formState.errors.firstName ? "border-green-500" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registrationForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            value={field.value || ''}
                            className={field.value && !registrationForm.formState.errors.lastName ? "border-green-500" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={registrationForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={showPassword ? "text" : "password"}
                            {...field}
                            className={field.value && !registrationForm.formState.errors.password ? "border-green-500" : ""}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      <FormMessage />
                      {field.value && !registrationForm.formState.errors.password && (
                        <p className="text-sm text-green-500 mt-1 flex items-center gap-1">
                          <Check className="h-4 w-4" />
                          Password meets requirements
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full font-bold hover:opacity-90"
                  disabled={registerMutation.isPending}
                >
                  Create Account
                </Button>
              </form>
            </Form>
          </div>
        </div>

        <div className="hidden lg:flex flex-1 items-center justify-center bg-[hsl(209,99%,50%)]">
          <AuthHeroSection isLogin={false} />
        </div>
      </div>
    );
  }

  // Login form view
  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm p-6">
          <div className="text-center mb-8">
            <img
              src="/invela-logo.svg"
              alt="Invela"
              className="h-12 w-12 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold">Log in to Invela</h1>
          </div>

          {!showRegistrationForm && invitationCode && (
            <div className="mb-4 flex items-center gap-2 text-amber-500 bg-amber-50 p-4 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className="font-semibold">Warning:</span> Invalid or expired invitation code
            </div>
          )}

          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        autoComplete="email"
                        autoFocus
                        className={field.value && !loginForm.formState.errors.email ? "border-green-500" : ""}
                      />
                    </FormControl>
                    {field.value && loginForm.formState.errors.email && (
                      <FormMessage />
                    )}
                    {field.value && !loginForm.formState.errors.email && (
                      <p className="text-sm text-green-500 mt-1 flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        Valid email address
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showPassword ? "text" : "password"}
                          {...field}
                          autoComplete="current-password"
                          className={field.value && !loginForm.formState.errors.password ? "border-green-500" : ""}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {field.value && loginForm.formState.errors.password && (
                      <FormMessage />
                    )}
                    {field.value && !loginForm.formState.errors.password && (
                      <p className="text-sm text-green-500 mt-1 flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        Password meets requirements
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full font-bold hover:opacity-90"
                disabled={loginMutation.isPending}
              >
                Log in
              </Button>
            </form>
          </Form>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center bg-[hsl(209,99%,50%)]">
        <AuthHeroSection isLogin={true} />
      </div>
    </div>
  );
}