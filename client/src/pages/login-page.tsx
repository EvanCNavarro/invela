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
  });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

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
                        {...field}
                        type="email"
                        autoComplete="email"
                        autoFocus
                        placeholder="Enter your email"
                        className={field.value && !form.formState.errors.email ? "border-green-500" : ""}
                      />
                    </FormControl>
                    {field.value && form.formState.errors.email && (
                      <FormMessage />
                    )}
                    {field.value && !form.formState.errors.email && (
                      <p className="text-sm text-green-500 mt-1 flex items-center gap-1">
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
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showPassword ? "text" : "password"}
                          {...field}
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          className={field.value && !form.formState.errors.password ? "border-green-500" : ""}
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

              <div className="text-center mt-4">
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
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center bg-[hsl(209,99%,50%)]">
        <AuthHeroSection isLogin={true} />
      </div>
    </div>
  );
}