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
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { EmailField } from "@/components/auth/EmailField";
import { Check, Eye, EyeOff } from "lucide-react";

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  company: z.string().min(2, "Company name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const popularEmailProviders = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'protonmail.com', 'mail.com', 'zoho.com', 'yandex.com',
  'gmx.com', 'live.com', 'msn.com', 'fastmail.com', 'me.com',
  'mailbox.org', 'tutanota.com', 'inbox.com', 'mail.ru', 'qq.com'
];

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

  useEffect(() => {
    if (redirectEmail) {
      form.setValue("email", redirectEmail);
    }
  }, [redirectEmail, form]);

  const extractInfoFromEmail = (email: string) => {
    if (fieldsAutoFilled) return;

    const [localPart, domain] = email.split('@');

    // Only process if it's not a popular email provider
    if (!popularEmailProviders.includes(domain.toLowerCase())) {
      // Only autofill if fields are empty
      const currentFullName = form.getValues('fullName');
      const currentCompany = form.getValues('company');

      // Only proceed if both fields are empty
      if (!currentFullName && !currentCompany) {
        // Extract company name if field is empty
        const company = domain.split('.')[0];
        form.setValue('company', company.charAt(0).toUpperCase() + company.slice(1), {
          shouldValidate: true,
          shouldTouch: true
        });

        // Extract full name if field is empty
        const nameParts = localPart.split(/[._]/);
        const fullName = nameParts
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
        form.setValue('fullName', fullName, {
          shouldValidate: true,
          shouldTouch: true
        });

        setFieldsAutoFilled(true);
      }
    }
  };

  if (user) {
    return <Redirect to="/" />;
  }

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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <EmailField 
                    field={field} 
                    setRedirectEmail={setRedirectEmail}
                    isLogin={isLogin}
                    onValidEmail={!isLogin ? extractInfoFromEmail : undefined}
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
                          {field.value && !form.formState.errors.fullName && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Check className="w-5 h-5 text-green-500" />
                            </div>
                          )}
                        </div>
                        {touchedFields.fullName && field.value && <FormMessage className="text-[#EE7151]" />}
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
                          {field.value && !form.formState.errors.company && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Check className="w-5 h-5 text-green-500" />
                            </div>
                          )}
                        </div>
                        {touchedFields.company && field.value && <FormMessage className="text-[#EE7151]" />}
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
                          className="pr-10"
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
                    {touchedFields.password && field.value && <FormMessage className="text-[#EE7151]" />}
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
          "hidden lg:flex flex-1 items-center justify-center",
          isLogin ? "bg-[hsl(209,99%,50%)]" : "bg-white"
        )}
      >
        <div className="max-w-[500px] w-full h-[500px] relative flex items-center justify-center">
          {isLogin ? (
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
          ) : (
            <img
              src="/assets/register_animation.gif"
              alt="Register Animation"
              className="w-full h-full object-contain"
              style={{
                imageRendering: 'auto',
                WebkitBackfaceVisibility: 'hidden',
                backfaceVisibility: 'hidden'
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}