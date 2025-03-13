
import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/components/ui/use-toast';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';

// Define form schema for email validation
const resetPasswordRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export default function ResetPasswordRequestPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<z.infer<typeof resetPasswordRequestSchema>>({
    resolver: zodResolver(resetPasswordRequestSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof resetPasswordRequestSchema>) => {
    setIsProcessing(true);

    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to request password reset');
      }

      toast({
        title: 'Password reset email sent',
        description: 'If an account exists with that email, you will receive a password reset link.',
        variant: 'default',
        className: 'border-l-4 border-green-500',
      });

      setIsProcessing(false);
      setLocation('/login');
    } catch (err) {
      console.error('Error requesting password reset:', err);
      
      // Still show success message for security (don't reveal if email exists)
      toast({
        title: 'Password reset email sent',
        description: 'If an account exists with that email, you will receive a password reset link.',
        variant: 'default',
        className: 'border-l-4 border-green-500',
      });
      
      setIsProcessing(false);
      setLocation('/login');
    }
  };

  if (isProcessing) {
    return <LoadingScreen message="Sending password reset email..." />;
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
            <h1 className="text-2xl font-bold">Reset Password</h1>
            <p className="text-muted-foreground mt-2">Enter your email to receive a password reset link</p>
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
                        type="email"
                        {...field}
                        placeholder="Enter your email address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full mt-6">
                Send Reset Link
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => setLocation('/login')}
              className="text-sm text-muted-foreground"
            >
              Back to login
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center bg-[hsl(209,99%,50%)]">
        <div className="max-w-md p-8 text-white">
          <h2 className="text-3xl font-bold mb-4">Forgot Your Password?</h2>
          <p className="text-lg opacity-90">
            Don't worry, it happens to the best of us. Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
      </div>
    </div>
  );
}
