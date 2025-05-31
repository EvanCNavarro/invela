import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { TaskTable } from "@/components/tasks/TaskTable";
import { useQuery } from "@tanstack/react-query";
import type { SelectTask } from "@db/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskStatus } from "@db/schema";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Update status mapping to only include EMAIL_SENT and COMPLETED
const taskStatusMap = {
  [TaskStatus.EMAIL_SENT]: 'Email Sent',
  [TaskStatus.COMPLETED]: 'Completed',
} as const;

export default function TaskCenter() {
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | 'all'>('all');

  const { data: tasks = [], isLoading } = useQuery<SelectTask[]>({
    queryKey: ["/api/tasks"],
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    // REMOVED: refetchInterval polling - using event-driven WebSocket updates only
  });

  const filteredTasks = selectedStatus === 'all'
    ? tasks
    : tasks.filter(task => task.status === selectedStatus);

  if (isLoading) {
    return (
      <div className="container py-6 max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Task Center</h1>
          <p className="text-muted-foreground">
            Manage and track your company's tasks and submissions.
          </p>
        </div>
        <CreateTaskModal />
      </div>

      <div className="space-y-4">
        <div className="flex gap-4 items-center">
          <Select
            value={selectedStatus}
            onValueChange={(value) => setSelectedStatus(value as TaskStatus | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(taskStatusMap).map(([status, label]) => (
                <SelectItem key={status} value={status}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TaskTable tasks={filteredTasks} />
      </div>
    </div>
  );
}