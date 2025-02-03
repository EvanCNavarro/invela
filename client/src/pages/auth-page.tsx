import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
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
import { motion } from "framer-motion";

const formSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6),
});

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  if (user) {
    return <Redirect to="/" />;
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (isLogin) {
      loginMutation.mutate(values);
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
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending || registerMutation.isPending}
              >
                {isLogin ? "Log in" : "Register"}
              </Button>
            </form>
          </Form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin ? "Register" : "Log in"}
            </button>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-[hsl(209,99%,50%)] items-center justify-center">
        <div className="w-[500px] h-[500px] p-8">
          <motion.svg 
            viewBox="0 0 400 400" 
            className="w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.circle
              cx="200"
              cy="200"
              r="80"
              stroke="white"
              strokeWidth="2"
              fill="none"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
            {[...Array(6)].map((_, i) => (
              <motion.circle
                key={i}
                cx={200 + Math.cos((i * Math.PI * 2) / 6) * 120}
                cy={200 + Math.sin((i * Math.PI * 2) / 6) * 120}
                r="20"
                fill="white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
              />
            ))}
            {[...Array(6)].map((_, i) => (
              <motion.line
                key={`line-${i}`}
                x1="200"
                y1="200"
                x2={200 + Math.cos((i * Math.PI * 2) / 6) * 120}
                y2={200 + Math.sin((i * Math.PI * 2) / 6) * 120}
                stroke="white"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
              />
            ))}
          </motion.svg>
        </div>
      </div>
    </div>
  );
}