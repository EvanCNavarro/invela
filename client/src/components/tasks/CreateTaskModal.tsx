import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, PlusIcon, Check, FileText, Send, User, Building2 } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";

// Define company interface
interface Company {
  id: number;
  name: string;
  category?: string;
  logoId?: number | null;
}

// First define the literal types to avoid inference issues
const TaskType = {
  USER_ONBOARDING: "user_onboarding",
  FILE_REQUEST: "file_request",
  COMPANY_KYB: "company_kyb",
} as const;

const TaskScope = {
  USER: "user",
  COMPANY: "company",
} as const;

const TaskStatus = {
  EMAIL_SENT: "email_sent",
  COMPLETED: "completed",
} as const;

const STATUS_PROGRESS = {
  [TaskStatus.EMAIL_SENT]: 50,
  [TaskStatus.COMPLETED]: 100,
} as const;

type TaskType = typeof TaskType[keyof typeof TaskType];
type TaskScope = typeof TaskScope[keyof typeof TaskScope];

// Define the base schema for common fields
const baseSchema = {
  dueDate: z.date().optional(),
};

// Define the user onboarding schema
const userOnboardingSchema = z.object({
  taskType: z.literal(TaskType.USER_ONBOARDING),
  userEmail: z.string().email("Valid email is required"),
  companyId: z.number({ required_error: "Company is required for user onboarding" }),
  ...baseSchema,
});

// Define the file request schema
const fileRequestSchema = z.object({
  taskType: z.literal(TaskType.FILE_REQUEST),
  taskScope: z.enum([TaskScope.USER, TaskScope.COMPANY]),
  userEmail: z.string().email("Valid email is required").optional(),
  companyId: z.number().optional(),
  ...baseSchema,
});

// Define the company KYB schema
const companyKybSchema = z.object({
  taskType: z.literal(TaskType.COMPANY_KYB),
  companyId: z.number({ required_error: "Company ID is required for KYB" }),
  ...baseSchema,
});


// Combined schema using discriminated union
const taskSchema = z.discriminatedUnion("taskType", [
  userOnboardingSchema,
  fileRequestSchema,
  companyKybSchema,
]);

type TaskFormData = z.infer<typeof taskSchema>;

// Default values matching the schema type
const defaultValues: TaskFormData = {
  taskType: TaskType.FILE_REQUEST,
  taskScope: TaskScope.USER,
  userEmail: "",
  companyId: undefined,
} as const;

interface CreateTaskModalProps {
  disabled?: boolean;
}

