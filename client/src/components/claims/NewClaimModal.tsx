import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  bankId: z.string().min(1, { message: 'Bank ID is required' }),
  bankName: z.string().min(1, { message: 'Bank name is required' }),
  fintechName: z.string().min(1, { message: 'FinTech name is required' }),
  accountNumber: z.string().optional(),
  claimDate: z.date({ required_error: 'Claim date is required' }),
  policyNumber: z.string().optional(),
  breachDate: z.date({ required_error: 'Breach date is required' }),
  consentId: z.string().optional(),
  consentScope: z.string().optional(),
  affectedRecords: z.coerce.number().optional(),
  incidentDescription: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NewClaimModalProps {
  open: boolean;
  onClose: () => void;
  onClaimCreated: () => void;
}

export default function NewClaimModal({ open, onClose, onClaimCreated }: NewClaimModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bankId: '',
      bankName: '',
      fintechName: '',
      accountNumber: '',
      claimDate: new Date(),
      policyNumber: '',
      breachDate: new Date(),
      consentId: '',
      consentScope: '',
      affectedRecords: 0,
      incidentDescription: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      await apiRequest('/api/claims', {
        method: 'POST',
        data,
      });
      onClaimCreated();
    } catch (error) {
      console.error('Error creating claim:', error);
      toast({
        title: 'Error creating claim',
        description: 'There was an error creating your claim. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New PII Data Loss Claim</DialogTitle>
          <DialogDescription>
            Submit a new claim for a PII data loss incident. Fill in the details below to create a claim record.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bank Information */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-lg font-medium">Financial Institution Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bankId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank ID</FormLabel>
                        <FormControl>
                          <Input placeholder="BNK-12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Name</FormLabel>
                        <FormControl>
                          <Input placeholder="First National Bank" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Data Recipient Information */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-lg font-medium">Data Recipient Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fintechName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Recipient Name</FormLabel>
                        <FormControl>
                          <Input placeholder="PayQuick Solutions" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="ACCT-12345678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Claim Details */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-lg font-medium">Claim Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="claimDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Claim Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="policyNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Policy Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="POL-2025-12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Breach Details */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-lg font-medium">Breach Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="breachDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Breach Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="consentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consent ID (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="consent-uuid-12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="consentScope"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consent Scope (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="PII" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="affectedRecords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Affected Records (Optional)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="250" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="incidentDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Incident Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the incident and how the data breach occurred." 
                          className="min-h-[120px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Claim'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
