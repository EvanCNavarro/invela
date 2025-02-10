import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { TaskDetailsModal } from "@/components/modals/TaskDetailsModal";
import { format } from "date-fns";

interface Task {
  id: number;
  title: string;
  status: string;
  progress: number;
  dueDate?: string;
  // ... other task fields
}

export function TaskTable({ tasks }: { tasks: Task[] }) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell>{task.title}</TableCell>
              <TableCell>{task.status}</TableCell>
              <TableCell>{task.progress}%</TableCell>
              <TableCell>
                {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '-'}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => {
                        setSelectedTask(task);
                        setDetailsModalOpen(true);
                      }}
                    >
                      View Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <TaskDetailsModal
        task={selectedTask}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
      />
    </>
  );
}
