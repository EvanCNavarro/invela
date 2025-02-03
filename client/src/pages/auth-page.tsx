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
import { useState } from "react";
import { cn } from "@/lib/utils";
import { EmailField } from "@/components/auth/EmailField";
import { Eye, EyeOff } from "lucide-react";

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
  const [location, setLocation] = useLocation();
  const [redirectEmail, setRedirectEmail] = useState<string>("");
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [fieldsAutoFilled, setFieldsAutoFilled] = useState(false);
  const isLogin = location.includes("mode=login");

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
    defaultValues: {
      email: redirectEmail,
      fullName: "",
      company: "",
      password: "",
    },
    mode: "onBlur"
  });

  if (user) {
    return <Redirect to="/" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Show all error messages by marking all fields as touched
    const fields = isLogin ? ['email', 'password'] as const : ['email', 'fullName', 'company', 'password'] as const;
    fields.forEach(field => {
      setTouchedFields(prev => ({ ...prev, [field]: true }));
    });

    // Trigger validation for all fields
    const isValid = await form.trigger();

    if (!isValid) {
      // Find first error field
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

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    if (isLogin) {
      const { email, password } = values;
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate(values);
    }
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
                    setRedirectEmail={setRedirectEmail}
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
                        <FormLabel className={cn(
                          touchedFields.fullName && form.formState.errors.fullName && "text-[#E56047]"
                        )}>Full Name</FormLabel>
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
                        <FormLabel className={cn(
                          touchedFields.company && form.formState.errors.company && "text-[#E56047]"
                        )}>Company</FormLabel>
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
                    <FormLabel className={cn(
                      touchedFields.password && form.formState.errors.password && "text-[#E56047]"
                    )}>Password</FormLabel>
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
                            "border-[#E56047] focus-visible:ring-[#E56047]",
                            touchedFields.password && field.value && !form.formState.errors.password &&
                            "border-green-500"
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
                setLocation(isLogin ? '/auth' : '/auth?mode=login');
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

      <div 
        className={cn(
          "hidden lg:flex flex-1 items-center justify-center bg-[#346CF0]"
        )}
      >
        <div className="max-w-[500px] w-full h-[500px] relative flex items-center justify-center">
          <img
            src="/assets/auth_animation.gif"
            alt="Secure Login Animation"
            className="w-full h-full object-contain"
            style={{
              imageRendering: 'auto',
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden'
            }}
          />
        </div>
      </div>
    </div>
  );
}