export function CreateTaskModal({ disabled = false }: CreateTaskModalProps) {
  const [open, setOpen] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies", searchQuery],
    enabled: searchQuery.length > 0,
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues,
  });

  const taskType = form.watch("taskType");
  const taskScope = taskType === TaskType.FILE_REQUEST ? form.watch("taskScope") : undefined;

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      let taskData;
      if (data.taskType === TaskType.USER_ONBOARDING) {
        const company = companies.find((c) => c.id === data.companyId);
        const companyName = company ? company.name : 'the company';
        taskData = {
          ...data,
          title: `New User Invitation: ${data.userEmail}`,
          description: `Invitation sent to ${data.userEmail} to join ${companyName} on the platform.`,
          taskScope: TaskScope.USER,
          status: TaskStatus.EMAIL_SENT,
          progress: STATUS_PROGRESS[TaskStatus.EMAIL_SENT],
          userEmail: data.userEmail?.toLowerCase(),
          metadata: {
            emailSentAt: new Date().toISOString(),
            statusFlow: [TaskStatus.EMAIL_SENT]
          }
        };
      } else if (data.taskType === TaskType.COMPANY_KYB) {
        const company = companies.find((c) => c.id === data.companyId);
        const companyName = company ? company.name : 'the company';
        taskData = {
          ...data,
          title: `KYB for ${companyName}`,
          description: `KYB task initiated for ${companyName}`,
          status: TaskStatus.EMAIL_SENT,
          progress: STATUS_PROGRESS[TaskStatus.EMAIL_SENT],
          metadata: {
            emailSentAt: new Date().toISOString(),
            statusFlow: [TaskStatus.EMAIL_SENT]
          }
        };
      } else {
        const assignee = data.taskScope === TaskScope.COMPANY
          ? companies.find((c) => c.id === data.companyId)?.name
          : data.userEmail;
        taskData = {
          ...data,
          title: `File Request for ${assignee}`,
          description: `Document request task for ${assignee}`,
          status: TaskStatus.EMAIL_SENT,
          progress: STATUS_PROGRESS[TaskStatus.EMAIL_SENT],
          userEmail: data.userEmail?.toLowerCase(),
          metadata: {
            emailSentAt: new Date().toISOString(),
            statusFlow: [TaskStatus.EMAIL_SENT]
          }
        };
      }

      console.log('[CreateTaskModal] Creating task with data:', taskData);

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create task");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });

      toast({
        title: "Success",
        description: taskType === TaskType.FILE_REQUEST
          ? "File request task created successfully"
          : taskType === TaskType.COMPANY_KYB
            ? "KYB task created successfully"
            : "Invite sent successfully and task created",
      });
      setOpen(false);
      form.reset(defaultValues);
    },
    onError: (error) => {
      toast({
        title: "Error creating task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    form.setValue("dueDate", date);
  };

  const onSubmit = async (data: TaskFormData) => {
    createTaskMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled} className={cn(
          disabled && "opacity-50 cursor-not-allowed"
        )}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Create a new task for user onboarding, file requests, or company KYB.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="taskType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>
                          {field.value === TaskType.USER_ONBOARDING ? (
                            <div className="flex items-center">
                              <Send className="h-4 w-4 mr-2" />
                              <span>Invite New FinTech User</span>
                            </div>
                          ) : field.value === TaskType.COMPANY_KYB ? (
                            <div className="flex items-center">
                              <Building2 className="h-4 w-4 mr-2" />
                              <span>Company KYB</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              <span>Request Files</span>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={TaskType.USER_ONBOARDING}>
                        <div className="flex items-center">
                          <Send className="h-4 w-4 mr-2" />
                          <span>Invite New FinTech User</span>
                        </div>
                      </SelectItem>
                      <SelectItem value={TaskType.FILE_REQUEST}>
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          <span>Request Files</span>
                        </div>
                      </SelectItem>
                      <SelectItem value={TaskType.COMPANY_KYB}>
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-2" />
                          <span>Company KYB</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {taskType === TaskType.FILE_REQUEST && (
              <FormField
                control={form.control}
                name="taskScope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue>
                            {field.value === TaskScope.COMPANY ? (
                              <div className="flex items-center">
                                <Building2 className="h-4 w-4 mr-2" />
                                <span>Company</span>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-2" />
                                <span>Single User</span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TaskScope.COMPANY}>
                          <div className="flex items-center">
                            <Building2 className="h-4 w-4 mr-2" />
                            <span>Company</span>
                          </div>
                        </SelectItem>
                        <SelectItem value={TaskScope.USER}>
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            <span>Single User</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {((taskType === TaskType.FILE_REQUEST && taskScope === TaskScope.USER) || taskType === TaskType.USER_ONBOARDING) && (
              <FormField
                control={form.control}
                name="userEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(taskType === TaskType.FILE_REQUEST && taskScope === TaskScope.COMPANY) || taskType === TaskType.USER_ONBOARDING || taskType === TaskType.COMPANY_KYB ? (
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCombobox}
                            className="w-full justify-between"
                          >
                            {field.value
                              ? companies.find((company) => company.id === field.value)?.name
                              : "Search companies..."}
                            <Building2 className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search companies..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                          />
                          <CommandEmpty>No companies found.</CommandEmpty>
                          <CommandGroup>
                            {companies.map((company) => (
                              <CommandItem
                                key={company.id}
                                value={company.name}
                                onSelect={() => {
                                  form.setValue("companyId", company.id);
                                  setOpenCombobox(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    company.id === field.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {company.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {taskType === TaskType.FILE_REQUEST && (
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
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
                              <span>Choose a Due Date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={handleDateSelect}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-between gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createTaskMutation.isPending || disabled}
              >
                {taskType === TaskType.FILE_REQUEST ? (
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    <span>Create File Task</span>
                  </div>
                ) : taskType === TaskType.COMPANY_KYB ? (
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 mr-2" />
                    <span>Create KYB Task</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Send className="h-4 w-4 mr-2" />
                    <span>Create Invite Task</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}