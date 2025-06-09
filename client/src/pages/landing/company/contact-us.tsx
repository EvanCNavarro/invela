import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { LandingLayout } from '@/components/landing/LandingLayout';
import SectionTitleChip from '@/components/landing/SectionTitleChip';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { CheckCircle2 } from 'lucide-react';

// Form schema for contact form
const contactFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  company: z.string().min(1, { message: 'Company name is required.' }),
  phone: z.string().optional(),
  inquiryType: z.string().min(1, { message: 'Please select an inquiry type.' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export default function ContactUsPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const typeParam = searchParams.get('type');
  
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      company: '',
      phone: '',
      inquiryType: typeParam === 'product-demo' ? 'product-demo' : 
                   typeParam === 'sales-inquiry' ? 'sales-inquiry' : '',
      message: '',
    },
    mode: 'onChange', // Enable validation on field change
    criteriaMode: 'all',
    shouldFocusError: true,
  });
  
  // Removed auto-focus to prevent unwanted focusing behavior

  function onSubmit(data: ContactFormValues) {
    // In a real implementation, this would send the data to a server
    console.log(data);
    
    // Show success toast
    toast({
      title: "Message sent!",
      description: "We've received your inquiry and will get back to you shortly.",
    });
    
    // Reset the form
    form.reset();
  }
  
  // This will trigger when the form submission fails due to validation errors
  const handleInvalidSubmit = () => {
    // Count the number of validation errors
    const errorCount = Object.keys(form.formState.errors).length;
    
    if (errorCount > 0) {
      // Force validation of all required fields to show all error states at once
      Object.keys(contactFormSchema.shape).forEach(key => {
        form.setError(key as any, { 
          type: "manual",
          message: form.formState.errors[key as keyof ContactFormValues]?.message
        }, { shouldFocus: false });
      });
      
      toast({
        title: "Form validation failed",
        description: `Please correct the ${errorCount} highlighted field${errorCount === 1 ? '' : 's'} before submitting.`,
        variant: "destructive",
      });
    }
  }

  return (
    <LandingLayout>
      <div className="min-h-screen bg-gradient-to-b from-[#F8FAFF] to-white">
        <div className="container mx-auto px-4 py-16 max-w-5xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Have questions or want to learn more about Invela's products and services? We're here to help.
            </p>
          </motion.div>

          {/* Get in Touch Section */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-16"
          >
            <div className="max-w-3xl mx-auto">
              <div id="contact-form" className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mb-10">
                <div className="mb-6 text-left">
                  <SectionTitleChip title="Get in Touch" sectionId="contact-form" centered={false} />
                  <h2 className="text-2xl font-bold mt-2 mb-6">Send Us a Message</h2>
                </div>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit, handleInvalidSubmit)} className="space-y-6">
                    {/* Name and Company row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel>
                              <span className="font-semibold">Name</span>
                              <span className="text-red-500 ml-1">*</span>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  placeholder="Your name" 
                                  autoFocus
                                  {...field} 
                                  className={
                                    form.formState.touchedFields.name || form.formState.isSubmitted
                                      ? !form.formState.errors.name && field.value
                                        ? "border-green-500 focus-visible:ring-green-500 pr-10" 
                                        : form.formState.errors.name 
                                          ? "border-red-500 focus-visible:ring-red-500"
                                          : ""
                                      : ""
                                  }
                                />
                                {(form.formState.touchedFields.name || form.formState.isSubmitted) && !form.formState.errors.name && field.value && (
                                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel>
                              <span className="font-semibold">Company</span>
                              <span className="text-red-500 ml-1">*</span>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  placeholder="Your company" 
                                  {...field} 
                                  className={
                                    form.formState.touchedFields.company || form.formState.isSubmitted
                                      ? !form.formState.errors.company && field.value
                                        ? "border-green-500 focus-visible:ring-green-500 pr-10" 
                                        : form.formState.errors.company
                                          ? "border-red-500 focus-visible:ring-red-500"
                                          : ""
                                      : ""
                                  }
                                />
                                {(form.formState.touchedFields.company || form.formState.isSubmitted) && !form.formState.errors.company && field.value && (
                                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Email and Phone row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel>
                              <span className="font-semibold">Email</span>
                              <span className="text-red-500 ml-1">*</span>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  placeholder="your.email@example.com" 
                                  {...field} 
                                  className={
                                    form.formState.touchedFields.email || form.formState.isSubmitted
                                      ? !form.formState.errors.email && field.value
                                        ? "border-green-500 focus-visible:ring-green-500 pr-10" 
                                        : form.formState.errors.email
                                          ? "border-red-500 focus-visible:ring-red-500"
                                          : ""
                                      : ""
                                  }
                                />
                                {(form.formState.touchedFields.email || form.formState.isSubmitted) && !form.formState.errors.email && field.value && (
                                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel>
                              <span className="font-semibold">Phone</span>
                              <span className="font-normal text-gray-500"> (Optional)</span>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="+1 (555) 123-4567" 
                                type="tel"
                                pattern="[0-9+()-\s]*"
                                onKeyPress={(e) => {
                                  // Allow only numbers, +, -, (, ), and spaces
                                  const regex = /[0-9+\-() ]/;
                                  const key = e.key;
                                  if (!regex.test(key)) {
                                    e.preventDefault();
                                  }
                                }}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Inquiry Type row (half width) */}
                    <div className="md:w-1/2">
                      <FormField
                        control={form.control}
                        name="inquiryType"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel>
                              <span className="font-semibold">Inquiry Type</span>
                              <span className="text-red-500 ml-1">*</span>
                            </FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <div className="relative">
                                  <SelectTrigger className={
                                    form.formState.touchedFields.inquiryType || field.value || form.formState.isSubmitted
                                      ? !form.formState.errors.inquiryType && field.value
                                        ? "border-green-500 focus:ring-green-500" 
                                        : form.formState.errors.inquiryType
                                          ? "border-red-500 focus:ring-red-500"
                                          : ""
                                      : ""
                                  }>
                                    <SelectValue placeholder="Select the type of inquiry" />

                                  </SelectTrigger>
                                </div>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="product-demo">Product Demo</SelectItem>
                                <SelectItem value="sales-inquiry">Sales Inquiry</SelectItem>
                                <SelectItem value="partnership">Partnership Opportunities</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Message row (full width) */}
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel>
                            <span className="font-semibold">Message</span>
                            <span className="text-red-500 ml-1">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Textarea 
                                placeholder="How can we help you? Please provide details about your inquiry." 
                                className={`min-h-[120px] ${
                                  form.formState.touchedFields.message || form.formState.isSubmitted
                                    ? !form.formState.errors.message && field.value
                                      ? "border-green-500 focus-visible:ring-green-500 pr-10" 
                                      : form.formState.errors.message
                                        ? "border-red-500 focus-visible:ring-red-500"
                                        : ""
                                    : ""
                                }`}
                                {...field} 
                              />
                              {(form.formState.touchedFields.message || form.formState.isSubmitted) && !form.formState.errors.message && field.value && (
                                <div className="absolute right-3 top-5 pointer-events-none">
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full md:w-auto px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                    >
                      Send Message
                    </Button>
                  </form>
                </Form>
              </div>
              
              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Our Office */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-xl font-semibold mb-4">Our Office</h3>
                  <p className="text-gray-600 mb-4">
                    350 Buck Center Dr<br />
                    Salt Lake City, UT 84108
                  </p>
                </div>
                
                {/* Contact Details */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-xl font-semibold mb-4">Contact Details</h3>
                  <p className="text-gray-600 mb-2">
                    <span className="font-semibold">Email:</span> <a href="mailto:info@invela.com" className="text-blue-600 hover:underline">info@invela.com</a>
                  </p>
                  <p className="text-gray-600 mb-2">
                    <span className="font-semibold">Phone:</span> <a href="tel:+15551234567" className="text-blue-600 hover:underline">+1 (555) 123-4567</a>
                  </p>
                  <p className="text-gray-600 mb-2">
                    <span className="font-semibold">Support:</span> <a href="mailto:support@invela.com" className="text-blue-600 hover:underline">support@invela.com</a>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </LandingLayout>
  );
}