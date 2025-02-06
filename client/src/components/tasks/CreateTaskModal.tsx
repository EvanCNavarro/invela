import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, PlusIcon, Check, FileText, Send, User, Building2 } from "lucide-react";
import { format, addDays, isSameDay } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

const taskSchema = z.object({
  taskType: z.enum(["user_onboarding", "file_request"]),
  taskScope: z.enum(["user", "company"]),
  userEmail: z.string().email().optional(),
  companyId: z.number().optional(),
  dueDate: z.date().optional(),
  hasDueDate: z.boolean().default(true),
});

type TaskFormData = z.infer<typeof taskSchema>;

const dueDateOptions = [
  { label: "Tomorrow", value: 1 },
  { label: "Next Week", value: 7 },
  { label: "Custom", value: "custom" },
  { label: "No Due Date", value: "none" },
] as const;

export function CreateTaskModal() {
  const [open, setOpen] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const tomorrow = addDays(new Date(), 1);
  const nextWeek = addDays(new Date(), 7);
  const [selectedDueDateOption, setSelectedDueDateOption] = useState<typeof dueDateOptions[number]>(dueDateOptions[0]);

  // Fetch companies when search query changes
  const { data: companies = [] } = useQuery({
    queryKey: ["/api/companies", searchQuery],
    enabled: searchQuery.length > 0,
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      taskType: "file_request",
      taskScope: "user",
      dueDate: tomorrow,
      hasDueDate: true,
    },
  });

  const taskType = form.watch("taskType");
  const taskScope = form.watch("taskScope");

  const onSubmit = async (data: TaskFormData) => {
    console.log(data);
    // TODO: Add API call to create task
    setOpen(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (isSameDay(date, tomorrow)) {
      setSelectedDueDateOption(dueDateOptions[0]);
    } else if (isSameDay(date, nextWeek)) {
      setSelectedDueDateOption(dueDateOptions[1]);
    } else {
      setSelectedDueDateOption(dueDateOptions[2]);
    }

    form.setValue("dueDate", date);
    form.setValue("hasDueDate", true);
  };

  const handleDueDateOptionClick = (option: typeof dueDateOptions[number]) => {
    setSelectedDueDateOption(option);
    if (option.value === "none") {
      form.setValue("hasDueDate", false);
      form.setValue("dueDate", undefined);
    } else if (typeof option.value === "number") {
      const date = addDays(new Date(), option.value);
      form.setValue("hasDueDate", true);
      form.setValue("dueDate", date);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="taskType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>
                          {field.value === "user_onboarding" ? (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Invite New FinTech User
                            </>
                          ) : (
                            <>
                              <FileText className="h-4 w-4 mr-2" />
                              Request Files
                            </>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user_onboarding" className="relative pl-6">
                        <Check className="h-4 w-4 absolute left-0 top-2 text-primary opacity-0 peer-[.selected]:opacity-100" />
                        Invite New FinTech User
                      </SelectItem>
                      <SelectItem value="file_request" className="relative pl-6">
                        <Check className="h-4 w-4 absolute left-0 top-2 text-primary opacity-0 peer-[.selected]:opacity-100" />
                        Request Files
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {taskType === "file_request" && (
              <FormField
                control={form.control}
                name="taskScope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue>
                            {field.value === "company" ? (
                              <>
                                <Building2 className="h-4 w-4 mr-2" />
                                Company
                              </>
                            ) : (
                              <>
                                <User className="h-4 w-4 mr-2" />
                                Single User
                              </>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="company" className="relative pl-6">
                          <Check className="h-4 w-4 absolute left-0 top-2 text-primary opacity-0 peer-[.selected]:opacity-100" />
                          Company
                        </SelectItem>
                        <SelectItem value="user" className="relative pl-6">
                          <Check className="h-4 w-4 absolute left-0 top-2 text-primary opacity-0 peer-[.selected]:opacity-100" />
                          Single User
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {((taskType === "file_request" && taskScope === "user") || taskType === "user_onboarding") && (
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

            {((taskType === "file_request" && taskScope === "company") || taskType === "user_onboarding") && (
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
            )}

            {taskType === "file_request" && (
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !form.getValues("hasDueDate") && "text-muted-foreground opacity-50",
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
                    <Tabs
                      value={selectedDueDateOption.label}
                      onValueChange={(value) => {
                        const option = dueDateOptions.find(opt => opt.label === value);
                        if (option) handleDueDateOptionClick(option);
                      }}
                      className="w-full mt-2"
                    >
                      <TabsList className="grid grid-cols-4 w-full">
                        {dueDateOptions.map((option) => (
                          <TabsTrigger
                            key={option.label}
                            value={option.label}
                            className={cn(
                              "data-[state=active]:text-primary",
                              "data-[state=active]:bg-primary/10"
                            )}
                          >
                            {option.label}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
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
              <Button type="submit" className="flex-1">
                {taskType === "file_request" ? (
                  <>
                    Create File Task
                    <FileText className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Create Invite Task
                    <Send className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}