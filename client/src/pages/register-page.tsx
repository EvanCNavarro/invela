import { useState } from "react";
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

// Initial schema just for invitation code
const invitationCodeSchema = z.object({
  invitationCode: z
    .string()
    .length(6, "Invitation code must be 6 characters")
    .regex(/^[0-9A-F]+$/, "Code must be a valid hexadecimal value")
});

// Full registration schema including validated invitation data
const registrationSchema = z.object({
  invitationCode: z
    .string()
    .length(6, "Invitation code must be 6 characters")
    .regex(/^[0-9A-F]+$/, "Code must be a valid hexadecimal value"),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  fullName: z.string().min(1, "Full name is required."),
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  company: z.string().min(1, "Company is required."),
});

export default function RegisterPage() {
  const { user, registerMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [validatedInvitation, setValidatedInvitation] = useState<{
    email: string;
    company: string;
    fullName: string;
  } | null>(null);

  // Form for invitation code validation
  const invitationForm = useForm<z.infer<typeof invitationCodeSchema>>({
    resolver: zodResolver(invitationCodeSchema),
    defaultValues: {
      invitationCode: "",
    },
  });

  // Form for full registration
  const registrationForm = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      invitationCode: "",
      email: "",
      password: "",
      fullName: "",
      firstName: "",
      lastName: "",
      company: "",
    },
  });

  // Query to validate invitation code
  const { data: invitationData, refetch: validateInvitation } = useQuery({
    queryKey: ["validateInvitation", invitationForm.watch("invitationCode")],
    queryFn: async () => {
      const code = invitationForm.watch("invitationCode");
      if (!code || code.length !== 6) return null;

      const response = await fetch(`/api/invitations/${code}/validate`);
      if (!response.ok) throw new Error("Invalid invitation code");
      return response.json();
    },
    enabled: false, // Don't run automatically
  });

  // Handle invitation code validation
  const onValidateCode = async (values: z.infer<typeof invitationCodeSchema>) => {
    try {
      const result = await validateInvitation();
      if (result.data?.valid) {
        setValidatedInvitation({
          email: result.data.email,
          company: result.data.company,
          fullName: result.data.fullName,
        });

        // Pre-fill registration form
        registrationForm.setValue("invitationCode", values.invitationCode);
        registrationForm.setValue("email", result.data.email);
        registrationForm.setValue("company", result.data.company);
        registrationForm.setValue("fullName", result.data.fullName);

        // Split full name into first and last name
        const nameParts = result.data.fullName.split(" ");
        registrationForm.setValue("firstName", nameParts[0] || "");
        registrationForm.setValue("lastName", nameParts.slice(1).join(" ") || "");
      }
    } catch (error) {
      invitationForm.setError("invitationCode", {
        type: "manual",
        message: "Invalid invitation code",
      });
    }
  };

  // Handle full registration
  const onRegisterSubmit = async (values: z.infer<typeof registrationSchema>) => {
    registerMutation.mutate(values);
  };

  // Redirect if already logged in
  if (user) {
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
            // Show invitation code form first
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
            // Show full registration form after code validation
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

      <div className="hidden lg:flex flex-1 items-center justify-center bg-[hsl(209,99%,50%)]">
        <AuthHeroSection isLogin={false} />
      </div>
    </div>
  );
}