import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation, useRoute } from "wouter";
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
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { EmailField } from "@/components/auth/EmailField";
import { Eye, EyeOff } from "lucide-react";
import { AuthHeroSection } from "@/components/auth/AuthHeroSection";
import { Skeleton } from "@/components/ui/skeleton";

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  company: z.string().min(2, "Company name must be at least 2 characters."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [match] = useRoute("/register");
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [fieldsAutoFilled, setFieldsAutoFilled] = useState(false);
  const isLogin = !match;
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);


  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
    defaultValues: {
      email: "",
      fullName: "",
      company: "",
      password: "",
    },
    mode: "onBlur"
  });

  if (user) {
    return <Redirect to="/" />;
  }

    if (isPageLoading) {
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
              {!isLogin && (
                <>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </>
              )}
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
        <div className={cn(
          "hidden lg:flex flex-1 items-center justify-center",
          isLogin ? "bg-[hsl(209,99%,50%)]" : "bg-white"
        )}>
          <Skeleton className="w-[500px] h-[500px]" />
        </div>
      </div>
    );
  }

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    if (isLogin) {
      const { email, password } = values;
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate(values);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fields = ['email', 'fullName', 'company', 'password'] as const;
    fields.forEach(field => {
      setTouchedFields(prev => ({ ...prev, [field]: true }));
    });

    const isValid = await form.trigger();

    if (!isValid) {
      const firstErrorField = fields.find(field => {
        const value = form.getValues(field);
        return !value || form.formState.errors[field];
      });

      if (firstErrorField) {
        form.setFocus(firstErrorField);
      }
      return;
    }

    form.handleSubmit(onSubmit)(e);
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
            <h1 className="text-2xl font-bold">
              {isLogin ? "Log in to Invela" : "Create an Account"}
            </h1>
          </div>

          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <EmailField 
                    field={field}
                    isLogin={isLogin}
                    showError={touchedFields.email}
                  />
                )}
              />

              {!isLogin && (
                <>
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input 
                              {...field} 
                              className={cn(
                                "pr-10",
                                touchedFields.fullName && form.formState.errors.fullName && 
                                "border-[#E56047] focus-visible:ring-[#E56047]",
                                field.value && !form.formState.errors.fullName && 
                                "border-green-500"
                              )}
                              onBlur={(e) => {
                                field.onBlur(e);
                                if (field.value) {
                                  setTouchedFields(prev => ({ ...prev, fullName: true }));
                                }
                              }}
                            />
                          </FormControl>
                        </div>
                        {touchedFields.fullName && <FormMessage className="text-[#E56047]" />}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input 
                              {...field} 
                              className={cn(
                                "pr-10",
                                touchedFields.company && form.formState.errors.company && 
                                "border-[#E56047] focus-visible:ring-[#E56047]",
                                field.value && !form.formState.errors.company && 
                                "border-green-500"
                              )}
                              onBlur={(e) => {
                                field.onBlur(e);
                                if (field.value) {
                                  setTouchedFields(prev => ({ ...prev, company: true }));
                                }
                              }}
                            />
                          </FormControl>
                        </div>
                        {touchedFields.company && <FormMessage className="text-[#E56047]" />}
                      </FormItem>
                    )}
                  />
                </>
              )}

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
                          onBlur={(e) => {
                            field.onBlur(e);
                            if (field.value) {
                              setTouchedFields(prev => ({ ...prev, password: true }));
                            }
                          }}
                          className={cn(
                            "pr-10",
                            touchedFields.password && form.formState.errors.password && 
                            "border-[#E56047] focus-visible:ring-[#E56047]"
                          )}
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
                    {touchedFields.password && <FormMessage className="text-[#E56047]" />}
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full font-bold hover:opacity-90"
                disabled={loginMutation.isPending || registerMutation.isPending}
              >
                {isLogin ? "Log in" : "Register"}
              </Button>
            </form>
          </Form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setLocation(isLogin ? '/register' : '/login');
                form.reset();
                setTouchedFields({});
                setFieldsAutoFilled(false);
              }}
              className="text-primary hover:underline"
            >
              {isLogin ? "Register" : "Log in"}
            </button>
          </p>
        </div>
      </div>

      <div className={cn(
        "hidden lg:flex flex-1 items-center justify-center",
        isLogin ? "bg-[hsl(209,99%,50%)]" : "bg-white"
      )}>
        <AuthHeroSection isLogin={isLogin} />
      </div>
    </div>
  );
}