import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { TaskTable } from "@/components/tasks/TaskTable";
import { useQuery } from "@tanstack/react-query";
import type { SelectTask } from "@db/schema";

export default function TaskCenter() {
  const { data: tasks = [] } = useQuery<SelectTask[]>({
    queryKey: ["/api/tasks"],
  });

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
        <TaskTable tasks={tasks} />
      </div>
    </div>
  );
}