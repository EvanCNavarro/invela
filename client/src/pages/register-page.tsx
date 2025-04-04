import { useState, useEffect } from "react";
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
import { AuthHeroSection } from "@/components/auth/AuthHeroSection";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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

          {!validatedInvitation ? (
            <Form {...invitationForm}>
              <form onSubmit={invitationForm.handleSubmit(onValidateCode)} className="space-y-4">
                <FormField
                  control={invitationForm.control}
                  name="invitationCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invitation Code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter 6-character code"
                          autoFocus
                          className="text-center tracking-widest uppercase font-mono"
                          maxLength={6}
                          value={field.value.toUpperCase()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full font-bold hover:opacity-90"
                  disabled={invitationForm.formState.isSubmitting}
                >
                  Validate Code
                </Button>

                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/login" className="text-primary hover:underline">
                      Log in here
                    </Link>
                  </p>
                </div>
              </form>
            </Form>
          ) : (
            <Form {...registrationForm}>
              <form onSubmit={registrationForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-700">
                        Valid invitation code
                      </p>
                      <p className="text-sm text-blue-600 mt-1">
                        Registering for {validatedInvitation.company}
                      </p>
                    </div>
                  </div>
                </div>

                <FormField
                  control={registrationForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registrationForm.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input {...field} type="text" disabled />
                      </FormControl>
                      <FormMessage />
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
                          <Input {...field} type="text" placeholder="First name" />
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
                          <Input {...field} type="text" placeholder="Last name" />
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
                            placeholder="Choose a secure password"
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

                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/login" className="text-primary hover:underline">
                      Log in here
                    </Link>
                  </p>
                </div>
              </form>
            </Form>
          )}
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center bg-background">
        <AuthHeroSection isLogin={false} />
      </div>
    </div>
  );
}