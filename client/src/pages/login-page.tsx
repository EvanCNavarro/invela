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
import { Eye, EyeOff, Check, ArrowLeft } from "lucide-react";
import { AuthHeroSection } from "@/components/auth/AuthHeroSection";
import { AuthFooter } from "@/components/auth/AuthFooter";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export default function LoginPage() {
  const { user, loginMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange" // Validate on change instead of just on submit
  });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    if (!form.formState.isValid) {
      console.log('[Login] Form validation failed:', form.formState.errors);
      return;
    }

    console.log('[Login] Submitting form with email:', values.email);
    console.log('[Login] Password length:', values.password.length);
    loginMutation.mutate(values);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gray-100">
      <div className="px-4 pt-8 w-full max-w-6xl mx-auto">
        <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground gap-1 transition-colors font-medium text-sm">
          <ArrowLeft className="h-4 w-4" />
          Back to Website
        </Link>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl bg-white rounded-lg shadow-lg overflow-hidden flex">
          <div className="w-full lg:w-[55%] p-14 flex flex-col justify-center">
            <div className="mb-12">
              <img
                src="/invela-logo.svg"
                alt="Invela"
                className="h-14 w-14 mb-6"
              />
              <h1 className="text-3xl font-bold">Log in to Invela</h1>
              <p className="text-base text-muted-foreground mt-3">
                Enter your credentials to access your account
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="mb-6">
                      <FormLabel className="text-base">Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          autoComplete="email"
                          autoFocus
                          placeholder="Enter your email"
                          className={`h-12 ${field.value && !form.formState.errors.email ? "border-green-500" : ""}`}
                          onChange={(e) => {
                            field.onChange(e);
                            console.log('[Login] Email field changed:', e.target.value);
                          }}
                        />
                      </FormControl>
                      {field.value && form.formState.errors.email && (
                        <FormMessage />
                      )}
                      {field.value && !form.formState.errors.email && (
                        <p className="text-sm text-green-500 mt-2 flex items-center gap-1">
                          <Check className="h-4 w-4" />
                          Valid email address
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="mb-6">
                      <FormLabel className="text-base">Password</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={showPassword ? "text" : "password"}
                            {...field}
                            autoComplete="current-password"
                            placeholder="Enter your password"
                            className={`h-12 ${field.value && !form.formState.errors.password ? "border-green-500" : ""}`}
                            onChange={(e) => {
                              field.onChange(e);
                              console.log('[Login] Password field changed, length:', e.target.value.length);
                            }}
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
                      {field.value && form.formState.errors.password && (
                        <FormMessage />
                      )}
                      {field.value && !form.formState.errors.password && (
                        <p className="text-sm text-green-500 mt-2 flex items-center gap-1">
                          <Check className="h-4 w-4" />
                          Password meets requirements
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full font-bold hover:opacity-90 mt-10 h-12 text-base"
                  disabled={!form.formState.isValid || loginMutation.isPending}
                  onClick={() => {
                    console.log('[Login] Submit button clicked');
                    console.log('[Login] Form state:', {
                      isValid: form.formState.isValid,
                      errors: form.formState.errors,
                      isDirty: form.formState.isDirty
                    });
                  }}
                >
                  {loginMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      Logging in...
                    </span>
                  ) : (
                    'Log in'
                  )}
                </Button>

                <div className="text-center mt-6">
                  <p className="text-sm text-muted-foreground">
                    Have an invitation code?{" "}
                    <Link href="/register" className="text-primary hover:underline">
                      Register here
                    </Link>
                  </p>
                </div>
              </form>
            </Form>
          </div>

          <div className="hidden lg:block w-[45%] p-3">
            <AuthHeroSection isLogin={true} />
          </div>
        </div>
      </div>
      
      <AuthFooter />
    </div>
  );
}